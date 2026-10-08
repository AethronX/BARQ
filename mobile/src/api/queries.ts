/**
 * Data access for screens. Reads go through RLS-protected tables; every write
 * goes through a database function that re-checks permissions server-side.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { unwrap } from './errors';
import type { AuditEntry, Company, Notification, Order, OrderEvent, OrderStatus, PaymentTerms, Quote, Rfq, SupplierRfq } from './types';

export type RfqWithCount = Rfq & { quotes: { count: number }[] };
export type QuoteWithSupplier = Quote & { supplier: Pick<Company, 'id' | 'name' | 'verification' | 'city' | 'created_at'> };
export type OrderWithParties = Order & {
  rfq: Pick<Rfq, 'title' | 'category' | 'quantity' | 'unit' | 'number' | 'location' | 'required_by'> | null;
  supplier: Pick<Company, 'name' | 'verification'> | null;
  buyer: Pick<Company, 'name'> | null;
};

const ORDER_SELECT =
  '*, rfq:rfqs(title, category, quantity, unit, number, location, required_by), supplier:companies!orders_supplier_company_id_fkey(name, verification), buyer:companies!orders_buyer_company_id_fkey(name)';

/* ------------------------------- buyer ---------------------------------- */

export function useBuyerRfqs() {
  return useQuery({
    queryKey: ['rfqs'],
    queryFn: async () => unwrap(await supabase.from('rfqs').select('*, quotes(count)').order('created_at', { ascending: false }).limit(100)) as RfqWithCount[],
  });
}

export function useRfq(id: string | undefined) {
  return useQuery({
    queryKey: ['rfq', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('rfqs').select('*').eq('id', id!).single()) as Rfq,
  });
}

export function useRfqQuotes(rfqId: string | undefined) {
  return useQuery({
    queryKey: ['quotes', rfqId],
    enabled: !!rfqId,
    queryFn: async () => {
      const quotes = unwrap(
        await supabase.from('quotes').select('*, supplier:companies(id, name, verification, city, created_at)').eq('rfq_id', rfqId!).order('total_baisa'),
      ) as QuoteWithSupplier[];
      const ids = [...new Set(quotes.map((q) => q.supplier_company_id))];
      const stats = ids.length
        ? (unwrap(await supabase.rpc('supplier_stats', { p_company_ids: ids })) as { company_id: string; completed_orders: number; total_orders: number }[])
        : [];
      return { quotes, stats: Object.fromEntries(stats.map((s) => [s.company_id, s])) };
    },
  });
}

export interface RfqInput {
  title: string;
  category: string;
  quantity: number;
  unit: string;
  spec: string;
  location: string;
  requiredBy: string;
  idempotencyKey: string;
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: RfqInput) =>
      unwrap(
        await supabase.rpc('create_rfq', {
          p_title: i.title, p_category: i.category, p_quantity: i.quantity, p_unit: i.unit, p_spec: i.spec,
          p_location: i.location, p_required_by: i.requiredBy, p_idempotency_key: i.idempotencyKey,
        }),
      ) as Rfq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  });
}

export function useAwardQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => unwrap(await supabase.rpc('award_quote', { p_quote_id: quoteId })) as Order,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCancelRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rfqId: string) => unwrap(await supabase.rpc('cancel_rfq', { p_rfq_id: rfqId })) as Rfq,
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------ supplier -------------------------------- */

export function useSupplierRfqs() {
  return useQuery({
    queryKey: ['supplier-rfqs'],
    queryFn: async () => unwrap(await supabase.rpc('supplier_rfqs')) as SupplierRfq[],
  });
}

export function useMyQuote(rfqId: string | undefined) {
  return useQuery({
    queryKey: ['my-quote', rfqId],
    enabled: !!rfqId,
    queryFn: async () => unwrap(await supabase.from('quotes').select('*').eq('rfq_id', rfqId!).maybeSingle()) as Quote | null,
  });
}

export interface QuoteInput {
  rfqId: string;
  unitPriceBaisa: number;
  minDays: number;
  maxDays: number;
  warrantyMonths: number;
  paymentTerms: PaymentTerms;
  notes: string;
  validUntil: string | null;
}

export function useSubmitQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: QuoteInput) =>
      unwrap(
        await supabase.rpc('submit_quote', {
          p_rfq_id: i.rfqId, p_unit_price_baisa: i.unitPriceBaisa, p_min_days: i.minDays, p_max_days: i.maxDays,
          p_warranty_months: i.warrantyMonths, p_payment_terms: i.paymentTerms, p_notes: i.notes || undefined, p_valid_until: i.validUntil ?? undefined,
        }),
      ) as Quote,
    onSuccess: (_q, i) => {
      qc.invalidateQueries({ queryKey: ['supplier-rfqs'] });
      qc.invalidateQueries({ queryKey: ['my-quote', i.rfqId] });
    },
  });
}

export function useWithdrawQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => unwrap(await supabase.rpc('withdraw_quote', { p_quote_id: quoteId })) as Quote,
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------- orders --------------------------------- */

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => unwrap(await supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(100)) as OrderWithParties[],
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const order = unwrap(await supabase.from('orders').select(ORDER_SELECT).eq('id', id!).single()) as OrderWithParties;
      const events = unwrap(await supabase.from('order_events').select('*').eq('order_id', id!).order('created_at')) as OrderEvent[];
      const quote = unwrap(await supabase.from('quotes').select('*').eq('id', order.quote_id).single()) as Quote;
      return { order, events, quote };
    },
  });
}

export function useAdvanceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { orderId: string; to: OrderStatus; note?: string }) =>
      unwrap(await supabase.rpc('advance_order', { p_order_id: v.orderId, p_to: v.to, p_note: v.note || undefined })) as Order,
    onSuccess: (_o, v) => {
      qc.invalidateQueries({ queryKey: ['order', v.orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/* ---------------------------- notifications ----------------------------- */

export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient();
  // Live updates: new notifications refresh lists across the app.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)) as Notification[],
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('mark_notifications_read')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/* ------------------------------ account --------------------------------- */

export interface OnboardingInput {
  fullName: string;
  role: 'buyer' | 'supplier';
  companyName: string;
  city: string;
  crNumber: string;
  phone: string;
  categories: string[];
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: OnboardingInput) =>
      unwrap(
        await supabase.rpc('complete_onboarding', {
          p_full_name: i.fullName, p_role: i.role, p_company_name: i.companyName, p_city: i.city || undefined,
          p_cr_number: i.crNumber || undefined, p_phone: i.phone || undefined, p_categories: i.categories,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useRequestDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('request_account_deletion')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

/* ------------------------------- admin ---------------------------------- */

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => unwrap(await supabase.rpc('admin_overview')) as Record<string, number>,
  });
}

export function useAllCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => unwrap(await supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(500)) as Company[],
  });
}

export function useSetVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { companyId: string; level: number; note?: string }) =>
      unwrap(await supabase.rpc('admin_set_verification', { p_company_id: v.companyId, p_level: v.level, p_note: v.note || undefined })) as Company,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: async () => unwrap(await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)) as AuditEntry[],
  });
}

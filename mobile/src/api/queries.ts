/**
 * Data access for screens. Reads go through RLS-protected tables; every write
 * goes through a database function that re-checks permissions server-side.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { unwrap } from './errors';
import type { AuditEntry, Company, Notification, Order, OrderEvent, OrderStatus, PaymentTerms, Profile, Quote, Rfq, RfqStatus, Role, SupplierRfq } from './types';

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
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)) as Notification[],
  });
}

/**
 * Live updates: ONE realtime subscription per signed-in user for the whole app
 * (mounted once in AuthProvider). New notifications refresh every list.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}:${Date.now().toString(36)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
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

/* ------------------------- admin: statistics ---------------------------- */

export interface AdminStats {
  window_days: number;
  generated_at: string;
  totals: { buyers: number; suppliers: number; pending_verification: number; deleted: number };
  rfq_totals: { all: number; open: number; awarded: number; cancelled: number };
  order_totals: { all: number; active: number; completed: number; cancelled: number; gmv_baisa: number; avg_order_baisa: number | null };
  funnel: { rfqs: number; quoted: number; awarded: number; completed: number };
  series: { day: string; rfqs: number; quotes: number; orders: number; gmv_baisa: number }[];
  categories: { category: string; rfqs: number; quotes: number; awarded: number }[];
  health: {
    avg_quotes_per_rfq: number | null;
    rfqs_without_quotes: number;
    avg_hours_to_first_quote: number | null;
    avg_hours_to_award: number | null;
    award_rate_pct: number | null;
    completion_rate_pct: number | null;
  };
  verification_mix: Record<string, number>;
  top_suppliers: { company_id: string; name: string; verification: number; quotes: number; won: number; win_rate_pct: number | null; gmv_baisa: number }[];
  pending_deletions: number;
}

export function useAdminStats(days: number) {
  return useQuery({
    queryKey: ['admin-stats', days],
    queryFn: async () => unwrap(await supabase.rpc('admin_stats', { p_days: days })) as AdminStats,
  });
}

/* --------------------------- admin: control ----------------------------- */

/** Everything below is re-checked server-side and written to the audit log. */
function useAdminMutation<TInput, TResult>(fn: (i: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ['companies', 'admin-overview', 'admin-stats', 'admin-profiles', 'audit', 'rfqs', 'orders', 'quotes']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export interface AdminProfile extends Profile {
  company: Pick<Company, 'id' | 'name' | 'kind'> | null;
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () =>
      unwrap(
        await supabase.from('profiles').select('*, company:companies(id, name, kind)').order('created_at', { ascending: false }).limit(500),
      ) as AdminProfile[],
  });
}

export function useAdminUpdateCompany() {
  return useAdminMutation(async (v: { companyId: string; name?: string; crNumber?: string; city?: string; categories?: string[] }) =>
    unwrap(
      await supabase.rpc('admin_update_company', {
        p_company_id: v.companyId, p_name: v.name ?? undefined, p_cr_number: v.crNumber ?? undefined,
        p_city: v.city ?? undefined, p_categories: v.categories ?? undefined,
      }),
    ) as Company,
  );
}

export function useAdminSetRole() {
  return useAdminMutation(async (v: { userId: string; role: Role; reason: string }) =>
    unwrap(await supabase.rpc('admin_set_role', { p_user_id: v.userId, p_role: v.role, p_reason: v.reason })) as Profile,
  );
}

export function useAdminForceRfqStatus() {
  return useAdminMutation(async (v: { rfqId: string; status: RfqStatus; reason: string }) =>
    unwrap(await supabase.rpc('admin_force_rfq_status', { p_rfq_id: v.rfqId, p_status: v.status, p_reason: v.reason })) as Rfq,
  );
}

export function useAdminForceOrderStatus() {
  return useAdminMutation(async (v: { orderId: string; status: OrderStatus; reason: string }) =>
    unwrap(await supabase.rpc('admin_force_order_status', { p_order_id: v.orderId, p_status: v.status, p_reason: v.reason })) as Order,
  );
}

export type AdminEntity = 'company' | 'rfq' | 'quote';

export function useAdminSoftDelete() {
  return useAdminMutation(async (v: { entity: AdminEntity; id: string; reason: string }) =>
    unwrap(await supabase.rpc('admin_soft_delete', { p_entity: v.entity, p_id: v.id, p_reason: v.reason })) as null,
  );
}

export function useAdminRestore() {
  return useAdminMutation(async (v: { entity: AdminEntity; id: string }) =>
    unwrap(await supabase.rpc('admin_restore', { p_entity: v.entity, p_id: v.id })) as null,
  );
}

/** Permanent. Refused by the server for a company that carries orders. */
export function useAdminPurgeCompany() {
  return useAdminMutation(async (v: { companyId: string; reason: string }) =>
    unwrap(await supabase.rpc('admin_purge_company', { p_company_id: v.companyId, p_reason: v.reason })) as {
      name: string; rfqs: number; quotes: number; users_detached: number;
    },
  );
}

export function useAdminAnonymizeProfile() {
  return useAdminMutation(async (v: { userId: string; reason: string }) =>
    unwrap(await supabase.rpc('admin_anonymize_profile', { p_user_id: v.userId, p_reason: v.reason })) as Profile,
  );
}

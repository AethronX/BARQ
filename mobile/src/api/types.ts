/** Row shapes returned by the API (mirrors supabase/migrations). */
export type Role = 'buyer' | 'supplier' | 'admin';
export type RfqStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'QUOTES_RECEIVED' | 'EVALUATION' | 'AWARDED' | 'CLOSED' | 'CANCELLED';
export type QuoteStatus = 'SUBMITTED' | 'WITHDRAWN' | 'AWARDED' | 'NOT_SELECTED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type PaymentTerms = 'ADVANCE_100' | 'ADVANCE_50' | 'ADVANCE_30' | 'NET_30' | 'NET_60';
export type Category = 'c_hvac' | 'c_pipes' | 'c_elec' | 'c_safety';
export type Unit = 'u_pcs' | 'u_box' | 'u_m' | 'u_ton';
export type Location = 'l_seeb' | 'l_bawshar' | 'l_muttrah' | 'l_amerat' | 'l_qurayyat' | 'l_muscat' | 'l_rusayl' | 'l_ghala';

export const CATEGORIES: Category[] = ['c_hvac', 'c_pipes', 'c_elec', 'c_safety'];
export const UNITS: Unit[] = ['u_pcs', 'u_box', 'u_m', 'u_ton'];
export const LOCATIONS: Location[] = ['l_seeb', 'l_bawshar', 'l_muttrah', 'l_amerat', 'l_qurayyat', 'l_muscat', 'l_rusayl', 'l_ghala'];
export const PAYMENT_TERMS: PaymentTerms[] = ['NET_60', 'NET_30', 'ADVANCE_30', 'ADVANCE_50', 'ADVANCE_100'];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: Role;
  company_id: string | null;
  deletion_requested_at: string | null;
}

export interface Company {
  id: string;
  kind: Role;
  name: string;
  cr_number: string | null;
  city: string | null;
  categories: Category[];
  verification: 0 | 1 | 2 | 3;
  created_at: string;
}

export interface Rfq {
  id: string;
  number: number;
  buyer_company_id: string;
  title: string;
  category: Category;
  quantity: number;
  unit: Unit;
  spec: string;
  location: Location;
  required_by: string;
  status: RfqStatus;
  closes_at: string;
  created_at: string;
}

/** What a supplier sees about an RFQ: no buyer identity until award. */
export interface SupplierRfq {
  id: string;
  number: number;
  title: string;
  category: Category;
  quantity: number;
  unit: Unit;
  spec: string;
  location: Location;
  required_by: string;
  closes_at: string;
  status: RfqStatus;
  created_at: string;
  buyer_verification: number;
  my_quote_id: string | null;
  my_quote_status: QuoteStatus | null;
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_company_id: string;
  unit_price_baisa: number;
  total_baisa: number;
  min_days: number;
  max_days: number;
  warranty_months: number;
  payment_terms: PaymentTerms;
  notes: string | null;
  valid_until: string | null;
  status: QuoteStatus;
  version: number;
  updated_at: string;
}

export interface Order {
  id: string;
  number: number;
  rfq_id: string;
  quote_id: string;
  buyer_company_id: string;
  supplier_company_id: string;
  total_baisa: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: number;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  kind: string;
  params: Record<string, string | number | null>;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

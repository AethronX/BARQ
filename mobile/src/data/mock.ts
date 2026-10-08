/**
 * MOCK DATA — every company, price, rating and review count here is FICTIONAL.
 * No partnership or integration with any real company exists. The UI shows a
 * permanent "demo data" banner while this module is the data source.
 */
import { omrToBaisa, type Baisa } from '../domain/money';
import type { VerificationLevel } from '../domain/score';

export const IS_MOCK = true;

export type Localized = { ar: string; en: string };
export type CategoryKey = 'c_hvac' | 'c_pipes' | 'c_elec' | 'c_safety';
export type UnitKey = 'u_pcs' | 'u_box' | 'u_m' | 'u_ton';
export type LocationKey = 'l_seeb' | 'l_ruwi' | 'l_bawshar' | 'l_mawaleh';

export interface LogoSpec {
  kind: 'wave' | 'letter' | 'ship' | 'globe';
  letter?: string;
  color?: string;
}

export interface Supplier {
  id: string;
  name: Localized;
  logo: LogoSpec;
  verification: VerificationLevel;
  rating: number;
  reviews: number;
  years: number;
  minDays: number;
  maxDays: number;
  warrantyMonths: number;
  terms: Localized;
  termsScore: number;
  onTimeRate: number;
  /** Mock pricing multiplier against a category base price. */
  priceFactor: number;
}

export const SUPPLIERS: readonly Supplier[] = [
  { id: 's1', name: { ar: 'نسيم عُمان للتبريد', en: 'Naseem Oman Cooling' }, logo: { kind: 'wave' }, verification: 3, rating: 4.8, reviews: 124, years: 5, minDays: 2, maxDays: 3, warrantyMonths: 24, terms: { ar: 'دفع خلال 30 يوماً', en: 'Net 30' }, termsScore: 0.85, onTimeRate: 96, priceFactor: 1.0323 },
  { id: 's2', name: { ar: 'الوادي للتوريدات', en: 'Al Wadi Supplies' }, logo: { kind: 'letter', letter: 'W', color: '#14213D' }, verification: 2, rating: 4.6, reviews: 98, years: 10, minDays: 4, maxDays: 6, warrantyMonths: 12, terms: { ar: '50% مقدماً', en: '50% advance' }, termsScore: 0.5, onTimeRate: 91, priceFactor: 1 },
  { id: 's3', name: { ar: 'مجان للتقنية', en: 'Majan Technical' }, logo: { kind: 'letter', letter: 'M', color: '#EA580C' }, verification: 3, rating: 4.5, reviews: 76, years: 7, minDays: 5, maxDays: 7, warrantyMonths: 36, terms: { ar: 'دفع خلال 60 يوماً', en: 'Net 60' }, termsScore: 1, onTimeRate: 93, priceFactor: 1.1089 },
  { id: 's4', name: { ar: 'الصفوة للحلول', en: 'Safwa Solutions' }, logo: { kind: 'letter', letter: 'S', color: '#1D4ED8' }, verification: 1, rating: 4.3, reviews: 54, years: 5, minDays: 7, maxDays: 10, warrantyMonths: 12, terms: { ar: '30% مقدماً', en: '30% advance' }, termsScore: 0.6, onTimeRate: 88, priceFactor: 1.1653 },
  { id: 's5', name: { ar: 'الأفق للتجارة', en: 'Ufuq Trading' }, logo: { kind: 'letter', letter: 'U', color: '#64748B' }, verification: 0, rating: 3.9, reviews: 12, years: 1, minDays: 10, maxDays: 14, warrantyMonths: 6, terms: { ar: '100% مقدماً', en: '100% advance' }, termsScore: 0.2, onTimeRate: 79, priceFactor: 0.9798 },
];

/** Mock base unit price per category in OMR. */
export const CATEGORY_BASE_OMR: Record<CategoryKey, number> = { c_hvac: 248, c_pipes: 12.5, c_elec: 35, c_safety: 9 };

export type CarrierFeature = 'ins' | 'track' | 'support' | 'pod' | 'cod';

export interface Carrier {
  id: string;
  name: Localized;
  tagline: Localized;
  logo: LogoSpec;
  price: Baisa;
  etaKey: 'eta_today' | 'eta_12' | 'eta_23';
  etaHours: number;
  rating: number;
  reviews: number;
  distanceKm: number;
  features: CarrierFeature[];
}

export const CARRIERS: readonly Carrier[] = [
  { id: 'p1', name: { ar: 'ساري للشحن', en: 'Sari Logistics' }, tagline: { ar: 'توصيل موثوق داخل مسقط', en: 'Reliable delivery in Muscat' }, logo: { kind: 'letter', letter: 'S', color: '#0E7490' }, price: omrToBaisa(12.5), etaKey: 'eta_today', etaHours: 24, rating: 4.8, reviews: 210, distanceKm: 6, features: ['ins', 'track', 'support'] },
  { id: 'p2', name: { ar: 'درب للتوصيل', en: 'Darb Delivery' }, tagline: { ar: 'حلول توصيل متكاملة', en: 'End-to-end delivery' }, logo: { kind: 'letter', letter: 'D', color: '#7C3AED' }, price: omrToBaisa(14.8), etaKey: 'eta_12', etaHours: 48, rating: 4.5, reviews: 89, distanceKm: 11, features: ['track', 'pod', 'cod'] },
  { id: 'p3', name: { ar: 'رمال للنقل', en: 'Rimal Transport' }, tagline: { ar: 'نقل آمن في جميع أنحاء عُمان', en: 'Safe transport across Oman' }, logo: { kind: 'letter', letter: 'R', color: '#B45309' }, price: omrToBaisa(16.2), etaKey: 'eta_12', etaHours: 48, rating: 4.3, reviews: 64, distanceKm: 4, features: ['ins', 'pod', 'support'] },
  { id: 'p4', name: { ar: 'مسار السريع', en: 'Masar Express' }, tagline: { ar: 'خدمات لوجستية للشركات', en: 'Business logistics services' }, logo: { kind: 'letter', letter: 'M', color: '#BE123C' }, price: omrToBaisa(18.9), etaKey: 'eta_23', etaHours: 72, rating: 4.2, reviews: 51, distanceKm: 15, features: ['ins', 'track'] },
];

export interface Forwarder {
  id: string;
  name: Localized;
  tagline: Localized;
  logo: LogoSpec;
  price: Baisa;
  minDays: number;
  maxDays: number;
  rating: number;
}

export const FORWARDERS: readonly Forwarder[] = [
  { id: 'f1', name: { ar: 'موج للشحن الدولي', en: 'Mawj Freight' }, tagline: { ar: 'شحن دولي بحري وبري', en: 'International sea & land freight' }, logo: { kind: 'ship' }, price: omrToBaisa(1850), minDays: 18, maxDays: 22, rating: 4.9 },
  { id: 'f2', name: { ar: 'سفينة الشرق', en: 'Safina East' }, tagline: { ar: 'حلول شحن عالمية', en: 'Global freight solutions' }, logo: { kind: 'letter', letter: 'F', color: '#1D4ED8' }, price: omrToBaisa(1980), minDays: 20, maxDays: 25, rating: 4.6 },
  { id: 'f3', name: { ar: 'طريق الحرير للشحن', en: 'Silk Route Cargo' }, tagline: { ar: 'توصيل آمن في الوقت المحدد', en: 'Safe, on-time delivery' }, logo: { kind: 'globe' }, price: omrToBaisa(2150), minDays: 25, maxDays: 30, rating: 4.3 },
  { id: 'f4', name: { ar: 'نجم البحار', en: 'Najm Seas' }, tagline: { ar: 'خبرة تزيد عن 10 سنوات', en: 'Over 10 years of experience' }, logo: { kind: 'letter', letter: 'N', color: '#0F766E' }, price: omrToBaisa(2320), minDays: 28, maxDays: 34, rating: 4.2 },
];

export interface SeedRfq {
  id: string;
  title: Localized;
  category: CategoryKey;
  sector: Localized;
  quantity: number;
  unit: UnitKey;
  closesInMs: number;
  quoteCount: number;
}

const H = 3_600_000;
export const SEED_RFQS: readonly SeedRfq[] = [
  { id: '0147', title: { ar: 'مكيفات سبليت 5 طن', en: '5-ton split A/C units' }, category: 'c_hvac', sector: { ar: 'المشاريع', en: 'Projects' }, quantity: 10, unit: 'u_pcs', closesInMs: 2 * H + 14 * 60_000 + 36_000, quoteCount: 5 },
  { id: '0146', title: { ar: 'مواد أنابيب الصلب', en: 'Steel pipe materials' }, category: 'c_pipes', sector: { ar: 'الإنشاءات', en: 'Construction' }, quantity: 400, unit: 'u_m', closesInMs: 8 * 24 * H + 6 * H + 32 * 60_000, quoteCount: 5 },
  { id: '0145', title: { ar: 'معدات السلامة الشخصية', en: 'Personal safety equipment' }, category: 'c_safety', sector: { ar: 'التشغيل والصيانة', en: 'Operations & maintenance' }, quantity: 200, unit: 'u_pcs', closesInMs: 2 * 24 * H + 14 * H + 20 * 60_000, quoteCount: 3 },
];

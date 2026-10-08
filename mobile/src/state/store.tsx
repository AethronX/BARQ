/**
 * In-memory app state for the prototype. This is the seam where a real API
 * client will plug in: screens call the actions below and never mutate state.
 * Every create action is idempotent (keyed) so a double tap or a retried
 * request can never produce two RFQs or two orders.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { omrToBaisa, type Baisa } from '../domain/money';
import { scoreQuotes, type ScoreResult, type VerificationLevel } from '../domain/score';
import {
  ORDER_TRANSITIONS,
  nextShipmentStatus,
  transition,
  type OrderStatus,
  type ShipmentStatus,
} from '../domain/stateMachines';
import {
  CARRIERS,
  CATEGORY_BASE_OMR,
  SEED_RFQS,
  SUPPLIERS,
  type CategoryKey,
  type Localized,
  type LocationKey,
  type LogoSpec,
  type UnitKey,
} from '../data/mock';
import type { RfqDraft } from '../domain/validation';

export interface Rfq {
  id: string;
  title: Localized;
  category: CategoryKey;
  sector: Localized;
  quantity: number;
  unit: UnitKey;
  closesAt: number;
  location: LocationKey | null;
  requiredBy: string | null;
}

export interface Quote extends ScoreResult {
  id: string;
  rfqId: string;
  supplierId: string;
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
  unitPrice: Baisa;
  total: Baisa;
}

export interface Delivery {
  kind: 'supplier' | 'carrier';
  name: Localized;
  eta: Localized;
}

export interface Order {
  id: string;
  rfqId: string;
  quote: Quote;
  status: OrderStatus;
  times: Partial<Record<OrderStatus, number>>;
  location: LocationKey;
  delivery: Delivery | null;
  shipment: { status: ShipmentStatus; times: Partial<Record<ShipmentStatus, number>> } | null;
}

export type NotifKind = 'quote' | 'deadline' | 'check' | 'ship' | 'rfq' | 'order';
/** Messages are stored as i18n keys + params so they follow the language switch. */
export interface Notif {
  id: string;
  kind: NotifKind;
  key: 'n_quote' | 'n_deadline' | 'n_upd' | 'n_pub' | 'n_sel' | 'n_order' | 'n_ship' | 'n_deliv';
  params: Record<string, string | Localized>;
  sub: string;
  at: number;
}

interface State {
  rfqs: Rfq[];
  quotes: Record<string, Quote[]>;
  pending: Record<string, boolean>;
  order: Order | null;
  notifs: Notif[];
  unread: number;
  usedKeys: string[];
}

type Action =
  | { type: 'rfq/created'; rfq: Rfq; key: string }
  | { type: 'quote/arrived'; rfqId: string; quote: Omit<Quote, keyof ScoreResult> }
  | { type: 'quote/done'; rfqId: string }
  | { type: 'order/created'; order: Order; key: string }
  | { type: 'order/delivery'; delivery: Delivery }
  | { type: 'shipment/advance' }
  | { type: 'notif/push'; notif: Notif }
  | { type: 'notif/read' }
  | { type: 'reset'; state: State };

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function baseQuote(rfq: Pick<Rfq, 'id' | 'category' | 'quantity'>, s: (typeof SUPPLIERS)[number]): Omit<Quote, keyof ScoreResult> {
  const base = omrToBaisa(CATEGORY_BASE_OMR[rfq.category]);
  const unitPrice = Math.round((base * s.priceFactor) / 50) * 50;
  return {
    id: `${rfq.id}-${s.id}`, rfqId: rfq.id, supplierId: s.id, name: s.name, logo: s.logo, verification: s.verification,
    rating: s.rating, reviews: s.reviews, years: s.years, minDays: s.minDays, maxDays: s.maxDays, warrantyMonths: s.warrantyMonths,
    terms: s.terms, termsScore: s.termsScore, onTimeRate: s.onTimeRate, unitPrice, total: unitPrice * rfq.quantity,
  };
}

const rescore = (qs: Omit<Quote, keyof ScoreResult>[]): Quote[] =>
  scoreQuotes(qs.map((q) => ({ ...q, maxDays: q.maxDays }))) as Quote[];

const strip = (q: Quote): Omit<Quote, keyof ScoreResult> => {
  const { score: _s, factors: _f, ...rest } = q;
  return rest;
};

function initialState(): State {
  const now = Date.now();
  const rfqs: Rfq[] = SEED_RFQS.map((r) => ({
    id: r.id, title: r.title, category: r.category, sector: r.sector, quantity: r.quantity, unit: r.unit,
    closesAt: now + r.closesInMs, location: null, requiredBy: null,
  }));
  const quotes: Record<string, Quote[]> = {};
  SEED_RFQS.forEach((r, i) => {
    quotes[r.id] = rescore(SUPPLIERS.slice(0, r.quoteCount).map((s) => baseQuote(rfqs[i], s)));
  });
  const day = 86_400_000;
  const at = (daysAgo: number, hh: number, mm: number) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  };
  return {
    rfqs,
    quotes,
    pending: {},
    order: null,
    unread: 0,
    usedKeys: [],
    notifs: [
      { id: 'n1', kind: 'quote', key: 'n_quote', params: { s: SUPPLIERS[1].name }, sub: 'RFQ #BARQ-2025-0147', at: at(0, 9, 24) },
      { id: 'n2', kind: 'deadline', key: 'n_deadline', params: { p: SEED_RFQS[2].title }, sub: 'RFQ #BARQ-2025-0145', at: at(1, 16, 17) },
      { id: 'n3', kind: 'check', key: 'n_upd', params: { s: SUPPLIERS[2].name }, sub: 'RFQ #BARQ-2025-0146', at: at(1, 11, 3) },
    ],
  };
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'rfq/created':
      if (state.usedKeys.includes(a.key)) return state; // idempotent
      return {
        ...state,
        usedKeys: [...state.usedKeys, a.key],
        rfqs: [a.rfq, ...state.rfqs],
        quotes: { ...state.quotes, [a.rfq.id]: [] },
        pending: { ...state.pending, [a.rfq.id]: true },
      };
    case 'quote/arrived': {
      const current = (state.quotes[a.rfqId] ?? []).map(strip);
      if (current.some((q) => q.id === a.quote.id)) return state;
      return { ...state, quotes: { ...state.quotes, [a.rfqId]: rescore([...current, a.quote]) } };
    }
    case 'quote/done':
      return { ...state, pending: { ...state.pending, [a.rfqId]: false } };
    case 'order/created':
      // One award per demo session; never a second order.
      if (state.order || state.usedKeys.includes(a.key)) return state;
      return { ...state, order: a.order, usedKeys: [...state.usedKeys, a.key] };
    case 'order/delivery': {
      const o = state.order;
      if (!o || o.delivery) return state;
      const now = Date.now();
      const processing = transition(ORDER_TRANSITIONS, o.status, 'PROCESSING');
      const ready = transition(ORDER_TRANSITIONS, processing, 'READY_FOR_SHIPMENT');
      return {
        ...state,
        order: {
          ...o,
          status: ready,
          times: { ...o.times, PROCESSING: now, READY_FOR_SHIPMENT: now },
          delivery: a.delivery,
          shipment: { status: 'CREATED', times: { CREATED: now } },
        },
      };
    }
    case 'shipment/advance': {
      const o = state.order;
      if (!o?.shipment) return state;
      const next = nextShipmentStatus(o.shipment.status);
      if (!next) return state;
      const now = Date.now();
      let status = o.status;
      const times = { ...o.times };
      if (next === 'PICKED_UP') { status = transition(ORDER_TRANSITIONS, status, 'SHIPPED'); times.SHIPPED = now; }
      if (next === 'DELIVERED') { status = transition(ORDER_TRANSITIONS, status, 'DELIVERED'); times.DELIVERED = now; }
      return {
        ...state,
        order: { ...o, status, times, shipment: { status: next, times: { ...o.shipment.times, [next]: now } } },
      };
    }
    case 'notif/push':
      return { ...state, notifs: [a.notif, ...state.notifs], unread: state.unread + 1 };
    case 'notif/read':
      return state.unread ? { ...state, unread: 0 } : state;
    case 'reset':
      return a.state;
  }
}

interface Store extends State {
  createRfq: (draft: RfqDraft, key: string) => Promise<string>;
  acceptQuote: (quote: Quote, key: string) => Promise<Order>;
  chooseSupplierDelivery: () => void;
  chooseCarrier: (carrierId: string) => void;
  advanceShipment: () => void;
  markAlertsRead: () => void;
  ensureDemoOrder: (withShipment: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Simulated network latency so loading and double-tap states are real. */
const LATENCY_MS = 800;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inflight = useRef(new Map<string, Promise<unknown>>());

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const push = useCallback((n: Omit<Notif, 'id' | 'at'>) => {
    dispatch({ type: 'notif/push', notif: { ...n, id: uid('n'), at: Date.now() } });
  }, []);

  /** Runs `fn` once per key; concurrent or repeated calls share the first result. */
  const once = useCallback(<T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    const existing = inflight.current.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const p = fn();
    inflight.current.set(key, p);
    return p;
  }, []);

  const createRfq = useCallback<Store['createRfq']>(
    (draft, key) =>
      once(key, async () => {
        await wait(LATENCY_MS);
        const n = stateRef.current.rfqs.length;
        const id = String(148 + n - SEED_RFQS.length).padStart(4, '0');
        const category = draft.category as CategoryKey;
        const rfq: Rfq = {
          id,
          title: { ar: draft.product.trim(), en: draft.product.trim() },
          category,
          sector: { ar: 'المشاريع', en: 'Projects' },
          quantity: Number(draft.quantity),
          unit: draft.unit as UnitKey,
          closesAt: Date.now() + 72 * 3_600_000,
          location: draft.location as LocationKey,
          requiredBy: draft.requiredBy,
        };
        dispatch({ type: 'rfq/created', rfq, key });
        push({ kind: 'rfq', key: 'n_pub', params: { p: `#BARQ-2025-${id}` }, sub: draft.product.trim() });
        // Mock suppliers respond one by one.
        SUPPLIERS.forEach((s, i) => {
          timers.current.push(
            setTimeout(() => {
              dispatch({ type: 'quote/arrived', rfqId: id, quote: baseQuote(rfq, s) });
              push({ kind: 'quote', key: 'n_quote', params: { s: s.name }, sub: `RFQ #BARQ-2025-${id}` });
              if (i === SUPPLIERS.length - 1) dispatch({ type: 'quote/done', rfqId: id });
            }, 1200 + i * 900),
          );
        });
        return id;
      }),
    [once, push],
  );

  const buildOrder = (quote: Quote): Order => {
    const rfq = stateRef.current.rfqs.find((r) => r.id === quote.rfqId);
    const now = Date.now();
    return {
      id: String(now).slice(-6),
      rfqId: quote.rfqId,
      quote,
      status: transition(ORDER_TRANSITIONS, 'PENDING', 'CONFIRMED'),
      times: { CONFIRMED: now },
      location: rfq?.location ?? 'l_seeb',
      delivery: null,
      shipment: null,
    };
  };

  const acceptQuote = useCallback<Store['acceptQuote']>(
    (quote, key) =>
      once(key, async () => {
        const existing = stateRef.current.order;
        if (existing) return existing;
        await wait(LATENCY_MS);
        const order = buildOrder(quote);
        dispatch({ type: 'order/created', order, key });
        push({ kind: 'check', key: 'n_sel', params: { s: quote.name }, sub: `RFQ #BARQ-2025-${quote.rfqId}` });
        push({ kind: 'order', key: 'n_order', params: { o: `ORD-${order.id}` }, sub: '' });
        return order;
      }),
    [once, push],
  );

  const chooseSupplierDelivery = useCallback(() => {
    const o = stateRef.current.order;
    if (!o || o.delivery) return;
    const eta = { ar: `${o.quote.minDays} - ${o.quote.maxDays} أيام`, en: `${o.quote.minDays} - ${o.quote.maxDays} days` };
    dispatch({ type: 'order/delivery', delivery: { kind: 'supplier', name: o.quote.name, eta } });
    push({ kind: 'ship', key: 'n_deliv', params: { c: o.quote.name }, sub: `ORD-${o.id}` });
  }, [push]);

  const chooseCarrier = useCallback(
    (carrierId: string) => {
      const o = stateRef.current.order;
      const c = CARRIERS.find((x) => x.id === carrierId);
      if (!o || o.delivery || !c) return;
      const etaText = { eta_today: { ar: 'اليوم - غداً', en: 'Today - tomorrow' }, eta_12: { ar: '1 - 2 يوم', en: '1 - 2 days' }, eta_23: { ar: '2 - 3 أيام', en: '2 - 3 days' } }[c.etaKey];
      dispatch({ type: 'order/delivery', delivery: { kind: 'carrier', name: c.name, eta: etaText } });
      push({ kind: 'ship', key: 'n_deliv', params: { c: c.name }, sub: `ORD-${o.id}` });
    },
    [push],
  );

  const advanceShipment = useCallback(() => {
    const o = stateRef.current.order;
    const next = o?.shipment ? nextShipmentStatus(o.shipment.status) : null;
    if (!o || !next) return;
    dispatch({ type: 'shipment/advance' });
    push({ kind: 'ship', key: 'n_ship', params: { x: `ss_${next}` }, sub: `SHP-${o.id}` });
  }, [push]);

  /** Lets a stakeholder jump straight to later screens during a demo. */
  const ensureDemoOrder = useCallback((withShipment: boolean) => {
    let o = stateRef.current.order;
    if (!o) {
      const best = [...(stateRef.current.quotes['0147'] ?? [])].sort((a, b) => b.score - a.score)[0];
      if (!best) return;
      o = buildOrder(best);
      dispatch({ type: 'order/created', order: o, key: 'demo-order' });
    }
    if (withShipment && !o.delivery) {
      const c = CARRIERS[0];
      dispatch({ type: 'order/delivery', delivery: { kind: 'carrier', name: c.name, eta: { ar: 'اليوم - غداً', en: 'Today - tomorrow' } } });
    }
  }, []);

  const markAlertsRead = useCallback(() => dispatch({ type: 'notif/read' }), []);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    inflight.current.clear();
    dispatch({ type: 'reset', state: initialState() });
  }, []);

  const value = useMemo<Store>(
    () => ({ ...state, createRfq, acceptQuote, chooseSupplierDelivery, chooseCarrier, advanceShipment, markAlertsRead, ensureDemoOrder, reset }),
    [state, createRfq, acceptQuote, chooseSupplierDelivery, chooseCarrier, advanceShipment, markAlertsRead, ensureDemoOrder, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

export const newKey = (prefix: string) => uid(prefix);

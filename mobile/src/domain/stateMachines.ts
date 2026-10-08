/**
 * Critical workflows are explicit state machines. Any transition not listed
 * here is rejected. The real backend must enforce the same tables; the client
 * copy exists only so the UI never offers an impossible action.
 */

export type RfqStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'OPEN'
  | 'QUOTES_RECEIVED'
  | 'EVALUATION'
  | 'AWARDED'
  | 'CLOSED'
  | 'CANCELLED';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ShipmentStatus = 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

type Table<S extends string> = Readonly<Record<S, readonly S[]>>;

export const RFQ_TRANSITIONS: Table<RfqStatus> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['OPEN', 'CANCELLED'],
  OPEN: ['QUOTES_RECEIVED', 'CANCELLED'],
  QUOTES_RECEIVED: ['EVALUATION', 'CANCELLED'],
  EVALUATION: ['AWARDED', 'CANCELLED'],
  AWARDED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export const ORDER_TRANSITIONS: Table<OrderStatus> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_SHIPMENT'],
  READY_FOR_SHIPMENT: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const SHIPMENT_STEPS: readonly ShipmentStatus[] = [
  'CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Order steps shown on the order timeline (cancellation is shown separately). */
export const ORDER_TIMELINE: readonly OrderStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_SHIPMENT',
  'SHIPPED',
  'DELIVERED',
];

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid transition ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition<S extends string>(table: Table<S>, from: S, to: S): boolean {
  return table[from].includes(to);
}

export function transition<S extends string>(table: Table<S>, from: S, to: S): S {
  if (!canTransition(table, from, to)) throw new InvalidTransitionError(from, to);
  return to;
}

export function nextShipmentStatus(current: ShipmentStatus): ShipmentStatus | null {
  const i = SHIPMENT_STEPS.indexOf(current);
  return i >= 0 && i < SHIPMENT_STEPS.length - 1 ? SHIPMENT_STEPS[i + 1] : null;
}

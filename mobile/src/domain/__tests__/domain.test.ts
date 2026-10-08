import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, moneyParts, omrToBaisa } from '../money.ts';
import { scoreQuotes } from '../score.ts';
import { ORDER_TRANSITIONS, RFQ_TRANSITIONS, InvalidTransitionError, nextShipmentStatus, transition } from '../stateMachines.ts';
import { validateRfq } from '../validation.ts';

test('money keeps three baisa digits and compact hides whole-rial zeros', () => {
  assert.equal(omrToBaisa(12.5), 12500);
  assert.equal(formatMoney(omrToBaisa(2560)), 'OMR 2,560.000');
  assert.equal(formatMoney(omrToBaisa(2560), true), 'OMR 2,560');
  assert.equal(formatMoney(omrToBaisa(12.5), true), 'OMR 12.500');
  assert.throws(() => moneyParts(1.5));
});

test('order state machine rejects skipped and backward transitions', () => {
  assert.equal(transition(ORDER_TRANSITIONS, 'PENDING', 'CONFIRMED'), 'CONFIRMED');
  assert.throws(() => transition(ORDER_TRANSITIONS, 'PENDING', 'SHIPPED'), InvalidTransitionError);
  assert.throws(() => transition(ORDER_TRANSITIONS, 'DELIVERED', 'PROCESSING'), InvalidTransitionError);
  assert.throws(() => transition(RFQ_TRANSITIONS, 'CLOSED', 'OPEN'), InvalidTransitionError);
  assert.equal(nextShipmentStatus('IN_TRANSIT'), 'OUT_FOR_DELIVERY');
  assert.equal(nextShipmentStatus('DELIVERED'), null);
});

test('cheapest unverified quote does not automatically win the BARQ Score', () => {
  const base = { rating: 4.5, onTimeRate: 90, termsScore: 0.5 };
  const [verified, cheap] = scoreQuotes([
    { ...base, unitPrice: 256000, maxDays: 3, verification: 3 as const, rating: 4.8, onTimeRate: 96, termsScore: 0.85 },
    { ...base, unitPrice: 243000, maxDays: 14, verification: 0 as const, rating: 3.9, onTimeRate: 79, termsScore: 0.2 },
  ]);
  assert.ok(verified.score > cheap.score);
  assert.equal(cheap.factors.price, 1);
  assert.ok(verified.score <= 100 && cheap.score >= 0);
});

test('missing history is excluded, not invented', () => {
  const [q] = scoreQuotes([{ unitPrice: 1000, maxDays: 3, rating: null, onTimeRate: null, verification: 3 as const, termsScore: 1 }]);
  assert.equal(q.factors.rating, null);
  assert.equal(q.factors.reliability, null);
  assert.equal(q.score, 100); // all remaining factors are maximal
});

test('RFQ validation reports each invalid field', () => {
  const today = new Date(2026, 9, 8);
  const ok = { product: 'Split AC 5 ton', category: 'c_hvac', quantity: '10', unit: 'u_pcs', spec: 'Inverter, R410A, 3 year warranty', location: 'l_seeb', requiredBy: '2026-10-15' };
  assert.deepEqual(validateRfq(ok, today), {});
  const bad = validateRfq({ ...ok, product: 'ab', quantity: '0', spec: 'short', location: '', requiredBy: '2026-10-08' }, today);
  assert.deepEqual(Object.keys(bad).sort(), ['location', 'product', 'quantity', 'requiredBy', 'spec']);
  assert.equal(validateRfq({ ...ok, requiredBy: '2026-02-30' }, today).requiredBy, 'e_date');
});

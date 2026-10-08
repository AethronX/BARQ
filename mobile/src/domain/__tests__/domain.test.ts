import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, moneyParts, omrToBaisa } from '../money.ts';
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

test('RFQ validation reports each invalid field', () => {
  const today = new Date(2026, 9, 8);
  const ok = { product: 'Split AC 5 ton', category: 'c_hvac', quantity: '10', unit: 'u_pcs', spec: 'Inverter, R410A, 3 year warranty', location: 'l_seeb', requiredBy: '2026-10-15' };
  assert.deepEqual(validateRfq(ok, today), {});
  const bad = validateRfq({ ...ok, product: 'ab', quantity: '0', spec: 'short', location: '', requiredBy: '2026-10-08' }, today);
  assert.deepEqual(Object.keys(bad).sort(), ['location', 'product', 'quantity', 'requiredBy', 'spec']);
  assert.equal(validateRfq({ ...ok, requiredBy: '2026-02-30' }, today).requiredBy, 'e_date');
});

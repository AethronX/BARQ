import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partitionOffers, totalCost, type NormalizedOffer } from '../offer.ts';
import { SCORE_WEIGHTS, scoreOffers, supplierQuality, type ScoreWeights } from '../score.ts';
import { recommend } from '../recommend.ts';

const NOW = Date.UTC(2026, 9, 8);

function offer(p: Partial<NormalizedOffer> & { quoteId: string }): NormalizedOffer {
  return {
    supplier: { id: `s-${p.quoteId}`, name: `Supplier ${p.quoteId}`, verification: 2, completedOrders: 4 },
    quantity: 10,
    unitPrice: 10_000,
    goodsTotal: 100_000,
    deliveryCost: null,
    fees: 0,
    discount: 0,
    minDays: 3,
    maxDays: 5,
    warrantyMonths: 12,
    paymentTerms: 'NET_30',
    rating: null,
    onTimeRate: null,
    validUntil: null,
    status: 'SUBMITTED',
    ...p,
  };
}

test('no offers: no recommendation, no savings, no crash', () => {
  const r = recommend([]);
  assert.equal(r.best, null);
  assert.equal(r.savings, null);
  assert.deepEqual(r.ranked, []);
});

test('a single offer is not a comparison', () => {
  const r = recommend([offer({ quoteId: 'a' })]);
  assert.equal(r.best, null);
  assert.equal(r.savings, null);
  assert.deepEqual(r.labels, {});
  assert.equal(r.ranked.length, 1);
});

test('identical offers tie-break deterministically and yield exactly one best', () => {
  const r = recommend([offer({ quoteId: 'b' }), offer({ quoteId: 'a' })]);
  assert.equal(r.best?.offer.quoteId, 'a'); // id breaks a full tie
  const bests = Object.values(r.labels).flat().filter((l) => l === 'best');
  assert.equal(bests.length, 1);
  // Re-ordering the input must not change the outcome.
  assert.equal(recommend([offer({ quoteId: 'a' }), offer({ quoteId: 'b' })]).best?.offer.quoteId, 'a');
});

test('the cheapest offer does not win when the supplier is unverified and new', () => {
  const r = recommend([
    offer({ quoteId: 'good', goodsTotal: 256_000, unitPrice: 25_600, maxDays: 3, supplier: { id: 's1', name: 'Verified', verification: 3, completedOrders: 9 }, paymentTerms: 'NET_60' }),
    offer({ quoteId: 'cheap', goodsTotal: 243_000, unitPrice: 24_300, maxDays: 14, supplier: { id: 's2', name: 'New', verification: 0, completedOrders: 0 }, paymentTerms: 'ADVANCE_100' }),
  ]);
  assert.equal(r.best?.offer.quoteId, 'good');
  assert.deepEqual(r.labels['cheap'], ['cheapest']);
  // and the recommendation says it is not the cheapest, it says why it still wins
  assert.ok(!r.best!.reasons.some((x) => x.kind === 'cheapest'));
});

test('an unknown delivery cost is never replaced by zero', () => {
  const a = offer({ quoteId: 'a', deliveryCost: 5_000 });
  const b = offer({ quoteId: 'b', deliveryCost: null, goodsTotal: 101_000 });
  assert.equal(totalCost(b).complete, false);
  assert.equal(totalCost(b).delivery, null);
  assert.equal(totalCost(b).total, 101_000);
  const r = recommend([a, b]);
  assert.equal(r.basis, 'goods_only'); // one unknown ⇒ everyone compared on goods
  assert.equal(r.ranked.find((o) => o.quoteId === 'a')!.comparableCost, 100_000);
  assert.equal(r.savings?.complete, false);
});

test('all delivery costs known: comparison runs on the full total', () => {
  const r = recommend([offer({ quoteId: 'a', deliveryCost: 5_000 }), offer({ quoteId: 'b', deliveryCost: 20_000 })]);
  assert.equal(r.basis, 'total');
  assert.equal(r.best?.offer.quoteId, 'a');
  assert.equal(r.savings?.vsHighest, 15_000);
});

test('missing ratings are excluded, weights re-normalised, and no star label appears', () => {
  const { offers } = scoreOffers([offer({ quoteId: 'a' }), offer({ quoteId: 'b' })]);
  assert.equal(offers[0].factors.rating, null);
  assert.equal(Math.round(offers[0].weightApplied * 100), 90);
  const r = recommend([offer({ quoteId: 'a' }), offer({ quoteId: 'b', goodsTotal: 120_000 })]);
  assert.ok(!Object.values(r.labels).flat().includes('top_rated'));
});

test('an expired offer leaves the comparison', () => {
  const { live, setAside } = partitionOffers(
    [offer({ quoteId: 'a' }), offer({ quoteId: 'old', validUntil: new Date(NOW - 86_400_000).toISOString() })],
    NOW,
  );
  assert.deepEqual(live.map((o) => o.quoteId), ['a']);
  assert.deepEqual(setAside, [{ offer: setAside[0].offer, why: 'expired' }]);
});

test('a withdrawn offer leaves the comparison', () => {
  const { live, setAside } = partitionOffers([offer({ quoteId: 'a' }), offer({ quoteId: 'w', status: 'WITHDRAWN' })], NOW);
  assert.deepEqual(live.map((o) => o.quoteId), ['a']);
  assert.equal(setAside[0].why, 'withdrawn');
});

test('the best offer is never also labelled cheapest or fastest', () => {
  const r = recommend([
    offer({ quoteId: 'a', goodsTotal: 90_000, maxDays: 2 }),
    offer({ quoteId: 'b', goodsTotal: 150_000, maxDays: 9 }),
  ]);
  assert.equal(r.best?.offer.quoteId, 'a');
  assert.deepEqual(r.labels['a'], ['best']);
  assert.equal(r.labels['b'], undefined);
  // the facts still surface, as reasons on the winning card
  assert.ok(r.best!.reasons.some((x) => x.kind === 'cheapest'));
  assert.ok(r.best!.reasons.some((x) => x.kind === 'fastest'));
});

test('savings are never negative and reflect this request only', () => {
  const r = recommend([offer({ quoteId: 'a', goodsTotal: 100_000 }), offer({ quoteId: 'b', goodsTotal: 100_000 })]);
  assert.ok(r.savings!.vsHighest >= 0);
  assert.ok(r.savings!.vsAverage >= 0);
  assert.equal(r.savings!.offers, 2);
});

test('scores stay inside 0–100 for extreme inputs', () => {
  const { offers } = scoreOffers([
    offer({ quoteId: 'tiny', goodsTotal: 1, unitPrice: 1, maxDays: 1 }),
    offer({ quoteId: 'huge', goodsTotal: 1_000_000_000, unitPrice: 100_000_000, maxDays: 999 }),
  ]);
  for (const o of offers) assert.ok(o.score >= 0 && o.score <= 100, `${o.quoteId}=${o.score}`);
});

test('a reason list is never empty: without data it says so', () => {
  // Two offers tied on everything, unverified, no history, worst terms:
  // nothing factual can be claimed about the winner.
  const base = { supplier: { id: 's', name: 'N', verification: 0 as const, completedOrders: 0 }, paymentTerms: 'ADVANCE_100' as const, warrantyMonths: 0 };
  const r = recommend([offer({ quoteId: 'a', ...base, goodsTotal: 100_000, maxDays: 9 }), offer({ quoteId: 'b', ...base, goodsTotal: 90_000, maxDays: 5 })]);
  const loser = r.ranked[1];
  assert.ok(loser);
  const solo = recommend([offer({ quoteId: 'a', ...base, goodsTotal: 100_000, maxDays: 9 }), offer({ quoteId: 'b', ...base, goodsTotal: 100_000, maxDays: 9 })]);
  assert.deepEqual(solo.best!.reasons.map((x) => x.kind).sort(), ['cheapest', 'fastest']);
});

test('weights are configurable and actually change the ranking', () => {
  const offers = [
    offer({ quoteId: 'cheap', goodsTotal: 80_000, maxDays: 20, supplier: { id: '1', name: 'c', verification: 0, completedOrders: 0 } }),
    offer({ quoteId: 'quality', goodsTotal: 120_000, maxDays: 4, supplier: { id: '2', name: 'q', verification: 3, completedOrders: 10 } }),
  ];
  assert.equal(recommend(offers, SCORE_WEIGHTS).best?.offer.quoteId, 'quality');
  const priceOnly: ScoreWeights = { price: 1, supplierQuality: 0, deliverySpeed: 0, rating: 0, paymentTerms: 0 };
  assert.equal(recommend(offers, priceOnly).best?.offer.quoteId, 'cheap');
});

test('supplier quality counts verification and real history, capped', () => {
  assert.equal(supplierQuality(0, 0), 0);
  assert.equal(supplierQuality(3, 10), 1);
  assert.equal(supplierQuality(3, 1000), 1); // cap, not an ever-growing advantage
  assert.ok(supplierQuality(3, 0) > supplierQuality(0, 10) - 0.0001);
});

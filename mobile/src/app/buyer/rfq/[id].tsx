import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAwardQuote, useCancelRfq, useOrders, useRfq, useRfqQuotes, type QuoteWithSupplier } from '../../../api/queries';
import { toOffers } from '../../../api/offers';
import { errorKey } from '../../../api/errors';
import { partitionOffers } from '../../../domain/offer';
import { SCORE_WEIGHTS, type ScoreFactor, type ScoredOffer, type VerificationLevel } from '../../../domain/score';
import { recommend, type OfferLabel } from '../../../domain/recommend';
import { formatMoney } from '../../../domain/money';
import { track } from '../../../analytics/events';
import {
  AppHeader, Btn, Card, Checkbox, CompanyLogo, DayRange, EmptyState, KV, Money, Note, Num, Pill, Screen, Sheet, T, Thumb, Tile, Toast, VerificationPill,
} from '../../../ui/components';
import { Icon, type IconName } from '../../../ui/Icon';
import { Meta, OfferCard, ScoreLink } from '../../../ui/OfferCard';
import { DealBadges, dealBadge } from '../../../ui/DealBadge';
import { TotalCostRow } from '../../../ui/TotalCostRow';
import { WhyBest } from '../../../ui/WhyBest';
import { formatDate, rfqRef } from '../../../ui/format';
import { useNow } from '../../../ui/RfqRow';
import { QueryState } from '../../../ui/states';
import { colors } from '../../../ui/theme';

type Sort = 'score' | 'price' | 'fast';
const SORTS: { key: Sort; icon: IconName; label: StringKey }[] = [
  { key: 'score', icon: 'star', label: 's_score' },
  { key: 'price', icon: 'tag', label: 's_price' },
  { key: 'fast', icon: 'bolt', label: 's_fast' },
];
const FACTORS: { k: ScoreFactor; label: StringKey }[] = [
  { k: 'price', label: 'fx_price' },
  { k: 'supplierQuality', label: 'fx_supplierQuality' },
  { k: 'deliverySpeed', label: 'fx_deliverySpeed' },
  { k: 'rating', label: 'fx_rating' },
  { k: 'paymentTerms', label: 'fx_paymentTerms' },
];

type Row = ScoredOffer & { quote: QuoteWithSupplier; labels: OfferLabel[] };
type SheetState =
  | { kind: 'score'; q: Row }
  | { kind: 'accept'; q: Row; ok: boolean }
  | { kind: 'compare' }
  | { kind: 'cancel' }
  | null;

export default function BuyerRfqDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const i18n = useI18n();
  const { t } = i18n;
  const rfq = useRfq(id);
  const qq = useRfqQuotes(id);
  const orders = useOrders();
  const award = useAwardQuote();
  const cancel = useCancelRfq();
  const now = useNow(30_000);
  const [sort, setSort] = useState<Sort>('score');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<string | null>(null);

  const r = rfq.data;

  /** Withdrawn and expired offers are set aside, not silently dropped. */
  const engine = useMemo(() => {
    const quotes = qq.data?.quotes ?? [];
    const byId = new Map(quotes.map((q) => [q.id, q]));
    const offers = toOffers({ quotes, stats: qq.data?.stats ?? {}, quantity: r?.quantity ?? 0 });
    const { live, setAside } = partitionOffers(offers, now);
    const rec = recommend(live);
    const rows: Row[] = rec.ranked.map((o) => ({ ...o, quote: byId.get(o.quoteId)!, labels: rec.labels[o.quoteId] ?? [] }));
    return { rec, rows, setAside: setAside.map((s) => ({ ...s, quote: byId.get(s.offer.quoteId)! })) };
  }, [qq.data, r?.quantity, now]);

  const { rec, rows, setAside } = engine;

  // One event per request view, not per re-render.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!rows.length || seen.current === id) return;
    seen.current = id;
    track({ name: 'deal_engine_viewed', rfqId: id, offers: rows.length, basis: rec.basis });
    if (rec.best) track({ name: 'deal_recommendation_shown', rfqId: id, offers: rows.length, reasons: rec.best.reasons.length, scoreVersion: rec.best.offer.version });
  }, [id, rows.length, rec]);

  const list = useMemo(() => {
    const by: Record<Sort, (a: Row, b: Row) => number> = {
      score: () => 0, // already ranked by the engine, deterministically
      price: (a, b) => a.comparableCost - b.comparableCost,
      fast: (a, b) => a.maxDays - b.maxDays || a.minDays - b.minDays,
    };
    return sort === 'score' ? rows : [...rows].sort(by[sort]);
  }, [rows, sort]);

  const order = orders.data?.find((o) => o.rfq_id === id);
  const canAward = !!r && ['OPEN', 'QUOTES_RECEIVED', 'EVALUATION'].includes(r.status);
  const canCancel = !!r && !['AWARDED', 'CLOSED', 'CANCELLED'].includes(r.status);
  const closed = r ? new Date(r.closes_at).getTime() <= now : false;
  const minDays = rows.length ? Math.min(...rows.map((q) => q.maxDays)) : 0;
  const minCost = rows.length ? Math.min(...rows.map((q) => q.comparableCost)) : 0;

  const doAward = (q: Row) => {
    track({
      name: 'deal_award_confirmed',
      rfqId: id,
      quoteId: q.quoteId,
      followedRecommendation: rec.best?.offer.quoteId === q.quoteId,
      scoreVersion: q.version,
    });
    award.mutate(q.quoteId, {
      onSuccess: (o) => {
        setSheet(null);
        router.replace({ pathname: '/order/[id]', params: { id: o.id } });
      },
      onError: (e) => {
        setSheet(null);
        setToast(t(errorKey(e)));
      },
    });
  };

  return (
    <>
      <Screen
        header={<AppHeader title={t('rfq_details')} back />}
        onRefresh={() => { rfq.refetch(); qq.refetch(); }}
        refreshing={rfq.isRefetching || qq.isRefetching}
        footer={
          rows.length > 1 ? (
            <View style={st.dock}>
              <Btn
                label={t('compare')}
                variant="navy"
                icon="bolt"
                small
                onPress={() => { track({ name: 'deal_comparison_opened', rfqId: id, offers: rows.length }); setSheet({ kind: 'compare' }); }}
              />
            </View>
          ) : null
        }
      >
        <QueryState isPending={rfq.isPending} error={rfq.error} onRetry={() => rfq.refetch()}>
          {r ? (
            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Thumb category={r.category} size={60} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontSize: 17, fontWeight: '700' }}>{r.title}</T>
                  <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }}>{rfqRef(r.number)}</Num>
                  <Pill label={t(`rs_${r.status}` as StringKey)} tone={r.status === 'AWARDED' ? 'green' : r.status === 'CANCELLED' ? 'red' : closed ? 'grey' : 'amber'} />
                </View>
              </View>
              <KV
                items={[
                  { label: t('quantity'), value: `${r.quantity} ${t(r.unit as StringKey)}` },
                  { label: t('location'), value: t(r.location as StringKey) },
                  { label: t('required_by'), value: formatDate(i18n, r.required_by) },
                  { label: t('closes_in'), value: closed ? t('closed') : formatDate(i18n, r.closes_at) },
                ]}
              />
              <View style={{ gap: 4 }}>
                <T style={{ fontSize: 12, color: colors.muted }}>{t('spec')}</T>
                <T>{r.spec}</T>
              </View>
              {order ? <Btn label={t('view_order')} variant="navy" small icon="list" chevron onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} /> : null}
              {canCancel ? (
                <Pressable onPress={() => setSheet({ kind: 'cancel' })} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
                  <T style={{ color: colors.red, fontWeight: '600', fontSize: 13 }}>{t('cancel_rfq')}</T>
                </Pressable>
              ) : null}
            </Card>
          ) : null}
        </QueryState>

        <T style={{ fontSize: 16, fontWeight: '700' }}>{t('offers')} <Num style={{ color: colors.muted }}>{`(${rows.length})`}</Num></T>

        {rec.savings ? <SavingsCard savings={rec.savings} /> : null}

        {rows.length > 1 ? (
          <View style={st.seg}>
            {SORTS.map((x) => {
              const on = sort === x.key;
              return (
                <Pressable key={x.key} onPress={() => setSort(x.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.segBtn, on && { backgroundColor: colors.amber }]}>
                  <T style={{ fontWeight: '700', fontSize: 12.5, color: on ? colors.amberInk : colors.ink }} numberOfLines={1}>{t(x.label)}</T>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {rows.length === 1 ? <Note text={t('bde_single')} /> : null}
        {rows.length ? <Note text={t('no_auto')} /> : null}

        <QueryState isPending={qq.isPending} error={qq.error} onRetry={() => qq.refetch()} isEmpty={!rows.length} empty={<EmptyState icon="chat" title={t('no_quotes')} body={t('no_quotes_s')} />}>
          {list.map((q) => {
            const isBest = rec.best?.offer.quoteId === q.quoteId;
            const badge = q.labels[0];
            return (
              <OfferCard
                key={q.quoteId}
                name={q.supplier.name}
                verified={q.supplier.verification >= 2}
                subtitle={t(`v${q.supplier.verification}` as StringKey)}
                ribbon={isBest ? { label: t('bde_best'), icon: 'trophy' } : badge ? { label: t(dealBadge(badge).key), icon: dealBadge(badge).icon } : undefined}
                extra={!isBest && q.labels.length > 1 ? <DealBadges labels={q.labels.slice(1)} /> : null}
                tiles={
                  <>
                    <Tile label={t('eta')} icon="truck" badge={rows.length > 1 && q.maxDays === minDays ? <Pill label={t('fast_badge')} tone="green" icon="bolt" /> : null}>
                      <DayRange min={q.minDays} max={q.maxDays} />
                    </Tile>
                    <Tile label={t('bde_total_cost')} badge={rows.length > 1 && q.comparableCost === minCost ? <Pill label={t('lowest')} tone="green" icon="tag" /> : null}>
                      <Money amount={q.total.total} compact />
                    </Tile>
                  </>
                }
                meta={
                  <View style={{ gap: 6 }}>
                    {!q.total.complete ? <Meta icon="warn" text={t('bde_no_delivery')} /> : null}
                    <Meta icon="shield" text={q.supplier.completedOrders > 0 ? t('completed_n', { n: q.supplier.completedOrders }) : t('new_supplier')} />
                    <Meta icon="doc" text={`${t(`pt_${q.paymentTerms}` as StringKey)} · ${t('warranty')} ${q.warrantyMonths} ${t('mo')}`} />
                    {q.quote.version > 1 ? <Meta icon="refresh" text={t('version_n', { n: q.quote.version })} /> : null}
                    {q.quote.notes ? <Meta icon="chat" text={q.quote.notes} /> : null}
                    <ScoreLink score={q.score} onPress={() => { track({ name: 'deal_score_opened', rfqId: id, quoteId: q.quoteId }); setSheet({ kind: 'score', q }); }} />
                    {isBest && rec.best ? <WhyBest reasons={rec.best.reasons} /> : null}
                  </View>
                }
                acceptLabel={q.status === 'AWARDED' ? t('qs_AWARDED') : t('accept')}
                acceptDisabled={!canAward}
                onAccept={() => {
                  if (!isBest) track({ name: 'deal_alternative_selected', rfqId: id, quoteId: q.quoteId, label: q.labels[0] ?? 'none' });
                  setSheet({ kind: 'accept', q, ok: false });
                }}
              />
            );
          })}
        </QueryState>

        {setAside.length ? (
          <Card style={{ padding: 14, gap: 10 }}>
            <T style={{ fontWeight: '700', fontSize: 13.5 }}>{t('bde_set_aside')}</T>
            {setAside.map((s) => (
              <View key={s.offer.quoteId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T style={{ fontSize: 13, flex: 1 }}>{s.offer.supplier.name}</T>
                <Pill label={t(s.why === 'expired' ? 'bde_expired' : 'bde_withdrawn')} tone="grey" />
              </View>
            ))}
          </Card>
        ) : null}
      </Screen>

      {sheet?.kind === 'score' ? (
        <Sheet visible onClose={() => setSheet(null)} title={`${t('score_lbl')} · ${sheet.q.score}`}>
          <T style={{ fontWeight: '700' }}>{sheet.q.supplier.name}</T>
          {FACTORS.map(({ k, label }) => {
            const v = sheet.q.factors[k];
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T style={{ width: 96, fontSize: 12.5 }}>{t(label)} <Num style={{ fontSize: 10.5, color: colors.muted }}>{`${Math.round(SCORE_WEIGHTS[k] * 100)}%`}</Num></T>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8ECF2', overflow: 'hidden' }}>
                  {v != null ? <View style={{ width: `${Math.round(v * 100)}%`, height: '100%', backgroundColor: colors.amber }} /> : null}
                </View>
                {v != null ? <Num style={{ width: 52, fontSize: 12.5 }}>{Math.round(v * 100)}</Num> : <T style={{ width: 52, fontSize: 11, color: colors.muted }}>{t('no_data')}</T>}
              </View>
            );
          })}
          <Note text={t('bde_weight_applied', { p: Math.round(sheet.q.weightApplied * 100) })} />
          <T style={{ fontWeight: '700', fontSize: 13 }}>{t('bde_breakdown')}</T>
          <TotalCostRow cost={sheet.q.total} />
          <Note text={t('sc_formula')} />
          <Btn label={t('close')} variant="ghost" small onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'accept' ? (
        <Sheet visible onClose={() => !award.isPending && setSheet(null)} title={t('cf_title')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CompanyLogo name={sheet.q.supplier.name} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <T style={{ fontWeight: '700' }}>{sheet.q.supplier.name}</T>
              <VerificationPill level={sheet.q.supplier.verification as VerificationLevel} />
            </View>
          </View>
          <TotalCostRow cost={sheet.q.total} />
          <KV
            items={[
              { label: t('unit'), value: <Money amount={sheet.q.unitPrice} size={16} /> },
              { label: t('eta'), value: <DayRange min={sheet.q.minDays} max={sheet.q.maxDays} size={14} /> },
              { label: t('terms'), value: t(`pt_${sheet.q.paymentTerms}` as StringKey) },
              { label: t('warranty'), value: `${sheet.q.warrantyMonths} ${t('mo')}` },
              { label: t('valid_until'), value: sheet.q.validUntil ? formatDate(i18n, sheet.q.validUntil) : '—' },
            ]}
          />
          <Checkbox checked={sheet.ok} onChange={(ok) => setSheet({ ...sheet, ok })} label={t('cf_chk')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={16} color={colors.muted} />
            <T style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{t('cf_once')}</T>
          </View>
          <Btn label={t('cf_go')} icon="check" disabled={!sheet.ok} loading={award.isPending} onPress={() => doAward(sheet.q)} />
          <Btn label={t('cancel')} variant="ghost" small disabled={award.isPending} onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'cancel' && r ? (
        <Sheet visible onClose={() => setSheet(null)} title={t('cancel_rfq')}>
          <T>{t('cancel_rfq_q')}</T>
          <Btn
            label={t('cancel_rfq_go')}
            variant="navy"
            loading={cancel.isPending}
            onPress={() => cancel.mutate(r.id, { onSettled: () => setSheet(null), onError: (e) => setToast(t(errorKey(e))) })}
          />
          <Btn label={t('cancel')} variant="ghost" small onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'compare' ? (
        <Sheet visible onClose={() => setSheet(null)} title={t('compare')}>
          <CompareTable quotes={list} />
          <Note text={t('no_auto')} />
          <Btn label={t('close')} variant="ghost" small onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

/** Differences inside this request only. No market or historical baselines exist. */
function SavingsCard({ savings }: { savings: NonNullable<ReturnType<typeof recommend>['savings']> }) {
  const { t } = useI18n();
  if (savings.vsHighest <= 0 && savings.vsAverage <= 0) return null;
  return (
    <Card style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="dollar" size={18} color={colors.green} />
        <T style={{ fontWeight: '700', fontSize: 14 }}>{t('bde_savings')}</T>
      </View>
      {savings.vsHighest > 0 ? <T style={{ fontSize: 12.5, color: colors.ink2 }}>{t('bde_vs_highest', { a: formatMoney(savings.vsHighest, true) })}</T> : null}
      {savings.vsAverage > 0 ? <T style={{ fontSize: 12.5, color: colors.ink2 }}>{t('bde_vs_avg', { a: formatMoney(savings.vsAverage, true) })}</T> : null}
      <Note text={savings.complete ? t('bde_savings_note') : `${t('bde_savings_note')} ${t('bde_partial')}`} />
    </Card>
  );
}

function CompareTable({ quotes }: { quotes: Row[] }) {
  const { t } = useI18n();
  const best = {
    score: Math.max(...quotes.map((q) => q.score)),
    total: Math.min(...quotes.map((q) => q.comparableCost)),
    days: Math.min(...quotes.map((q) => q.maxDays)),
    warranty: Math.max(...quotes.map((q) => q.warrantyMonths)),
  };
  const good = (b: boolean) => (b ? { color: colors.green, fontWeight: '700' as const } : null);
  const rows: { label: string; cell: (q: Row) => React.ReactNode }[] = [
    { label: t('score_lbl'), cell: (q) => <Num style={[{ fontSize: 13 }, good(q.score === best.score)]}>{q.score}</Num> },
    { label: t('bde_total_cost'), cell: (q) => <Money amount={q.total.total} size={13} color={q.comparableCost === best.total ? colors.green : colors.ink} /> },
    { label: t('bde_delivery'), cell: (q) => (q.total.delivery == null ? <T style={{ fontSize: 11.5, color: colors.amberText }}>{t('bde_no_delivery')}</T> : <Money amount={q.total.delivery} size={13} />) },
    { label: t('unit'), cell: (q) => <Money amount={q.unitPrice} size={13} /> },
    { label: t('eta'), cell: (q) => <DayRange min={q.minDays} max={q.maxDays} size={13} /> },
    { label: t('warranty'), cell: (q) => <T style={[{ fontSize: 13 }, good(q.warrantyMonths === best.warranty)]}>{`${q.warrantyMonths} ${t('mo')}`}</T> },
    { label: t('terms'), cell: (q) => <T style={{ fontSize: 12.5 }}>{t(`pt_${q.paymentTerms}` as StringKey)}</T> },
    { label: t('verification'), cell: (q) => <VerificationPill level={q.supplier.verification as VerificationLevel} /> },
  ];
  return (
    <ScrollView horizontal contentContainerStyle={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14 }}>
      <View>
        <View style={[st.tr, { backgroundColor: colors.tile }]}>
          <View style={st.th} />
          {quotes.map((q) => (
            <View key={q.quoteId} style={st.td}><T style={{ fontWeight: '700', fontSize: 12.5 }}>{q.supplier.name}</T></View>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={row.label} style={[st.tr, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={st.th}><T style={{ fontSize: 12, color: colors.muted }}>{row.label}</T></View>
            {quotes.map((q) => <View key={q.quoteId} style={st.td}>{row.cell(q)}</View>)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dock: { padding: 12, paddingBottom: 24, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  th: { width: 110, padding: 10, justifyContent: 'center' },
  td: { width: 140, padding: 10, justifyContent: 'center' },
});

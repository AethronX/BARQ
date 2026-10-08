import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { TERMS_SCORE } from '../../../api/types';
import { useAwardQuote, useCancelRfq, useOrders, useRfq, useRfqQuotes, type QuoteWithSupplier } from '../../../api/queries';
import { errorKey } from '../../../api/errors';
import { SCORE_WEIGHTS, scoreQuotes, type ScoreFactor, type ScoreResult, type VerificationLevel } from '../../../domain/score';
import {
  AppHeader, Btn, Card, Checkbox, CompanyLogo, DayRange, EmptyState, KV, Money, Note, Num, Pill, Screen, Sheet, T, Thumb, Tile, Toast, VerificationPill,
} from '../../../ui/components';
import { Icon, type IconName } from '../../../ui/Icon';
import { Meta, OfferCard, ScoreLink } from '../../../ui/OfferCard';
import { formatDate, rfqRef } from '../../../ui/format';
import { useNow } from '../../../ui/RfqRow';
import { QueryState } from '../../../ui/states';
import { colors } from '../../../ui/theme';

type Sort = 'score' | 'price' | 'fast';
const SORTS: { key: Sort; icon: IconName; label: StringKey; ribbon: StringKey }[] = [
  { key: 'score', icon: 'star', label: 's_score', ribbon: 'rib_score' },
  { key: 'price', icon: 'tag', label: 's_price', ribbon: 'rib_price' },
  { key: 'fast', icon: 'bolt', label: 's_fast', ribbon: 'rib_fast' },
];
const FACTORS: { k: ScoreFactor; label: StringKey }[] = [
  { k: 'price', label: 'fx_price' }, { k: 'speed', label: 'fx_speed' }, { k: 'rating', label: 'fx_rating' },
  { k: 'reliability', label: 'fx_reliability' }, { k: 'verification', label: 'fx_verification' }, { k: 'terms', label: 'fx_terms' },
];

type Scored = QuoteWithSupplier & ScoreResult & { completed: number };
type SheetState = { kind: 'score'; q: Scored } | { kind: 'accept'; q: Scored; ok: boolean } | { kind: 'compare' } | { kind: 'cancel' } | null;

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

  // Only live (submitted) quotes compete; withdrawn ones are hidden from comparison.
  const scored: Scored[] = useMemo(() => {
    const live = (qq.data?.quotes ?? []).filter((q) => q.status === 'SUBMITTED' || q.status === 'AWARDED');
    const stats = qq.data?.stats ?? {};
    return scoreQuotes(
      live.map((q) => ({
        ...q,
        unitPrice: q.unit_price_baisa,
        maxDays: q.max_days,
        rating: null, // no rating system yet: excluded, never invented
        onTimeRate: null, // needs delivery history; excluded until it exists
        verification: q.supplier.verification as VerificationLevel,
        termsScore: TERMS_SCORE[q.payment_terms],
        completed: stats[q.supplier_company_id]?.completed_orders ?? 0,
      })),
    );
  }, [qq.data]);

  const list = useMemo(() => {
    const by: Record<Sort, (a: Scored, b: Scored) => number> = {
      score: (a, b) => b.score - a.score,
      price: (a, b) => a.total_baisa - b.total_baisa,
      fast: (a, b) => a.max_days - b.max_days || a.min_days - b.min_days,
    };
    return [...scored].sort(by[sort]);
  }, [scored, sort]);

  const r = rfq.data;
  const order = orders.data?.find((o) => o.rfq_id === id);
  const canAward = !!r && ['OPEN', 'QUOTES_RECEIVED', 'EVALUATION'].includes(r.status);
  const canCancel = !!r && !['AWARDED', 'CLOSED', 'CANCELLED'].includes(r.status);
  const minTotal = scored.length ? Math.min(...scored.map((q) => q.total_baisa)) : 0;
  const minDays = scored.length ? Math.min(...scored.map((q) => q.max_days)) : 0;
  const sortCfg = SORTS.find((x) => x.key === sort)!;
  const closed = r ? new Date(r.closes_at).getTime() <= now : false;

  const doAward = (q: Scored) => {
    award.mutate(q.id, {
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
          scored.length > 1 ? (
            <View style={st.dock}>
              <Btn label={t('compare')} variant="navy" icon="bolt" small onPress={() => setSheet({ kind: 'compare' })} />
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

        <T style={{ fontSize: 16, fontWeight: '700' }}>{t('offers')} <Num style={{ color: colors.muted }}>{`(${scored.length})`}</Num></T>

        {scored.length > 1 ? (
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
        {scored.length ? <Note text={t('no_auto')} /> : null}

        <QueryState isPending={qq.isPending} error={qq.error} onRetry={() => qq.refetch()} isEmpty={!scored.length} empty={<EmptyState icon="chat" title={t('no_quotes')} body={t('no_quotes_s')} />}>
          {list.map((q, i) => (
            <OfferCard
              key={q.id}
              name={q.supplier.name}
              verified={q.supplier.verification >= 2}
              subtitle={t(`v${q.supplier.verification}` as StringKey)}
              ribbon={i === 0 && list.length > 1 ? { label: t(sortCfg.ribbon), icon: sortCfg.icon } : undefined}
              tiles={
                <>
                  <Tile label={t('eta')} icon="truck" badge={list.length > 1 && q.max_days === minDays ? <Pill label={t('fast_badge')} tone="green" icon="bolt" /> : null}>
                    <DayRange min={q.min_days} max={q.max_days} />
                  </Tile>
                  <Tile label={t('total')} badge={list.length > 1 && q.total_baisa === minTotal ? <Pill label={t('lowest')} tone="green" icon="tag" /> : null}>
                    <Money amount={q.total_baisa} compact />
                  </Tile>
                </>
              }
              meta={
                <View style={{ gap: 6 }}>
                  <Meta icon="shield" text={q.completed > 0 ? t('completed_n', { n: q.completed }) : t('new_supplier')} />
                  <Meta icon="doc" text={`${t(`pt_${q.payment_terms}` as StringKey)} · ${t('warranty')} ${q.warranty_months} ${t('mo')}`} />
                  {q.version > 1 ? <Meta icon="refresh" text={t('version_n', { n: q.version })} /> : null}
                  {q.notes ? <Meta icon="chat" text={q.notes} /> : null}
                  <ScoreLink score={q.score} onPress={() => setSheet({ kind: 'score', q })} />
                </View>
              }
              acceptLabel={q.status === 'AWARDED' ? t('qs_AWARDED') : t('accept')}
              acceptDisabled={!canAward}
              onAccept={() => setSheet({ kind: 'accept', q, ok: false })}
            />
          ))}
        </QueryState>
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
          <KV
            items={[
              { label: t('total'), value: <Money amount={sheet.q.total_baisa} size={16} /> },
              { label: t('unit'), value: <Money amount={sheet.q.unit_price_baisa} size={16} /> },
              { label: t('eta'), value: <DayRange min={sheet.q.min_days} max={sheet.q.max_days} size={14} /> },
              { label: t('terms'), value: t(`pt_${sheet.q.payment_terms}` as StringKey) },
              { label: t('warranty'), value: `${sheet.q.warranty_months} ${t('mo')}` },
              { label: t('valid_until'), value: sheet.q.valid_until ? formatDate(i18n, sheet.q.valid_until) : '—' },
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

function CompareTable({ quotes }: { quotes: Scored[] }) {
  const { t } = useI18n();
  const best = {
    score: Math.max(...quotes.map((q) => q.score)),
    total: Math.min(...quotes.map((q) => q.total_baisa)),
    days: Math.min(...quotes.map((q) => q.max_days)),
    warranty: Math.max(...quotes.map((q) => q.warranty_months)),
  };
  const good = (b: boolean) => (b ? { color: colors.green, fontWeight: '700' as const } : null);
  const rows: { label: string; cell: (q: Scored) => React.ReactNode }[] = [
    { label: t('score_lbl'), cell: (q) => <Num style={[{ fontSize: 13 }, good(q.score === best.score)]}>{q.score}</Num> },
    { label: t('total'), cell: (q) => <Money amount={q.total_baisa} size={13} color={q.total_baisa === best.total ? colors.green : colors.ink} /> },
    { label: t('unit'), cell: (q) => <Money amount={q.unit_price_baisa} size={13} /> },
    { label: t('eta'), cell: (q) => <DayRange min={q.min_days} max={q.max_days} size={13} /> },
    { label: t('warranty'), cell: (q) => <T style={[{ fontSize: 13 }, good(q.warranty_months === best.warranty)]}>{`${q.warranty_months} ${t('mo')}`}</T> },
    { label: t('terms'), cell: (q) => <T style={{ fontSize: 12.5 }}>{t(`pt_${q.payment_terms}` as StringKey)}</T> },
    { label: t('verification'), cell: (q) => <VerificationPill level={q.supplier.verification as VerificationLevel} /> },
  ];
  return (
    <ScrollView horizontal contentContainerStyle={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14 }}>
      <View>
        <View style={[st.tr, { backgroundColor: colors.tile }]}>
          <View style={st.th} />
          {quotes.map((q) => (
            <View key={q.id} style={st.td}><T style={{ fontWeight: '700', fontSize: 12.5 }}>{q.supplier.name}</T></View>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={row.label} style={[st.tr, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={st.th}><T style={{ fontSize: 12, color: colors.muted }}>{row.label}</T></View>
            {quotes.map((q) => <View key={q.id} style={st.td}>{row.cell(q)}</View>)}
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

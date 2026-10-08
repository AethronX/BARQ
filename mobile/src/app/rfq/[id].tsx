import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { SCORE_WEIGHTS, type ScoreFactor } from '../../domain/score';
import { newKey, useStore, type Quote } from '../../state/store';
import {
  AppHeader, Btn, Checkbox, CompanyLogo, DayRange, EmptyState, HeaderButton, KV, Money, Note, Num, Pill, Screen, Sheet, T, Thumb, Tile, Toast, VerificationPill,
} from '../../ui/components';
import { Icon, type IconName } from '../../ui/Icon';
import { Meta, OfferCard, ScoreLink } from '../../ui/OfferCard';
import { colors } from '../../ui/theme';

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

type Filter = { verifiedOnly: boolean; maxDays: number };
type SheetState = { kind: 'filter'; draft: Filter } | { kind: 'score'; quote: Quote } | { kind: 'accept'; quote: Quote; ok: boolean } | { kind: 'compare' } | null;

export default function QuotesScreen() {
  const { id, sent } = useLocalSearchParams<{ id: string; sent?: string }>();
  const i18n = useI18n();
  const { t, L } = i18n;
  const store = useStore();
  const rfq = store.rfqs.find((r) => r.id === id);
  const all = store.quotes[id ?? ''] ?? [];
  const pending = !!store.pending[id ?? ''];
  const [sort, setSort] = useState<Sort>('score');
  const [filter, setFilter] = useState<Filter>({ verifiedOnly: false, maxDays: 0 });
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(sent ? t('toast_sent') : null);
  const acceptKey = useRef(newKey('award')).current;

  const list = useMemo(() => {
    let qs = [...all];
    if (filter.verifiedOnly) qs = qs.filter((q) => q.verification >= 2);
    if (filter.maxDays) qs = qs.filter((q) => q.maxDays <= filter.maxDays);
    const by: Record<Sort, (a: Quote, b: Quote) => number> = {
      score: (a, b) => b.score - a.score,
      price: (a, b) => a.total - b.total,
      fast: (a, b) => a.maxDays - b.maxDays || a.minDays - b.minDays,
    };
    return qs.sort(by[sort]);
  }, [all, filter, sort]);

  if (!rfq) {
    return (
      <Screen header={<AppHeader title={t('cmp_title')} back />}>
        <EmptyState icon="doc" title={t('none_match')} />
      </Screen>
    );
  }

  const minTotal = all.length ? Math.min(...all.map((q) => q.total)) : 0;
  const maxTotal = all.length ? Math.max(...all.map((q) => q.total)) : 0;
  const minDays = all.length ? Math.min(...all.map((q) => q.maxDays)) : 0;
  const fastest = all.length ? all.reduce((a, b) => (a.maxDays <= b.maxDays ? a : b)) : null;
  const filterOn = filter.verifiedOnly || filter.maxDays > 0;
  const sortCfg = SORTS.find((x) => x.key === sort)!;

  const accept = async (quote: Quote) => {
    if (busy) return;
    if (store.order) {
      setSheet(null);
      setToast(t('toast_has_order'));
      return;
    }
    setBusy(true);
    try {
      await store.acceptQuote(quote, acceptKey);
      setSheet(null);
      router.navigate('/orders');
    } finally {
      setBusy(false);
    }
  };

  const footer = all.length ? (
    <View style={st.dock}>
      <View style={st.dockStats}>
        <View style={st.dockStat}>
          <Icon name="doc" size={20} />
          <View>
            <T style={st.dockLbl}>{t('total_offers')}</T>
            <Num style={{ fontWeight: '700' }}>{all.length}</Num>
          </View>
        </View>
        {fastest ? (
          <View style={[st.dockStat, { borderStartWidth: 1, borderStartColor: colors.line }]}>
            <Icon name="timer" size={20} />
            <View>
              <T style={st.dockLbl}>{t('fastest_offer')}</T>
              <DayRange min={fastest.minDays} max={fastest.maxDays} size={13} />
            </View>
          </View>
        ) : null}
      </View>
      <Btn label={t('compare')} variant="navy" icon="bolt" small onPress={() => setSheet({ kind: 'compare' })} style={{ paddingHorizontal: 16 }} />
    </View>
  ) : null;

  return (
    <>
      <Screen
        header={<AppHeader title={t('cmp_title')} back action={<HeaderButton icon="sliders" label={t('filter')} onPress={() => setSheet({ kind: 'filter', draft: filter })} />} />}
        footer={footer}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Thumb category={rfq.category} size={64} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 18, fontWeight: '700' }}>{L(rfq.title)}</T>
            <Num style={{ fontSize: 12.5, color: colors.muted, alignSelf: 'flex-start' }}>{`RFQ #BARQ-2025-${rfq.id}`}</Num>
          </View>
          <View style={st.count}>
            <T style={{ fontSize: 11.5, color: colors.ink2 }}>{t('offers')}</T>
            <Num style={{ fontSize: 22, fontWeight: '700' }}>{all.length}</Num>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={st.seg}>
            {SORTS.map((x) => {
              const on = sort === x.key;
              return (
                <Pressable key={x.key} onPress={() => setSort(x.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.segBtn, on && { backgroundColor: colors.amber }]}>
                  <T style={{ fontWeight: '700', fontSize: 12.5, color: on ? colors.amberInk : colors.ink }} numberOfLines={1}>
                    {t(x.label)}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => setSheet({ kind: 'filter', draft: filter })} accessibilityRole="button" accessibilityLabel={t('filter')} style={st.filterBtn}>
            <Icon name="funnel" size={20} />
            {filterOn ? <View style={st.filterDot} /> : null}
          </Pressable>
        </View>

        <Note text={t('no_auto')} />

        {list.map((q, i) => {
          const savePct = maxTotal ? Math.round((1 - q.total / maxTotal) * 100) : 0;
          return (
            <OfferCard
              key={q.id}
              name={L(q.name)}
              logo={q.logo}
              verified={q.verification >= 2}
              subtitle={t(`v${q.verification}` as StringKey)}
              rating={q.rating}
              reviews={q.reviews}
              ribbon={i === 0 ? { label: t(sortCfg.ribbon), icon: sortCfg.icon } : undefined}
              tiles={
                <>
                  <Tile label={t('eta')} icon="truck" badge={q.maxDays === minDays ? <Pill label={t('fast_badge')} tone="green" icon="bolt" /> : null}>
                    <DayRange min={q.minDays} max={q.maxDays} />
                  </Tile>
                  <Tile
                    label={t('total')}
                    badge={q.total === minTotal ? <Pill label={t('lowest')} tone="green" icon="tag" /> : savePct >= 5 ? <Pill label={t('save', { p: savePct })} tone="green" icon="tag" /> : null}
                  >
                    <Money amount={q.total} compact />
                  </Tile>
                </>
              }
              meta={
                <View style={{ gap: 6 }}>
                  <Meta icon="shield" text={q.years <= 1 ? t('yr1') : t('yrs', { y: q.years })} />
                  <Meta icon="building" text={t('city_ok')} />
                  <ScoreLink score={q.score} onPress={() => setSheet({ kind: 'score', quote: q })} />
                </View>
              }
              acceptLabel={t('accept')}
              onAccept={() => (store.order ? setToast(t('toast_has_order')) : setSheet({ kind: 'accept', quote: q, ok: false }))}
            />
          );
        })}

        {all.length > 0 && list.length === 0 ? (
          <EmptyState icon="funnel" title={t('none_match')} action={<Btn label={t('reset')} variant="ghost" small onPress={() => setFilter({ verifiedOnly: false, maxDays: 0 })} style={{ paddingHorizontal: 20 }} />} />
        ) : null}
        {pending ? <Note text={t('waiting')} icon="clock" /> : null}
      </Screen>

      {sheet?.kind === 'filter' ? (
        <Sheet visible onClose={() => setSheet(null)} title={t('filter')}>
          <Checkbox checked={sheet.draft.verifiedOnly} onChange={(v) => setSheet({ ...sheet, draft: { ...sheet.draft, verifiedOnly: v } })} label={t('f_verified')} />
          <T style={{ fontWeight: '700' }}>{t('f_maxdays')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[0, 7, 10].map((v) => {
              const on = sheet.draft.maxDays === v;
              return (
                <Pressable key={v} onPress={() => setSheet({ ...sheet, draft: { ...sheet.draft, maxDays: v } })} style={[st.chip, on && { backgroundColor: colors.amber, borderColor: colors.amber }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <T style={{ fontWeight: '700', fontSize: 13 }}>{v ? t('within', { d: v }) : t('any')}</T>
                </Pressable>
              );
            })}
          </View>
          <Btn label={t('apply')} onPress={() => { setFilter(sheet.draft); setSheet(null); }} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'score' ? (
        <Sheet visible onClose={() => setSheet(null)} title={`${t('score_lbl')} · ${sheet.quote.score}`}>
          <T style={{ fontWeight: '700' }}>{L(sheet.quote.name)}</T>
          {FACTORS.map(({ k, label }) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T style={{ width: 92, fontSize: 12.5 }}>
                {t(label)} <Num style={{ fontSize: 10.5, color: colors.muted }}>{`${Math.round(SCORE_WEIGHTS[k] * 100)}%`}</Num>
              </T>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8ECF2', overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(sheet.quote.factors[k] * 100)}%`, height: '100%', backgroundColor: colors.amber }} />
              </View>
              <Num style={{ width: 30, fontSize: 12.5 }}>{Math.round(sheet.quote.factors[k] * 100)}</Num>
            </View>
          ))}
          <Note text={t('sc_formula')} />
          <Btn label={t('close')} variant="ghost" small onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'accept' ? (
        <Sheet visible onClose={() => !busy && setSheet(null)} title={t('cf_title')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CompanyLogo logo={sheet.quote.logo} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <T style={{ fontWeight: '700' }}>{L(sheet.quote.name)}</T>
              <VerificationPill level={sheet.quote.verification} />
            </View>
          </View>
          <KV
            items={[
              { label: t('total'), value: <Money amount={sheet.quote.total} size={16} /> },
              { label: t('unit'), value: <Money amount={sheet.quote.unitPrice} size={16} /> },
              { label: t('eta'), value: <DayRange min={sheet.quote.minDays} max={sheet.quote.maxDays} size={14} /> },
              { label: t('terms'), value: L(sheet.quote.terms) },
              { label: t('warranty'), value: `${sheet.quote.warrantyMonths} ${t('mo')}` },
              { label: t('score_lbl'), value: String(sheet.quote.score) },
            ]}
          />
          <Checkbox checked={sheet.ok} onChange={(ok) => setSheet({ ...sheet, ok })} label={t('cf_chk')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={16} color={colors.muted} />
            <T style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{t('cf_once')}</T>
          </View>
          <Btn label={t('cf_go')} icon="check" disabled={!sheet.ok} loading={busy} onPress={() => accept(sheet.quote)} />
          <Btn label={t('cancel')} variant="ghost" small disabled={busy} onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      {sheet?.kind === 'compare' ? (
        <Sheet visible onClose={() => setSheet(null)} title={t('compare')}>
          <CompareTable quotes={list.length ? list : all} />
          <Note text={t('no_auto')} />
          <Btn label={t('close')} variant="ghost" small onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

function CompareTable({ quotes }: { quotes: Quote[] }) {
  const { t, L } = useI18n();
  const best = {
    score: Math.max(...quotes.map((q) => q.score)),
    total: Math.min(...quotes.map((q) => q.total)),
    days: Math.min(...quotes.map((q) => q.maxDays)),
    rating: Math.max(...quotes.map((q) => q.rating)),
    onTime: Math.max(...quotes.map((q) => q.onTimeRate)),
    warranty: Math.max(...quotes.map((q) => q.warrantyMonths)),
  };
  const good = (b: boolean) => (b ? { color: colors.green, fontWeight: '700' as const } : null);
  const rows: { label: string; cell: (q: Quote) => React.ReactNode }[] = [
    { label: t('score_lbl'), cell: (q) => <Num style={[{ fontSize: 13 }, good(q.score === best.score)]}>{q.score}</Num> },
    { label: t('total'), cell: (q) => <Money amount={q.total} size={13} color={q.total === best.total ? colors.green : colors.ink} /> },
    { label: t('unit'), cell: (q) => <Money amount={q.unitPrice} size={13} /> },
    { label: t('eta'), cell: (q) => <DayRange min={q.minDays} max={q.maxDays} size={13} /> },
    { label: t('rating'), cell: (q) => <Num style={[{ fontSize: 13 }, good(q.rating === best.rating)]}>{`★ ${q.rating.toFixed(1)}`}</Num> },
    { label: t('ontime'), cell: (q) => <Num style={[{ fontSize: 13 }, good(q.onTimeRate === best.onTime)]}>{`${q.onTimeRate}%`}</Num> },
    { label: t('warranty'), cell: (q) => <T style={[{ fontSize: 13 }, good(q.warrantyMonths === best.warranty)]}>{`${q.warrantyMonths} ${t('mo')}`}</T> },
    { label: t('terms'), cell: (q) => <T style={{ fontSize: 12.5 }}>{L(q.terms)}</T> },
    { label: t('verification'), cell: (q) => <VerificationPill level={q.verification} /> },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14 }}>
      <View>
        <View style={[st.tr, { backgroundColor: colors.tile }]}>
          <View style={st.th} />
          {quotes.map((q) => (
            <View key={q.id} style={st.td}>
              <T style={{ fontWeight: '700', fontSize: 12.5 }}>{L(q.name)}</T>
            </View>
          ))}
        </View>
        {rows.map((r, i) => (
          <View key={r.label} style={[st.tr, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={st.th}>
              <T style={{ fontSize: 12, color: colors.muted }}>{r.label}</T>
            </View>
            {quotes.map((q) => (
              <View key={q.id} style={st.td}>
                {r.cell(q)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  count: { backgroundColor: '#E9F0FB', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  seg: { flex: 1, flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBtn: { width: 52, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 8, end: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', backgroundColor: colors.card },
  dock: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 24, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line },
  dockStats: { flex: 1, flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 6 },
  dockStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  dockLbl: { fontSize: 10.5, color: colors.muted },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  th: { width: 110, padding: 10, justifyContent: 'center' },
  td: { width: 140, padding: 10, justifyContent: 'center' },
});

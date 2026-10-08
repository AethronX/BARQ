import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAdminStats } from '../../../api/queries';
import { formatMoney } from '../../../domain/money';
import { Card, Money, Note, Num, Screen, SectionTitle, T } from '../../../ui/components';
import { BarChart, Donut, Funnel, Legend, RankBars, Stat } from '../../../ui/Charts';
import { QueryState } from '../../../ui/states';
import { RoleHeader } from '../../../screens/common';
import { colors } from '../../../ui/theme';

const WINDOWS = [7, 30, 90] as const;
const VERIF_COLORS = [colors.red, colors.ink2, colors.blue, colors.green];

export default function AdminStats() {
  const { t, locale } = useI18n();
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const q = useAdminStats(days);
  const s = q.data;

  const series = useMemo(
    () => (s?.series ?? []).map((d) => ({ label: d.day.slice(5), value: d.rfqs, quotes: d.quotes, orders: d.orders, gmv: d.gmv_baisa })),
    [s?.series],
  );
  const verifMix = useMemo(
    () => [0, 1, 2, 3].map((l) => ({ label: t(`v${l}` as StringKey), value: s?.verification_mix?.[String(l)] ?? 0, color: VERIF_COLORS[l] })),
    [s?.verification_mix, t],
  );

  return (
    <Screen header={<RoleHeader title={t('a_stats')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <View style={st.seg}>
        {WINDOWS.map((w) => {
          const on = days === w;
          return (
            <Pressable key={w} onPress={() => setDays(w)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.segBtn, on && { backgroundColor: colors.amber }]}>
              <T style={{ fontWeight: '700', fontSize: 12.5, color: on ? colors.amberInk : colors.ink }}>{t('a_last_days', { n: w })}</T>
            </Pressable>
          );
        })}
      </View>

      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()}>
        {s ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Stat label={t('a_gmv')} value={formatMoney(s.order_totals.gmv_baisa, true)} icon="dollar" tone="good" />
              <Stat label={t('a_orders_all')} value={s.order_totals.all} icon="truck" />
              <Stat label={t('a_buyers')} value={s.totals.buyers} icon="users" />
              <Stat label={t('a_suppliers')} value={s.totals.suppliers} icon="building" />
              <Stat label={t('a_pending')} value={s.totals.pending_verification} icon="shield" tone={s.totals.pending_verification > 0 ? 'warn' : 'plain'} />
              <Stat label={t('a_pending_del')} value={s.pending_deletions} icon="warn" tone={s.pending_deletions > 0 ? 'warn' : 'plain'} />
            </View>

            <Card style={{ padding: 14, gap: 10 }}>
              <SectionTitle icon="activity" title={t('a_activity')} />
              <T style={{ fontSize: 12, color: colors.muted }}>{t('a_rfqs_per_day')}</T>
              <BarChart data={series.map((d) => ({ label: d.label, value: d.value }))} />
              <T style={{ fontSize: 12, color: colors.muted }}>{t('a_quotes_per_day')}</T>
              <BarChart data={series.map((d) => ({ label: d.label, value: d.quotes }))} color={colors.blue} height={70} />
              <T style={{ fontSize: 12, color: colors.muted }}>{t('a_orders_per_day')}</T>
              <BarChart data={series.map((d) => ({ label: d.label, value: d.orders }))} color={colors.green} height={70} />
            </Card>

            <Card style={{ padding: 14, gap: 12 }}>
              <SectionTitle icon="funnel" title={t('a_funnel')} />
              <Funnel
                stages={[
                  { label: t('a_f_rfqs'), value: s.funnel.rfqs },
                  { label: t('a_f_quoted'), value: s.funnel.quoted },
                  { label: t('a_f_awarded'), value: s.funnel.awarded },
                  { label: t('a_f_completed'), value: s.funnel.completed },
                ]}
              />
              <Note text={t('a_funnel_note', { n: days })} />
            </Card>

            <Card style={{ padding: 14, gap: 12 }}>
              <SectionTitle icon="activity" title={t('a_health')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Stat label={t('a_h_quotes_per_rfq')} value={s.health.avg_quotes_per_rfq} icon="chat" />
                <Stat label={t('a_h_no_quotes')} value={s.health.rfqs_without_quotes} icon="warn" tone={s.health.rfqs_without_quotes > 0 ? 'warn' : 'plain'} />
                <Stat label={t('a_h_first_quote')} value={s.health.avg_hours_to_first_quote} unit={t('a_hours')} icon="timer" />
                <Stat label={t('a_h_to_award')} value={s.health.avg_hours_to_award} unit={t('a_hours')} icon="clock" />
                <Stat label={t('a_h_award_rate')} value={s.health.award_rate_pct} unit="%" icon="trophy" />
                <Stat label={t('a_h_completion')} value={s.health.completion_rate_pct} unit="%" icon="checkCircle" />
              </View>
              <Note text={t('a_health_note')} />
            </Card>

            <Card style={{ padding: 14, gap: 12 }}>
              <SectionTitle icon="box" title={t('a_by_category')} />
              <RankBars
                rows={s.categories.map((c) => ({
                  label: t(c.category as StringKey),
                  value: c.rfqs,
                  sub: t('a_cat_sub', { q: c.quotes, a: c.awarded }),
                }))}
              />
            </Card>

            <Card style={{ padding: 14, gap: 12 }}>
              <SectionTitle icon="shield" title={t('a_verif_mix')} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Donut slices={verifMix} />
                <Legend items={verifMix} />
              </View>
            </Card>

            <Card style={{ padding: 14, gap: 12 }}>
              <SectionTitle icon="users" title={t('a_top_suppliers')} />
              {s.top_suppliers.length ? (
                s.top_suppliers.map((sup, i, arr) => (
                  <View key={sup.company_id} style={[{ paddingVertical: 10, gap: 4 }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <T style={{ fontWeight: '700', fontSize: 13.5, flex: 1 }} numberOfLines={1}>{sup.name}</T>
                      <Money amount={sup.gmv_baisa} size={13} compact />
                    </View>
                    <T style={{ fontSize: 12, color: colors.muted }}>
                      {t('a_sup_line', { q: sup.quotes, w: sup.won, r: sup.win_rate_pct == null ? t('no_data') : `${sup.win_rate_pct}%` })}
                    </T>
                  </View>
                ))
              ) : (
                <T style={{ fontSize: 12, color: colors.muted }}>{t('no_data')}</T>
              )}
              <Note text={t('a_top_note')} />
            </Card>

            <Note text={t('a_generated', { d: new Date(s.generated_at).toLocaleString(locale) })} icon="refresh" />
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

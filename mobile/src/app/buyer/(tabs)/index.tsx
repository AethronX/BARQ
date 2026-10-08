import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAuth } from '../../../auth/AuthProvider';
import { useBuyerRfqs, useNotifications, useOrders } from '../../../api/queries';
import { Btn, EmptyState, Num, SectionTitle, T, useDir } from '../../../ui/components';
import { Icon, type IconName } from '../../../ui/Icon';
import { RfqRow } from '../../../ui/RfqRow';
import { QueryState } from '../../../ui/states';
import { notifText } from '../../../ui/format';
import { PendingNotice, RoleHeader } from '../../../screens/common';
import { colors, shadow } from '../../../ui/theme';

function Kpi({ icon, value, label, to }: { icon: IconName; value: number | string; label: StringKey; to: Href }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => router.navigate(to)} accessibilityRole="button" style={({ pressed }) => [st.kpi, pressed && { opacity: 0.7 }]}>
      <View style={st.kpiIcon}>
        <Icon name={icon} size={18} color={colors.white} />
      </View>
      <Num style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{value}</Num>
      <T style={{ color: '#E2E8F0', fontSize: 11, lineHeight: 15 }} numberOfLines={2}>{t(label)}</T>
    </Pressable>
  );
}

export default function BuyerHome() {
  const i18n = useI18n();
  const { t } = i18n;
  const d = useDir();
  const { profile, company, session } = useAuth();
  const rfqs = useBuyerRfqs();
  const orders = useOrders();
  const notifs = useNotifications(session?.user.id);
  const verified = (company?.verification ?? 0) >= 1;

  const open = rfqs.data?.filter((r) => r.status === 'OPEN' || r.status === 'QUOTES_RECEIVED') ?? [];
  const quoteCount = rfqs.data?.reduce((a, r) => a + (r.quotes[0]?.count ?? 0), 0) ?? 0;
  const activeOrders = orders.data?.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length ?? 0;
  const done = orders.data?.filter((o) => o.status === 'COMPLETED').length ?? 0;
  const dash = (n: number) => (rfqs.isPending ? '–' : n);

  const refresh = () => {
    rfqs.refetch();
    orders.refetch();
    notifs.refetch();
  };

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      <RoleHeader sub="sub_smart" />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl refreshing={rfqs.isRefetching} onRefresh={refresh} tintColor={colors.amber} />}>
        <View style={st.hero}>
          <Svg width={170} height={200} viewBox="0 0 170 200" style={[st.bolts, d.isRTL ? { transform: [{ scaleX: -1 }] } : null]} pointerEvents="none">
            <Path d="M120 0h34L80 120H46z" fill={colors.amber} opacity={0.75} />
            <Path d="M162 30h18L118 140h-18z" fill={colors.amber} opacity={0.4} />
          </Svg>
          <T style={{ color: colors.navyInk, fontSize: 14 }}>{t('hello')}</T>
          <T style={{ color: colors.white, fontSize: 22, fontWeight: '800' }} numberOfLines={1}>{profile?.full_name}</T>
          <T style={{ color: colors.amber, fontSize: 13.5, marginBottom: 14 }} numberOfLines={1}>{company?.name}</T>
          <Btn label={t('newrfq')} icon="docPlus" disabled={!verified} onPress={() => router.push('/buyer/rfq/new')} />
          <View style={st.kpis}>
            <Kpi icon="doc" value={dash(open.length)} label="k_active" to="/buyer/rfqs" />
            <Kpi icon="chat" value={dash(quoteCount)} label="k_quotes" to="/buyer/rfqs" />
            <Kpi icon="truck" value={orders.isPending ? '–' : activeOrders} label="k_orders" to="/buyer/orders" />
            <Kpi icon="checkCircle" value={orders.isPending ? '–' : done} label="k_done" to="/buyer/orders" />
          </View>
        </View>
        <View style={{ marginTop: -54, paddingHorizontal: 14, gap: 14 }}>
          {!verified ? <PendingNotice /> : null}
          <View style={st.panel}>
            <SectionTitle icon="doc" title={t('my_rfqs')} action={{ label: t('see_all'), onPress: () => router.navigate('/buyer/rfqs') }} />
            <QueryState isPending={rfqs.isPending} error={rfqs.error} onRetry={() => rfqs.refetch()} isEmpty={!rfqs.data?.length} empty={<EmptyState icon="doc" title={t('no_rfqs')} body={t('no_rfqs_s')} />}>
              {rfqs.data?.slice(0, 3).map((r, i, arr) => (
                <RfqRow
                  key={r.id}
                  title={r.title}
                  number={r.number}
                  category={r.category}
                  status={r.status}
                  closesAt={r.closes_at}
                  badge={t('quotes_n', { n: r.quotes[0]?.count ?? 0 })}
                  onPress={() => router.push({ pathname: '/buyer/rfq/[id]', params: { id: r.id } })}
                  last={i === arr.length - 1}
                />
              ))}
            </QueryState>
          </View>
          {notifs.data?.length ? (
            <View style={st.panel}>
              <SectionTitle icon="activity" title={t('recent')} action={{ label: t('see_all'), onPress: () => router.navigate('/buyer/alerts') }} />
              {notifs.data.slice(0, 3).map((n, i, arr) => (
                <View key={n.id} style={[{ paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                  <Icon name="bolt" size={16} color={colors.amber} />
                  <T style={{ flex: 1, fontSize: 13.5, fontWeight: n.read_at ? '500' : '700' }}>{notifText(i18n, n)}</T>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 72, overflow: 'hidden' },
  bolts: { position: 'absolute', top: -10, end: -30, opacity: 0.9 },
  kpis: { flexDirection: 'row', gap: 8, marginTop: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: 'rgba(203,213,225,0.22)', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 9, gap: 4, alignItems: 'flex-start' },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 14, ...shadow.card },
});

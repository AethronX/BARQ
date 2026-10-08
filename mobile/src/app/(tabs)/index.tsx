import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { SUPPLIERS } from '../../data/mock';
import { useStore } from '../../state/store';
import { AppHeader, Btn, MockBanner, Num, SectionTitle, T, useDir } from '../../ui/components';
import { Icon, type IconName } from '../../ui/Icon';
import { NotifRow } from '../../ui/NotifRow';
import { RfqRow } from '../../ui/RfqRow';
import { colors, shadow } from '../../ui/theme';

function Kpi({ icon, value, label, to }: { icon: IconName; value: number; label: StringKey; to: '/rfqs' | '/alerts' }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => router.navigate(to)} accessibilityRole="button" style={({ pressed }) => [st.kpi, pressed && { opacity: 0.7 }]}>
      <View style={st.kpiIcon}>
        <Icon name={icon} size={18} color={colors.white} />
      </View>
      <Num style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>{value}</Num>
      <T style={{ color: '#E2E8F0', fontSize: 11, lineHeight: 15 }} numberOfLines={2}>
        {t(label)}
      </T>
      <Icon name="chevronEnd" size={14} color="#E2E8F0" />
    </Pressable>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { rfqs, quotes, notifs } = useStore();
  const d = useDir();
  const quoteTotal = Object.values(quotes).reduce((a, q) => a + q.length, 0);
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      <AppHeader sub="sub_smart" />
      <MockBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={st.hero}>
          {/* lightning motif */}
          <Svg width={170} height={200} viewBox="0 0 170 200" style={[st.bolts, d.isRTL ? { transform: [{ scaleX: -1 }] } : null]} pointerEvents="none">
            <Path d="M120 0h34L80 120H46z" fill={colors.amber} opacity={0.75} />
            <Path d="M162 30h18L118 140h-18z" fill={colors.amber} opacity={0.4} />
          </Svg>
          <T style={{ color: colors.white, fontSize: 24, fontWeight: '700' }}>
            {t('hello')} <T style={{ color: colors.amber, fontSize: 24, fontWeight: '800' }}>{t('brand')}</T>
          </T>
          <T style={{ color: colors.navyInk, fontSize: 13.5, marginTop: 4, marginBottom: 16 }}>{t('tag')}</T>
          <Btn label={t('newrfq')} icon="docPlus" onPress={() => router.push('/rfq/new')} />
          <View style={st.kpis}>
            <Kpi icon="doc" value={rfqs.length} label="k_active" to="/rfqs" />
            <Kpi icon="timer" value={SUPPLIERS.length} label="k_bid" to="/rfqs" />
            <Kpi icon="chat" value={quoteTotal} label="k_q" to="/rfqs" />
            <Kpi icon="users" value={SUPPLIERS.filter((s) => s.verification >= 2).length} label="k_sup" to="/rfqs" />
          </View>
        </View>
        <View style={{ marginTop: -54, paddingHorizontal: 14, gap: 14 }}>
          <View style={st.panel}>
            <SectionTitle icon="doc" title={t('active_rfqs')} action={{ label: t('see_all'), onPress: () => router.navigate('/rfqs') }} />
            {rfqs.slice(0, 3).map((r, i, arr) => (
              <RfqRow key={r.id} rfq={r} quoteCount={quotes[r.id]?.length ?? 0} last={i === arr.length - 1} />
            ))}
          </View>
          <View style={st.panel}>
            <SectionTitle icon="activity" title={t('recent')} action={{ label: t('see_all'), onPress: () => router.navigate('/alerts') }} />
            {notifs.slice(0, 3).map((n, i, arr) => (
              <NotifRow key={n.id} n={n} last={i === arr.length - 1} />
            ))}
          </View>
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

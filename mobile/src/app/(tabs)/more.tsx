import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { Lang } from '../../i18n/strings';
import { useStore } from '../../state/store';
import { AppHeader, Card, Pill, Screen, T, VerificationPill } from '../../ui/components';
import { Icon, type IconName } from '../../ui/Icon';
import { colors } from '../../ui/theme';

function Row({ icon, label, sub, right, onPress, last }: { icon: IconName; label: string; sub?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  const body = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 54 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <Icon name={icon} size={22} />
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600' }}>{label}</T>
        {sub ? <T style={{ fontSize: 12, color: colors.muted }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}

export default function More() {
  const { t, lang, setLang } = useI18n();
  const { reset } = useStore();
  const seg = (l: Lang, label: string) => (
    <Pressable key={l} onPress={() => setLang(l)} accessibilityRole="button" accessibilityState={{ selected: lang === l }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9, backgroundColor: lang === l ? colors.navy : 'transparent' }}>
      <Text style={{ color: lang === l ? colors.white : colors.muted, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
  return (
    <Screen header={<AppHeader title={t('t_more')} />}>
      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.amber, fontWeight: '800', fontSize: 22 }}>AR</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T style={{ fontSize: 16, fontWeight: '700' }}>{t('company')}</T>
          <T style={{ fontSize: 12.5, color: colors.muted }}>{t('company_role')}</T>
          <VerificationPill level={2} />
        </View>
      </Card>
      <Card style={{ paddingHorizontal: 16 }}>
        <Row icon="globe" label={t('lang')} right={<View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 3, direction: 'ltr' }}>{[seg('ar', 'العربية'), seg('en', 'English')]}</View>} />
        <Row icon="ship" label={t('opt_intl')} right={<Pill label={t('soon')} tone="amber" />} onPress={() => router.push('/international')} />
        <Row icon="help" label={t('help')} right={<Pill label={t('soon')} />} />
        <Row icon="lock" label={t('terms_l')} right={<Pill label={t('soon')} />} />
        <Row icon="refresh" label={t('reset_demo')} onPress={() => { reset(); router.navigate('/'); }} />
        <Row icon="info" label={t('about')} sub={t('about_v')} last />
      </Card>
    </Screen>
  );
}

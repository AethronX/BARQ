import { View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { Reason } from '../domain/recommend';
import { formatMoney } from '../domain/money';
import { Note, T } from './components';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

/** Each reason renders a fact from the quote. Nothing here is a conclusion. */
function reasonText(r: Reason, t: (k: StringKey, p?: Record<string, string | number>) => string): { icon: IconName; text: string } {
  switch (r.kind) {
    case 'cheapest': return { icon: 'tag', text: t('bde_r_cheapest') };
    case 'fastest': return { icon: 'bolt', text: t('bde_r_fastest') };
    case 'cheaper_than_avg': return { icon: 'dollar', text: t('bde_r_cheaper_avg', { a: formatMoney(r.amount, true) }) };
    case 'verified': return { icon: 'shield', text: t('bde_r_verified', { lvl: t(`v${r.level}` as StringKey) }) };
    case 'completed_orders': return { icon: 'checkCircle', text: t('bde_r_completed', { n: r.n }) };
    case 'warranty': return { icon: 'doc', text: t('bde_r_warranty', { n: r.months }) };
    case 'terms': return { icon: 'cal', text: t('bde_r_terms', { t: t(`pt_${r.terms}` as StringKey) }) };
    case 'insufficient_data': return { icon: 'info', text: t('bde_r_nodata') };
  }
}

export function WhyBest({ reasons }: { reasons: readonly Reason[] }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.tile }}>
      <T style={{ fontSize: 13, fontWeight: '700' }}>{t('bde_why')}</T>
      {reasons.map((r, i) => {
        const { icon, text } = reasonText(r, t);
        return (
          <View key={`${r.kind}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={icon} size={16} color={colors.ink2} />
            <T style={{ fontSize: 12.5, color: colors.ink, flex: 1 }}>{text}</T>
          </View>
        );
      })}
      <Note text={t('bde_why_note')} />
    </View>
  );
}

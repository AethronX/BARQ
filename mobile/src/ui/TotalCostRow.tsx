import { View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { TotalCost } from '../domain/offer';
import { Money, Note, T } from './components';
import { colors } from './theme';

/**
 * Cost breakdown. When a component is unknown it is printed as words, not as a
 * zero: a total that quietly omits delivery is a wrong number that looks right.
 */
export function TotalCostRow({ cost }: { cost: TotalCost }) {
  const { t } = useI18n();
  const line = (label: string, value: React.ReactNode) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <T style={{ fontSize: 12.5, color: colors.muted }}>{label}</T>
      {value}
    </View>
  );
  return (
    <View style={{ gap: 7 }}>
      {line(t('bde_goods'), <Money amount={cost.goods} size={14} />)}
      {line(
        t('bde_delivery'),
        cost.delivery == null ? (
          <T style={{ fontSize: 12.5, color: colors.amberText, fontWeight: '600', flexShrink: 1 }}>{t('bde_no_delivery')}</T>
        ) : (
          <Money amount={cost.delivery} size={14} />
        ),
      )}
      {cost.fees > 0 ? line(t('bde_fees'), <Money amount={cost.fees} size={14} />) : null}
      {cost.discount > 0 ? line(t('bde_discount'), <Money amount={-cost.discount} size={14} color={colors.green} />) : null}
      <View style={{ height: 1, backgroundColor: colors.line }} />
      {line(t('bde_total_cost'), <Money amount={cost.total} size={17} />)}
      {!cost.complete ? <Note text={t('bde_partial')} tone="amber" icon="warn" /> : null}
    </View>
  );
}

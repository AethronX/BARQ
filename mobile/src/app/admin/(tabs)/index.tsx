import { View } from 'react-native';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAdminOverview } from '../../../api/queries';
import { Card, Num, Screen, T } from '../../../ui/components';
import { QueryState } from '../../../ui/states';
import { RoleHeader } from '../../../screens/common';
import { colors } from '../../../ui/theme';

const TILES: { key: string; label: StringKey; warn?: boolean }[] = [
  { key: 'pending_verification', label: 'a_pending', warn: true },
  { key: 'buyers', label: 'a_buyers' },
  { key: 'suppliers', label: 'a_suppliers' },
  { key: 'open_rfqs', label: 'a_open' },
  { key: 'quotes', label: 'a_quotes' },
  { key: 'orders_active', label: 'a_active' },
  { key: 'orders_completed', label: 'a_completed' },
];

export default function AdminOverview() {
  const { t } = useI18n();
  const q = useAdminOverview();
  return (
    <Screen header={<RoleHeader title={t('t_overview')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TILES.map((tile) => {
            const v = q.data?.[tile.key] ?? 0;
            const hot = tile.warn && v > 0;
            return (
              <Card key={tile.key} style={{ flexGrow: 1, flexBasis: '45%', padding: 14, gap: 4, borderColor: hot ? colors.amber : colors.line }}>
                <Num style={{ fontSize: 26, fontWeight: '700', color: hot ? colors.amberText : colors.ink }}>{v}</Num>
                <T style={{ color: colors.muted, fontSize: 12.5 }}>{t(tile.label)}</T>
              </Card>
            );
          })}
        </View>
      </QueryState>
    </Screen>
  );
}

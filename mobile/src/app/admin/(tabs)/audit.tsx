import { View } from 'react-native';
import { useI18n } from '../../../i18n/I18nProvider';
import { useAuditLog } from '../../../api/queries';
import { Card, EmptyState, Num, Screen, T } from '../../../ui/components';
import { formatStamp } from '../../../ui/format';
import { QueryState } from '../../../ui/states';
import { RoleHeader } from '../../../screens/common';
import { colors } from '../../../ui/theme';

/** Append-only audit trail (read-only; no one can edit it from the app). */
export default function AdminAudit() {
  const i18n = useI18n();
  const { t } = i18n;
  const q = useAuditLog();
  return (
    <Screen header={<RoleHeader title={t('t_audit')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!q.data?.length} empty={<EmptyState icon="doc" title={t('a_audit_empty')} />}>
        <Card style={{ paddingHorizontal: 14 }}>
          {q.data?.map((e, i) => (
            <View key={e.id} style={[{ paddingVertical: 10, gap: 2 }, i < q.data!.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Num style={{ fontWeight: '700', fontSize: 13 }}>{e.action}</Num>
                <T style={{ fontSize: 11.5, color: colors.muted }}>{formatStamp(i18n, e.created_at)}</T>
              </View>
              <Num style={{ fontSize: 11.5, color: colors.muted }} numberOfLines={2}>{`${e.entity} ${e.entity_id?.slice(0, 8) ?? ''} ${JSON.stringify(e.meta)}`}</Num>
            </View>
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

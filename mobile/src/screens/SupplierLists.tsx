import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { useSupplierRfqs } from '../api/queries';
import { Card, EmptyState, Screen } from '../ui/components';
import { RfqRow } from '../ui/RfqRow';
import { QueryState } from '../ui/states';
import { PendingNotice, RoleHeader } from './common';

/** Supplier RFQ list: open requests to quote on ('inbox') or the ones already quoted ('quoted'). */
export function SupplierRfqList({ mode }: { mode: 'inbox' | 'quoted' }) {
  const { t } = useI18n();
  const { company } = useAuth();
  const q = useSupplierRfqs();
  const rows = (q.data ?? []).filter((r) => (mode === 'inbox' ? !r.my_quote_id : !!r.my_quote_id));
  const empty =
    mode === 'inbox' ? <EmptyState icon="doc" title={t('inbox_empty')} body={t('inbox_empty_s')} /> : <EmptyState icon="tag" title={t('my_quotes_empty')} />;
  return (
    <Screen
      header={<RoleHeader title={mode === 'inbox' ? t('inbox_t') : t('t_quotes')} sub="sub_proc" />}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      {mode === 'inbox' && (company?.verification ?? 0) < 1 ? <PendingNotice /> : null}
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} empty={empty}>
        <Card style={{ paddingHorizontal: 16 }}>
          {rows.map((r, i) => (
            <RfqRow
              key={r.id}
              title={r.title}
              number={r.number}
              category={r.category}
              status={r.status}
              closesAt={r.closes_at}
              sub={`${r.quantity} ${t(r.unit as StringKey)} · ${t(r.location as StringKey)}`}
              badge={r.my_quote_status ? t(`qs_${r.my_quote_status}` as StringKey) : undefined}
              onPress={() => router.push({ pathname: '/supplier/rfq/[id]', params: { id: r.id } })}
              last={i === rows.length - 1}
            />
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

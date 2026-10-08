import { router } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import { useAuth } from '../../../auth/AuthProvider';
import { useBuyerRfqs } from '../../../api/queries';
import { Btn, Card, EmptyState, Screen } from '../../../ui/components';
import { RfqRow } from '../../../ui/RfqRow';
import { QueryState } from '../../../ui/states';
import { PendingNotice, RoleHeader } from '../../../screens/common';

export default function BuyerRfqs() {
  const { t } = useI18n();
  const { company } = useAuth();
  const q = useBuyerRfqs();
  const verified = (company?.verification ?? 0) >= 1;
  return (
    <Screen header={<RoleHeader title={t('t_rfqs')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <PendingNotice />
      <Btn label={t('newrfq')} icon="docPlus" disabled={!verified} onPress={() => router.push('/buyer/rfq/new')} />
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!q.data?.length} empty={<EmptyState icon="doc" title={t('no_rfqs')} body={t('no_rfqs_s')} />}>
        <Card style={{ paddingHorizontal: 16 }}>
          {q.data?.map((r, i) => (
            <RfqRow
              key={r.id}
              title={r.title}
              number={r.number}
              category={r.category}
              status={r.status}
              closesAt={r.closes_at}
              badge={t('quotes_n', { n: r.quotes[0]?.count ?? 0 })}
              onPress={() => router.push({ pathname: '/buyer/rfq/[id]', params: { id: r.id } })}
              last={i === q.data!.length - 1}
            />
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import { useAuth } from '../../../auth/AuthProvider';
import { useBuyerRfqs } from '../../../api/queries';
import type { RfqStatus } from '../../../api/types';
import { Btn, Card } from '../../../ui/components';
import { ListScreen } from '../../../ui/ListScreen';
import { useSearch, type FilterOption } from '../../../ui/primitives';
import { RfqRow } from '../../../ui/RfqRow';
import { PendingNotice, RoleHeader } from '../../../screens/common';

type Filter = 'all' | 'open' | 'quoted' | 'awarded' | 'closed';
const GROUP: Record<Exclude<Filter, 'all'>, RfqStatus[]> = {
  open: ['DRAFT', 'PUBLISHED', 'OPEN'],
  quoted: ['QUOTES_RECEIVED', 'EVALUATION'],
  awarded: ['AWARDED'],
  closed: ['CLOSED', 'CANCELLED'],
};

export default function BuyerRfqs() {
  const { t } = useI18n();
  const { company } = useAuth();
  const q = useBuyerRfqs();
  const verified = (company?.verification ?? 0) >= 1;
  const [filter, setFilter] = useState<Filter>('all');

  const all = q.data ?? [];
  const count = (f: Exclude<Filter, 'all'>) => all.filter((r) => GROUP[f].includes(r.status)).length;
  const byFilter = filter === 'all' ? all : all.filter((r) => GROUP[filter].includes(r.status));
  const { query, setQuery, result } = useSearch(byFilter, (r) => [r.title, r.number, r.spec]);

  const filters: FilterOption<Filter>[] = [
    { key: 'all', label: t('f_all'), count: all.length },
    { key: 'open', label: t('f_open'), count: count('open') },
    { key: 'quoted', label: t('f_quoted'), count: count('quoted') },
    { key: 'awarded', label: t('f_awarded'), count: count('awarded') },
    ...(count('closed') ? [{ key: 'closed' as const, label: t('f_closed'), count: count('closed') }] : []),
  ];

  return (
    <ListScreen
      header={<RoleHeader title={t('t_rfqs')} />}
      data={result}
      keyExtractor={(r) => r.id}
      query={query}
      onQuery={setQuery}
      filters={filters}
      filter={filter}
      onFilter={setFilter}
      isPending={q.isPending}
      error={q.error}
      onRetry={() => q.refetch()}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      empty={{ icon: 'doc', title: t('no_rfqs'), body: t('no_rfqs_s') }}
      aboveList={
        <View style={{ gap: 12 }}>
          <PendingNotice />
          <Btn label={t('newrfq')} icon="docPlus" disabled={!verified} onPress={() => router.push('/buyer/rfq/new')} />
        </View>
      }
      renderItem={(r) => (
        <Card style={{ paddingHorizontal: 16 }}>
          <RfqRow
            title={r.title}
            number={r.number}
            category={r.category}
            status={r.status}
            closesAt={r.closes_at}
            badge={t('quotes_n', { n: r.quotes[0]?.count ?? 0 })}
            onPress={() => router.push({ pathname: '/buyer/rfq/[id]', params: { id: r.id } })}
            last
          />
        </Card>
      )}
    />
  );
}

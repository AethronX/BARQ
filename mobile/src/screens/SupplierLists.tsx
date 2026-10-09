import { useState } from 'react';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { useSupplierRfqs } from '../api/queries';
import { Card } from '../ui/components';
import { ListScreen } from '../ui/ListScreen';
import { useSearch, type FilterOption } from '../ui/primitives';
import { RfqRow } from '../ui/RfqRow';
import { PendingNotice, RoleHeader } from './common';

type Cat = 'all' | 'c_hvac' | 'c_pipes' | 'c_elec' | 'c_safety';

/**
 * Supplier request list: open requests to quote on ('inbox') or the ones
 * already quoted ('quoted'). Filtering is by the supplier's own categories,
 * which is what decides whether a request is worth reading.
 */
export function SupplierRfqList({ mode }: { mode: 'inbox' | 'quoted' }) {
  const { t } = useI18n();
  const { company } = useAuth();
  const q = useSupplierRfqs();
  const [cat, setCat] = useState<Cat>('all');

  const mine = (q.data ?? []).filter((r) => (mode === 'inbox' ? !r.my_quote_id : !!r.my_quote_id));
  const byCat = cat === 'all' ? mine : mine.filter((r) => r.category === cat);
  const { query, setQuery, result } = useSearch(byCat, (r) => [r.title, r.number, r.spec]);

  // Only the categories this supplier actually serves, with real counts.
  const cats: FilterOption<Cat>[] = [
    { key: 'all', label: t('f_all'), count: mine.length },
    ...(company?.categories ?? []).map((c) => ({
      key: c as Cat,
      label: t(c as StringKey),
      count: mine.filter((r) => r.category === c).length,
    })),
  ];

  return (
    <ListScreen
      header={<RoleHeader title={mode === 'inbox' ? t('t_inbox') : t('t_quotes')} sub="sub_proc" />}
      data={result}
      keyExtractor={(r) => r.id}
      query={query}
      onQuery={setQuery}
      filters={cats.length > 2 ? cats : undefined}
      filter={cats.length > 2 ? cat : undefined}
      onFilter={cats.length > 2 ? setCat : undefined}
      isPending={q.isPending}
      error={q.error}
      onRetry={() => q.refetch()}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      empty={
        mode === 'inbox'
          ? { icon: 'doc', title: t('inbox_empty'), body: t('inbox_empty_s') }
          : { icon: 'tag', title: t('my_quotes_empty') }
      }
      aboveList={mode === 'inbox' && (company?.verification ?? 0) < 1 ? <PendingNotice /> : null}
      renderItem={(r) => (
        <Card style={{ paddingHorizontal: 16 }}>
          <RfqRow
            title={r.title}
            number={r.number}
            category={r.category}
            status={r.status}
            closesAt={r.closes_at}
            sub={`${r.quantity} ${t(r.unit as StringKey)} · ${t(r.location as StringKey)}`}
            badge={r.my_quote_status ? t(`qs_${r.my_quote_status}` as StringKey) : undefined}
            onPress={() => router.push({ pathname: '/supplier/rfq/[id]', params: { id: r.id } })}
            last
          />
        </Card>
      )}
    />
  );
}

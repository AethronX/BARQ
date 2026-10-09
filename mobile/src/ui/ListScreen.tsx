/**
 * One virtualised list screen used by orders, requests and the supplier inbox.
 *
 * It owns the parts those screens kept re-implementing: a sticky search and
 * filter header, pull to refresh, and the four states a list can be in
 * (loading, error, empty, no search match) — so content never jumps and a
 * failure always offers a retry. FlatList keeps long lists cheap.
 */
import type { ReactNode } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { EmptyState, useDir } from './components';
import { ErrorState, FilterChips, LoadingState, SearchBar, type FilterOption } from './primitives';
import { useI18n } from '../i18n/I18nProvider';
import { colors, GUTTER, space } from '../theme';
import type { IconName } from './Icon';

export function ListScreen<T, K extends string>({
  header, data, renderItem, keyExtractor,
  query, onQuery, searchPlaceholder,
  filters, filter, onFilter,
  isPending, error, onRetry, onRefresh, refreshing,
  empty, aboveList, footer, searchable = true,
}: {
  header: ReactNode;
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  query?: string;
  onQuery?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: readonly FilterOption<K>[];
  filter?: K;
  onFilter?: (k: K) => void;
  isPending?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  empty: { icon: IconName; title: string; body?: string };
  aboveList?: ReactNode;
  footer?: ReactNode;
  searchable?: boolean;
}) {
  const { t } = useI18n();
  const d = useDir();
  const searching = !!query?.trim();

  const controls = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      {searchable && onQuery ? <SearchBar value={query ?? ''} onChange={onQuery} placeholder={searchPlaceholder} /> : null}
      {filters && filter && onFilter ? <FilterChips options={filters} value={filter} onChange={onFilter} /> : null}
      {aboveList}
    </View>
  );

  const body = () => {
    if (isPending) return <LoadingState />;
    if (error) return <ErrorState message={error instanceof Error ? undefined : undefined} onRetry={onRetry} />;
    if (!data.length) {
      return searching
        ? <EmptyState icon="funnel" title={t('no_match')} body={t('no_match_s')} />
        : <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />;
    }
    return null;
  };

  const placeholder = body();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      {header}
      <FlatList
        data={placeholder ? [] : (data as T[])}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => <View style={{ paddingBottom: space.md }}>{renderItem(item, index)}</View>}
        ListHeaderComponent={<>{controls}{placeholder}</>}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: space.md, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={11}
        removeClippedSubviews={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.navy} /> : undefined}
      />
      {footer}
    </View>
  );
}

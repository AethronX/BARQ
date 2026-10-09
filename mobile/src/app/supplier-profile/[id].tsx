import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { useSupplierProfile } from '../../api/queries';
import type { VerificationLevel } from '../../domain/score';
import { AppHeader, Card, CompanyLogo, Note, Screen, SectionTitle, T, VerificationPill } from '../../ui/components';
import { Divider, Fact, StatusBadge } from '../../ui/primitives';
import { formatDate } from '../../ui/format';
import { QueryState } from '../../ui/states';
import { RoleGate } from '../../screens/RoleGate';
import { colors, space, type as typo } from '../../theme';

/**
 * Supplier profile.
 *
 * Deliberately split in two: what BARQ verified itself, and what the supplier
 * stated about itself. Nothing is merged into one trustworthy-looking block,
 * there are no ratings (no review system exists yet) and no certification
 * badges (none are collected yet) — their absence is stated rather than filled
 * with something invented.
 */
function SupplierProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const i18n = useI18n();
  const { t } = i18n;
  const q = useSupplierProfile(id);
  const c = q.data?.company;
  const stats = q.data?.stats;

  return (
    <Screen header={<AppHeader title={t('sp_title')} back />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()}>
        {c ? (
          <>
            <Card style={{ padding: space.lg, gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <CompanyLogo name={c.name} size={58} />
                <View style={{ flex: 1, gap: 4 }}>
                  <T style={typo.h3} numberOfLines={2}>{c.name}</T>
                  <VerificationPill level={c.verification as VerificationLevel} />
                </View>
              </View>
              <Divider />
              <SectionTitle icon="shield" title={t('sp_verified_facts')} />
              <Fact label={t('verification')} value={t(`v${c.verification}` as StringKey)} />
              <Fact label={t('sp_member', { d: '' }).trim()} value={formatDate(i18n, c.created_at)} />
              <Fact
                label={t('sp_history')}
                value={stats && stats.completed_orders > 0 ? t('sp_orders_done', { n: stats.completed_orders }) : t('sp_orders_none')}
              />
              <Note text={t('sp_no_rating')} />
            </Card>

            <Card style={{ padding: space.lg, gap: space.sm }}>
              <SectionTitle icon="building" title={t('sp_claims')} />
              <Fact label={t('sp_categories')} claimed value={c.categories.length ? c.categories.map((x) => t(x as StringKey)).join('، ') : t('no_data')} />
              <Fact label={t('sp_coverage')} claimed value={c.city ?? t('no_data')} />
              <Fact label={t('a_field_cr')} claimed value={c.cr_number ?? t('a_no_cr')} />
              <Note text={t('sp_claims_note')} tone="amber" icon="info" />
            </Card>

            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <StatusBadge label={t('sp_contact_hidden')} tone="neutral" icon="lock" />
            </View>
          </>
        ) : null}
      </QueryState>
    </Screen>
  );
}

export default function Page() {
  return (
    <RoleGate>
      <SupplierProfileScreen />
    </RoleGate>
  );
}

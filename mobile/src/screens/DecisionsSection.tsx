import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { RfqWithCount } from '../api/queries';
import { track } from '../analytics/events';
import { Note, SectionTitle, T } from '../ui/components';
import { RfqRow } from '../ui/RfqRow';
import { colors, shadow } from '../ui/theme';

/** RFQ statuses where the buyer can still choose a quote. */
const DECIDABLE = ['OPEN', 'QUOTES_RECEIVED', 'EVALUATION'];

export function pendingDecisions(rfqs: readonly RfqWithCount[] | undefined): RfqWithCount[] {
  return (rfqs ?? [])
    .filter((r) => DECIDABLE.includes(r.status) && (r.quotes[0]?.count ?? 0) > 0)
    .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime());
}

/**
 * "طلبات تحتاج قرارك" — requests that already have quotes and are waiting for
 * the buyer. Soonest to close first, because that is the one that expires.
 * Rendered only when there is something to decide.
 */
export function DecisionsSection({ rfqs }: { rfqs: readonly RfqWithCount[] | undefined }) {
  const { t } = useI18n();
  const pending = pendingDecisions(rfqs);
  if (!pending.length) return null;
  return (
    <View style={st.panel}>
      <SectionTitle icon="trophy" title={t('bde_decisions')} />
      <T style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>{t('bde_decisions_s')}</T>
      {pending.slice(0, 3).map((r, i, arr) => (
        <RfqRow
          key={r.id}
          title={r.title}
          number={r.number}
          category={r.category}
          status={r.status}
          closesAt={r.closes_at}
          badge={t('bde_offers_n', { n: r.quotes[0]?.count ?? 0 })}
          onPress={() => {
            track({ name: 'decisions_section_tapped', rfqId: r.id, pending: pending.length });
            router.push({ pathname: '/buyer/rfq/[id]', params: { id: r.id } });
          }}
          last={i === arr.length - 1}
        />
      ))}
      <Note text={t('no_auto')} />
    </View>
  );
}

const st = StyleSheet.create({
  panel: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 14, gap: 2, ...shadow.card },
});

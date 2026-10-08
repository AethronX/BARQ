import { View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { OfferLabel } from '../domain/recommend';
import { Pill } from './components';
import type { IconName } from './Icon';

/** Visual vocabulary for the four deal labels. One label, one meaning. */
const LABEL: Record<OfferLabel, { icon: IconName; key: StringKey; tone: 'amber' | 'green' | 'blue' }> = {
  best: { icon: 'trophy', key: 'bde_best', tone: 'amber' },
  cheapest: { icon: 'tag', key: 'bde_cheapest', tone: 'green' },
  fastest: { icon: 'bolt', key: 'bde_fastest', tone: 'blue' },
  top_rated: { icon: 'star', key: 'bde_top_rated', tone: 'amber' },
};

export function dealBadge(label: OfferLabel) {
  return LABEL[label];
}

export function DealBadges({ labels }: { labels: readonly OfferLabel[] }) {
  const { t } = useI18n();
  if (!labels.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {labels.map((l) => (
        <Pill key={l} label={t(LABEL[l].key)} tone={LABEL[l].tone} icon={LABEL[l].icon} />
      ))}
    </View>
  );
}

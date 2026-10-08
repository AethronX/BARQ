import { View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { Notif, NotifKind } from '../state/store';
import { Num, T } from './components';
import { formatTime, isToday, notifText } from './format';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

const LOOK: Record<NotifKind, { icon: IconName; bg: string; fg: string }> = {
  quote: { icon: 'chat', bg: colors.greenSoft, fg: colors.greenIcon },
  deadline: { icon: 'clock', bg: '#E8ECF4', fg: colors.navy3 },
  check: { icon: 'check', bg: colors.greenSoft, fg: colors.greenIcon },
  order: { icon: 'checkCircle', bg: colors.greenSoft, fg: colors.greenIcon },
  ship: { icon: 'truck', bg: colors.amberSoft, fg: colors.amber2 },
  rfq: { icon: 'doc', bg: colors.blueSoft, fg: colors.blue },
};

export function NotifRow({ n, last }: { n: Notif; last?: boolean }) {
  const i18n = useI18n();
  const look = LOOK[n.kind];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={look.icon} size={21} color={look.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontSize: 13.5, fontWeight: '600' }}>{notifText(i18n, n)}</T>
        {n.sub ? <T style={{ fontSize: 11.5, color: colors.muted }}>{n.sub}</T> : null}
      </View>
      <View style={{ alignItems: 'center' }}>
        <T style={{ fontSize: 11, color: colors.muted }}>{isToday(n.at) ? i18n.t('today') : i18n.t('yday')}</T>
        <Num style={{ fontSize: 11.5, color: colors.muted }}>{formatTime(n.at)}</Num>
      </View>
    </View>
  );
}

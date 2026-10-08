import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { Category, RfqStatus } from '../api/types';
import { Num, Pill, T, Thumb } from './components';
import { countdown, dayCountLabel, rfqRef } from './format';
import { Icon } from './Icon';
import { colors } from './theme';

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const OPEN: RfqStatus[] = ['OPEN', 'QUOTES_RECEIVED'];

/** One RFQ in a list: thumbnail, title, reference, live countdown and quote count. */
export function RfqRow({
  title, number, category, status, closesAt, sub, badge, onPress, last,
}: {
  title: string; number: number; category: Category; status: RfqStatus; closesAt: string;
  sub?: string; badge?: string; onPress: () => void; last?: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const now = useNow();
  const open = OPEN.includes(status);
  const cd = open ? countdown(new Date(closesAt).getTime() - now) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${rfqRef(number)}`}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, opacity: pressed ? 0.7 : 1 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
    >
      <Thumb category={category} size={64} />
      <View style={{ flex: 1, gap: 3 }}>
        <T style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{title}</T>
        <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }} numberOfLines={1}>{rfqRef(number)}</Num>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {cd ? null : <Pill label={t(`rs_${status}` as StringKey)} tone={status === 'AWARDED' ? 'green' : status === 'CANCELLED' ? 'red' : 'grey'} />}
          {sub ? <T style={{ fontSize: 12, color: colors.muted }}>{sub}</T> : null}
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        {cd ? (
          <View style={{ backgroundColor: colors.amberSoft, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', minWidth: 100 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={15} color="#D98A00" />
              {cd.days ? <T style={{ color: '#D98A00', fontSize: 12, fontWeight: '600' }}>{dayCountLabel(i18n, cd.days)}</T> : null}
              <Num style={{ color: '#D98A00', fontSize: 14, fontWeight: '700' }}>{cd.clock}</Num>
            </View>
            <T style={{ fontSize: 10.5, color: colors.ink2 }} center>{t('left')}</T>
          </View>
        ) : null}
        {badge ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="chat" size={15} />
            <T style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink2 }}>{badge}</T>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

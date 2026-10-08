import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { Rfq } from '../state/store';
import { Num, T, Thumb } from './components';
import { countdown, dayCountLabel } from './format';
import { Icon } from './Icon';
import { colors } from './theme';

/** Re-renders every `ms` so countdowns stay live; one timer per row is cheap at this list size. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function RfqRow({ rfq, quoteCount, last }: { rfq: Rfq; quoteCount: number; last?: boolean }) {
  const i18n = useI18n();
  const { t, L } = i18n;
  const now = useNow();
  const cd = countdown(rfq.closesAt - now);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/rfq/[id]', params: { id: rfq.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${L(rfq.title)}, RFQ ${rfq.id}`}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, opacity: pressed ? 0.7 : 1 },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.line },
      ]}
    >
      <Thumb category={rfq.category} size={72} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontSize: 15.5, fontWeight: '700' }} numberOfLines={2}>
          {L(rfq.title)}
        </T>
        <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }} numberOfLines={1} adjustsFontSizeToFit>{`RFQ #BARQ-2025-${rfq.id}`}</Num>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="building" size={14} color={colors.muted} />
          <T style={{ fontSize: 12, color: colors.muted, flexShrink: 1 }} numberOfLines={1}>
            {t('sector')}: {L(rfq.sector)}
          </T>
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ backgroundColor: cd ? colors.amberSoft : colors.tile, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', minWidth: 108 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="clock" size={16} color={cd ? '#D98A00' : colors.muted} />
            {cd?.days ? <T style={{ color: '#D98A00', fontSize: 12.5, fontWeight: '600' }}>{dayCountLabel(i18n, cd.days)}</T> : null}
            <Num style={{ color: cd ? '#D98A00' : colors.muted, fontSize: 14.5, fontWeight: '700' }}>{cd ? cd.clock : t('closed')}</Num>
          </View>
          <T style={{ fontSize: 10.5, color: colors.ink2 }} center>
            {t('left')}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="chat" size={15} />
          <T style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink2 }}>{t('quotes_n', { n: quoteCount })}</T>
          <Icon name="chevronEnd" size={14} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );
}

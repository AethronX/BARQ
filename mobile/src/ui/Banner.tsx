import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { ReactNode } from 'react';
import { T, useDir } from './components';
import { Icon, type IconName } from './Icon';
import { colors, shadow } from './theme';

/** Navy banner with a drawn skyline (Muscat fort or port), as in the mockups. */
export function Banner({ icon, title, sub, kind = 'local' }: { icon: IconName; title: string; sub: string; kind?: 'local' | 'port' }) {
  const d = useDir();
  return (
    <View style={{ backgroundColor: colors.navy, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 70, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 440 200" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }}>
        <Rect width={440} height={200} fill={colors.navy3} />
        {kind === 'local' ? (
          <>
            <Path d="M0 150l40-30 30 18 50-46 40 30 34-22 46 40 40-24 60 34 40-26 60 40v36H0z" fill="#2A3B5E" />
            <Path d="M40 160v-34h10v-8h8v8h12v-14h8v14h10v34zM96 160v-50l10-8 10 8v50zM118 160v-26h40v26z" fill="#33476E" />
          </>
        ) : (
          <>
            <Path d="M20 160V70h14v90zM40 160V90h18v70zM62 160V60h12v100zM80 160V96h20v64z" fill="#2E4470" />
            <Path d="M120 160V60h70M150 60V46M220 160V80h60M250 80V66" stroke="#3A5285" strokeWidth={3} fill="none" />
            <Path d="M150 120h26v14h-26z" fill="#B45309" />
            <Path d="M178 120h26v14h-26z" fill="#1D4ED8" />
            <Path d="M206 120h26v14h-26z" fill="#B91C1C" />
            <Path d="M164 106h26v14h-26z" fill="#15803D" />
            <Path d="M120 134h170l-14 26H136z" fill="#1E2F52" />
          </>
        )}
        <Path d="M0 170c80-10 160-12 240-6s140 2 200-6v42H0z" fill={colors.navy} />
      </Svg>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, d.dir]}>
        <Icon name={icon} size={44} color={colors.amber} />
        <View style={{ flex: 1 }}>
          <T style={{ color: colors.white, fontSize: 23, fontWeight: '700' }}>{title}</T>
          <T style={{ color: '#E2E8F0', fontSize: 13 }}>{sub}</T>
        </View>
      </View>
    </View>
  );
}

/** White card that overlaps the banner (route summary). */
export function RouteCard({ children }: { children: ReactNode }) {
  return <View style={{ marginTop: -54, marginHorizontal: 14, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, ...shadow.card }}>{children}</View>;
}

export function Attrs({ items }: { items: { icon: IconName; label: string; value: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      {items.map((it, i) => (
        <View key={it.label} style={[{ flex: 1, paddingHorizontal: 6, gap: 3 }, i > 0 && { borderStartWidth: 1, borderStartColor: colors.line }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name={it.icon} size={14} />
            <T style={{ fontSize: 10.5, color: colors.muted, flexShrink: 1 }} numberOfLines={1}>
              {it.label}
            </T>
          </View>
          <T style={{ fontSize: 12.5, fontWeight: '700' }}>{it.value}</T>
        </View>
      ))}
    </View>
  );
}

export function Endpoint({ label, title, sub, icon, alignEnd }: { label?: string; title: string; sub?: string; icon: ReactNode; alignEnd?: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: alignEnd ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
      {icon}
      <View style={{ flex: 1 }}>
        {label ? <T style={{ fontSize: 11.5, color: colors.muted }} end={alignEnd}>{label}</T> : null}
        <T style={{ fontSize: 15, fontWeight: '700' }} end={alignEnd}>
          {title}
        </T>
        {sub ? <T style={{ fontSize: 12, color: colors.muted }} end={alignEnd}>{sub}</T> : null}
      </View>
    </View>
  );
}

export function PinCircle({ icon }: { icon: IconName }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} color={colors.navy} />
    </View>
  );
}

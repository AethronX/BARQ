import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  I18nManager,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { moneyParts, type Baisa } from '../domain/money';
import type { VerificationLevel } from '../domain/score';
import type { Category } from '../api/types';
import { Icon, QMark, type IconName } from './Icon';
import { colors, radius, shadow, space, TOUCH } from './theme';

/* ------------------------------------------------------------------ */
/* Direction helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Layout direction is applied per screen via the `direction` style so the
 * language can switch live without restarting the app. Text alignment must be
 * physical; if the OS has already enabled native RTL it swaps left/right, so
 * we compensate here.
 */
export function useDir() {
  const { isRTL } = useI18n();
  const nativeRTL = I18nManager.isRTL;
  const start: TextStyle['textAlign'] = isRTL !== nativeRTL ? 'right' : 'left';
  const end: TextStyle['textAlign'] = isRTL !== nativeRTL ? 'left' : 'right';
  return { isRTL, dir: { direction: isRTL ? 'rtl' : 'ltr' } as ViewStyle, start, end };
}

/** Text with brand defaults and direction-aware alignment. */
export function T({ style, center, end, ...p }: TextProps & { center?: boolean; end?: boolean }) {
  const d = useDir();
  return (
    <Text
      {...p}
      maxFontSizeMultiplier={1.4}
      style={[{ color: colors.ink, fontSize: 14, textAlign: center ? 'center' : end ? d.end : d.start, writingDirection: d.isRTL ? 'rtl' : 'ltr' }, style]}
    />
  );
}

/** Numbers and codes always render left-to-right, even inside Arabic text. */
export function Num({ style, ...p }: TextProps) {
  return <Text {...p} maxFontSizeMultiplier={1.4} style={[{ color: colors.ink, fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]} />;
}

/* ------------------------------------------------------------------ */
/* Chrome                                                               */
/* ------------------------------------------------------------------ */

export function Logo({ sub, compact }: { sub: StringKey; compact?: boolean }) {
  const { t } = useI18n();
  const size = compact ? 21 : 27;
  return (
    <View style={{ alignItems: 'center', direction: 'ltr' }} accessible accessibilityLabel="BARQ">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: colors.white, fontSize: size, fontWeight: '800', letterSpacing: 2 }}>BAR</Text>
        <QMark size={size} />
      </View>
      <Text style={{ color: '#E2E8F0', fontSize: compact ? 6.5 : 7.5, fontWeight: '600', letterSpacing: 2.4, marginTop: 3 }}>{t(sub)}</Text>
    </View>
  );
}

export function HeaderButton({ icon, label, onPress, dot }: { icon: IconName; label: string; onPress: () => void; dot?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [s.hbtn, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={24} color={colors.white} />
      {dot ? <View style={s.hdot} /> : null}
    </Pressable>
  );
}

export function AppHeader({ title, back, sub = 'sub_proc', action, onBell, unread = 0 }: { title?: string; back?: boolean; sub?: StringKey; action?: ReactNode; onBell?: () => void; unread?: number }) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const d = useDir();
  const startNode = back ? (
    <HeaderButton icon="chevronStart" label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
  ) : null;
  const endNode = action ?? (onBell ? <HeaderButton icon="bell" label={t('notifs')} onPress={onBell} dot={unread > 0} /> : <View style={{ width: TOUCH }} />);
  return (
    <View style={[s.header, d.dir, { paddingTop: insets.top + 6 }]}>
      <View style={[s.hside, { justifyContent: 'flex-start' }]}>
        {startNode}
        {title ? (
          <T numberOfLines={1} style={s.htitle} accessibilityRole="header">
            {title}
          </T>
        ) : null}
      </View>
      {title ? null : <Logo sub={sub} />}
      <View style={[s.hside, { justifyContent: 'flex-end' }]}>{endNode}</View>
    </View>
  );
}

/** Screen shell: navy header and a scrollable body with pull-to-refresh. */
export function Screen({ header, children, footer, scroll = true, padded = true, onRefresh, refreshing = false }: { header: ReactNode; children: ReactNode; footer?: ReactNode; scroll?: boolean; padded?: boolean; onRefresh?: () => void; refreshing?: boolean }) {
  const d = useDir();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={padded ? s.body : { paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                           */
/* ------------------------------------------------------------------ */

type BtnVariant = 'amber' | 'navy' | 'ghost';
export function Btn({
  label,
  onPress,
  variant = 'amber',
  icon,
  chevron,
  disabled,
  loading,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  chevron?: boolean;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'amber' ? colors.amber2 : variant === 'navy' ? colors.navy2 : colors.card;
  const fg = variant === 'amber' ? colors.amberInk : variant === 'navy' ? colors.white : colors.ink;
  const iconColor = variant === 'navy' ? colors.amber : fg;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, minHeight: small ? TOUCH : 52, opacity: off ? 0.5 : 1, transform: [{ scale: pressed && !off ? 0.985 : 1 }] },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.line },
        variant === 'amber' && !off && s.amberShadow,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={iconColor} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14.5 : 15.5 }} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      {chevron ? (
        <View style={s.btnChev}>
          <Icon name="chevronEnd" size={18} color={fg} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  return <View style={[s.card, highlight && s.cardTop, style]}>{children}</View>;
}

type PillTone = 'green' | 'blue' | 'amber' | 'grey' | 'red';
const PILL: Record<PillTone, [string, string]> = {
  green: [colors.greenSoft, colors.green],
  blue: [colors.blueSoft, colors.blue],
  amber: [colors.amberSoft, colors.amberText],
  grey: [colors.tile, colors.ink2],
  red: [colors.redSoft, colors.red],
};
export function Pill({ label, tone = 'grey', icon }: { label: string; tone?: PillTone; icon?: IconName }) {
  const [bg, fg] = PILL[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: '600' }} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

export function VerificationPill({ level }: { level: VerificationLevel }) {
  const { t } = useI18n();
  const tone: PillTone = level >= 3 ? 'green' : level === 2 ? 'blue' : level === 1 ? 'grey' : 'red';
  return <Pill label={t(`v${level}` as StringKey)} tone={tone} icon={level >= 2 ? 'checkCircle' : level === 0 ? 'warn' : undefined} />;
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} color={rating >= i - 0.25 ? colors.amber : rating >= i - 0.75 ? '#FAD58A' : '#E2E8F0'} />
      ))}
    </View>
  );
}

export function Money({ amount, compact, size = 19, color = colors.ink }: { amount: Baisa; compact?: boolean; size?: number; color?: string }) {
  const p = moneyParts(amount, compact);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', direction: 'ltr', gap: 3 }} accessible accessibilityLabel={`${p.whole}${p.fraction ? '.' + p.fraction : ''} OMR`}>
      <Text style={{ fontSize: size * 0.6, fontWeight: '600', color: colors.ink2 }}>{p.currency}</Text>
      <Text style={{ fontSize: size, fontWeight: '700', color, fontVariant: ['tabular-nums'] }} adjustsFontSizeToFit numberOfLines={1}>
        {p.whole}
        {p.fraction !== null ? <Text style={{ fontSize: size * 0.66, color: colors.ink2 }}>.{p.fraction}</Text> : null}
      </Text>
    </View>
  );
}

export function DayRange({ min, max, size = 17 }: { min: number; max: number; size?: number }) {
  const { dayWord } = useI18n();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      <Num style={{ fontSize: size, fontWeight: '700' }}>{`${min} - ${max}`}</Num>
      <T style={{ fontSize: size * 0.9, fontWeight: '700' }}>{dayWord(max)}</T>
    </View>
  );
}

export function Tile({ label, icon, children, badge }: { label: string; icon?: IconName; children: ReactNode; badge?: ReactNode }) {
  return (
    <View style={s.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        {icon ? <Icon name={icon} size={15} /> : null}
        <T style={{ fontSize: 11.5, color: colors.muted }} center numberOfLines={2}>
          {label}
        </T>
      </View>
      {children}
      {badge}
    </View>
  );
}

export function Ribbon({ label, icon }: { label: string; icon: IconName }) {
  return (
    <View style={s.ribbon}>
      <Icon name={icon} size={14} color={colors.amberInk} />
      <Text style={{ color: colors.amberInk, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const LOGO_COLORS = ['#14213D', '#EA580C', '#1D4ED8', '#0E7490', '#7C3AED', '#B45309', '#BE123C', '#0F766E'];

/** Monogram from the company name (real logos come with verified profiles later). */
export function CompanyLogo({ name, size = 54 }: { name: string; size?: number }) {
  const letter = (name.trim()[0] ?? '?').toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color = LOGO_COLORS[h % LOGO_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: '800', color }}>{letter}</Text>
    </View>
  );
}

/** Illustrated product thumbnails (drawn, not photos). */
export function Thumb({ category, size = 72 }: { category: Category; size?: number }) {
  const wrap: ViewStyle = { width: size, height: size, borderRadius: 14, overflow: 'hidden' };
  if (category === 'c_hvac') {
    return (
      <View style={wrap}>
        <Svg width={size} height={size} viewBox="0 0 80 80">
          <Path d="M0 0h80v80H0z" fill="#E4EAF2" />
          <Path d="M18 20h48a4 4 0 014 4v34a4 4 0 01-4 4H18a4 4 0 01-4-4V24a4 4 0 014-4z" fill="#fff" stroke="#B9C5D6" />
          <Circle cx={34} cy={41} r={13} fill="#E9EEF5" stroke="#9AA9BE" />
          <Path d="M34 29v24M22 41h24M25.5 32.5l17 17M42.5 32.5l-17 17" stroke="#7C8BA1" strokeWidth={2.2} />
          <Circle cx={34} cy={41} r={3} fill="#64748B" />
          <Path d="M53.5 31h6M53.5 35h6M53.5 39h6M53.5 43h6M53.5 47h6" stroke="#B9C5D6" />
        </Svg>
      </View>
    );
  }
  if (category === 'c_pipes') {
    return (
      <View style={wrap}>
        <Svg width={size} height={size} viewBox="0 0 80 80">
          <Path d="M0 0h80v80H0z" fill="#E6EAF0" />
          {[[24, 50, 15], [54, 52, 14], [39, 27, 14], [64, 24, 9]].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="#8D99AA" stroke="#C9D1DC" strokeWidth={3} />
          ))}
          {[[24, 50, 9], [54, 52, 8.5], [39, 27, 8.5], [64, 24, 5.5]].map(([cx, cy, r], i) => (
            <Circle key={'i' + i} cx={cx} cy={cy} r={r} fill="#3C4655" />
          ))}
        </Svg>
      </View>
    );
  }
  if (category === 'c_safety') {
    return (
      <View style={wrap}>
        <Svg width={size} height={size} viewBox="0 0 80 80">
          <Path d="M0 0h80v80H0z" fill="#F8EBD0" />
          <Path d="M14 46c0-15 11-26 26-26s26 11 26 26z" fill="#F4A60F" />
          <Path d="M36 20.5h8V46h-8z" fill="#F8B514" />
          <Path d="M10 46h60v6H10z" fill="#E08A00" />
          <Path d="M18 58c4-4 10-5 15-3l8 4-6 9H22z" fill="#2B2B2B" />
          <Path d="M48 60l10-6c5-1 9 1 11 5l-9 9H48z" fill="#3A3A3A" />
        </Svg>
      </View>
    );
  }
  return (
    <View style={[wrap, { backgroundColor: '#EEF3F9', alignItems: 'center', justifyContent: 'center' }]}>
      <Icon name="bolt" size={size * 0.45} color={colors.amber} />
    </View>
  );
}

export function SectionTitle({ icon, title, action }: { icon: IconName; title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={s.secHead}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Icon name={icon} size={22} color={colors.amber} />
        <T style={{ fontSize: 16.5, fontWeight: '700' }} accessibilityRole="header">
          {title}
        </T>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 }}>
          <T style={{ color: colors.blue, fontWeight: '600', fontSize: 13 }}>{action.label}</T>
          <Icon name="chevronEnd" size={16} color={colors.blue} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Note({ text, tone = 'plain', icon = 'info' }: { text: string; tone?: 'plain' | 'amber'; icon?: IconName }) {
  const amber = tone === 'amber';
  return (
    <View style={[s.note, amber && { backgroundColor: colors.amberSoft, borderColor: '#F8E3B5' }]}>
      <Icon name={icon} size={16} color={amber ? '#7C4A03' : colors.ink2} />
      <T style={{ fontSize: 12, color: amber ? '#7C4A03' : colors.ink2, flex: 1 }}>{text}</T>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16, gap: 8 }}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} color={colors.amber2} />
      </View>
      <T center style={{ fontSize: 16, fontWeight: '700' }}>
        {title}
      </T>
      {body ? (
        <T center style={{ color: colors.muted }}>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={s.check}>
      <View style={[s.box, checked && { backgroundColor: colors.navy, borderColor: colors.navy }]}>{checked ? <Icon name="check" size={15} color={colors.white} /> : null}</View>
      <T style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>{label}</T>
    </Pressable>
  );
}

export function KV({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it, i) => (
        <View key={i} style={s.kv}>
          <T style={{ fontSize: 11, color: colors.muted }}>{it.label}</T>
          {typeof it.value === 'string' ? <T style={{ fontSize: 13.5, fontWeight: '700' }}>{it.value}</T> : it.value}
        </View>
      ))}
    </View>
  );
}

/** Bottom sheet built on Modal (no extra native dependency, works in Expo Go). */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const d = useDir();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="close" />
      <View style={[s.sheet, d.dir, { paddingBottom: insets.bottom + 18 }]} accessibilityViewIsModal>
        <View style={s.grab} />
        <T style={{ fontSize: 18, fontWeight: '700' }} accessibilityRole="header">
          {title}
        </T>
        <ScrollView contentContainerStyle={{ gap: 14 }} style={{ maxHeight: 560 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Lightweight toast; mount once per screen that needs feedback. */
export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const d = useDir();
  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const id = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(onHide), 2400);
    return () => clearTimeout(id);
  }, [message, onHide, opacity]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, d.dir, { opacity }]} accessibilityLiveRegion="polite">
      <Icon name="bolt" size={18} color={colors.amber} />
      <T style={{ color: colors.white, fontWeight: '600', flex: 1 }}>{message}</T>
    </Animated.View>
  );
}

export const s = StyleSheet.create({
  header: { backgroundColor: colors.navy, paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hside: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  htitle: { color: colors.white, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  hbtn: { width: TOUCH, height: TOUCH, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hdot: { position: 'absolute', top: 8, end: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber, borderWidth: 2, borderColor: colors.navy },
  body: { padding: space.lg, gap: 14, paddingBottom: 32 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: radius.md, paddingHorizontal: 18 },
  amberShadow: { shadowColor: colors.amber2, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  btnChev: { position: 'absolute', end: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  cardTop: { borderColor: colors.amber, borderWidth: 1.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  tile: { flex: 1, backgroundColor: colors.tile, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 96 },
  ribbon: { position: 'absolute', top: 0, start: 0, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.amber2, paddingVertical: 5, paddingHorizontal: 14, borderBottomEndRadius: 14, zIndex: 2 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.tile, borderRadius: 14, padding: 12, minHeight: TOUCH },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  kv: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.tile, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,6,23,0.5)' },
  sheet: { position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, gap: 14, ...shadow.raised },
  grab: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D5DCE6', alignSelf: 'center' },
  toast: { position: 'absolute', start: 16, end: 16, bottom: 24, backgroundColor: colors.navy, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card },
});

/**
 * The primitives the design system was missing: search, filters, semantic
 * status, skeletons, error state, list rows and dividers.
 *
 * Everything here is RTL-correct by construction (logical start/end, no
 * manual mirroring) and sized from the tokens, so controls line up across
 * screens without per-screen styling.
 */
import { memo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { Btn, T, useDir } from './components';
import { Icon, type IconName } from './Icon';
import { colors, radius, size, space, TOUCH, type as typo } from '../theme';

/* ------------------------------- search --------------------------------- */

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useI18n();
  const d = useDir();
  return (
    <View style={st.search}>
      <Icon name="funnel" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? t('search_ph')}
        placeholderTextColor={colors.muted}
        style={[st.searchInput, { textAlign: d.start }]}
        accessibilityLabel={placeholder ?? t('search_ph')}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('clear')}>
          <Icon name="minus" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------- filters -------------------------------- */

export interface FilterOption<K extends string> {
  key: K;
  label: string;
  /** Shown beside the label. Omitted when the count is not known. */
  count?: number;
}

/** Buyer-controlled filtering. Nothing is pre-filtered on the user's behalf. */
export function FilterChips<K extends string>({ options, value, onChange }: { options: readonly FilterOption<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[st.chip, on && st.chipOn]}
          >
            <T style={{ ...typo.small, fontWeight: '700', color: on ? colors.amberInk : colors.ink2 }}>
              {o.count == null ? o.label : `${o.label} (${o.count})`}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------- status badge ------------------------------ */

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'danger';

const TONE: Record<StatusTone, { bg: string; fg: string; icon: IconName }> = {
  neutral: { bg: colors.tile, fg: colors.ink2, icon: 'info' },
  info: { bg: colors.infoSoft, fg: colors.info, icon: 'info' },
  progress: { bg: colors.amberSoft, fg: colors.warning, icon: 'clock' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'checkCircle' },
  danger: { bg: colors.errorSoft, fg: colors.error, icon: 'warn' },
};

/** Status always carries an icon and a word, so colour is never the only cue. */
export function StatusBadge({ label, tone = 'neutral', icon }: { label: string; tone?: StatusTone; icon?: IconName }) {
  const look = TONE[tone];
  return (
    <View style={[st.badge, { backgroundColor: look.bg }]}>
      <Icon name={icon ?? look.icon} size={13} color={look.fg} />
      <T style={{ ...typo.tiny, fontWeight: '700', color: look.fg }}>{label}</T>
    </View>
  );
}

/* ------------------------------ skeletons ------------------------------- */

/** A placeholder with the final height, so content does not jump when it loads. */
export function Skeleton({ height = 16, width = '100%', radius: r = radius.sm }: { height?: number; width?: number | `${number}%`; radius?: number }) {
  return <View style={{ height, width, borderRadius: r, backgroundColor: colors.hair }} />;
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.md }} accessibilityLabel={t('loading')} accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={st.skelCard}>
          <Skeleton height={48} width="40%" />
          <Skeleton height={13} width="70%" />
          <Skeleton height={13} width="45%" />
        </View>
      ))}
    </View>
  );
}

/* ----------------------------- error state ------------------------------ */

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
      <View style={st.errorIcon}>
        <Icon name="warn" size={26} color={colors.error} />
      </View>
      <T style={{ ...typo.bodyStrong }} center>{t('err_title')}</T>
      <T style={{ ...typo.small, color: colors.muted, paddingHorizontal: space.lg }} center>{message ?? t('err_generic')}</T>
      {onRetry ? <Btn label={t('retry')} icon="refresh" variant="navy" small onPress={onRetry} /> : null}
    </View>
  );
}

/* ------------------------------- list row ------------------------------- */

/** One tappable row. `leading` is the thumbnail or avatar, `trailing` the value. */
export const ListRow = memo(function ListRow({
  title, subtitle, meta, leading, trailing, onPress, last, accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const body = (
    <View style={[st.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      {leading}
      <View style={{ flex: 1, gap: 3 }}>
        <T style={typo.bodyStrong} numberOfLines={1}>{title}</T>
        {subtitle ? <T style={{ ...typo.small, color: colors.muted }} numberOfLines={1}>{subtitle}</T> : null}
        {meta ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>{meta}</View> : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => (pressed ? { opacity: 0.65 } : undefined)}>
      {body}
    </Pressable>
  );
});

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

/* --------------------------- labelled fact ------------------------------ */

/**
 * One fact with its source. `claimed` marks information the company stated
 * about itself, which must never be shown as if BARQ had verified it.
 */
export function Fact({ label, value, claimed }: { label: string; value: ReactNode; claimed?: boolean }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 3, paddingVertical: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <T style={{ ...typo.tiny, color: colors.muted }}>{label}</T>
        {claimed ? <StatusBadge label={t('self_reported')} tone="neutral" icon="info" /> : null}
      </View>
      {typeof value === 'string' ? <T style={typo.body}>{value}</T> : value}
    </View>
  );
}

/** Searchable, filterable list helpers shared by the list screens. */
export function useSearch<T>(items: readonly T[] | undefined, fields: (item: T) => (string | number | null | undefined)[]) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const result = !q
    ? (items ?? [])
    : (items ?? []).filter((item) => fields(item).some((f) => f != null && String(f).toLowerCase().includes(q)));
  return { query, setQuery, result };
}

export function filterLabel(t: (k: StringKey) => string, key: StringKey) {
  return t(key);
}

const st = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, height: size.input,
    paddingHorizontal: space.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.ink, paddingVertical: 0 },
  chip: {
    minHeight: 36, paddingHorizontal: space.md, justifyContent: 'center',
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.sm },
  skelCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: size.cardPadding, gap: space.sm },
  errorIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.errorSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: TOUCH + 10 },
});

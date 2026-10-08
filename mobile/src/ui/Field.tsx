import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { Sheet, T } from './components';
import { Icon, type IconName } from './Icon';
import { colors, TOUCH } from './theme';

export function Field({ label, error, required = true, children }: { label: string; error?: StringKey | null; required?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: 8 }}>
      <T style={{ fontSize: 15, fontWeight: '700' }}>
        {label}
        {required ? <T style={{ color: colors.error }}> *</T> : null}
      </T>
      {children}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessibilityLiveRegion="polite">
          <Icon name="info" size={15} color={colors.error} />
          <T style={{ color: colors.error, fontSize: 12.5, flex: 1 }}>{t(error)}</T>
        </View>
      ) : null}
    </View>
  );
}

export function SelectBox({ icon, value, placeholder, onPress, error, label }: { icon?: IconName; value?: string; placeholder: string; onPress: () => void; error?: boolean; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? placeholder}`} style={[fs.input, error && fs.inputErr, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      {icon ? <Icon name={icon} size={22} /> : null}
      <T style={{ flex: 1, fontSize: 15, color: value ? colors.ink : '#94A3B8' }}>{value ?? placeholder}</T>
      <Icon name="down" size={20} />
    </Pressable>
  );
}

/** Bottom-sheet single choice list. */
export function PickerSheet<K extends string>({ title, items, value, onPick, onClose, label }: { title: string; items: readonly K[]; value: K | ''; onPick: (k: K) => void; onClose: () => void; label: (k: K) => string }) {
  return (
    <Sheet visible onClose={onClose} title={title}>
      {items.map((k) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onPick(k)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[fs.option, on && { borderColor: colors.navy, backgroundColor: '#EEF2F8' }]}>
            <T style={{ flex: 1, fontSize: 15, fontWeight: on ? '700' : '500' }}>{label(k)}</T>
            {on ? <Icon name="check" size={18} color={colors.navy} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

export const fs = StyleSheet.create({
  input: { minHeight: 56, borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  inputErr: { borderColor: colors.error },
  textInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 4 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
});

export const newIdempotencyKey = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

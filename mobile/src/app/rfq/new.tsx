import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import type { CategoryKey, LocationKey, UnitKey } from '../../data/mock';
import { RFQ_LIMITS, validateRfq, type RfqDraft, type RfqErrors } from '../../domain/validation';
import { newKey, useStore } from '../../state/store';
import { AppHeader, Btn, Screen, Sheet, T, Toast, useDir } from '../../ui/components';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, TOUCH } from '../../ui/theme';

const CATS: CategoryKey[] = ['c_hvac', 'c_pipes', 'c_elec', 'c_safety'];
const UNITS: UnitKey[] = ['u_pcs', 'u_box', 'u_m', 'u_ton'];
const LOCS: LocationKey[] = ['l_seeb', 'l_ruwi', 'l_bawshar', 'l_mawaleh'];
const DATE_OFFSETS = [3, 7, 14, 30];

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Field({ label, error, required = true, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
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
          <T style={{ color: colors.error, fontSize: 12.5 }}>{t(error as StringKey)}</T>
        </View>
      ) : null}
    </View>
  );
}

function SelectBox({ icon, value, placeholder, onPress, error, label }: { icon?: IconName; value?: string; placeholder: string; onPress: () => void; error?: boolean; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? placeholder}`} style={[st.input, error && st.inputErr, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      {icon ? <Icon name={icon} size={22} /> : null}
      <T style={{ flex: 1, fontSize: 15, color: value ? colors.ink : '#94A3B8' }}>{value ?? placeholder}</T>
      <Icon name="down" size={20} />
    </Pressable>
  );
}

type Picker = 'cat' | 'unit' | 'loc' | null;

export default function NewRfq() {
  const i18n = useI18n();
  const { t } = i18n;
  const d = useDir();
  const { createRfq } = useStore();
  const [f, setF] = useState<RfqDraft>({ product: '', category: 'c_hvac', quantity: '10', unit: 'u_pcs', spec: '', location: '', requiredBy: '' });
  const [errors, setErrors] = useState<RfqErrors>({});
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [toast, setToast] = useState<string | null>(null);
  // One idempotency key per form instance: retries and double taps reuse it.
  const key = useRef(newKey('rfq')).current;

  const set = <K extends keyof RfqDraft>(k: K, v: RfqDraft[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const dates = useMemo(() => DATE_OFFSETS.map((n) => { const x = new Date(); x.setDate(x.getDate() + n); return x; }), []);

  const submit = async () => {
    if (busy) return;
    const e = validateRfq(f);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setBusy(true);
    try {
      const id = await createRfq(f, key);
      router.replace({ pathname: '/rfq/[id]', params: { id, sent: '1' } });
    } catch {
      setToast(t('e_send'));
      setBusy(false);
    }
  };

  const qty = Number(f.quantity) || 0;
  const step = (delta: number) => set('quantity', String(Math.min(RFQ_LIMITS.qtyMax, Math.max(RFQ_LIMITS.qtyMin, qty + delta))));

  const pickerItems: Record<Exclude<Picker, null>, { title: string; items: string[]; field: keyof RfqDraft }> = {
    cat: { title: t('f_cat'), items: CATS, field: 'category' },
    unit: { title: t('f_unit'), items: UNITS, field: 'unit' },
    loc: { title: t('f_loc'), items: LOCS, field: 'location' },
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<AppHeader title={t('rfq_title')} back action={<View style={{ width: TOUCH }} />} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={st.headIcon}>
            <Icon name="docPlus" size={28} color={colors.amber2} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 20, fontWeight: '700' }}>{t('add_details')}</T>
            <T style={{ fontSize: 12.5, color: colors.muted }}>{t('add_sub')}</T>
          </View>
        </View>

        <Field label={t('f_prod')} error={errors.product}>
          <View style={[st.input, errors.product && st.inputErr, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Icon name="box" size={22} />
            <TextInput
              value={f.product}
              onChangeText={(v) => set('product', v)}
              placeholder={t('f_prod_ph')}
              placeholderTextColor="#94A3B8"
              maxLength={RFQ_LIMITS.productMax}
              style={[st.textInput, { textAlign: d.start }]}
              accessibilityLabel={t('f_prod')}
              returnKeyType="next"
            />
          </View>
        </Field>

        <Field label={t('f_cat')}>
          <SelectBox label={t('f_cat')} icon="tag" value={t(f.category as StringKey)} placeholder="" onPress={() => setPicker('cat')} />
        </Field>

        <Field label={t('f_qty')} error={errors.quantity}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SelectBox label={t('f_unit')} value={t(f.unit as StringKey)} placeholder="" onPress={() => setPicker('unit')} />
            </View>
            <View style={[st.input, errors.quantity && st.inputErr, { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }]}>
              <Pressable onPress={() => step(1)} style={st.stepBtn} accessibilityRole="button" accessibilityLabel="+">
                <Icon name="plus" size={18} />
              </Pressable>
              <TextInput
                value={f.quantity}
                onChangeText={(v) => set('quantity', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                style={[st.textInput, { textAlign: 'center', fontSize: 20, fontWeight: '600' }]}
                accessibilityLabel={t('f_qty')}
              />
              <Pressable onPress={() => step(-1)} style={st.stepBtn} accessibilityRole="button" accessibilityLabel="-">
                <Icon name="minus" size={18} />
              </Pressable>
            </View>
          </View>
        </Field>

        <Field label={t('f_spec')} error={errors.spec}>
          <View style={[st.input, errors.spec && st.inputErr, { minHeight: 130, paddingBottom: 30 }]}>
            <TextInput
              value={f.spec}
              onChangeText={(v) => set('spec', v)}
              placeholder={t('f_spec_ph')}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={RFQ_LIMITS.specMax}
              style={[st.textInput, { textAlign: d.start, textAlignVertical: 'top', minHeight: 90 }]}
              accessibilityLabel={t('f_spec')}
            />
            <T style={{ position: 'absolute', bottom: 10, end: 14, fontSize: 12, color: colors.muted }}>{`${f.spec.length}/${RFQ_LIMITS.specMax}`}</T>
          </View>
        </Field>

        <Field label={t('f_loc')} error={errors.location}>
          <SelectBox label={t('f_loc')} icon="pin" value={f.location ? t(f.location as StringKey) : undefined} placeholder={t('f_loc')} onPress={() => setPicker('loc')} error={!!errors.location} />
        </Field>

        <Field label={t('f_date')} error={errors.requiredBy}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dates.map((dt) => {
              const v = isoDate(dt);
              const on = f.requiredBy === v;
              return (
                <Pressable key={v} onPress={() => set('requiredBy', v)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[st.chip, on && st.chipOn]}>
                  <Icon name="cal" size={16} color={on ? colors.white : colors.ink2} />
                  <T style={{ fontWeight: '600', fontSize: 13, color: on ? colors.white : colors.ink }}>{dt.toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short' })}</T>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <View style={st.info}>
          <Icon name="shield" size={28} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>{t('send_all')}</T>
            <T style={{ fontSize: 12, color: colors.muted }}>{t('send_all_s')}</T>
          </View>
        </View>

        <Btn label={busy ? t('sending') : t('send')} icon={busy ? undefined : 'bolt'} loading={busy} onPress={submit} />
      </Screen>

      {picker ? (
        <Sheet visible onClose={() => setPicker(null)} title={pickerItems[picker].title}>
          {pickerItems[picker].items.map((k) => {
            const on = f[pickerItems[picker].field] === k;
            return (
              <Pressable
                key={k}
                onPress={() => { set(pickerItems[picker].field, k); setPicker(null); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[st.option, on && { borderColor: colors.navy, backgroundColor: '#EEF2F8' }]}
              >
                <T style={{ flex: 1, fontSize: 15, fontWeight: on ? '700' : '500' }}>{t(k as StringKey)}</T>
                {on ? <Icon name="check" size={18} color={colors.navy} /> : null}
              </Pressable>
            );
          })}
        </Sheet>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  headIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 56, borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  inputErr: { borderColor: colors.error },
  textInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 4 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0F5FD', borderWidth: 1, borderColor: '#E0E9F7', borderRadius: 16, padding: 14 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
});

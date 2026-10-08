import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { CATEGORIES, LOCATIONS, UNITS, type Category, type Location, type Unit } from '../../../api/types';
import { useCreateRfq } from '../../../api/queries';
import { errorKey } from '../../../api/errors';
import { RFQ_LIMITS, validateRfq, type RfqDraft, type RfqErrors } from '../../../domain/validation';
import { AppHeader, Btn, Screen, T, useDir } from '../../../ui/components';
import { Field, PickerSheet, SelectBox, fs, newIdempotencyKey } from '../../../ui/Field';
import { Icon } from '../../../ui/Icon';
import { colors } from '../../../ui/theme';

const DATE_OFFSETS = [3, 7, 14, 30];
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
type Picker = 'cat' | 'unit' | 'loc' | null;

export default function NewRfq() {
  const i18n = useI18n();
  const { t } = i18n;
  const d = useDir();
  const create = useCreateRfq();
  const [f, setF] = useState<RfqDraft>({ product: '', category: 'c_hvac', quantity: '1', unit: 'u_pcs', spec: '', location: '', requiredBy: '' });
  const [errors, setErrors] = useState<RfqErrors>({});
  const [serverError, setServerError] = useState<StringKey | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  // One key per form: a double tap or a network retry can never create two RFQs.
  const key = useRef(newIdempotencyKey('rfq')).current;

  const set = <K extends keyof RfqDraft>(k: K, v: RfqDraft[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const dates = useMemo(() => DATE_OFFSETS.map((n) => { const x = new Date(); x.setDate(x.getDate() + n); return x; }), []);

  const submit = () => {
    if (create.isPending) return;
    const e = validateRfq(f);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setServerError(null);
    create.mutate(
      { title: f.product.trim(), category: f.category, quantity: Number(f.quantity), unit: f.unit, spec: f.spec.trim(), location: f.location, requiredBy: f.requiredBy, idempotencyKey: key },
      {
        onSuccess: (rfq) => router.replace({ pathname: '/buyer/rfq/[id]', params: { id: rfq.id } }),
        onError: (err) => setServerError(errorKey(err)),
      },
    );
  };

  const qty = Number(f.quantity) || 0;
  const step = (delta: number) => set('quantity', String(Math.min(RFQ_LIMITS.qtyMax, Math.max(RFQ_LIMITS.qtyMin, qty + delta))));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<AppHeader title={t('rfq_title')} back />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={st.headIcon}>
            <Icon name="docPlus" size={28} color={colors.amber2} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 20, fontWeight: '700' }}>{t('add_details')}</T>
            <T style={{ fontSize: 12.5, color: colors.muted }}>{t('add_sub')}</T>
          </View>
        </View>

        <Field label={t('f_prod')} error={errors.product as StringKey | undefined}>
          <View style={[fs.input, errors.product && fs.inputErr, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Icon name="box" size={22} />
            <TextInput value={f.product} onChangeText={(v) => set('product', v)} placeholder={t('f_prod_ph')} placeholderTextColor="#94A3B8" maxLength={RFQ_LIMITS.productMax} style={[fs.textInput, { textAlign: d.start }]} accessibilityLabel={t('f_prod')} />
          </View>
        </Field>

        <Field label={t('f_cat')}>
          <SelectBox label={t('f_cat')} icon="tag" value={t(f.category as StringKey)} placeholder="" onPress={() => setPicker('cat')} />
        </Field>

        <Field label={t('f_qty')} error={errors.quantity as StringKey | undefined}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SelectBox label={t('f_unit')} value={t(f.unit as StringKey)} placeholder="" onPress={() => setPicker('unit')} />
            </View>
            <View style={[fs.input, errors.quantity && fs.inputErr, { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }]}>
              <Pressable onPress={() => step(1)} style={fs.stepBtn} accessibilityRole="button" accessibilityLabel="+"><Icon name="plus" size={18} /></Pressable>
              <TextInput value={f.quantity} onChangeText={(v) => set('quantity', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} style={[fs.textInput, { textAlign: 'center', fontSize: 20, fontWeight: '600' }]} accessibilityLabel={t('f_qty')} />
              <Pressable onPress={() => step(-1)} style={fs.stepBtn} accessibilityRole="button" accessibilityLabel="-"><Icon name="minus" size={18} /></Pressable>
            </View>
          </View>
        </Field>

        <Field label={t('f_spec')} error={errors.spec as StringKey | undefined}>
          <View style={[fs.input, errors.spec && fs.inputErr, { minHeight: 130, paddingBottom: 30 }]}>
            <TextInput value={f.spec} onChangeText={(v) => set('spec', v)} placeholder={t('f_spec_ph')} placeholderTextColor="#94A3B8" multiline maxLength={RFQ_LIMITS.specMax} style={[fs.textInput, { textAlign: d.start, textAlignVertical: 'top', minHeight: 90 }]} accessibilityLabel={t('f_spec')} />
            <T style={{ position: 'absolute', bottom: 10, end: 14, fontSize: 12, color: colors.muted }}>{`${f.spec.length}/${RFQ_LIMITS.specMax}`}</T>
          </View>
        </Field>

        <Field label={t('f_loc')} error={errors.location as StringKey | undefined}>
          <SelectBox label={t('f_loc')} icon="pin" value={f.location ? t(f.location as StringKey) : undefined} placeholder={t('f_loc')} onPress={() => setPicker('loc')} error={!!errors.location} />
        </Field>

        <Field label={t('f_date')} error={errors.requiredBy as StringKey | undefined}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dates.map((dt) => {
              const v = isoDate(dt);
              const on = f.requiredBy === v;
              return (
                <Pressable key={v} onPress={() => set('requiredBy', v)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
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
        {serverError ? <T style={{ color: colors.error }} accessibilityLiveRegion="polite">{t(serverError)}</T> : null}
        <Btn label={create.isPending ? t('sending') : t('send')} icon={create.isPending ? undefined : 'bolt'} loading={create.isPending} onPress={submit} />
      </Screen>

      {picker === 'cat' ? <PickerSheet<Category> title={t('f_cat')} items={CATEGORIES} value={f.category as Category} label={(k) => t(k)} onClose={() => setPicker(null)} onPick={(k) => { set('category', k); setPicker(null); }} /> : null}
      {picker === 'unit' ? <PickerSheet<Unit> title={t('f_unit')} items={UNITS} value={f.unit as Unit} label={(k) => t(k)} onClose={() => setPicker(null)} onPick={(k) => { set('unit', k); setPicker(null); }} /> : null}
      {picker === 'loc' ? <PickerSheet<Location> title={t('f_loc')} items={LOCATIONS} value={f.location as Location | ''} label={(k) => t(k)} onClose={() => setPicker(null)} onPick={(k) => { set('location', k); setPicker(null); }} /> : null}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  headIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0F5FD', borderWidth: 1, borderColor: '#E0E9F7', borderRadius: 16, padding: 14 },
});

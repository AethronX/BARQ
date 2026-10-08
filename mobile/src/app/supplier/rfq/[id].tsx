import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAuth } from '../../../auth/AuthProvider';
import { useMyQuote, useOrders, useSubmitQuote, useSupplierRfqs, useWithdrawQuote } from '../../../api/queries';
import { errorKey } from '../../../api/errors';
import { PAYMENT_TERMS, type PaymentTerms } from '../../../api/types';
import { AppHeader, Btn, Card, KV, Money, Note, Num, Pill, Screen, Sheet, T, Thumb, Toast, VerificationPill } from '../../../ui/components';
import { Field, fs } from '../../../ui/Field';
import { formatDate, parseOmr, rfqRef } from '../../../ui/format';
import { useNow } from '../../../ui/RfqRow';
import { QueryState } from '../../../ui/states';
import { colors } from '../../../ui/theme';
import type { VerificationLevel } from '../../../domain/score';

const VALIDITY = [7, 14, 30];
const MAX_VERSIONS = 5;
const isoIn = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const toOmrText = (baisa: number) => (baisa / 1000).toFixed(3).replace(/\.?0+$/, '');

export default function SupplierRfqDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const i18n = useI18n();
  const { t } = i18n;
  const { company } = useAuth();
  const list = useSupplierRfqs();
  const mine = useMyQuote(id);
  const orders = useOrders();
  const submit = useSubmitQuote();
  const withdraw = useWithdrawQuote();
  const now = useNow(30_000);
  const [form, setForm] = useState({ price: '', minDays: '', maxDays: '', warranty: '12', terms: 'NET_30' as PaymentTerms, notes: '', validity: 14 });
  const [errors, setErrors] = useState<{ price?: StringKey; days?: StringKey; warranty?: StringKey }>({});
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const r = list.data?.find((x) => x.id === id);
  const q = mine.data;
  const order = orders.data?.find((o) => o.rfq_id === id);
  const open = !!r && (r.status === 'OPEN' || r.status === 'QUOTES_RECEIVED') && new Date(r.closes_at).getTime() > now;
  const canEdit = open && (!q || q.status === 'SUBMITTED' || q.status === 'WITHDRAWN') && (q?.version ?? 0) < MAX_VERSIONS && (company?.verification ?? 0) >= 1;

  // Prefill the form from the existing quote once loaded.
  useEffect(() => {
    if (!q) return;
    setForm((f) => ({ ...f, price: toOmrText(q.unit_price_baisa), minDays: String(q.min_days), maxDays: String(q.max_days), warranty: String(q.warranty_months), terms: q.payment_terms, notes: q.notes ?? '' }));
  }, [q]);

  const unitBaisa = parseOmr(form.price);
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const send = () => {
    if (!r || submit.isPending) return;
    const e: typeof errors = {};
    const minD = Number(form.minDays), maxD = Number(form.maxDays), w = Number(form.warranty);
    if (!unitBaisa) e.price = 'e_price';
    if (!Number.isInteger(minD) || !Number.isInteger(maxD) || minD < 1 || maxD > 365 || maxD < minD) e.days = 'e_days';
    if (!Number.isInteger(w) || w < 0 || w > 120) e.warranty = 'e_warranty';
    setErrors(e);
    if (Object.keys(e).length) return;
    submit.mutate(
      { rfqId: r.id, unitPriceBaisa: unitBaisa!, minDays: minD, maxDays: maxD, warrantyMonths: w, paymentTerms: form.terms, notes: form.notes.trim(), validUntil: isoIn(form.validity) },
      { onSuccess: () => setToast(q ? t('q_updated') : t('q_sent')), onError: (err) => setToast(t(errorKey(err))) },
    );
  };

  const numInput = (k: 'minDays' | 'maxDays' | 'warranty', label: StringKey, err?: boolean) => (
    <View style={{ flex: 1, gap: 6 }}>
      <T style={{ fontSize: 12.5, fontWeight: '600' }}>{t(label)}</T>
      <View style={[fs.input, err && fs.inputErr]}>
        <TextInput value={form[k]} onChangeText={(v) => set(k, v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={3} editable={canEdit} style={[fs.textInput, { textAlign: 'center', fontSize: 17, fontWeight: '600' }]} accessibilityLabel={t(label)} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<AppHeader title={t('rfq_details')} back />} onRefresh={() => { list.refetch(); mine.refetch(); }} refreshing={list.isRefetching}>
        <QueryState isPending={list.isPending} error={list.error} onRetry={() => list.refetch()}>
          {r ? (
            <>
              <Card style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Thumb category={r.category} size={60} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <T style={{ fontSize: 17, fontWeight: '700' }}>{r.title}</T>
                    <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }}>{rfqRef(r.number)}</Num>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <T style={{ fontSize: 12, color: colors.muted }}>{t('buyer')}:</T>
                      <VerificationPill level={r.buyer_verification as VerificationLevel} />
                    </View>
                  </View>
                </View>
                <KV
                  items={[
                    { label: t('quantity'), value: `${r.quantity} ${t(r.unit as StringKey)}` },
                    { label: t('location'), value: t(r.location as StringKey) },
                    { label: t('required_by'), value: formatDate(i18n, r.required_by) },
                    { label: t('closes_in'), value: open ? formatDate(i18n, r.closes_at) : t('closed') },
                  ]}
                />
                <View style={{ gap: 4 }}>
                  <T style={{ fontSize: 12, color: colors.muted }}>{t('spec')}</T>
                  <T>{r.spec}</T>
                </View>
              </Card>

              {order ? <Btn label={t('view_order')} variant="navy" icon="list" chevron onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} /> : null}

              <Card style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <T style={{ fontSize: 16, fontWeight: '700' }}>{t('q_form')}</T>
                  {q ? <Pill label={`${t(`qs_${q.status}` as StringKey)} · ${t('version_n', { n: q.version })}`} tone={q.status === 'AWARDED' ? 'green' : q.status === 'SUBMITTED' ? 'blue' : 'grey'} /> : null}
                </View>
                {!open ? <Note text={t('q_closed_note')} icon="lock" /> : null}

                <Field label={t('q_unit_price')} error={errors.price}>
                  <View style={[fs.input, errors.price && fs.inputErr, { flexDirection: 'row', alignItems: 'center', gap: 8, direction: 'ltr' }]}>
                    <T style={{ color: colors.muted, fontWeight: '700' }}>OMR</T>
                    <TextInput value={form.price} onChangeText={(v) => set('price', v)} keyboardType="decimal-pad" editable={canEdit} placeholder="0.000" placeholderTextColor="#94A3B8" maxLength={14} style={[fs.textInput, { fontSize: 18, fontWeight: '700', textAlign: 'left' }]} accessibilityLabel={t('q_unit_price')} />
                  </View>
                  {unitBaisa ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <T style={{ fontSize: 12.5, color: colors.muted }}>{t('q_total_preview', { q: r.quantity, u: t(r.unit as StringKey) })}</T>
                      <Money amount={unitBaisa * r.quantity} size={15} />
                    </View>
                  ) : null}
                </Field>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {numInput('minDays', 'q_min_days', !!errors.days)}
                    {numInput('maxDays', 'q_max_days', !!errors.days)}
                    {numInput('warranty', 'q_warranty', !!errors.warranty)}
                  </View>
                  {errors.days ? <T style={{ color: colors.error, fontSize: 12.5 }}>{t(errors.days)}</T> : null}
                  {errors.warranty ? <T style={{ color: colors.error, fontSize: 12.5 }}>{t(errors.warranty)}</T> : null}
                </View>

                <Field label={t('q_terms')}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PAYMENT_TERMS.map((p) => {
                      const on = form.terms === p;
                      return (
                        <Pressable key={p} disabled={!canEdit} onPress={() => set('terms', p)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
                          <T style={{ fontWeight: '600', fontSize: 13, color: on ? colors.white : colors.ink }}>{t(`pt_${p}` as StringKey)}</T>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>

                <Field label={t('q_valid')} required={false}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {VALIDITY.map((v) => {
                      const on = form.validity === v;
                      return (
                        <Pressable key={v} disabled={!canEdit} onPress={() => set('validity', v)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
                          <T style={{ fontWeight: '600', fontSize: 13, color: on ? colors.white : colors.ink }}>{`${v} ${i18n.dayWord(v)}`}</T>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>

                <Field label={t('q_notes')} required={false}>
                  <View style={[fs.input, { minHeight: 90 }]}>
                    <TextInput value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={1000} editable={canEdit} style={[fs.textInput, { textAlignVertical: 'top', minHeight: 70 }]} accessibilityLabel={t('q_notes')} />
                  </View>
                </Field>

                <Note text={t('q_private')} icon="lock" />
                {q && canEdit ? <T style={{ fontSize: 12, color: colors.muted }}>{t('q_revisions_left', { n: MAX_VERSIONS - q.version })}</T> : null}
                {canEdit ? <Btn label={q && q.status === 'SUBMITTED' ? t('q_update') : t('q_submit')} icon="bolt" loading={submit.isPending} onPress={send} /> : null}
                {q?.status === 'SUBMITTED' && open ? <Btn label={t('q_withdraw')} variant="ghost" small onPress={() => setConfirmWithdraw(true)} /> : null}
              </Card>
            </>
          ) : (
            <Note text={t('err_not_found')} />
          )}
        </QueryState>
      </Screen>

      <Sheet visible={confirmWithdraw} onClose={() => setConfirmWithdraw(false)} title={t('q_withdraw')}>
        <T>{t('q_withdraw_q')}</T>
        <Btn
          label={t('q_withdraw')}
          variant="navy"
          loading={withdraw.isPending}
          onPress={() => q && withdraw.mutate(q.id, { onSettled: () => setConfirmWithdraw(false), onSuccess: () => setToast(t('q_withdrawn')), onError: (e) => setToast(t(errorKey(e))) })}
        />
        <Btn label={t('cancel')} variant="ghost" small onPress={() => setConfirmWithdraw(false)} />
      </Sheet>
      <Toast message={toast} onHide={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { useAuth } from '../../auth/AuthProvider';
import { useAdvanceOrder, useOrder } from '../../api/queries';
import { errorKey } from '../../api/errors';
import type { OrderStatus } from '../../api/types';
import { ORDER_TIMELINE } from '../../domain/stateMachines';
import { AppHeader, Btn, Card, CompanyLogo, DayRange, KV, Money, Note, Num, Screen, Sheet, T, Thumb, Toast } from '../../ui/components';
import { Timeline } from '../../ui/Timeline';
import { fs } from '../../ui/Field';
import { formatDate, formatStamp, rfqRef } from '../../ui/format';
import { QueryState } from '../../ui/states';
import { colors } from '../../ui/theme';
import { OrderStatusPill } from '../../screens/common';
import { RoleGate } from '../../screens/RoleGate';
import { AdminOrderOverride } from '../../screens/AdminOverride';

/** Next step each party may take (mirrors advance_order on the server). */
const SUPPLIER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PROCESSING', PROCESSING: 'READY_FOR_SHIPMENT', READY_FOR_SHIPMENT: 'SHIPPED', SHIPPED: 'DELIVERED',
};
const BUYER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = { DELIVERED: 'COMPLETED' };

function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const i18n = useI18n();
  const { t } = i18n;
  const { profile, company } = useAuth();
  const q = useOrder(id);
  const advance = useAdvanceOrder();
  const [step, setStep] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const data = q.data;
  const o = data?.order;
  const isSupplier = !!o && company?.id === o.supplier_company_id;
  const isBuyer = !!o && company?.id === o.buyer_company_id;
  const next = o ? (isSupplier ? SUPPLIER_NEXT[o.status] : isBuyer ? BUYER_NEXT[o.status] : undefined) : undefined;
  const timeline: OrderStatus[] =
    o?.status === 'CANCELLED' ? (data?.events ?? []).map((e) => e.status) : [...ORDER_TIMELINE, 'COMPLETED'];
  const times = Object.fromEntries((data?.events ?? []).map((e) => [e.status, e.created_at]));
  const current = o ? timeline.lastIndexOf(o.status) : -1;

  const confirm = () => {
    if (!o || !step) return;
    advance.mutate(
      { orderId: o.id, to: step, note },
      { onSuccess: () => { setStep(null); setNote(''); }, onError: (e) => { setStep(null); setToast(t(errorKey(e))); } },
    );
  };

  return (
    <>
      <Screen header={<AppHeader title={t('o_title')} back />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()}>
          {o && data ? (
            <>
              <Card style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {o.rfq ? <Thumb category={o.rfq.category} size={52} /> : null}
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 15.5, fontWeight: '700' }}>{o.rfq?.title}</T>
                    <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }}>{`#${o.number}${o.rfq ? ' · ' + rfqRef(o.rfq.number) : ''}`}</Num>
                  </View>
                  <OrderStatusPill status={o.status} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <CompanyLogo name={(isBuyer ? o.supplier?.name : o.buyer?.name) ?? '?'} size={40} />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 11.5, color: colors.muted }}>{isBuyer ? t('supplier') : t('buyer')}</T>
                    <T style={{ fontWeight: '700' }}>{(isBuyer ? o.supplier?.name : o.buyer?.name) ?? ''}</T>
                  </View>
                </View>
                <KV
                  items={[
                    { label: t('agreed'), value: <Money amount={o.total_baisa} size={16} /> },
                    {
                      label: times.DELIVERED ? t('eta_confirmed') : t('eta_estimated'),
                      value: times.DELIVERED
                        ? formatDate(i18n, times.DELIVERED)
                        : <DayRange min={data.quote.min_days} max={data.quote.max_days} size={14} />,
                    },
                    { label: t('quantity'), value: o.rfq ? `${o.rfq.quantity} ${t(o.rfq.unit as StringKey)}` : '' },
                    { label: t('location'), value: o.rfq ? t(o.rfq.location as StringKey) : '' },
                    { label: t('terms'), value: t(`pt_${data.quote.payment_terms}` as StringKey) },
                    { label: t('required_by'), value: o.rfq ? formatDate(i18n, o.rfq.required_by) : '' },
                  ]}
                />
                {!times.DELIVERED ? <Note text={t('eta_estimated_note')} icon="clock" /> : null}
                <Note text={`${t('delivery_by_supplier')} · ${t('pay_v')}`} icon="truck" />
              </Card>

              <Card style={{ padding: 16, gap: 14 }}>
                <Timeline
                  steps={timeline.map((s) => ({ key: s, label: t(`os_${s}` as StringKey), time: times[s] ? formatStamp(i18n, times[s]) : undefined }))}
                  current={current}
                />
                {data.events.filter((e) => e.note).map((e) => (
                  <Note key={e.id} text={`${t(`os_${e.status}` as StringKey)}: ${e.note}`} icon="chat" />
                ))}
              </Card>

              {next ? (
                <Btn label={t(`mark_${next}` as StringKey)} icon="check" chevron onPress={() => setStep(next)} />
              ) : o.status === 'COMPLETED' ? (
                <Note text={t('order_done')} icon="checkCircle" />
              ) : o.status !== 'CANCELLED' ? (
                <Note text={isBuyer ? t('waiting_supplier') : t('waiting_buyer')} icon="clock" />
              ) : null}
              <Note text={`${t('dispute')} ${t('dispute_s')}`} icon="help" />
              {profile?.role === 'admin' ? <AdminOrderOverride orderId={o.id} current={o.status} onToast={setToast} /> : null}
            </>
          ) : null}
        </QueryState>
      </Screen>

      {step ? (
        <Sheet visible onClose={() => !advance.isPending && setStep(null)} title={t(`mark_${step}` as StringKey)}>
          {step === 'COMPLETED' ? <T>{t('delivered_q')}</T> : null}
          {profile?.role === 'supplier' ? (
            <View style={{ gap: 6 }}>
              <T style={{ fontWeight: '600' }}>{t('step_note')}</T>
              <View style={fs.input}>
                <TextInput value={note} onChangeText={setNote} placeholder={t('step_note_ph')} placeholderTextColor="#94A3B8" maxLength={500} style={fs.textInput} />
              </View>
            </View>
          ) : null}
          <Btn label={t(`mark_${step}` as StringKey)} icon="check" loading={advance.isPending} onPress={confirm} />
          <Btn label={t('cancel')} variant="ghost" small disabled={advance.isPending} onPress={() => setStep(null)} />
        </Sheet>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

export default function OrderScreen() {
  return (
    <RoleGate>
      <OrderDetail />
    </RoleGate>
  );
}

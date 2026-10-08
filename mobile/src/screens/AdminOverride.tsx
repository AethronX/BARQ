/**
 * Admin status override for an order.
 *
 * An admin may move an order to any state — support staff must be able to
 * unstick a real-world situation the state machine did not anticipate. The
 * override is not silent: a written reason is required, both parties are
 * notified, the reason is added to the order timeline, and the change is
 * recorded in the audit log as an override rather than a normal step.
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { OrderStatus } from '../api/types';
import { useAdminForceOrderStatus } from '../api/queries';
import { errorKey } from '../api/errors';
import { Btn, Card, Note, Sheet, T } from '../ui/components';
import { fs } from '../ui/Field';
import { colors } from '../ui/theme';

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED',
];

export function AdminOrderOverride({ orderId, current, onToast }: { orderId: string; current: OrderStatus; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(current);
  const [reason, setReason] = useState('');
  const force = useAdminForceOrderStatus();

  return (
    <>
      <Card style={{ padding: 14, gap: 10, borderColor: colors.amber }}>
        <T style={{ fontWeight: '700', fontSize: 13.5 }}>{t('a_override')}</T>
        <T style={{ fontSize: 12, color: colors.muted }}>{t('a_override_note')}</T>
        <Btn label={t('a_override_open')} variant="navy" small icon="sliders" onPress={() => { setStatus(current); setReason(''); setOpen(true); }} />
      </Card>

      {open ? (
        <Sheet visible onClose={() => !force.isPending && setOpen(false)} title={t('a_override')}>
          <Note text={t('a_override_warn')} tone="amber" icon="warn" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ALL_ORDER_STATUSES.map((s) => {
              const on = status === s;
              return (
                <Pressable key={s} onPress={() => setStatus(s)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
                  <T style={{ fontWeight: '600', fontSize: 12.5, color: on ? colors.white : colors.ink }}>{t(`os_${s}` as StringKey)}</T>
                </Pressable>
              );
            })}
          </View>
          <View style={[fs.input, { minHeight: 80 }]}>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t('a_reason_ph')}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              style={[fs.textInput, { textAlignVertical: 'top', minHeight: 60 }]}
            />
          </View>
          <Btn
            label={t('a_apply')}
            icon="check"
            disabled={reason.trim().length < 5 || status === current}
            loading={force.isPending}
            onPress={() =>
              force.mutate(
                { orderId, status, reason },
                { onSuccess: () => setOpen(false), onError: (e) => { setOpen(false); onToast(t(errorKey(e))); } },
              )
            }
          />
          <Btn label={t('close')} variant="ghost" small disabled={force.isPending} onPress={() => setOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}

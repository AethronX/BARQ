import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { ORDER_TIMELINE, SHIPMENT_STEPS } from '../../domain/stateMachines';
import { useStore } from '../../state/store';
import { AppHeader, Btn, Card, CompanyLogo, DayRange, EmptyState, KV, Money, Num, Pill, Screen, T } from '../../ui/components';
import { formatStamp } from '../../ui/format';
import { Icon, type IconName } from '../../ui/Icon';
import { Timeline } from '../../ui/Timeline';
import { colors } from '../../ui/theme';

function Option({ icon, title, sub, onPress, navy }: { icon: IconName; title: string; sub: string; onPress: () => void; navy?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: navy ? '#E8ECF4' : colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={24} color={navy ? colors.navy3 : colors.amber2} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontSize: 14.5, fontWeight: '700' }}>{title}</T>
          <T style={{ fontSize: 12, color: colors.muted }}>{sub}</T>
        </View>
        <Icon name="chevronEnd" size={20} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

export default function Orders() {
  const i18n = useI18n();
  const { t, L } = i18n;
  const { order, chooseSupplierDelivery } = useStore();

  if (!order) {
    return (
      <Screen header={<AppHeader title={t('o_title')} />}>
        <EmptyState
          icon="list"
          title={t('o_none')}
          body={t('o_none_s')}
          action={<Btn label={t('cmp_title')} variant="navy" small style={{ marginTop: 8, paddingHorizontal: 22 }} onPress={() => router.push({ pathname: '/rfq/[id]', params: { id: '0147' } })} />}
        />
      </Screen>
    );
  }

  const q = order.quote;
  const shipIdx = order.shipment ? SHIPMENT_STEPS.indexOf(order.shipment.status) : -1;
  const progress = order.shipment ? shipIdx / (SHIPMENT_STEPS.length - 1) : 0;

  return (
    <Screen header={<AppHeader title={t('o_title')} />}>
      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CompanyLogo logo={q.logo} size={50} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 15, fontWeight: '700' }}>{L(q.name)}</T>
            <Num style={{ fontSize: 12, color: colors.muted, alignSelf: 'flex-start' }}>{`ORD-${order.id} · RFQ #BARQ-2025-${order.rfqId}`}</Num>
          </View>
          <Pill label={t(`os_${order.status}` as StringKey)} tone="green" />
        </View>
        <KV
          items={[
            { label: t('agreed'), value: <Money amount={q.total} size={16} /> },
            { label: t('eta'), value: <DayRange min={q.minDays} max={q.maxDays} size={14} /> },
            { label: t('terms'), value: L(q.terms) },
            { label: t('pay'), value: t('pay_v') },
          ]}
        />
        <Timeline
          steps={ORDER_TIMELINE.map((s) => ({ key: s, label: t(`os_${s}` as StringKey), time: order.times[s] ? formatStamp(i18n, order.times[s]!) : undefined }))}
          current={ORDER_TIMELINE.indexOf(order.status)}
        />
      </Card>

      {!order.delivery ? (
        <View style={{ gap: 10 }}>
          <T style={{ fontSize: 16, fontWeight: '700' }}>{t('deliv_how')}</T>
          <Option icon="building" title={t('opt_sup')} sub={t('opt_sup_s')} onPress={chooseSupplierDelivery} navy />
          <Option icon="truck" title={t('opt_local')} sub={t('opt_local_s')} onPress={() => router.push('/delivery')} />
          <Option icon="ship" title={t('opt_intl')} sub={t('opt_intl_s')} onPress={() => router.push('/international')} navy />
        </View>
      ) : (
        <Card style={{ padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="truck" size={21} color={colors.amber2} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{L(order.delivery.name)}</T>
              <T style={{ fontSize: 12, color: colors.muted }}>{t(`ss_${order.shipment!.status}` as StringKey)}</T>
            </View>
            <Pill label={`${Math.round(progress * 100)}%`} tone="amber" />
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E8ECF2', overflow: 'hidden' }}>
            <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.amber, borderRadius: 4 }} />
          </View>
          <Btn label={t('track_btn')} variant="navy" icon="truck" chevron small onPress={() => router.push('/track')} />
        </Card>
      )}
    </Screen>
  );
}

import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { SHIPMENT_STEPS } from '../domain/stateMachines';
import { useStore } from '../state/store';
import { AppHeader, Btn, Card, MockBanner, Note, T, useDir } from '../ui/components';
import { Attrs, Banner, Endpoint, PinCircle, RouteCard } from '../ui/Banner';
import { formatStamp } from '../ui/format';
import { Icon } from '../ui/Icon';
import { Timeline } from '../ui/Timeline';
import { colors } from '../ui/theme';

export default function Track() {
  const i18n = useI18n();
  const { t, L } = i18n;
  const d = useDir();
  const { order, advanceShipment, ensureDemoOrder } = useStore();

  // Opening tracking directly (e.g. in a demo) creates a sample order + shipment.
  useEffect(() => {
    if (!order?.shipment) ensureDemoOrder(true);
  }, [order?.shipment, ensureDemoOrder]);

  if (!order?.shipment || !order.delivery) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  const sh = order.shipment;
  const idx = SHIPMENT_STEPS.indexOf(sh.status);
  const done = sh.status === 'DELIVERED';

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      <AppHeader title={t('tr_title')} back />
      <MockBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Banner icon="truck" title={t(`ss_${sh.status}` as StringKey)} sub={`SHP-${order.id}`} />
        <RouteCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Endpoint label={t('from')} title={L(order.quote.name)} icon={<PinCircle icon="building" />} />
            <Icon name="arrowEnd" size={22} />
            <Endpoint label={t('to')} title={t(order.location as StringKey)} icon={<PinCircle icon="pin" />} alignEnd />
          </View>
          <Attrs
            items={[
              { icon: 'truck', label: t('carrier'), value: L(order.delivery.name) },
              { icon: 'clock', label: t('eta_l'), value: L(order.delivery.eta) },
            ]}
          />
        </RouteCard>
        <View style={{ padding: 16, gap: 14 }}>
          <Card style={{ padding: 16, gap: 14 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E8ECF2', overflow: 'hidden' }}>
              <View style={{ width: `${(idx / (SHIPMENT_STEPS.length - 1)) * 100}%`, height: '100%', backgroundColor: colors.amber }} />
            </View>
            <Timeline
              steps={SHIPMENT_STEPS.map((s) => ({ key: s, label: t(`ss_${s}` as StringKey), time: sh.times[s] ? formatStamp(i18n, sh.times[s]!) : undefined }))}
              current={idx}
            />
          </Card>
          {done ? (
            <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" size={21} color={colors.greenIcon} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }}>{t('pod')}</T>
                <T style={{ fontSize: 12, color: colors.muted }}>{t('pod_v')}</T>
              </View>
            </Card>
          ) : (
            <Btn label={t('sim')} icon="truck" onPress={advanceShipment} />
          )}
          <Note text={t('sim_note')} />
        </View>
      </ScrollView>
    </View>
  );
}

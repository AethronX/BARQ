import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { CARRIERS, SUPPLIERS, type Carrier, type CarrierFeature } from '../data/mock';
import { useStore } from '../state/store';
import { AppHeader, Btn, Checkbox, CompanyLogo, KV, MockBanner, Money, Note, Pill, Sheet, T, Tile, useDir } from '../ui/components';
import { Attrs, Banner, Endpoint, PinCircle, RouteCard } from '../ui/Banner';
import { Icon, type IconName } from '../ui/Icon';
import { Features, Meta, OfferCard } from '../ui/OfferCard';
import { colors, TOUCH } from '../ui/theme';

type Sort = 'best' | 'near' | 'fast' | 'cheap';
const SORTS: { key: Sort; icon: IconName; label: StringKey }[] = [
  { key: 'best', icon: 'trophy', label: 'c_best' },
  { key: 'near', icon: 'pin', label: 'c_near' },
  { key: 'fast', icon: 'clock', label: 'c_fast' },
  { key: 'cheap', icon: 'dollar', label: 'c_cheap' },
];
const FEAT: Record<CarrierFeature, { icon: IconName; label: StringKey }> = {
  ins: { icon: 'shield', label: 'feat_ins' },
  track: { icon: 'truck', label: 'feat_track' },
  support: { icon: 'headset', label: 'feat_support' },
  pod: { icon: 'camera', label: 'feat_pod' },
  cod: { icon: 'dollar', label: 'feat_cod' },
};

/** Simple published value formula for carriers: price 50%, speed 30%, rating 20%. */
function value(c: Carrier, minPrice: number) {
  return 0.5 * (minPrice / c.price) + 0.3 * (24 / c.etaHours) + 0.2 * (c.rating / 5);
}

export default function Delivery() {
  const i18n = useI18n();
  const { t, L } = i18n;
  const d = useDir();
  const { order, chooseCarrier, ensureDemoOrder } = useStore();
  const [sort, setSort] = useState<Sort>('best');
  const [pick, setPick] = useState<{ carrier: Carrier; ok: boolean } | null>(null);

  const minPrice = Math.min(...CARRIERS.map((c) => c.price));
  const minHours = Math.min(...CARRIERS.map((c) => c.etaHours));
  const list = useMemo(() => {
    const by: Record<Sort, (a: Carrier, b: Carrier) => number> = {
      best: (a, b) => value(b, minPrice) - value(a, minPrice),
      near: (a, b) => a.distanceKm - b.distanceKm,
      fast: (a, b) => a.etaHours - b.etaHours || a.price - b.price,
      cheap: (a, b) => a.price - b.price,
    };
    return [...CARRIERS].sort(by[sort]);
  }, [sort, minPrice]);

  const supplierName = order ? L(order.quote.name) : L(SUPPLIERS[0].name);
  const sortCfg = SORTS.find((s) => s.key === sort)!;

  const confirm = () => {
    if (!pick?.ok) return;
    if (!order) ensureDemoOrder(false);
    chooseCarrier(pick.carrier.id);
    setPick(null);
    router.replace('/track');
  };

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      <AppHeader title={t('local_t')} back />
      <MockBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Banner icon="truck" title={t('local_t')} sub={t('local_s')} />
        <RouteCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Endpoint label={t('from')} title={t('sup_wh')} sub={supplierName} icon={<PinCircle icon="building" />} />
            <Icon name="arrowEnd" size={22} />
            <Endpoint label={t('to')} title={t('cust')} sub={t((order?.location ?? 'l_seeb') as StringKey)} icon={<PinCircle icon="pin" />} alignEnd />
          </View>
          <Attrs
            items={[
              { icon: 'truck', label: t('a_type'), value: t('a_type_v') },
              { icon: 'cal', label: t('dur'), value: t('eta_today') },
              { icon: 'cube', label: t('a_cargo'), value: t('a_cargo_v') },
              { icon: 'shield', label: t('a_ins'), value: t('a_ins_v') },
            ]}
          />
        </RouteCard>
        <View style={{ padding: 16, gap: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={d.dir}>
            {SORTS.map((s) => {
              const on = s.key === sort;
              return (
                <Pressable key={s.key} onPress={() => setSort(s.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH + 2, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: on ? colors.amber : colors.line, backgroundColor: on ? colors.amber : colors.card }}>
                  <Icon name={s.icon} size={19} color={on ? colors.amberInk : colors.ink2} />
                  <T style={{ fontWeight: '700', fontSize: 13, color: on ? colors.amberInk : colors.ink }}>{t(s.label)}</T>
                </Pressable>
              );
            })}
          </ScrollView>
          <Note text={t('demo_prov')} />
          {list.map((c, i) => (
            <OfferCard
              key={c.id}
              name={L(c.name)}
              logo={c.logo}
              subtitle={L(c.tagline)}
              rating={c.rating}
              reviews={c.reviews}
              ribbon={i === 0 ? { label: t(sortCfg.label), icon: 'trophy' } : undefined}
              tiles={
                <>
                  <Tile label={t('dur')} icon="clock" badge={c.etaHours === minHours ? <Pill label={t('fast_badge')} tone="green" icon="bolt" /> : null}>
                    <T style={{ fontWeight: '700', fontSize: 15 }} center>{t(c.etaKey)}</T>
                  </Tile>
                  <Tile label={t('total')} badge={c.price === minPrice ? <Pill label={t('lowest')} tone="green" /> : null}>
                    <Money amount={c.price} compact />
                  </Tile>
                </>
              }
              meta={<Meta icon="pin" text={t('km', { k: c.distanceKm })} />}
              acceptLabel={t('accept')}
              acceptDisabled={!!order?.delivery}
              onAccept={() => setPick({ carrier: c, ok: false })}
              footer={<Features items={c.features.map((f) => ({ icon: FEAT[f].icon, label: t(FEAT[f].label) }))} />}
            />
          ))}
        </View>
      </ScrollView>

      {pick ? (
        <Sheet visible onClose={() => setPick(null)} title={t('cf_del')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CompanyLogo logo={pick.carrier.logo} size={48} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{L(pick.carrier.name)}</T>
              <T style={{ fontSize: 12, color: colors.muted }}>{L(pick.carrier.tagline)}</T>
            </View>
          </View>
          <KV items={[{ label: t('total'), value: <Money amount={pick.carrier.price} size={16} /> }, { label: t('dur'), value: t(pick.carrier.etaKey) }]} />
          <Note text={t('demo_prov')} />
          <Checkbox checked={pick.ok} onChange={(ok) => setPick({ ...pick, ok })} label={t('cf_del_chk')} />
          <Btn label={t('accept')} icon="check" disabled={!pick.ok} onPress={confirm} />
          <Btn label={t('cancel')} variant="ghost" small onPress={() => setPick(null)} />
        </Sheet>
      ) : null}
    </View>
  );
}

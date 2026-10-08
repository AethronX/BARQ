import { ScrollView, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useI18n } from '../i18n/I18nProvider';
import { FORWARDERS } from '../data/mock';
import { AppHeader, DayRange, MockBanner, Money, Note, T, Tile, useDir } from '../ui/components';
import { Attrs, Banner, Endpoint, RouteCard } from '../ui/Banner';
import { Icon } from '../ui/Icon';
import { Features, OfferCard } from '../ui/OfferCard';
import { colors } from '../ui/theme';

function Flag({ country }: { country: 'om' | 'cn' }) {
  return (
    <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: colors.white }}>
      <Svg width={46} height={46} viewBox="0 0 46 46">
        {country === 'cn' ? (
          <>
            <Rect width={46} height={46} fill="#DE2910" />
            <Path d="M14 9l2.1 6.4h6.7l-5.4 4 2 6.4L14 21.9l-5.4 3.9 2-6.4-5.4-4h6.7z" fill="#FFDE00" />
          </>
        ) : (
          <>
            <Rect width={46} height={46} fill="#fff" />
            <Rect y={15.3} width={46} height={15.4} fill="#DB161B" />
            <Rect y={30.7} width={46} height={15.3} fill="#008000" />
            <Rect width={14} height={46} fill="#DB161B" />
          </>
        )}
      </Svg>
    </View>
  );
}

/** Design preview only: international freight is out of first-launch scope. */
export default function International() {
  const { t, L } = useI18n();
  const d = useDir();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, d.dir]}>
      <AppHeader title={t('intl_t')} back sub="sub_log" />
      <MockBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Banner icon="ship" title={t('intl_h')} sub={t('intl_s')} kind="port" />
        <RouteCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Endpoint title={t('oman')} sub={t('omanc')} icon={<Flag country="om" />} />
            <View style={{ alignItems: 'center' }}>
              <Icon name="ship" size={24} />
              <T style={{ fontSize: 12, fontWeight: '700' }} center>{t('sea_land')}</T>
            </View>
            <Endpoint title={t('china')} sub={t('shanghai')} icon={<Flag country="cn" />} alignEnd />
          </View>
          <Attrs
            items={[
              { icon: 'cube', label: t('g_v'), value: '120 m³' },
              { icon: 'bag', label: t('g_w'), value: '12,500 kg' },
              { icon: 'box', label: t('g_type'), value: t('g_type_v') },
            ]}
          />
        </RouteCard>
        <View style={{ padding: 16, gap: 14 }}>
          <Note text={t('intl_note')} tone="amber" />
          {FORWARDERS.map((f, i) => (
            <OfferCard
              key={f.id}
              name={L(f.name)}
              logo={f.logo}
              subtitle={L(f.tagline)}
              rating={f.rating}
              ribbon={i === 0 ? { label: t('c_best'), icon: 'star' } : undefined}
              tiles={
                <>
                  <Tile label={t('transit_d')} icon="cal">
                    <DayRange min={f.minDays} max={f.maxDays} />
                  </Tile>
                  <Tile label={t('total')}>
                    <Money amount={f.price} compact />
                  </Tile>
                </>
              }
              acceptLabel={t('intl_off')}
              acceptIcon="lock"
              acceptDisabled
              footer={<Features items={[{ icon: 'ship', label: t('opt_intl') }, { icon: 'shield', label: t('feat_ins') }]} />}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

import { Pressable, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { useStore } from '../../state/store';
import { useDir } from '../../ui/components';
import { Icon, type IconName } from '../../ui/Icon';
import { colors } from '../../ui/theme';

const TABS: Record<string, { icon: IconName; label: StringKey }> = {
  index: { icon: 'home', label: 't_home' },
  rfqs: { icon: 'doc', label: 't_rfqs' },
  orders: { icon: 'list', label: 't_orders' },
  alerts: { icon: 'bell', label: 't_alerts' },
  more: { icon: 'dots', label: 't_more' },
};

/** Navy tab bar from the mockups; order follows the reading direction. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useI18n();
  const { unread, order } = useStore();
  const insets = useSafeAreaInsets();
  const d = useDir();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.navy, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4 }, d.dir]}>
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === index;
        const dot = (route.name === 'alerts' && unread > 0) || (route.name === 'orders' && !!order && order.status !== 'DELIVERED');
        const color = focused ? colors.amber : '#E2E8F0';
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(cfg.label)}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, minHeight: 52, paddingTop: 2 }}
          >
            <View>
              <Icon name={cfg.icon} size={25} color={color} />
              {dot ? <View style={{ position: 'absolute', top: -2, end: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber, borderWidth: 2, borderColor: colors.navy }} /> : null}
            </View>
            <Text style={{ color, fontSize: 12, fontWeight: focused ? '700' : '500' }} maxFontSizeMultiplier={1.2}>
              {t(cfg.label)}
            </Text>
            {focused ? <View style={{ width: 48, height: 3, borderRadius: 2, backgroundColor: colors.amber, marginTop: 2 }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rfqs" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

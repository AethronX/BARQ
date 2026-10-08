import { Pressable, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { useNotifications } from '../api/queries';
import { useDir } from '../ui/components';
import { Icon, type IconName } from '../ui/Icon';
import { colors } from '../ui/theme';
import { RoleSwitcher } from './RoleSwitcher';

export type TabDef = { name: string; icon: IconName; label: StringKey };

/** Navy tab bar from the mockups; order follows the reading direction. */
export function RoleTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} tabs={tabs} />}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

function TabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const { t } = useI18n();
  const { session } = useAuth();
  const notifs = useNotifications(session?.user.id);
  const unread = notifs.data?.filter((n) => !n.read_at).length ?? 0;
  const insets = useSafeAreaInsets();
  const d = useDir();
  return (
    <View>
    <RoleSwitcher />
    <View style={[{ flexDirection: 'row', backgroundColor: colors.navy, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4 }, d.dir]}>
      {state.routes.map((route, index) => {
        const cfg = tabs.find((x) => x.name === route.name);
        if (!cfg) return null;
        const focused = state.index === index;
        const dot = route.name === 'alerts' && unread > 0;
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
            <Text style={{ color, fontSize: 12, fontWeight: focused ? '700' : '500' }} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {t(cfg.label)}
            </Text>
            {focused ? <View style={{ width: 44, height: 3, borderRadius: 2, backgroundColor: colors.amber, marginTop: 2 }} /> : null}
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}

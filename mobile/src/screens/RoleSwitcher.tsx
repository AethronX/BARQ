import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { DEMO_MODE } from '../auth/demo';
import { errorKey } from '../api/errors';
import type { Role } from '../api/types';
import { Toast, useDir } from '../ui/components';
import { Icon, type IconName } from '../ui/Icon';
import { colors } from '../ui/theme';
import { homeFor } from './RoleGate';

const ROLES: { role: Role; icon: IconName; label: StringKey }[] = [
  { role: 'buyer', icon: 'docPlus', label: 'role_buyer' },
  { role: 'supplier', icon: 'truck', label: 'role_supplier' },
  { role: 'admin', icon: 'shield', label: 'role_admin' },
];

/** Demo-only bar for switching between the parties' views in one tap. */
export function RoleSwitcher() {
  const { t } = useI18n();
  const d = useDir();
  const { profile, switchRole, switching } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  if (!DEMO_MODE || !profile) return null;

  const go = async (role: Role) => {
    if (switching || role === profile.role) return;
    try {
      await switchRole(role);
      router.replace(homeFor(role));
    } catch (e) {
      setToast(t(errorKey(e)));
    }
  };

  return (
    <>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0B1222', paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#1E2A44' }, d.dir]}>
        <Text style={{ color: colors.amber, fontSize: 10.5, fontWeight: '700' }}>{t('demo_view')}</Text>
        {ROLES.map((r) => {
          const on = r.role === profile.role;
          return (
            <Pressable
              key={r.role}
              onPress={() => go(r.role)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, borderRadius: 10, backgroundColor: on ? colors.amber : 'rgba(255,255,255,0.06)' }}
            >
              <Icon name={r.icon} size={15} color={on ? colors.amberInk : '#CBD5E1'} />
              <Text style={{ color: on ? colors.amberInk : '#E2E8F0', fontWeight: '700', fontSize: 12.5 }}>{t(r.label)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Modal visible={switching} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.navy, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 28, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.amber} />
            <Text style={{ color: colors.white, fontWeight: '600' }}>{t('demo_switching')}</Text>
          </View>
        </View>
      </Modal>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

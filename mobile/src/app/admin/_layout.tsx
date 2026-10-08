import { Stack } from 'expo-router';
import { RoleGate } from '../../screens/RoleGate';
import { colors } from '../../ui/theme';

/** Admin screens. Every admin action is re-checked by the database (is_admin). */
export default function AdminLayout() {
  return (
    <RoleGate role="admin">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RoleGate>
  );
}

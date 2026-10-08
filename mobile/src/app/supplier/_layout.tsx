import { Stack } from 'expo-router';
import { RoleGate } from '../../screens/RoleGate';
import { colors } from '../../ui/theme';

export default function SupplierLayout() {
  return (
    <RoleGate role="supplier">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RoleGate>
  );
}

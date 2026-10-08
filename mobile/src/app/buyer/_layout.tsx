import { Stack } from 'expo-router';
import { RoleGate } from '../../screens/RoleGate';
import { colors } from '../../ui/theme';

export default function BuyerLayout() {
  return (
    <RoleGate role="buyer">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RoleGate>
  );
}

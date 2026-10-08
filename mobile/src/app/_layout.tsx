import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../i18n/I18nProvider';
import { StoreProvider } from '../state/store';
import { colors } from '../ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
        </StoreProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

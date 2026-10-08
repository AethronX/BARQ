import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { errorKey } from '../api/errors';
import { Btn, EmptyState, T } from './components';
import { Icon } from './Icon';
import { colors } from './theme';

/** Uniform loading / error / empty handling for query-backed screens. */
export function QueryState({
  isPending,
  error,
  onRetry,
  isEmpty,
  empty,
  children,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty?: boolean;
  empty?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (isPending) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.navy} />
        <T style={{ color: colors.muted }}>{t('loading')}</T>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ paddingVertical: 36, alignItems: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="warn" size={26} color={colors.red} />
        </View>
        <T center style={{ color: colors.ink2 }}>{t(errorKey(error))}</T>
        <Btn label={t('retry')} variant="ghost" small onPress={onRetry} style={{ paddingHorizontal: 24 }} />
      </View>
    );
  }
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}

export { EmptyState };

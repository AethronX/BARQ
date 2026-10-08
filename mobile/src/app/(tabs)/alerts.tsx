import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/store';
import { AppHeader, Card, EmptyState, Screen } from '../../ui/components';
import { NotifRow } from '../../ui/NotifRow';

export default function Alerts() {
  const { t } = useI18n();
  const { notifs, markAlertsRead } = useStore();
  useFocusEffect(useCallback(() => markAlertsRead(), [markAlertsRead]));
  return (
    <Screen header={<AppHeader title={t('t_alerts')} />}>
      <Card style={{ paddingHorizontal: 16 }}>
        {notifs.length ? notifs.map((n, i) => <NotifRow key={n.id} n={n} last={i === notifs.length - 1} />) : <EmptyState icon="bell" title={t('n_none')} />}
      </Card>
    </Screen>
  );
}

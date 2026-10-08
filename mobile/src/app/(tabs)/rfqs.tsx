import { View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '../../i18n/I18nProvider';
import { useStore } from '../../state/store';
import { AppHeader, Btn, Card, Screen } from '../../ui/components';
import { RfqRow } from '../../ui/RfqRow';

export default function Rfqs() {
  const { t } = useI18n();
  const { rfqs, quotes } = useStore();
  return (
    <Screen header={<AppHeader title={t('t_rfqs')} />}>
      <Btn label={t('newrfq')} icon="docPlus" onPress={() => router.push('/rfq/new')} />
      <Card style={{ paddingHorizontal: 16 }}>
        <View>
          {rfqs.map((r, i) => (
            <RfqRow key={r.id} rfq={r} quoteCount={quotes[r.id]?.length ?? 0} last={i === rfqs.length - 1} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

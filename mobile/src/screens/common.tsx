import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import Constants from 'expo-constants';
import { useI18n } from '../i18n/I18nProvider';
import type { Lang, StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { useMarkRead, useNotifications, useOrders, useRequestDeletion } from '../api/queries';
import { errorKey } from '../api/errors';
import type { OrderStatus, Role } from '../api/types';
import { AppHeader, Btn, Card, CompanyLogo, EmptyState, Money, Num, Pill, Screen, Sheet, T, Thumb, Toast, VerificationPill } from '../ui/components';
import { Icon, type IconName } from '../ui/Icon';
import { formatDate, formatStamp, isToday, notifText } from '../ui/format';
import { QueryState } from '../ui/states';
import { colors } from '../ui/theme';
import { homeFor, routeForLink } from './RoleGate';
import { DEMO_MODE } from '../auth/demo';

/** Header with the role's notification bell wired up. */
export function RoleHeader(props: Omit<ComponentProps<typeof AppHeader>, 'onBell' | 'unread'>) {
  const { session, profile } = useAuth();
  const n = useNotifications(session?.user.id);
  const unread = n.data?.filter((x) => !x.read_at).length ?? 0;
  const base = profile ? homeFor(profile.role) : '/';
  return <AppHeader {...props} unread={unread} onBell={() => router.navigate(`${base}/alerts` as Href)} />;
}

/** Banner shown while BARQ has not verified the company yet. */
export function PendingNotice() {
  const { t } = useI18n();
  const { profile, company } = useAuth();
  if (!profile || !company || company.verification >= 1) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.amberSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F8E3B5' }}>
      <Icon name="shield" size={26} color={colors.amberText} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '700', color: '#7C4A03' }}>{t('pending_t')}</T>
        <T style={{ fontSize: 12.5, color: '#7C4A03' }}>{profile.role === 'supplier' ? t('pending_supplier') : t('pending_buyer')}</T>
      </View>
    </View>
  );
}

const ORDER_TONE: Record<OrderStatus, ComponentProps<typeof Pill>['tone']> = {
  PENDING: 'grey', CONFIRMED: 'blue', PROCESSING: 'amber', READY_FOR_SHIPMENT: 'amber', SHIPPED: 'amber', DELIVERED: 'green', COMPLETED: 'green', CANCELLED: 'red',
};
export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <Pill label={t(`os_${status}` as StringKey)} tone={ORDER_TONE[status]} />;
}

const KIND_LOOK: Record<string, { icon: IconName; bg: string; fg: string }> = {
  rfq_new: { icon: 'doc', bg: colors.blueSoft, fg: colors.blue },
  quote_new: { icon: 'chat', bg: colors.greenSoft, fg: colors.greenIcon },
  quote_updated: { icon: 'chat', bg: colors.blueSoft, fg: colors.blue },
  quote_withdrawn: { icon: 'warn', bg: colors.redSoft, fg: colors.red },
  quote_awarded: { icon: 'trophy', bg: colors.amberSoft, fg: colors.amber2 },
  quote_not_selected: { icon: 'info', bg: '#E8ECF4', fg: colors.navy3 },
  rfq_cancelled: { icon: 'warn', bg: colors.redSoft, fg: colors.red },
  order_status: { icon: 'truck', bg: colors.amberSoft, fg: colors.amber2 },
  verification_changed: { icon: 'shield', bg: colors.greenSoft, fg: colors.greenIcon },
};

export function AlertsScreen() {
  const i18n = useI18n();
  const { t } = i18n;
  const { session, profile } = useAuth();
  const q = useNotifications(session?.user.id);
  const markRead = useMarkRead();
  const hasUnread = !!q.data?.some((n) => !n.read_at);
  useFocusEffect(
    useCallback(() => {
      if (hasUnread) markRead.mutate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasUnread]),
  );
  return (
    <Screen header={<AppHeader title={t('t_alerts')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!q.data?.length} empty={<EmptyState icon="bell" title={t('n_none')} />}>
        <Card style={{ paddingHorizontal: 16 }}>
          {q.data?.map((n, i) => {
            const look = KIND_LOOK[n.kind] ?? { icon: 'info' as IconName, bg: colors.tile, fg: colors.ink2 };
            const target = profile ? routeForLink(profile.role, n.link) : null;
            return (
              <Pressable
                key={n.id}
                disabled={!target}
                onPress={() => target && router.push(target as Href)}
                accessibilityRole={target ? 'button' : undefined}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i < q.data!.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}
              >
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={look.icon} size={21} color={look.fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontSize: 13.5, fontWeight: n.read_at ? '500' : '700' }}>{notifText(i18n, n)}</T>
                  <T style={{ fontSize: 11.5, color: colors.muted }}>{isToday(n.created_at) ? t('today') : formatDate(i18n, n.created_at)} · {formatStamp(i18n, n.created_at).split(' ').slice(-2).join(' ')}</T>
                </View>
                {!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber }} /> : null}
              </Pressable>
            );
          })}
        </Card>
      </QueryState>
    </Screen>
  );
}

export function OrdersScreen() {
  const i18n = useI18n();
  const { t } = i18n;
  const { profile } = useAuth();
  const q = useOrders();
  const isBuyer = profile?.role === 'buyer';
  return (
    <Screen header={<RoleHeader title={t('t_orders')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <QueryState
        isPending={q.isPending}
        error={q.error}
        onRetry={() => q.refetch()}
        isEmpty={!q.data?.length}
        empty={<EmptyState icon="list" title={t('orders_empty')} body={isBuyer ? t('orders_empty_buyer') : t('orders_empty_supplier')} />}
      >
        {q.data?.map((o) => {
          const party = isBuyer ? o.supplier?.name : o.buyer?.name;
          return (
            <Pressable key={o.id} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} accessibilityRole="button">
              <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {o.rfq ? <Thumb category={o.rfq.category} size={56} /> : null}
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontWeight: '700' }} numberOfLines={1}>{o.rfq?.title ?? ''}</T>
                  <T style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{party ?? ''}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <OrderStatusPill status={o.status} />
                    <Num style={{ fontSize: 12, color: colors.muted }}>{`#${o.number}`}</Num>
                  </View>
                </View>
                <Money amount={o.total_baisa} size={15} compact />
              </Card>
            </Pressable>
          );
        })}
      </QueryState>
    </Screen>
  );
}

function Row({ icon, label, sub, right, onPress, danger, last }: { icon: IconName; label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const body = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 54 }, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <Icon name={icon} size={22} color={danger ? colors.red : colors.ink2} />
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600', color: danger ? colors.red : colors.ink }}>{label}</T>
        {sub ? <T style={{ fontSize: 12, color: colors.muted }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

export function MoreScreen() {
  const i18n = useI18n();
  const { t, lang, setLang } = i18n;
  const { profile, company, signOut } = useAuth();
  const del = useRequestDeletion();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (del.error) setToast(t(errorKey(del.error)));
  }, [del.error, t]);
  const seg = (l: Lang, label: string) => (
    <Pressable key={l} onPress={() => setLang(l)} accessibilityRole="button" accessibilityState={{ selected: lang === l }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9, backgroundColor: lang === l ? colors.navy : 'transparent' }}>
      <Text style={{ color: lang === l ? colors.white : colors.muted, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
  const roleLabel: Record<Role, StringKey> = { buyer: 'role_buyer', supplier: 'role_supplier', admin: 't_overview' };
  return (
    <>
      <Screen header={<AppHeader title={t('t_more')} />}>
        {profile ? (
          <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <CompanyLogo name={company?.name ?? profile.full_name} size={58} />
            <View style={{ flex: 1, gap: 4 }}>
              <T style={{ fontSize: 16, fontWeight: '700' }}>{company?.name ?? 'BARQ'}</T>
              <T style={{ fontSize: 12.5, color: colors.muted }}>{profile.full_name} · {t(roleLabel[profile.role])}</T>
              <T style={{ fontSize: 12, color: colors.muted }}>{profile.email ?? ''}</T>
              {company ? <VerificationPill level={company.verification} /> : null}
            </View>
          </Card>
        ) : null}
        {profile?.role === 'admin' ? (
          <Card style={{ paddingHorizontal: 16 }}>
            <Row icon="users" label={t('a_users')} sub={t('a_role_note')} onPress={() => router.push('/admin/users')} last />
          </Card>
        ) : null}
        <Card style={{ paddingHorizontal: 16 }}>
          <Row icon="globe" label={t('lang')} right={<View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 3, direction: 'ltr' }}>{[seg('ar', 'العربية'), seg('en', 'English')]}</View>} />
          <Row icon="help" label={t('help')} sub={t('help_v')} />
          <Row icon="lock" label={t('privacy')} right={<Pill label={t('soon')} />} />
          <Row icon="doc" label={t('terms_l')} right={<Pill label={t('soon')} />} />
          <Row icon="info" label={t('version')} right={<Num style={{ color: colors.muted }}>{Constants.expoConfig?.version ?? '1.0.0'}</Num>} last />
        </Card>
        <Card style={{ paddingHorizontal: 16 }}>
          {DEMO_MODE ? null : <Row icon="arrowEnd" label={t('sign_out')} onPress={() => signOut().then(() => router.replace('/sign-in'))} />}
          {profile?.deletion_requested_at ? (
            <Row icon="warn" label={t('delete_account')} sub={t('delete_requested', { d: formatDate(i18n, profile.deletion_requested_at) })} danger last />
          ) : (
            <Row icon="warn" label={t('delete_account')} onPress={() => setConfirmDelete(true)} danger last />
          )}
        </Card>
      </Screen>
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('delete_account')}>
        <T>{t('delete_q')}</T>
        <Btn label={t('delete_go')} variant="navy" loading={del.isPending} onPress={() => del.mutate(undefined, { onSettled: () => setConfirmDelete(false) })} />
        <Btn label={t('cancel')} variant="ghost" small onPress={() => setConfirmDelete(false)} />
      </Sheet>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}


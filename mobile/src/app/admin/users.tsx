import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import type { StringKey } from '../../i18n/strings';
import { useAdminAnonymizeProfile, useAdminProfiles, useAdminSetRole, type AdminProfile } from '../../api/queries';
import { errorKey } from '../../api/errors';
import type { Role } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader, Btn, Card, Checkbox, CompanyLogo, EmptyState, Note, Pill, Screen, Sheet, T, Toast } from '../../ui/components';
import { fs } from '../../ui/Field';
import { QueryState } from '../../ui/states';
import { colors } from '../../ui/theme';

const ROLES: Role[] = ['buyer', 'supplier', 'admin'];
const ROLE_LABEL: Record<Role, StringKey> = { buyer: 'role_buyer', supplier: 'role_supplier', admin: 't_overview' };

/**
 * User administration: roles and the execution of account-deletion requests.
 * Both are server-checked and audited; an admin cannot act on their own row,
 * so the console can never lock itself out.
 */
export default function AdminUsers() {
  const { t } = useI18n();
  const { session } = useAuth();
  const q = useAdminProfiles();
  const setRole = useAdminSetRole();
  const anonymize = useAdminAnonymizeProfile();
  const [pendingOnly, setPendingOnly] = useState(false);
  const [sheet, setSheet] = useState<{ p: AdminProfile; role: Role; reason: string; mode: 'role' | 'anon'; ok: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(
    () => (q.data ?? []).filter((p) => !pendingOnly || p.deletion_requested_at != null),
    [q.data, pendingOnly],
  );
  const busy = setRole.isPending || anonymize.isPending;
  const fail = (e: unknown) => { setSheet(null); setToast(t(errorKey(e))); };

  return (
    <>
      <Screen header={<AppHeader title={t('a_users')} back />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <Checkbox checked={pendingOnly} onChange={setPendingOnly} label={t('a_pending_del')} />
        <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} empty={<EmptyState icon="users" title={t('a_audit_empty')} />}>
          {rows.map((p) => {
            const self = p.id === session?.user.id;
            return (
              <Card key={p.id} style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CompanyLogo name={p.full_name || '?'} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.full_name}</T>
                  <T style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{p.email ?? '—'}</T>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Pill label={t(ROLE_LABEL[p.role])} tone={p.role === 'admin' ? 'blue' : 'grey'} />
                    {p.company ? <Pill label={p.company.name} tone="grey" /> : null}
                    {p.deletion_requested_at ? <Pill label={t('a_deletion_requested')} tone="red" icon="warn" /> : null}
                  </View>
                </View>
                {self ? (
                  <Pill label={t('a_you')} tone="amber" />
                ) : (
                  <Pressable onPress={() => setSheet({ p, role: p.role, reason: '', mode: 'role', ok: false })} accessibilityRole="button" hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
                    <T style={{ fontSize: 12, fontWeight: '700', color: colors.blue }}>{t('a_manage')}</T>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </QueryState>
      </Screen>

      {sheet ? (
        <Sheet visible onClose={() => !busy && setSheet(null)} title={t('a_manage')}>
          <T style={{ fontWeight: '700' }}>{sheet.p.full_name}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={t('a_set_role')} variant={sheet.mode === 'role' ? 'navy' : 'ghost'} small onPress={() => setSheet({ ...sheet, mode: 'role', ok: false })} />
            <Btn label={t('a_anonymize')} variant={sheet.mode === 'anon' ? 'navy' : 'ghost'} small onPress={() => setSheet({ ...sheet, mode: 'anon', ok: false })} />
          </View>

          {sheet.mode === 'role' ? (
            <>
              <Note text={t('a_role_note')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ROLES.map((r) => {
                  const on = sheet.role === r;
                  return (
                    <Pressable key={r} onPress={() => setSheet({ ...sheet, role: r })} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
                      <T style={{ fontWeight: '600', fontSize: 13, color: on ? colors.white : colors.ink }}>{t(ROLE_LABEL[r])}</T>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Note text={t('a_anon_note')} tone="amber" icon="warn" />
          )}

          <View style={[fs.input, { minHeight: 80 }]}>
            <TextInput
              value={sheet.reason}
              onChangeText={(reason) => setSheet({ ...sheet, reason })}
              placeholder={t('a_reason_ph')}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              style={[fs.textInput, { textAlignVertical: 'top', minHeight: 60 }]}
            />
          </View>

          {sheet.mode === 'anon' ? <Checkbox checked={sheet.ok} onChange={(ok) => setSheet({ ...sheet, ok })} label={t('a_anon_confirm')} /> : null}

          <Btn
            label={sheet.mode === 'role' ? t('a_apply') : t('a_anonymize')}
            icon="check"
            disabled={sheet.reason.trim().length < 5 || (sheet.mode === 'role' ? sheet.role === sheet.p.role : !sheet.ok)}
            loading={busy}
            onPress={() =>
              sheet.mode === 'role'
                ? setRole.mutate({ userId: sheet.p.id, role: sheet.role, reason: sheet.reason }, { onSuccess: () => setSheet(null), onError: fail })
                : anonymize.mutate({ userId: sheet.p.id, reason: sheet.reason }, { onSuccess: () => setSheet(null), onError: fail })
            }
          />
          <Btn label={t('close')} variant="ghost" small disabled={busy} onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

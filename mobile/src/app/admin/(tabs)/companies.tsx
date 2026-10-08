import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useI18n } from '../../../i18n/I18nProvider';
import type { StringKey } from '../../../i18n/strings';
import { useAllCompanies, useSetVerification } from '../../../api/queries';
import { AdminCompanySheet } from '../../../screens/AdminControl';
import { errorKey } from '../../../api/errors';
import type { Company } from '../../../api/types';
import { Btn, Card, Checkbox, CompanyLogo, EmptyState, Note, Screen, Sheet, T, Toast, VerificationPill } from '../../../ui/components';
import { fs } from '../../../ui/Field';
import { formatDate } from '../../../ui/format';
import { QueryState } from '../../../ui/states';
import { RoleHeader } from '../../../screens/common';
import { colors } from '../../../ui/theme';
import type { VerificationLevel } from '../../../domain/score';

export default function AdminCompanies() {
  const i18n = useI18n();
  const { t } = i18n;
  const q = useAllCompanies();
  const setLevel = useSetVerification();
  const [pendingOnly, setPendingOnly] = useState(true);
  const [edit, setEdit] = useState<{ c: Company; level: VerificationLevel; note: string } | null>(null);
  const [manage, setManage] = useState<Company | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const rows = (q.data ?? []).filter((c) => !pendingOnly || c.verification === 0);

  return (
    <>
      <Screen header={<RoleHeader title={t('t_companies')} />} onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <Checkbox checked={pendingOnly} onChange={setPendingOnly} label={t('a_filter_pending')} />
        <QueryState isPending={q.isPending} error={q.error} onRetry={() => q.refetch()} isEmpty={!rows.length} empty={<EmptyState icon="building" title={t('a_audit_empty')} />}>
          {rows.map((c) => (
            <Pressable key={c.id} onPress={() => setEdit({ c, level: c.verification, note: '' })} accessibilityRole="button">
              <Card style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <CompanyLogo name={c.name} size={46} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={{ fontWeight: '700' }}>{c.name}</T>
                  <T style={{ fontSize: 12, color: colors.muted }}>
                    {t(c.kind === 'buyer' ? 'role_buyer' : 'role_supplier')} · {c.cr_number ? t('a_cr', { n: c.cr_number }) : t('a_no_cr')} · {formatDate(i18n, c.created_at)}
                  </T>
                  {c.categories.length ? <T style={{ fontSize: 12, color: colors.muted }}>{c.categories.map((x) => t(x as StringKey)).join('، ')}</T> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <VerificationPill level={c.verification} />
                  <Pressable onPress={() => setManage(c)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 28, justifyContent: 'center' }}>
                    <T style={{ fontSize: 12, fontWeight: '700', color: colors.blue }}>{t('a_manage')}</T>
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          ))}
        </QueryState>
      </Screen>

      {edit ? (
        <Sheet visible onClose={() => !setLevel.isPending && setEdit(null)} title={t('a_set_level')}>
          <T style={{ fontWeight: '700' }}>{edit.c.name}</T>
          <Note text={t('a_verify_hint')} icon="shield" tone="amber" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([0, 1, 2, 3] as VerificationLevel[]).map((l) => {
              const on = edit.level === l;
              return (
                <Pressable key={l} onPress={() => setEdit({ ...edit, level: l })} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[fs.chip, on && fs.chipOn]}>
                  <T style={{ fontWeight: '600', fontSize: 13, color: on ? colors.white : colors.ink }}>{t(`v${l}` as StringKey)}</T>
                </Pressable>
              );
            })}
          </View>
          <View style={[fs.input, { minHeight: 80 }]}>
            <TextInput value={edit.note} onChangeText={(note) => setEdit({ ...edit, note })} placeholder={t('a_note')} placeholderTextColor="#94A3B8" multiline maxLength={500} style={[fs.textInput, { textAlignVertical: 'top', minHeight: 60 }]} />
          </View>
          <Btn
            label={t('a_apply')}
            icon="check"
            loading={setLevel.isPending}
            onPress={() =>
              setLevel.mutate(
                { companyId: edit.c.id, level: edit.level, note: edit.note },
                { onSuccess: () => setEdit(null), onError: (e) => { setEdit(null); setToast(t(errorKey(e))); } },
              )
            }
          />
          <Btn label={t('cancel')} variant="ghost" small onPress={() => setEdit(null)} />
        </Sheet>
      ) : null}
      {manage ? <AdminCompanySheet company={manage} onClose={() => setManage(null)} onToast={setToast} /> : null}
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

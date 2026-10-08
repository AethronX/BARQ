/**
 * Administrative actions on one company.
 *
 * Every destructive action asks for a written reason, states in words what it
 * will do, and goes to a server function that re-checks the caller and records
 * the decision in the audit log. Removal is reversible by default; the
 * permanent purge is refused by the server for a company that carries orders.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { Company } from '../api/types';
import { CATEGORIES } from '../api/types';
import { errorKey } from '../api/errors';
import {
  useAdminPurgeCompany, useAdminRestore, useAdminSoftDelete, useAdminUpdateCompany,
} from '../api/queries';
import { Btn, Checkbox, Note, Sheet, T } from '../ui/components';
import { fs } from '../ui/Field';
import { colors } from '../ui/theme';

type Mode = 'edit' | 'delete' | 'purge';

export function AdminCompanySheet({
  company, onClose, onToast,
}: { company: Company & { deleted_at?: string | null }; onClose: () => void; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('edit');
  const [name, setName] = useState(company.name);
  const [cr, setCr] = useState(company.cr_number ?? '');
  const [city, setCity] = useState(company.city ?? '');
  const [cats, setCats] = useState<string[]>(company.categories);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const update = useAdminUpdateCompany();
  const softDelete = useAdminSoftDelete();
  const restore = useAdminRestore();
  const purge = useAdminPurgeCompany();
  const busy = update.isPending || softDelete.isPending || restore.isPending || purge.isPending;
  const fail = (e: unknown) => onToast(t(errorKey(e)));
  const done = () => { onClose(); };
  const reasonOk = reason.trim().length >= 5;
  const removed = !!company.deleted_at;

  const input = (value: string, set: (v: string) => void, placeholder: string, multiline = false) => (
    <View style={[fs.input, multiline && { minHeight: 80 }]}>
      <TextInput
        value={value}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        maxLength={multiline ? 500 : 120}
        style={[fs.textInput, multiline && { textAlignVertical: 'top', minHeight: 60 }]}
      />
    </View>
  );

  return (
    <Sheet visible onClose={() => !busy && onClose()} title={t('a_manage')}>
      <T style={{ fontWeight: '700' }}>{company.name}</T>
      {removed ? <Note text={t('a_is_deleted')} tone="amber" icon="warn" /> : null}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['edit', 'delete', 'purge'] as Mode[]).map((m) => (
          <Btn
            key={m}
            label={t(`a_mode_${m}` as StringKey)}
            variant={mode === m ? 'navy' : 'ghost'}
            small
            onPress={() => { setMode(m); setConfirmed(false); }}
          />
        ))}
      </View>

      {mode === 'edit' ? (
        <>
          {input(name, setName, t('a_field_name'))}
          {input(cr, setCr, t('a_field_cr'))}
          {input(city, setCity, t('a_field_city'))}
          <T style={{ fontSize: 12, color: colors.muted }}>{t('categories')}</T>
          {CATEGORIES.map((c) => (
            <Checkbox
              key={c}
              checked={cats.includes(c)}
              onChange={(on) => setCats(on ? [...cats, c] : cats.filter((x) => x !== c))}
              label={t(c as StringKey)}
            />
          ))}
          <Btn
            label={t('a_save')}
            icon="check"
            loading={update.isPending}
            onPress={() =>
              update.mutate(
                { companyId: company.id, name, crNumber: cr, city, categories: cats },
                { onSuccess: done, onError: fail },
              )
            }
          />
        </>
      ) : null}

      {mode === 'delete' ? (
        <>
          <Note text={removed ? t('a_restore_note') : t('a_soft_note')} />
          {removed ? (
            <Btn
              label={t('a_restore')}
              icon="refresh"
              loading={restore.isPending}
              onPress={() => restore.mutate({ entity: 'company', id: company.id }, { onSuccess: done, onError: fail })}
            />
          ) : (
            <>
              {input(reason, setReason, t('a_reason_ph'), true)}
              <Btn
                label={t('a_soft_delete')}
                variant="navy"
                icon="minus"
                disabled={!reasonOk}
                loading={softDelete.isPending}
                onPress={() => softDelete.mutate({ entity: 'company', id: company.id, reason }, { onSuccess: done, onError: fail })}
              />
            </>
          )}
        </>
      ) : null}

      {mode === 'purge' ? (
        <>
          <Note text={t('a_purge_note')} tone="amber" icon="warn" />
          {input(reason, setReason, t('a_reason_ph'), true)}
          <Checkbox checked={confirmed} onChange={setConfirmed} label={t('a_purge_confirm', { name: company.name })} />
          <Btn
            label={t('a_purge')}
            icon="warn"
            disabled={!reasonOk || !confirmed}
            loading={purge.isPending}
            onPress={() =>
              purge.mutate(
                { companyId: company.id, reason },
                {
                  onSuccess: (r) => { onToast(t('a_purged', { n: r.rfqs, q: r.quotes })); onClose(); },
                  onError: fail,
                },
              )
            }
          />
        </>
      ) : null}

      <Btn label={t('close')} variant="ghost" small disabled={busy} onPress={onClose} />
    </Sheet>
  );
}

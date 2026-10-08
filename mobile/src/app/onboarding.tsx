import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useI18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import { useAuth } from '../auth/AuthProvider';
import { useCompleteOnboarding } from '../api/queries';
import { errorKey } from '../api/errors';
import { CATEGORIES, type Category } from '../api/types';
import { AppHeader, Btn, Card, Screen, T, useDir } from '../ui/components';
import { Icon } from '../ui/Icon';
import { authStyles } from '../ui/authStyles';
import { colors, TOUCH } from '../ui/theme';
import { Splash } from '../screens/RoleGate';

type Role = 'buyer' | 'supplier';

export default function Onboarding() {
  const { t } = useI18n();
  const d = useDir();
  const { initializing, session, profile, profileLoading, signOut } = useAuth();
  const complete = useCompleteOnboarding();
  const [role, setRole] = useState<Role>('buyer');
  const [f, setF] = useState({ fullName: '', companyName: '', city: 'مسقط', crNumber: '', phone: '' });
  const [cats, setCats] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'company' | 'phone' | 'cats', StringKey>>>({});
  const [serverError, setServerError] = useState<StringKey | null>(null);

  if (initializing || profileLoading) return <Splash />;
  if (!session) return <Redirect href="/sign-in" />;
  if (profile) return <Redirect href="/" />;

  const submit = () => {
    if (complete.isPending) return;
    const e: typeof errors = {};
    if (f.fullName.trim().length < 2) e.name = 'e_name';
    if (f.companyName.trim().length < 2) e.company = 'e_company';
    if (f.phone.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(f.phone.trim())) e.phone = 'e_phone';
    if (role === 'supplier' && cats.length === 0) e.cats = 'e_categories';
    setErrors(e);
    if (Object.keys(e).length) return;
    setServerError(null);
    complete.mutate(
      { fullName: f.fullName.trim(), role, companyName: f.companyName.trim(), city: f.city.trim(), crNumber: f.crNumber.trim(), phone: f.phone.trim(), categories: role === 'supplier' ? cats : [] },
      { onSuccess: () => router.replace('/'), onError: (err) => setServerError(errorKey(err)) },
    );
  };

  const field = (key: keyof typeof f, label: StringKey, opts: { err?: StringKey; optional?: boolean; ltr?: boolean; keyboard?: 'phone-pad' | 'default' } = {}) => (
    <View style={{ gap: 6 }}>
      <T style={{ fontWeight: '700' }}>
        {t(label)}
        {opts.optional ? <T style={{ color: colors.muted, fontWeight: '400', fontSize: 12 }}> ({t('optional')})</T> : <T style={{ color: colors.error }}> *</T>}
      </T>
      <View style={[authStyles.input, opts.err && { borderColor: colors.error }]}>
        <TextInput
          value={f[key]}
          onChangeText={(v) => setF((p) => ({ ...p, [key]: v }))}
          style={[authStyles.textInput, { textAlign: opts.ltr ? 'left' : d.start, writingDirection: opts.ltr ? 'ltr' : undefined }]}
          keyboardType={opts.keyboard ?? 'default'}
          maxLength={120}
          accessibilityLabel={t(label)}
        />
      </View>
      {opts.err ? <T style={{ color: colors.error, fontSize: 12.5 }}>{t(opts.err)}</T> : null}
    </View>
  );

  const roleCard = (r: Role, title: StringKey, sub: StringKey) => {
    const on = role === r;
    return (
      <Pressable onPress={() => setRole(r)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1 }}>
        <Card style={{ padding: 14, gap: 6, borderColor: on ? colors.navy : colors.line, borderWidth: on ? 2 : 1 }}>
          <Icon name={r === 'buyer' ? 'docPlus' : 'truck'} size={26} color={on ? colors.navy : colors.ink2} />
          <T style={{ fontWeight: '700' }}>{t(title)}</T>
          <T style={{ fontSize: 12, color: colors.muted }}>{t(sub)}</T>
        </Card>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<AppHeader title={t('ob_t')} action={<Pressable onPress={signOut} hitSlop={8} accessibilityRole="button"><T style={{ color: colors.navyInk, fontSize: 12.5 }}>{t('sign_out')}</T></Pressable>} />}>
        <T style={{ color: colors.muted }}>{t('ob_s')}</T>
        <T style={{ fontWeight: '700' }}>{t('ob_role')}</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {roleCard('buyer', 'role_buyer', 'role_buyer_s')}
          {roleCard('supplier', 'role_supplier', 'role_supplier_s')}
        </View>
        {field('fullName', 'full_name', { err: errors.name })}
        {field('companyName', 'company_name', { err: errors.company })}
        {field('crNumber', 'cr_number', { optional: true, ltr: true })}
        {field('city', 'city', { optional: true })}
        {field('phone', 'phone', { optional: true, ltr: true, keyboard: 'phone-pad', err: errors.phone })}
        {role === 'supplier' ? (
          <View style={{ gap: 8 }}>
            <T style={{ fontWeight: '700' }}>{t('categories')}<T style={{ color: colors.error }}> *</T></T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((c) => {
                const on = cats.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={{ minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, justifyContent: 'center', borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navy : colors.card }}
                  >
                    <T style={{ fontWeight: '600', color: on ? colors.white : colors.ink }}>{t(c)}</T>
                  </Pressable>
                );
              })}
            </View>
            {errors.cats ? <T style={{ color: colors.error, fontSize: 12.5 }}>{t(errors.cats)}</T> : null}
          </View>
        ) : null}
        {serverError ? <T style={{ color: colors.error }}>{t(serverError)}</T> : null}
        <Btn label={t('ob_submit')} loading={complete.isPending} onPress={submit} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../auth/AuthProvider';
import { errorKey } from '../api/errors';
import { Btn, Logo, T, useDir } from '../ui/components';
import { Icon } from '../ui/Icon';
import { colors } from '../ui/theme';
import { authStyles as st } from '../ui/authStyles';

/** Password sign-in exists only for internal test accounts; switch off before launch. */
const TEST_LOGIN = process.env.EXPO_PUBLIC_TEST_LOGIN === 'true';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignIn() {
  const { t } = useI18n();
  const d = useDir();
  const insets = useSafeAreaInsets();
  const { session, sendCode, signInWithPassword } = useAuth();
  const [tEmail, setTEmail] = useState('');
  const [tPass, setTPass] = useState('');
  const [tError, setTError] = useState<string | null>(null);
  const [tBusy, setTBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (session) return <Redirect href="/" />;

  const submit = async () => {
    if (busy) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError(t('e_email'));
    setBusy(true);
    setError(null);
    try {
      await sendCode(e);
      router.push({ pathname: '/verify', params: { email: e } });
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const testLogin = async () => {
    if (tBusy || !tEmail.trim() || !tPass) return;
    setTBusy(true);
    setTError(null);
    try {
      await signInWithPassword(tEmail, tPass);
      router.replace('/');
    } catch (err) {
      setTError(t(errorKey(err)));
    } finally {
      setTBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[st.wrap, d.dir, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 28 }}>
          <Logo sub="sub_proc" />
          <View style={{ gap: 6, alignSelf: 'stretch' }}>
            <T style={{ color: colors.white, fontSize: 26, fontWeight: '800' }}>{t('welcome_t')}</T>
            <T style={{ color: colors.navyInk, fontSize: 14.5, lineHeight: 22 }}>{t('welcome_s')}</T>
          </View>
        </View>
        <View style={st.card}>
          <T style={{ fontWeight: '700', fontSize: 15 }}>{t('email')}</T>
          <View style={[st.input, error && { borderColor: colors.error }]}>
            <Icon name="mail" size={20} />
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder={t('email_ph')}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={submit}
              style={[st.textInput, { textAlign: 'left', writingDirection: 'ltr' }]}
              accessibilityLabel={t('email')}
              maxLength={254}
            />
          </View>
          {error ? <T style={{ color: colors.error, fontSize: 12.5 }} accessibilityLiveRegion="polite">{error}</T> : null}
          <Btn label={busy ? t('sending') : t('send_code')} icon={busy ? undefined : 'bolt'} loading={busy} onPress={submit} />
          <T center style={{ fontSize: 11.5, color: colors.muted }}>{t('terms_note')}</T>
        </View>
        {TEST_LOGIN ? (
          <View style={[st.card, { borderWidth: 2, borderColor: colors.amber }]}>
            <T style={{ fontWeight: '700', fontSize: 15, color: colors.amberText }}>{t('test_t')}</T>
            <View style={st.input}>
              <TextInput value={tEmail} onChangeText={setTEmail} placeholder={t('email')} placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" style={[st.textInput, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={t('email')} />
            </View>
            <View style={st.input}>
              <TextInput value={tPass} onChangeText={setTPass} placeholder={t('password')} placeholderTextColor="#94A3B8" autoCapitalize="none" secureTextEntry onSubmitEditing={testLogin} style={[st.textInput, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={t('password')} />
            </View>
            {tError ? <T style={{ color: colors.error, fontSize: 12.5 }} accessibilityLiveRegion="polite">{tError}</T> : null}
            <Btn label={t('test_go')} variant="navy" small loading={tBusy} onPress={testLogin} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

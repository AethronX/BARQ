import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../auth/AuthProvider';
import { errorKey } from '../api/errors';
import { Btn, HeaderButton, T, Toast, useDir } from '../ui/components';
import { colors } from '../ui/theme';
import { authStyles } from '../ui/authStyles';

const RESEND_SECONDS = 60;

export default function Verify() {
  const { t } = useI18n();
  const d = useDir();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { session, verifyCode, verifyLink, sendCode } = useAuth();
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [toast, setToast] = useState<string | null>(null);
  const submitted = useRef<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (session) return <Redirect href="/" />;
  if (!email) return <Redirect href="/sign-in" />;

  const submit = async (value = code) => {
    if (busy || submitted.current === value) return;
    if (!/^\d{6}$/.test(value)) return setError(t('e_code'));
    setBusy(true);
    setError(null);
    submitted.current = value;
    try {
      await verifyCode(email, value);
      router.replace('/');
    } catch (err) {
      submitted.current = null;
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const submitLink = async () => {
    if (linkBusy || !link.trim()) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      await verifyLink(link.trim());
      router.replace('/');
    } catch (err) {
      setLinkError(t(errorKey(err)));
    } finally {
      setLinkBusy(false);
    }
  };

  const resend = async () => {
    if (wait > 0) return;
    try {
      await sendCode(email);
      setWait(RESEND_SECONDS);
      setToast(t('code_sent'));
    } catch (err) {
      setError(t(errorKey(err)));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.navy }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[authStyles.wrap, d.dir, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row' }}>
          <HeaderButton icon="chevronStart" label={t('back')} onPress={() => router.back()} />
        </View>
        <View style={{ gap: 6 }}>
          <T style={{ color: colors.white, fontSize: 24, fontWeight: '800' }}>{t('code_t')}</T>
          <T style={{ color: colors.navyInk, fontSize: 14 }}>{t('code_s', { e: email })}</T>
        </View>
        <View style={authStyles.card}>
          <TextInput
            value={code}
            onChangeText={(v) => {
              const digits = v.replace(/[^0-9٠-٩]/g, '').replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).slice(0, 6);
              setCode(digits);
              setError(null);
              if (digits.length === 6) submit(digits);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            style={[authStyles.input, { textAlign: 'center', fontSize: 28, letterSpacing: 10, fontWeight: '700', writingDirection: 'ltr' }, error && { borderColor: colors.error }]}
            accessibilityLabel={t('code')}
          />
          {error ? <T style={{ color: colors.error, fontSize: 12.5 }} center accessibilityLiveRegion="polite">{error}</T> : null}
          <Btn label={busy ? t('verifying') : t('verify')} loading={busy} onPress={() => submit()} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
              <T style={{ color: colors.blue, fontWeight: '600', fontSize: 13 }}>{t('change_email')}</T>
            </Pressable>
            <Pressable onPress={resend} disabled={wait > 0} accessibilityRole="button" hitSlop={8}>
              <T style={{ color: wait > 0 ? colors.muted : colors.blue, fontWeight: '600', fontSize: 13 }}>{wait > 0 ? t('resend_in', { s: wait }) : t('resend')}</T>
            </Pressable>
          </View>
        </View>
        <View style={[authStyles.card, { gap: 10 }]}>
          <T style={{ fontWeight: '700', fontSize: 15 }}>{t('link_t')}</T>
          <T style={{ fontSize: 12.5, color: colors.muted }}>{t('link_s')}</T>
          <View style={[authStyles.input, linkError && { borderColor: colors.error }]}>
            <TextInput
              value={link}
              onChangeText={(v) => { setLink(v); setLinkError(null); }}
              placeholder={t('link_ph')}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={[authStyles.textInput, { textAlign: 'left', writingDirection: 'ltr', fontSize: 13, maxHeight: 90 }]}
              accessibilityLabel={t('link_ph')}
            />
          </View>
          {linkError ? <T style={{ color: colors.error, fontSize: 12.5 }} accessibilityLiveRegion="polite">{linkError}</T> : null}
          <Btn label={t('link_go')} variant="navy" small loading={linkBusy} onPress={submitLink} />
        </View>
      </ScrollView>
      <Toast message={toast} onHide={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

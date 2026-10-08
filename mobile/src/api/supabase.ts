import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.');
}

/**
 * Session storage in the device keychain/keystore. SecureStore values are
 * limited to ~2 KB, so larger session JSON is split into numbered chunks.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(k: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (count === null) return SecureStore.getItemAsync(k);
    const parts = await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join('');
  },
  async setItem(k: string, value: string): Promise<void> {
    await secureStorage.removeItem(k);
    const n = Math.ceil(value.length / CHUNK);
    await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK))));
    await SecureStore.setItemAsync(`${k}.n`, String(n));
  },
  async removeItem(k: string): Promise<void> {
    const count = await SecureStore.getItemAsync(`${k}.n`);
    const n = count === null ? 0 : Number(count);
    await Promise.all([
      SecureStore.deleteItemAsync(k),
      SecureStore.deleteItemAsync(`${k}.n`),
      ...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)),
    ]);
  },
};

const isWeb = Platform.OS === 'web';

export const supabase = createClient(url, key, {
  auth: {
    // On web (preview only) the browser's localStorage is used by default.
    ...(isWeb ? {} : { storage: secureStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

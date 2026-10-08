import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../api/types';
import { colors } from '../ui/theme';

export function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.amber} />
    </View>
  );
}

/**
 * Client-side routing guard for convenience only. Real access control is
 * enforced by the database (RLS + function checks) on every request.
 */
export function RoleGate({ role, children }: { role?: Role; children: ReactNode }) {
  const { initializing, session, profile, profileLoading } = useAuth();
  if (initializing || profileLoading) return <Splash />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile) return <Redirect href="/onboarding" />;
  if (role && profile.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}

export function homeFor(role: Role): '/buyer' | '/supplier' | '/admin' {
  return role === 'buyer' ? '/buyer' : role === 'supplier' ? '/supplier' : '/admin';
}

/** Maps a server notification link to this app's route for the viewer's role. */
export function routeForLink(role: Role, link: string | null): string | null {
  if (!link) return null;
  if (link.startsWith('/order/')) return link;
  if (link.startsWith('/supplier/rfq/')) return role === 'supplier' ? link : null;
  if (link.startsWith('/rfq/')) return role === 'buyer' ? `/buyer${link}` : null;
  return null;
}

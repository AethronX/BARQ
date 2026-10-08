import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { homeFor, Splash } from '../screens/RoleGate';

/** Entry point: sends each user to the right place for their state and role. */
export default function Index() {
  const { initializing, session, profile, profileLoading } = useAuth();
  if (initializing || profileLoading) return <Splash />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href={homeFor(profile.role)} />;
}

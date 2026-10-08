import type { Role } from '../api/types';

/**
 * DEMO MODE — internal testing only.
 * Opens the app without a sign-in page and lets the team switch between the
 * buyer, supplier and admin test accounts. The credentials come from .env and
 * end up inside the app bundle, so this MUST be disabled (EXPO_PUBLIC_DEMO_MODE=false)
 * and the test accounts deleted before any real company is invited.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const RAW: Record<Role, string | undefined> = {
  buyer: process.env.EXPO_PUBLIC_DEMO_BUYER,
  supplier: process.env.EXPO_PUBLIC_DEMO_SUPPLIER,
  admin: process.env.EXPO_PUBLIC_DEMO_ADMIN,
};

export function demoAccount(role: Role): { email: string; password: string } | null {
  if (!DEMO_MODE) return null;
  const v = RAW[role];
  if (!v || !v.includes('|')) return null;
  const [email, password] = v.split('|');
  return { email, password };
}

/**
 * Server-side role guard for dashboard layouts.
 *
 * Port of guardPage(requiredRole) from the legacy assets/js/shared.js: no
 * session -> /login, wrong role -> that role's own dashboard. RLS is still
 * the real access boundary (per 0002_rls.sql) - this only keeps a faculty
 * account from rendering the admin shell, it does not gate any data.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ROLE_DASHBOARDS, type UserRole } from '@/lib/types/domain';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position: string | null;
  department_id: string | null;
  photo_path: string | null;
}

export async function requireRole(role: UserRole): Promise<DashboardUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== 'string') {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, position, department_id, photo_path')
    .eq('id', userId)
    .single();

  if (!profile) {
    redirect('/login');
  }
  if (profile.role !== role) {
    redirect(ROLE_DASHBOARDS[profile.role as UserRole] ?? '/');
  }

  return profile;
}

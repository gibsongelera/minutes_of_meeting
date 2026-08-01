import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_DASHBOARDS, type UserRole } from '@/lib/types/domain';

/** Routes reachable without a session. */
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/auth'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));
}

/**
 * Refreshes the Supabase session cookie on every request and guards routes.
 *
 * Replaces guardPage() from the legacy assets/js/shared.js. Role checks here are a
 * routing convenience only — the real access boundary is RLS in Postgres.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not insert code between createServerClient and getClaims() — it can cause
  // users to be logged out at random.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { pathname } = request.nextUrl;

  if (!claims) {
    /*
     * Route handlers answer for themselves. Redirecting an API call to the login
     * page hands a fetch() caller a 307 and an HTML body where it expected JSON;
     * each handler checks the session and returns a real 401 instead.
     */
    if (pathname.startsWith('/api/')) return supabaseResponse;
    if (isPublic(pathname)) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Signed in users may still open /login to switch accounts.
  if (pathname === '/register' || pathname === '/forgot-password') {
    const role = (claims.user_metadata as { role?: string } | undefined)?.role;
    const url = request.nextUrl.clone();
    url.pathname = (role && ROLE_DASHBOARDS[role as UserRole]) || '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

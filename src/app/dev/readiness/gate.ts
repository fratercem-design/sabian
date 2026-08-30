/**
 * Readiness-dashboard access gate — fail-closed.
 *
 * The dashboard exposes provider/verification internals, so access is denied
 * by default. Production is ALWAYS denied regardless of any flag. Outside
 * production, access additionally requires the explicit server-only opt-in
 * READINESS_DASHBOARD_ENABLED=true. Reads process.env directly (not the cached
 * zod-parsed config) so the security decision cannot be affected by module-load
 * ordering and is trivially testable.
 */

function parseEnabled(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

export function isReadinessRouteAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return parseEnabled(process.env.READINESS_DASHBOARD_ENABLED);
}

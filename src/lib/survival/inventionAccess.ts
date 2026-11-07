/** Guests use local rule-based inventions, never the authenticated AI ledger. */
export function usesRemoteInventions(realGps: boolean, userId: string | null | undefined): boolean {
  return realGps && !!userId;
}
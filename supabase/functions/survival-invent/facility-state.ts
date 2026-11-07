/** Existing altars remain usable; base level only gates new construction. */
export function savedAltar(payload: { altar?: boolean } | null | undefined): boolean {
  return payload?.altar === true;
}
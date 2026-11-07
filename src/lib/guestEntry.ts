import { supabase } from '@/integrations/supabase/client';

let entry: Promise<void> | null = null;
/** Reuse an existing account/session; never create another anonymous user on double taps. */
export function enterGuestSession(): Promise<void> {
  if (entry) return entry;
  entry = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  })().finally(() => { entry = null; });
  return entry;
}
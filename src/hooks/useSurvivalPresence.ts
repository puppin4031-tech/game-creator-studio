import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LatLng } from '@/lib/survival/types';
import { presenceCell, roundCoord, shouldBroadcast, PRESENCE_MIN_INTERVAL_MS, type EmoteId } from '@/lib/survival/presence';

export interface PeerPlayer { id: string; name: string; lat: number; lng: number; level: number; at: number }
export type PeerEvent =
  | { type: 'emote'; from: string; to?: string; emote: EmoteId }
  | { type: 'attack'; from: string; to: string; dmg: number }
  | { type: 'ally'; from: string; to: string; name: string };

function guestId() {
  let id = sessionStorage.getItem('survival-guest-id');
  if (!id) { id = `g-${crypto.randomUUID().slice(0, 8)}`; sessionStorage.setItem('survival-guest-id', id); }
  return id;
}

/**
 * Low-traffic multiplayer presence: one realtime room per ~1km cell, position re-sent only after
 * 5m movement (min 3s apart) or a 20s heartbeat. Events (emote/attack/ally) are tiny broadcasts.
 */
export function useSurvivalPresence(enabled: boolean, pos: LatLng, level: number, onEvent: (e: PeerEvent) => void, chiefName?: string) {
  const { user, profile } = useAuth();
  const selfId = user?.id ?? guestId();
  const name = chiefName?.trim() || profile?.display_name || user?.email?.split('@')[0] || `원시인${selfId.slice(-3)}`;
  const [peers, setPeers] = useState<PeerPlayer[]>([]);
  const chan = useRef<RealtimeChannel | null>(null);
  const last = useRef<{ pos: LatLng; at: number } | null>(null);
  const evRef = useRef(onEvent); evRef.current = onEvent;
  const posRef = useRef(pos); posRef.current = pos;
  const cell = presenceCell(pos);

  const track = useCallback(async (force = false) => {
    const c = chan.current; if (!c) return;
    const now = Date.now(); const p = posRef.current;
    if (!force && !shouldBroadcast(last.current, p, now)) return;
    last.current = { pos: p, at: now };
    try { await c.track({ id: selfId, name, lat: roundCoord(p.lat), lng: roundCoord(p.lng), level, at: now }); }
    catch (e) { console.warn('[survivalPresence] track failed', e); }
  }, [selfId, name, level]);

  useEffect(() => {
    if (!enabled) { setPeers([]); return; }
    const c = supabase.channel(`survival-cell-${cell}`, { config: { presence: { key: selfId }, broadcast: { self: false } } });
    const sync = () => {
      const st = c.presenceState<PeerPlayer>();
      setPeers(Object.entries(st).filter(([k]) => k !== selfId).map(([, v]) => v[v.length - 1]).filter(Boolean));
    };
    c.on('presence', { event: 'sync' }, sync)
      .on('broadcast', { event: 'peer' }, ({ payload }) => {
        const e = payload as PeerEvent;
        if (e.from === selfId) return;
        if ('to' in e && e.to && e.to !== selfId) return;
        evRef.current(e);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { last.current = null; void track(true); }
      });
    chan.current = c;
    return () => { chan.current = null; void supabase.removeChannel(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cell, selfId]);

  // Throttled position updates + heartbeat.
  useEffect(() => { if (enabled) void track(); }, [enabled, pos, track]);
  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => void track(), PRESENCE_MIN_INTERVAL_MS * 2);
    return () => window.clearInterval(t);
  }, [enabled, track]);

  const send = useCallback((e: PeerEvent extends infer T ? T extends PeerEvent ? Omit<T, 'from'> : never : never) => {
    const c = chan.current;
    if (!c) return false;
    void c.send({ type: 'broadcast', event: 'peer', payload: { ...e, from: selfId } });
    return true;
  }, [selfId]);

  return { peers, selfId, name, send };
}

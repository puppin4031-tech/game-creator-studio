import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { haversineDistance } from '@/lib/haversine';

export interface TreasureItem {
  id: string;
  room_id: string;
  keyword: string;
  latitude: number;
  longitude: number;
  quiz_question: string;
  quiz_answer: string;
  found_by: string | null;
  found_at: string | null;
  created_at: string;
  challenge_type: string;
  puzzle_image_url: string | null;
  puzzle_grid_size: number;
  points: number;
  treasure_subtype: string | null;
}

export type ProximityLevel = 'close' | 'near' | 'far' | null;

export interface NearestTreasure extends TreasureItem {
  distance: number;
}

export interface TeamScores {
  team1: number;
  team2: number;
}

export function useTreasureHunt(
  roomId: string | undefined,
  myPlayerId: string | null,
  myLat: number,
  myLng: number,
  players?: { id: string; team: number | null }[]
) {
  const [treasures, setTreasures] = useState<TreasureItem[]>([]);
  const [cooldownEnd, setCooldownEnd] = useState<number>(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Fetch treasures
  const fetchTreasures = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('treasure_items')
      .select('*')
      .eq('room_id', roomId);
    if (data) setTreasures(data as TreasureItem[]);
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    fetchTreasures();

    const channel = supabase
      .channel(`treasure_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasure_items', filter: `room_id=eq.${roomId}` }, () => {
        fetchTreasures();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchTreasures]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownEnd <= Date.now()) {
      setCooldownLeft(0);
      return;
    }
    const iv = setInterval(() => {
      const left = Math.ceil((cooldownEnd - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownLeft(0);
        clearInterval(iv);
      } else {
        setCooldownLeft(left);
      }
    }, 200);
    return () => clearInterval(iv);
  }, [cooldownEnd]);

  // Nearest unfound treasure
  const nearest: NearestTreasure | null = useMemo(() => {
    if (!myLat || !myLng) return null;
    const unfound = treasures
      .filter(t => !t.found_by)
      .map(t => ({
        ...t,
        distance: haversineDistance(myLat, myLng, t.latitude, t.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);
    return unfound[0] || null;
  }, [treasures, myLat, myLng]);

  const proximityLevel: ProximityLevel = useMemo(() => {
    if (!nearest) return null;
    if (nearest.distance <= 5) return 'close';
    if (nearest.distance <= 10) return 'near';
    if (nearest.distance <= 30) return 'far';
    return null;
  }, [nearest]);

  // My found treasures
  const myFoundTreasures = useMemo(
    () => treasures.filter(t => t.found_by === myPlayerId),
    [treasures, myPlayerId]
  );

  // Check if current player has the key
  const hasKey = useMemo(
    () => myFoundTreasures.some(t => t.treasure_subtype === 'key'),
    [myFoundTreasures]
  );

  // Team scores computed from found treasures + player team mapping
  const teamScores: TeamScores = useMemo(() => {
    if (!players) return { team1: 0, team2: 0 };
    const playerTeamMap = new Map(players.map(p => [p.id, p.team]));
    let team1 = 0;
    let team2 = 0;
    treasures.filter(t => t.found_by).forEach(t => {
      const team = playerTeamMap.get(t.found_by!);
      if (team === 1) team1 += t.points;
      if (team === 2) team2 += t.points;
    });
    return { team1, team2 };
  }, [treasures, players]);

  // Check which team has the key
  const teamWithKey = useMemo(() => {
    if (!players) return null;
    const playerTeamMap = new Map(players.map(p => [p.id, p.team]));
    const keyItem = treasures.find(t => t.treasure_subtype === 'key' && t.found_by);
    if (!keyItem) return null;
    return playerTeamMap.get(keyItem.found_by!) || null;
  }, [treasures, players]);

  // Add treasure (host)
  const addTreasure = useCallback(async (item: {
    keyword: string; latitude: number; longitude: number;
    quiz_question: string; quiz_answer: string;
    challenge_type?: string; puzzle_image_url?: string; puzzle_grid_size?: number;
    points?: number; treasure_subtype?: string;
  }) => {
    if (!roomId) return;
    await supabase.from('treasure_items').insert({
      ...item,
      room_id: roomId,
      challenge_type: item.challenge_type || 'quiz',
      puzzle_grid_size: item.puzzle_grid_size || 3,
      points: item.points ?? 15,
      treasure_subtype: item.treasure_subtype || null,
    });
  }, [roomId]);

  // Remove treasure (host)
  const removeTreasure = useCallback(async (id: string) => {
    await supabase.from('treasure_items').delete().eq('id', id);
  }, []);

  // Attempt quiz answer
  const attemptAnswer = useCallback(async (treasureId: string, answer: string): Promise<{ success: boolean; alreadyFound?: boolean }> => {
    const treasure = treasures.find(t => t.id === treasureId);
    if (!treasure) return { success: false };

    if (answer.trim().toLowerCase() !== treasure.quiz_answer.trim().toLowerCase()) {
      setCooldownEnd(Date.now() + 15000);
      setCooldownLeft(15);
      return { success: false };
    }

    const { data, error } = await supabase
      .from('treasure_items')
      .update({ found_by: myPlayerId, found_at: new Date().toISOString() })
      .eq('id', treasureId)
      .is('found_by', null)
      .select()
      .single();

    if (error || !data) {
      return { success: false, alreadyFound: true };
    }

    return { success: true };
  }, [treasures, myPlayerId]);

  // Claim a treasure directly (for gems/key type)
  const claimTreasure = useCallback(async (treasureId: string): Promise<{ success: boolean; alreadyFound?: boolean }> => {
    const { data, error } = await supabase
      .from('treasure_items')
      .update({ found_by: myPlayerId, found_at: new Date().toISOString() })
      .eq('id', treasureId)
      .is('found_by', null)
      .select()
      .single();

    if (error || !data) return { success: false, alreadyFound: true };
    return { success: true };
  }, [myPlayerId]);

  // Attempt to open chest (requires key)
  const attemptChest = useCallback(async (treasureId: string): Promise<{ success: boolean; noKey?: boolean; alreadyFound?: boolean }> => {
    if (!hasKey) return { success: false, noKey: true };
    const { data, error } = await supabase
      .from('treasure_items')
      .update({ found_by: myPlayerId, found_at: new Date().toISOString() })
      .eq('id', treasureId)
      .is('found_by', null)
      .select()
      .single();

    if (error || !data) return { success: false, alreadyFound: true };
    return { success: true };
  }, [hasKey, myPlayerId]);

  return {
    treasures,
    nearest,
    proximityLevel,
    myFoundTreasures,
    cooldownLeft,
    hasKey,
    teamScores,
    teamWithKey,
    addTreasure,
    removeTreasure,
    attemptAnswer,
    claimTreasure,
    attemptChest,
    fetchTreasures,
  };
}

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
}

export type ProximityLevel = 'close' | 'near' | 'far' | null;

export interface NearestTreasure extends TreasureItem {
  distance: number;
}

export function useTreasureHunt(roomId: string | undefined, myPlayerId: string | null, myLat: number, myLng: number) {
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

  // Add treasure (host)
  const addTreasure = useCallback(async (item: {
    keyword: string; latitude: number; longitude: number;
    quiz_question: string; quiz_answer: string;
    challenge_type?: string; puzzle_image_url?: string; puzzle_grid_size?: number;
  }) => {
    if (!roomId) return;
    await supabase.from('treasure_items').insert({
      ...item,
      room_id: roomId,
      challenge_type: item.challenge_type || 'quiz',
      puzzle_grid_size: item.puzzle_grid_size || 3,
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

    // Check answer (case-insensitive, trimmed)
    if (answer.trim().toLowerCase() !== treasure.quiz_answer.trim().toLowerCase()) {
      // Start 15s cooldown
      setCooldownEnd(Date.now() + 15000);
      setCooldownLeft(15);
      return { success: false };
    }

    // Try to claim (first-come-first-served using found_by IS NULL condition)
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

  return {
    treasures,
    nearest,
    proximityLevel,
    myFoundTreasures,
    cooldownLeft,
    addTreasure,
    removeTreasure,
    attemptAnswer,
    fetchTreasures,
  };
}

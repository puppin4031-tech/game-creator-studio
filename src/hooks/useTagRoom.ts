import { enterGuestSession } from '@/lib/guestEntry';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TagRoom {
  id: string;
  room_code: string;
  title: string;
  host_id: string;
  status: string;
  timer_seconds: number;
  team1_name: string;
  team2_name: string;
  started_at: string | null;
  created_at: string;
  game_mode: string;
}

export interface TagPlayer {
  id: string;
  room_id: string;
  nickname: string;
  team: number | null;
  latitude: number;
  longitude: number;
  is_caught: boolean;
  is_host: boolean;
  updated_at: string;
}

export interface TagMessage {
  id: string;
  room_id: string;
  sender_nickname: string;
  message: string;
  channel: string;
  created_at: string;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useTagRoom(roomCode?: string, playerId?: string) {
  const [room, setRoom] = useState<TagRoom | null>(null);
  const [players, setPlayers] = useState<TagPlayer[]>([]);
  const [messages, setMessages] = useState<TagMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch room by code
  const fetchRoom = useCallback(async (code: string) => {
    const { data } = await supabase
      .from('tag_rooms')
      .select('*')
      .eq('room_code', code)
      .single();
    if (data) setRoom(data as TagRoom);
    return data as TagRoom | null;
  }, []);

  // Fetch players
  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('tag_players')
      .select('*')
      .eq('room_id', roomId);
    if (data) setPlayers(data as TagPlayer[]);
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('tag_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as TagMessage[]);
  }, []);

  // Create room
  const createRoom = useCallback(async (title: string, hostNickname: string, gameMode: string = 'tag') => {
    await enterGuestSession();
    const code = generateRoomCode();
    const hostId = crypto.randomUUID();

    const { data: roomData, error } = await supabase
      .from('tag_rooms')
      .insert({ room_code: code, title, host_id: hostId, game_mode: gameMode })
      .select()
      .single();

    if (error || !roomData) return null;

    await supabase.from('tag_players').insert({
      room_id: roomData.id,
      nickname: hostNickname,
      is_host: true,
    });

    return { room: roomData as TagRoom, hostId, playerId: hostId };
  }, []);

  // Join room
  const joinRoom = useCallback(async (code: string, nickname: string) => {
    await enterGuestSession();
    const roomData = await fetchRoom(code);
    if (!roomData) return null;

    const { data: player } = await supabase
      .from('tag_players')
      .insert({ room_id: roomData.id, nickname })
      .select()
      .single();

    return { room: roomData, player: player as TagPlayer };
  }, [fetchRoom]);

  // Assign team (pass null to unassign)
  const assignTeam = useCallback(async (targetPlayerId: string, team: number | null) => {
    await supabase.from('tag_players').update({ team }).eq('id', targetPlayerId);
  }, []);

  // Update team names
  const updateTeamNames = useCallback(async (roomId: string, team1: string, team2: string) => {
    await supabase.from('tag_rooms').update({ team1_name: team1, team2_name: team2 }).eq('id', roomId);
  }, []);

  // Update timer
  const updateTimer = useCallback(async (roomId: string, seconds: number) => {
    await supabase.from('tag_rooms').update({ timer_seconds: seconds }).eq('id', roomId);
  }, []);

  // Start game
  const startGame = useCallback(async (roomId: string) => {
    await supabase.from('tag_rooms').update({ 
      status: 'playing', 
      started_at: new Date().toISOString() 
    }).eq('id', roomId);
  }, []);

  // End game
  const endGame = useCallback(async (roomId: string) => {
    await supabase.from('tag_rooms').update({ status: 'ended' }).eq('id', roomId);
  }, []);

  // Send message
  const sendMessage = useCallback(async (roomId: string, senderNickname: string, message: string, channel: string) => {
    await supabase.from('tag_messages').insert({
      room_id: roomId,
      sender_nickname: senderNickname,
      message,
      channel,
    });
  }, []);

  // Update player position
  const updatePosition = useCallback(async (pId: string, lat: number, lng: number) => {
    await supabase.from('tag_players').update({
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    }).eq('id', pId);
  }, []);

  // Rejoin room — find existing player by nickname, or insert new
  const rejoinRoom = useCallback(async (code: string, nick: string) => {
    await enterGuestSession();
    const roomData = await fetchRoom(code);
    if (!roomData) return null;

    // Check if player already exists in this room
    const { data: existing } = await supabase
      .from('tag_players')
      .select('*')
      .eq('room_id', roomData.id)
      .eq('nickname', nick)
      .maybeSingle();

    if (existing) {
      return { room: roomData, player: existing as TagPlayer, isRejoin: true };
    }

    // Otherwise insert new player
    const { data: player } = await supabase
      .from('tag_players')
      .insert({ room_id: roomData.id, nickname: nick })
      .select()
      .single();

    return { room: roomData, player: player as TagPlayer, isRejoin: false };
  }, [fetchRoom]);

  // Delete room (cascade deletes players & messages)
  const deleteRoom = useCallback(async (roomId: string) => {
    const { error } = await supabase.from('tag_rooms').delete().eq('id', roomId);
    return !error;
  }, []);

  // Subscribe to realtime
  useEffect(() => {
    if (!room) return;

    fetchPlayers(room.id);
    fetchMessages(room.id);

    const playerChannel = supabase
      .channel(`tag_players_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_players', filter: `room_id=eq.${room.id}` }, (payload) => {
        console.log('[useTagRoom] tag_players event', payload.eventType);
        fetchPlayers(room.id);
      })
      .subscribe((status) => {
        console.log('[useTagRoom] playerChannel status:', status);
        if (status === 'SUBSCRIBED') {
          // Re-sync after subscription is confirmed (race condition guard)
          fetchPlayers(room.id);
        }
      });

    const messageChannel = supabase
      .channel(`tag_messages_${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tag_messages', filter: `room_id=eq.${room.id}` }, (payload) => {
        const newMsg = payload.new as TagMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchMessages(room.id);
        }
      });

    const roomChannel = supabase
      .channel(`tag_room_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_rooms', filter: `id=eq.${room.id}` }, (payload) => {
        console.log('[useTagRoom] tag_rooms event', payload.eventType, (payload.new as any)?.status);
        if (payload.eventType === 'DELETE') {
          setRoom(null);
        } else if (payload.new) {
          setRoom(payload.new as TagRoom);
        }
      })
      .subscribe((status) => {
        console.log('[useTagRoom] roomChannel status:', status);
        if (status === 'SUBSCRIBED' && room.room_code) {
          // Re-fetch latest room state after subscription confirmed
          fetchRoom(room.room_code);
        }
      });

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id]);

  // Initial fetch
  useEffect(() => {
    if (roomCode && !room) {
      setLoading(true);
      fetchRoom(roomCode).finally(() => setLoading(false));
    }
  }, [roomCode]);

  return {
    room, players, messages, loading,
    createRoom, joinRoom, rejoinRoom, fetchRoom,
    assignTeam, updateTeamNames, updateTimer,
    startGame, endGame, deleteRoom,
    sendMessage, updatePosition,
    setRoom,
  };
}

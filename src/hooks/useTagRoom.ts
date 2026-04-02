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
  const createRoom = useCallback(async (title: string, hostNickname: string) => {
    const code = generateRoomCode();
    const hostId = crypto.randomUUID();

    const { data: roomData, error } = await supabase
      .from('tag_rooms')
      .insert({ room_code: code, title, host_id: hostId })
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
    const roomData = await fetchRoom(code);
    if (!roomData) return null;

    const { data: player } = await supabase
      .from('tag_players')
      .insert({ room_id: roomData.id, nickname })
      .select()
      .single();

    return { room: roomData, player: player as TagPlayer };
  }, [fetchRoom]);

  // Assign team
  const assignTeam = useCallback(async (targetPlayerId: string, team: number) => {
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

  // Subscribe to realtime
  useEffect(() => {
    if (!room) return;

    fetchPlayers(room.id);
    fetchMessages(room.id);

    const playerChannel = supabase
      .channel(`tag_players_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tag_players', filter: `room_id=eq.${room.id}` }, () => {
        fetchPlayers(room.id);
      })
      .subscribe();

    const messageChannel = supabase
      .channel(`tag_messages_${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tag_messages', filter: `room_id=eq.${room.id}` }, (payload) => {
        const newMsg = payload.new as TagMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    const roomChannel = supabase
      .channel(`tag_room_${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tag_rooms', filter: `id=eq.${room.id}` }, (payload) => {
        setRoom(payload.new as TagRoom);
      })
      .subscribe();

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
    createRoom, joinRoom, fetchRoom,
    assignTeam, updateTeamNames, updateTimer,
    startGame, endGame,
    sendMessage, updatePosition,
    setRoom,
  };
}

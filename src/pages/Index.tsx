import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSpotDetection, DetectedSpot } from '@/hooks/useSpotDetection';
import { GameMap } from '@/components/game/GameMap';
import { FloatingBar } from '@/components/game/FloatingBar';
import { FloorSelector } from '@/components/game/FloorSelector';
import { MockControls } from '@/components/game/MockControls';
import { ARCameraView } from '@/components/game/ARCameraView';
import { InventoryDrawer } from '@/components/game/InventoryDrawer';
import { QuestDrawer } from '@/components/game/QuestDrawer';
import { HintPopup } from '@/components/game/HintPopup';
import { ItemAcquiredToast } from '@/components/game/ItemAcquiredToast';
import { GameMenu } from '@/components/game/GameMenu';
import type { Tables } from '@/integrations/supabase/types';

const MOCK_USER_ID = 'anonymous-player';

const Index = () => {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuest, setShowQuest] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintData, setHintData] = useState({ title: '', hint: '', floor: 1 });
  const [acquiredItem, setAcquiredItem] = useState<string | null>(null);

  const { position, mockMove } = useGeolocation();

  // Fetch spots
  const { data: spots } = useQuery({
    queryKey: ['spots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('spots').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory
  const { data: inventory = [], refetch: refetchInventory } = useQuery({
    queryKey: ['inventory', MOCK_USER_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', MOCK_USER_ID);
      if (error) throw error;
      return data;
    },
  });

  const detectedSpots = useSpotDetection(
    spots,
    position.latitude,
    position.longitude,
    currentFloor
  );

  const nearbyInRange = detectedSpots.filter(s => s.isInRange);

  const handleCollectItem = useCallback(async (ds: DetectedSpot) => {
    // Save to inventory
    await supabase.from('user_inventory').insert({
      user_id: MOCK_USER_ID,
      spot_id: ds.spot.id,
      item_name: ds.spot.item_name || '알 수 없는 아이템',
      item_icon: ds.spot.item_icon,
    });

    // Log the action
    await supabase.from('game_logs').insert({
      user_id: MOCK_USER_ID,
      spot_id: ds.spot.id,
      action: 'collect_item',
      floor: currentFloor,
    });

    // Show toast
    setAcquiredItem(ds.spot.item_name || '아이템');
    setTimeout(() => setAcquiredItem(null), 2000);

    refetchInventory();
  }, [currentFloor, refetchInventory]);

  const handleQRScan = useCallback(() => {
    // Simulate QR scan — pick a random spot on current floor
    const floorSpots = spots?.filter(s => s.floor === currentFloor) || [];
    if (floorSpots.length > 0) {
      const spot = floorSpots[Math.floor(Math.random() * floorSpots.length)];
      setHintData({
        title: spot.name,
        hint: spot.hint_text || '힌트가 없습니다',
        floor: spot.floor,
      });
      setShowHint(true);
    }
  }, [spots, currentFloor]);

  const handleSpotClick = useCallback((ds: DetectedSpot) => {
    if (ds.isInRange) {
      setHintData({
        title: ds.spot.name,
        hint: ds.spot.hint_text || '힌트가 없습니다',
        floor: ds.spot.floor,
      });
      setShowHint(true);
    }
  }, []);


  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Game menu */}
      <GameMenu />

      {/* Map */}
      <GameMap
        userLat={position.latitude}
        userLng={position.longitude}
        detectedSpots={detectedSpots}
        onSpotClick={handleSpotClick}
      />

      {/* Floor selector */}
      <FloorSelector currentFloor={currentFloor} onFloorChange={setCurrentFloor} />

      {/* Mock movement controls */}
      <MockControls onMove={mockMove} />

      {/* Floating action bar */}
      <FloatingBar
        onInventory={() => setShowInventory(true)}
        onQuest={() => setShowQuest(true)}
        onExplore={() => setShowCamera(true)}
        canExplore={nearbyInRange.length > 0}
      />

      {/* Status bar */}
      <div className="fixed top-4 left-4 z-[1000] flex items-center gap-2 bg-card/90 backdrop-blur rounded-full px-3 py-1.5 border border-border text-xs">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground">
          {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
        </span>
        <span className="text-primary font-medium">{nearbyInRange.length} 스팟</span>
      </div>

      {/* Camera AR view */}
      {showCamera && (
        <ARCameraView
          nearbySpots={detectedSpots}
          onClose={() => setShowCamera(false)}
          onCollectItem={handleCollectItem}
          onQRScan={handleQRScan}
        />
      )}

      {/* Drawers */}
      <InventoryDrawer
        open={showInventory}
        onOpenChange={setShowInventory}
        items={inventory}
      />
      <QuestDrawer
        open={showQuest}
        onOpenChange={setShowQuest}
        detectedSpots={detectedSpots}
        currentFloor={currentFloor}
      />

      {/* Hint popup */}
      <HintPopup
        open={showHint}
        onOpenChange={setShowHint}
        title={hintData.title}
        hint={hintData.hint}
        floor={hintData.floor}
      />

      {/* Item acquired toast */}
      <ItemAcquiredToast
        itemName={acquiredItem || ''}
        visible={!!acquiredItem}
      />
    </div>
  );
};

export default Index;

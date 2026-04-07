import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

  const { position, mockMove, isSimulated, setMockStep } = useGeolocation();

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
    await supabase.from('user_inventory').insert({
      user_id: MOCK_USER_ID,
      spot_id: ds.spot.id,
      item_name: ds.spot.item_name || '알 수 없는 아이템',
      item_icon: ds.spot.item_icon,
    });
    await supabase.from('game_logs').insert({
      user_id: MOCK_USER_ID,
      spot_id: ds.spot.id,
      action: 'collect_item',
      floor: currentFloor,
    });
    setAcquiredItem(ds.spot.item_name || '아이템');
    setTimeout(() => setAcquiredItem(null), 2000);
    refetchInventory();
  }, [currentFloor, refetchInventory]);

  const handleQRScan = useCallback(() => {
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
      {/* Map (background) */}
      <GameMap
        userLat={position.latitude}
        userLng={position.longitude}
        detectedSpots={detectedSpots}
        onSpotClick={handleSpotClick}
      />

      {/* ===== TOP-LEFT HUD: status bar ===== */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-4 z-[1000] flex items-center gap-2 bg-card/90 backdrop-blur rounded-full px-3 py-2 border border-border text-xs">
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground">
          {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
        </span>
        {position.accuracy != null && (
          <span className={`font-medium ${position.accuracy <= 10 ? 'text-green-500' : position.accuracy <= 25 ? 'text-yellow-500' : 'text-destructive'}`}>
            ±{position.accuracy.toFixed(1)}m
          </span>
        )}
        <span className="text-primary font-medium">{nearbyInRange.length} 스팟</span>
      </div>

      {/* ===== TOP-RIGHT HUD: stacked controls ===== */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] right-4 z-[1100] flex flex-col items-end gap-3">
        {/* Row 1: Menu + Tag game side by side */}
        <div className="flex items-center gap-2">
          <Link
            to="/play"
            className="h-12 px-5 flex items-center gap-2 bg-primary text-primary-foreground rounded-full text-base font-bold shadow-lg hover:opacity-90 transition active:scale-95"
          >
            🏃 술래잡기
          </Link>
          <GameMenu />
        </div>

        {/* Row 2: Floor selector */}
        <FloorSelector currentFloor={currentFloor} onFloorChange={setCurrentFloor} />
      </div>

      {/* ===== BOTTOM HUD ===== */}
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 right-0 z-[1000] flex flex-col items-center gap-3 pointer-events-none">
        {/* Mock controls - right aligned */}
        <div className="self-end mr-4 pointer-events-auto">
          <MockControls
            onMove={mockMove}
            isSimulated={isSimulated}
            position={position}
            onStepChange={setMockStep}
          />
        </div>

        {/* Floating action bar - centered */}
        <div className="pointer-events-auto">
          <FloatingBar
            onInventory={() => setShowInventory(true)}
            onQuest={() => setShowQuest(true)}
            onExplore={() => setShowCamera(true)}
            canExplore={nearbyInRange.length > 0}
          />
        </div>
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
      <InventoryDrawer open={showInventory} onOpenChange={setShowInventory} items={inventory} />
      <QuestDrawer open={showQuest} onOpenChange={setShowQuest} detectedSpots={detectedSpots} currentFloor={currentFloor} />

      {/* Hint popup */}
      <HintPopup open={showHint} onOpenChange={setShowHint} title={hintData.title} hint={hintData.hint} floor={hintData.floor} />

      {/* Item acquired toast */}
      <ItemAcquiredToast itemName={acquiredItem || ''} visible={!!acquiredItem} />
    </div>
  );
};

export default Index;

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { MockControls } from '@/components/game/MockControls';
import ProximityGlow from '@/components/treasure/ProximityGlow';
import TreasureHUD from '@/components/treasure/TreasureHUD';
import ShovelButton from '@/components/treasure/ShovelButton';
import TreasureQuizPopup from '@/components/treasure/TreasureQuizPopup';
import ChestVictoryOverlay from '@/components/treasure/ChestVictoryOverlay';
import PingOverlay, { Ping } from '@/components/tag-game/PingOverlay';
import { haversineDistance } from '@/lib/haversine';
import { getTreasureIconSrc } from '@/lib/treasureIcons';
import { QUIZ_PRESETS, TREASURE_PRESETS, SPECIAL_ITEMS } from '@/lib/quizPresets';
import { NearestTreasure, ProximityLevel, TeamScores } from '@/hooks/useTreasureHunt';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { playPingSound } from '@/lib/pingSound';

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;
const STEP = 0.0001;

const PUZZLE_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/250px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
];

interface LocalTreasure {
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

function generateTreasures(lat: number, lng: number): LocalTreasure[] {
  const items: LocalTreasure[] = [];
  const quizPool = [...QUIZ_PRESETS].sort(() => Math.random() - 0.5);

  // Gem treasures
  TREASURE_PRESETS.forEach((t, i) => {
    items.push({
      id: `gem-${i}`,
      room_id: 'sim',
      keyword: t.name,
      latitude: lat + (Math.random() - 0.5) * 0.001,
      longitude: lng + (Math.random() - 0.5) * 0.001,
      quiz_question: '',
      quiz_answer: '',
      found_by: null,
      found_at: null,
      created_at: new Date().toISOString(),
      challenge_type: 'treasure',
      puzzle_image_url: null,
      puzzle_grid_size: 3,
      points: t.points,
      treasure_subtype: t.subtype,
    });
  });

  // Quiz treasures
  for (let i = 0; i < 3; i++) {
    const q = quizPool[i];
    items.push({
      id: `quiz-${i}`,
      room_id: 'sim',
      keyword: `퀴즈${i + 1}`,
      latitude: lat + (Math.random() - 0.5) * 0.001,
      longitude: lng + (Math.random() - 0.5) * 0.001,
      quiz_question: q.question,
      quiz_answer: q.answer,
      found_by: null,
      found_at: null,
      created_at: new Date().toISOString(),
      challenge_type: 'quiz',
      puzzle_image_url: null,
      puzzle_grid_size: 3,
      points: 15,
      treasure_subtype: null,
    });
  }

  // Puzzle treasure
  items.push({
    id: 'puzzle-0',
    room_id: 'sim',
    keyword: '퍼즐보물',
    latitude: lat + (Math.random() - 0.5) * 0.001,
    longitude: lng + (Math.random() - 0.5) * 0.001,
    quiz_question: '',
    quiz_answer: '',
    found_by: null,
    found_at: null,
    created_at: new Date().toISOString(),
    challenge_type: 'puzzle',
    puzzle_image_url: PUZZLE_IMAGES[0],
    puzzle_grid_size: 3,
    points: 15,
    treasure_subtype: null,
  });

  // Key
  items.push({
    id: 'key-0',
    room_id: 'sim',
    keyword: SPECIAL_ITEMS.key.name,
    latitude: lat + (Math.random() - 0.5) * 0.001,
    longitude: lng + (Math.random() - 0.5) * 0.001,
    quiz_question: '',
    quiz_answer: '',
    found_by: null,
    found_at: null,
    created_at: new Date().toISOString(),
    challenge_type: 'treasure',
    puzzle_image_url: null,
    puzzle_grid_size: 3,
    points: 0,
    treasure_subtype: 'key',
  });

  // Chest
  items.push({
    id: 'chest-0',
    room_id: 'sim',
    keyword: SPECIAL_ITEMS.chest.name,
    latitude: lat + (Math.random() - 0.5) * 0.001,
    longitude: lng + (Math.random() - 0.5) * 0.001,
    quiz_question: '',
    quiz_answer: '',
    found_by: null,
    found_at: null,
    created_at: new Date().toISOString(),
    challenge_type: 'treasure',
    puzzle_image_url: null,
    puzzle_grid_size: 3,
    points: 100,
    treasure_subtype: 'chest',
  });

  return items;
}

export default function TreasureSimulator() {
  const navigate = useNavigate();
  const [myPos, setMyPos] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [step, setStep] = useState(STEP);
  const [treasures, setTreasures] = useState<LocalTreasure[]>(() => generateTreasures(DEFAULT_LAT, DEFAULT_LNG));
  const [hasKey, setHasKey] = useState(false);
  const [teamScores, setTeamScores] = useState<TeamScores>({ team1: 0, team2: 0 });
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeTreasure, setActiveTreasure] = useState<NearestTreasure | null>(null);
  const [chestDialogOpen, setChestDialogOpen] = useState(false);
  const [gemDialogOpen, setGemDialogOpen] = useState(false);
  const [victoryOverlay, setVictoryOverlay] = useState(false);
  const [pings, setPings] = useState<Ping[]>([]);
  const [pingCooldown, setPingCooldown] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const handleMove = useCallback((dir: 'north' | 'south' | 'east' | 'west') => {
    setMyPos(prev => ({
      latitude: prev.latitude + (dir === 'north' ? step : dir === 'south' ? -step : 0),
      longitude: prev.longitude + (dir === 'east' ? step : dir === 'west' ? -step : 0),
    }));
  }, [step]);

  // Compute nearest unfound treasure
  const nearest: NearestTreasure | null = useMemo(() => {
    const unfound = treasures.filter(t => !t.found_by);
    if (unfound.length === 0) return null;
    let best: NearestTreasure | null = null;
    for (const t of unfound) {
      const d = haversineDistance(myPos.latitude, myPos.longitude, t.latitude, t.longitude);
      if (!best || d < best.distance) {
        best = { ...t, distance: d };
      }
    }
    return best;
  }, [treasures, myPos.latitude, myPos.longitude]);

  // Proximity level
  const proximityLevel: ProximityLevel = useMemo(() => {
    if (!nearest) return null;
    if (nearest.distance <= 10) return 'near';
    if (nearest.distance <= 30) return 'far';
    return null;
  }, [nearest]);

  // Nearby treasures for map markers
  const nearbyTreasures = useMemo(() => {
    return treasures
      .filter(t => !t.found_by)
      .map(t => ({
        ...t,
        distance: haversineDistance(myPos.latitude, myPos.longitude, t.latitude, t.longitude),
      }))
      .filter(t => t.distance <= 100);
  }, [treasures, myPos.latitude, myPos.longitude]);

  const handleDigSuccess = (treasure: NearestTreasure) => {
    setActiveTreasure(treasure);
    if (treasure.challenge_type === 'treasure') {
      if (treasure.treasure_subtype === 'chest') {
        setChestDialogOpen(true);
      } else {
        setGemDialogOpen(true);
      }
    } else {
      setQuizOpen(true);
    }
  };

  const markFound = (id: string) => {
    setTreasures(prev => prev.map(t =>
      t.id === id ? { ...t, found_by: 'me', found_at: new Date().toISOString() } : t
    ));
  };

  const handleGemClaim = () => {
    if (!activeTreasure) return;
    markFound(activeTreasure.id);
    setGemDialogOpen(false);
    if (activeTreasure.treasure_subtype === 'key') {
      setHasKey(true);
      toast.success('열쇠를 획득했습니다!', {
        icon: <img src={getTreasureIconSrc('treasure', 'key')} alt="" className="w-5 h-5 object-contain" />,
      });
    } else {
      setTeamScores(prev => ({ ...prev, team1: prev.team1 + activeTreasure.points }));
      toast.success(`${activeTreasure.keyword}을(를) 획득! (+${activeTreasure.points}점)`);
    }
  };

  const handleChestOpen = () => {
    if (!activeTreasure) return;
    setChestDialogOpen(false);
    if (!hasKey) {
      toast.error('열쇠가 필요합니다! 먼저 열쇠를 찾으세요.', {
        icon: <img src={getTreasureIconSrc('treasure', 'key')} alt="" className="w-5 h-5 object-contain" />,
      });
      return;
    }
    markFound(activeTreasure.id);
    setVictoryOverlay(true);
  };

  const handleQuizSubmit = async (answer: string) => {
    if (!activeTreasure) return { success: false };
    if (answer.trim() === activeTreasure.quiz_answer) {
      markFound(activeTreasure.id);
      setTeamScores(prev => ({ ...prev, team1: prev.team1 + activeTreasure.points }));
      return { success: true };
    }
    // Start cooldown
    setCooldownLeft(15);
    const iv = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return { success: false };
  };

  const handlePuzzleSolve = async () => {
    if (!activeTreasure) return { success: false };
    markFound(activeTreasure.id);
    setTeamScores(prev => ({ ...prev, team1: prev.team1 + activeTreasure.points }));
    return { success: true };
  };

  const sendPing = useCallback(() => {
    if (pingCooldown > 0) return;
    const ping: Ping = {
      id: crypto.randomUUID(),
      lat: myPos.latitude,
      lng: myPos.longitude,
      team: 1,
      nickname: '나',
      timestamp: Date.now(),
    };
    setPings(prev => [...prev, ping]);
    playPingSound();
    setPingCooldown(10);
    const iv = setInterval(() => {
      setPingCooldown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [myPos, pingCooldown]);

  const handlePingExpire = useCallback((id: string) => {
    setPings(prev => prev.filter(p => p.id !== id));
  }, []);

  const center = { lat: myPos.latitude, lng: myPos.longitude };

  return (
    <div className="h-screen w-screen relative text-[1.3em]">
      <style>{`
        @keyframes treasure-float {
          0%, 100% { transform: translate(-50%, -100%) translateY(0px); }
          50% { transform: translate(-50%, -100%) translateY(-6px); }
        }
      `}</style>

      <Map center={center} style={{ width: '100%', height: '100%' }} level={2}>
        {/* Me */}
        <CustomOverlayMap position={center} zIndex={10}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: '#3b82f6', border: '3px solid white',
            transform: 'translate(-50%, -50%)',
          }} />
        </CustomOverlayMap>

        {/* Treasure markers */}
        {nearbyTreasures.map(t => (
          <CustomOverlayMap key={t.id} position={{ lat: t.latitude, lng: t.longitude }} zIndex={8}>
            <div style={{
              animation: 'treasure-float 2s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
            }}>
              <img
                src={getTreasureIconSrc(t.challenge_type, t.treasure_subtype)}
                alt={t.keyword}
                style={{ width: 36, height: 36, objectFit: 'contain' }}
              />
            </div>
          </CustomOverlayMap>
        ))}

        <PingOverlay pings={pings} onExpire={handlePingExpire} />
      </Map>

      <ProximityGlow level={proximityLevel} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/play')} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> 로비
          </Button>
          <TreasureHUD
            teamScores={teamScores}
            team1Name="내팀"
            team2Name="상대팀"
            hasKey={hasKey}
          />
        </div>
      </div>

      {/* Quiz/Puzzle popup */}
      {activeTreasure && (
        <TreasureQuizPopup
          open={quizOpen}
          onOpenChange={setQuizOpen}
          treasure={activeTreasure}
          onQuizSubmit={handleQuizSubmit}
          onPuzzleSolve={handlePuzzleSolve}
        />
      )}

      {/* Gem dialog */}
      <AlertDialog open={gemDialogOpen} onOpenChange={setGemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              <img
                src={getTreasureIconSrc('treasure', activeTreasure?.treasure_subtype || null)}
                alt=""
                className="w-16 h-16 mx-auto object-contain"
              />
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <strong>{activeTreasure?.keyword}</strong>을(를) 발견했습니다!
              <br />
              <span className="text-lg font-bold text-primary">+{activeTreasure?.points}점</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleGemClaim}>획득하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chest dialog */}
      <AlertDialog open={chestDialogOpen} onOpenChange={setChestDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              <img
                src={getTreasureIconSrc('treasure', 'chest')}
                alt="보물상자"
                className="w-16 h-16 mx-auto object-contain"
              />
              <span className="block mt-1">보물상자</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              보물상자를 발견했습니다!
              <br />
              {hasKey ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <img src={getTreasureIconSrc('treasure', 'key')} alt="" className="w-4 h-4 object-contain inline" />
                  열쇠를 보유하고 있습니다. 상자를 여시겠습니까?
                </span>
              ) : (
                <span className="text-destructive font-bold">🔒 열쇠가 없습니다. 먼저 열쇠를 찾아야 합니다!</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            {hasKey && (
              <AlertDialogAction onClick={handleChestOpen}>상자 열기</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-3 right-3 z-50 flex items-end justify-between">
        <div className="flex flex-col gap-2 items-center">
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={sendPing}
            disabled={pingCooldown > 0}
          >
            {pingCooldown > 0 ? (
              <span className="text-base font-bold">{pingCooldown}</span>
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </Button>
        </div>

        <ShovelButton
          nearest={nearest}
          onDigSuccess={handleDigSuccess}
          disabled={cooldownLeft > 0}
        />

        <MockControls
          onMove={handleMove}
          isSimulated
          position={myPos}
          onStepChange={setStep}
        />
      </div>

      {victoryOverlay && (
        <ChestVictoryOverlay
          winnerTeam="내팀"
          onComplete={() => {
            setVictoryOverlay(false);
            navigate('/play');
          }}
        />
      )}
    </div>
  );
}

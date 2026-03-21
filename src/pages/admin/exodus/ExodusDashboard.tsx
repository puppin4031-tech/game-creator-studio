import { List, Users, Package, Puzzle, Zap, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stats = [
  { label: '재앙 스테이지', value: '10', icon: List, color: '#dc2626' },
  { label: 'NPC 캐릭터', value: '4', icon: Users, color: '#d4a843' },
  { label: '아이템 프리셋', value: '5', icon: Package, color: '#22d3ee' },
  { label: '퍼즐/퀴즈', value: '∞', icon: Puzzle, color: '#a855f7' },
];

const quickLinks = [
  { title: '10대 재앙 스테이지', desc: '1재앙(피)부터 10재앙(장자의 죽음)까지 세로 타임라인', path: '/admin/exodus/stages', icon: Zap },
  { title: 'NPC 도감', desc: '모세, 아론, 파라오, 여호수아 캐릭터 프로필', path: '/admin/exodus/npcs', icon: Users },
  { title: '아이템 프리셋', desc: '트레이딩 카드 스타일의 수집품 관리', path: '/admin/exodus/items', icon: Package },
  { title: '퍼즐/퀴즈 메이커', desc: 'GPS 위치, 퀴즈 출제 에디터', path: '/admin/exodus/puzzle-maker', icon: Puzzle },
];

export default function ExodusDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#d4a843]">
          ⚡ EXODUS 대시보드
        </h1>
        <p className="text-[#7b8da6] text-[15px] mt-1">
          출애굽기 10대 재앙 — AR 위치 기반 방탈출 게임 프리셋
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + '20' }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#e8e0d0]">{s.value}</div>
            <div className="text-[13px] text-[#7b8da6]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-[#e8e0d0] mb-3">빠른 이동</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="text-left rounded-xl bg-[#111f38] border border-[#1e2d4a] hover:border-[#d4a843]/40 p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <link.icon className="h-5 w-5 text-[#d4a843] group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-[15px] font-medium text-[#e8e0d0]">{link.title}</div>
                  <div className="text-[13px] text-[#7b8da6]">{link.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map placeholder */}
      <div className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-[#d4a843]" />
          <h2 className="text-lg font-semibold text-[#e8e0d0]">활성 스팟 현황</h2>
        </div>
        <div className="h-48 rounded-lg bg-[#0a1628] border border-[#1e2d4a] flex items-center justify-center">
          <span className="text-[#7b8da6] text-sm">지도에 스팟을 배치하면 여기에 표시됩니다</span>
        </div>
      </div>
    </div>
  );
}

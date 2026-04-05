import { ProximityLevel } from '@/hooks/useTreasureHunt';

interface Props {
  level: ProximityLevel;
}

export default function ProximityGlow({ level }: Props) {
  if (!level || level === 'close') return null;

  const color = level === 'near'
    ? 'rgba(234, 179, 8, 0.6)'   // yellow
    : 'rgba(34, 197, 94, 0.4)';  // green

  const intensity = level === 'near' ? '80px' : '60px';

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none animate-proximity-glow"
      style={{
        boxShadow: `inset 0 0 ${intensity} ${color}`,
      }}
    />
  );
}

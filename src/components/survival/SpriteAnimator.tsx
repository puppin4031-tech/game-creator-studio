import { useEffect, useState } from 'react';

interface Props {
  url: string;
  frames: number;
  fps: number;
  height?: number;
  playing?: boolean;
}

/** Plays a horizontal sprite-sheet strip (equal-width frames, left to right). */
export default function SpriteAnimator({ url, frames, fps, height = 64, playing = true }: Props) {
  const [frame, setFrame] = useState(0);
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setRatio(img.naturalWidth / frames / img.naturalHeight || 1);
    img.src = url;
  }, [url, frames]);

  useEffect(() => {
    setFrame(0);
    if (!playing || frames < 2) return;
    const id = window.setInterval(() => setFrame(f => (f + 1) % frames), 1000 / fps);
    return () => window.clearInterval(id);
  }, [frames, fps, playing, url]);

  const width = height * ratio;
  return (
    <div
      aria-hidden
      className="pixelated select-none"
      style={{
        width, height,
        backgroundImage: `url(${url})`,
        backgroundSize: `${width * frames}px ${height}px`,
        backgroundPosition: `${-frame * width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}

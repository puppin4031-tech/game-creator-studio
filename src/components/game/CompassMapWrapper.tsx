import { useEffect, useRef, useState, ReactNode, cloneElement, isValidElement, Children } from 'react';

interface Props {
  compassActive: boolean;
  heading: number | null;
  children: ReactNode;
}

/**
 * Wraps a Kakao <Map> in a 150vmax CSS-rotated container so the map appears
 * to rotate around the user. Uses LERP smoothing and accumulated angle to
 * avoid 360→0 wrap-around. When compass is active, disables drag/zoom on
 * children automatically.
 */
export default function CompassMapWrapper({ compassActive, heading, children }: Props) {
  const accumulatedAngle = useRef(0);
  const smoothedAngle = useRef(0);
  const prevHeading = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [mapRotation, setMapRotation] = useState(0);

  useEffect(() => {
    if (!compassActive || heading === null) {
      accumulatedAngle.current = 0;
      smoothedAngle.current = 0;
      prevHeading.current = null;
      setMapRotation(0);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (prevHeading.current === null) {
      accumulatedAngle.current = -heading;
      smoothedAngle.current = -heading;
    } else {
      let diff = heading - prevHeading.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      accumulatedAngle.current -= diff;
    }
    prevHeading.current = heading;

    const SMOOTHING = 0.12;
    const animate = () => {
      const delta = accumulatedAngle.current - smoothedAngle.current;
      if (Math.abs(delta) < 0.05) {
        smoothedAngle.current = accumulatedAngle.current;
      } else {
        smoothedAngle.current += delta * SMOOTHING;
      }
      setMapRotation(Math.round(smoothedAngle.current * 100) / 100);
      rafRef.current = requestAnimationFrame(animate);
    };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [compassActive, heading]);

  // Inject draggable/zoomable=false into the Map child when compass is active
  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child) && compassActive) {
      return cloneElement(child as any, {
        draggable: false,
        zoomable: false,
      });
    }
    return child;
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '150vmax',
        height: '150vmax',
        transform: `translate(-50%, -50%) rotate(${mapRotation}deg)`,
      }}
    >
      {enhancedChildren}
    </div>
  );
}

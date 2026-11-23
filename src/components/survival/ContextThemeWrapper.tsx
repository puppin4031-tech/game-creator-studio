import React from 'react';
import type { GearInstance, Stack } from '@/lib/survival/types';
import type { OwnedPet } from '@/lib/survival/pets';
import type { CarriedEgg } from '@/lib/survival/dinoEggs';
import type { ObservedExpedition } from '@/lib/survival/expedition';

export type ContextMode = 'user' | 'base' | 'pet' | 'expedition';

export interface ContextThemeProps {
  mode: ContextMode;
  onSelectMode: (m: ContextMode) => void;
  hp: number;
  maxHp: number;
  hunger: number;
  weight: number;
  capacity: number;
  level: number;
  weapon: GearInstance | null;
  backpack: Stack[];
  storage: Stack[];
  baseLevel?: number;
  palisade?: boolean;
  pets: OwnedPet[];
  dinoEggs?: CarriedEgg[];
  walkSteps?: number;
  crew: ObservedExpedition | null;
  expeditionLevel?: number;
  expeditionDistanceM?: number;
  lastExpeditionLog?: string;
  onScanNearby?: () => void;
  onOpenPetFusion?: () => void;
  onStartDinoHunt?: () => void;
  onMoraleExpedition?: () => void;
  onRecallExpedition?: () => void;
  onOpenVillageModal?: (modal: string) => void;
  children: React.ReactNode;
}

export function ContextThemeWrapper({
  mode,
  children,
}: ContextThemeProps) {
  return (
    <div
      data-context-mode={mode}
      className="relative h-[100dvh] w-full overflow-hidden select-none bg-stone-950"
    >
      {children}
    </div>
  );
}

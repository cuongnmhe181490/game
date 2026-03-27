import type { ResourceDeltaState } from '@/game/state/types';

export interface ExplorationCombatProfile {
  maxHealth: number;
  moveSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldownMs: number;
}

export interface ExplorationRunOutcome {
  mapId: string;
  rewards: ResourceDeltaState;
  itemRewards?: Record<string, number>;
  sectPrestigeDelta?: number;
  playerCultivationProgressDelta?: number;
  foundationStabilityDelta?: number;
  factionRelationDeltas?: Record<string, number>;
  defeatedBoss: boolean;
  result: 'victory' | 'retreat' | 'defeat';
  notes: string[];
  storyFlags?: string[];
  worldFlags?: string[];
  choiceFlags?: string[];
}

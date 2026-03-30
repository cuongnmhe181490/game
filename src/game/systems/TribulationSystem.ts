import { realmCatalog } from '@/game/data';
import type { GameState } from '@/game/state/types';
import { BeastSystem } from '@/game/systems/BeastSystem';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
import { TechniqueSystem } from '@/game/systems/TechniqueSystem';

export type TribulationOutcome = 'success' | 'partial' | 'failure';

export interface TribulationFactor {
  label: string;
  value: number;
}

export interface TribulationAssessment {
  currentRealmName: string;
  nextRealmName: string;
  score: number;
  outcome: TribulationOutcome;
  summary: string;
  factorLines: string[];
  factors: TribulationFactor[];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

export class TribulationSystem {
  constructor(
    private readonly techniqueSystem: TechniqueSystem,
    private readonly beastSystem: BeastSystem,
    private readonly discipleSystem: DiscipleSystem
  ) {}

  assess(snapshot: Readonly<GameState>): TribulationAssessment | null {
    const currentRealm = realmCatalog.realms.find((realm) => realm.id === snapshot.player.cultivation.currentRealmId) ?? realmCatalog.realms[0];
    const nextRealm = realmCatalog.realms.find((realm) => realm.order === currentRealm.order + 1) ?? null;

    if (!nextRealm) {
      return null;
    }

    const cultivation = snapshot.player.cultivation;
    const overflowProgress = Math.max(0, cultivation.cultivationProgress - currentRealm.progressRequired);
    const beastSupport = this.beastSystem.getExplorationBonuses(snapshot);
    const management = this.discipleSystem.getSectManagementOverview(snapshot);
    const equipped = this.techniqueSystem.getEquippedPassiveEffects(snapshot);
    const libraryLevel = snapshot.sect.buildings.tang_kinh_cac.level;
    const hallLevel = snapshot.sect.buildings.tinh_tu_duong.level;

    const factors: TribulationFactor[] = [
      { label: 'Nen tien do', value: 42 },
      { label: 'Du thua tu vi', value: Math.min(10, Math.floor(overflowProgress / 4)) },
      { label: 'Nen can', value: Math.max(-4, Math.floor((cultivation.foundationStability - 55) / 8)) },
      { label: 'Duoc luc dan duoc', value: Math.max(0, cultivation.breakthroughBonus) },
      { label: 'Linh thu ho tro', value: Math.min(6, Math.floor((beastSupport.attackBonus + beastSupport.maxHealthBonus / 4) / 2)) },
      {
        label: 'Cong phap va kinh cac',
        value: Math.min(
          8,
          (equipped.dailyCultivationProgress ?? 0)
            + (equipped.foundationStabilityBonus ?? 0)
            + Math.max(0, snapshot.player.cultivation.knownTechniqueIds.length - 1)
            + libraryLevel
        )
      },
      {
        label: 'Tinh tu va noi mon',
        value: Math.min(6, hallLevel + Math.floor(management.cultivationPower / 60))
      },
      { label: 'Tam ma can tro', value: -Math.floor(cultivation.tamMaPressure / 14) }
    ];

    const score = clampScore(factors.reduce((sum, factor) => sum + factor.value, 0));
    const outcome: TribulationOutcome = score >= 58 ? 'success' : score >= 46 ? 'partial' : 'failure';
    const summary =
      outcome === 'success'
        ? `Thien kiep rung xuong nhung dao tam da dung. Co the pha qua ${nextRealm.name}.`
        : outcome === 'partial'
          ? `Kiep ap da qua nhung khi mach chua thong. Can them mot nhip on dinh truoc khi vuot ${nextRealm.name}.`
          : `Kiep van dot ngot lech pha. Nen can chao dao va can lui lai mot nhip.`;

    return {
      currentRealmName: currentRealm.name,
      nextRealmName: nextRealm.name,
      score,
      outcome,
      summary,
      factorLines: factors.map((factor) => `${factor.label}: ${(factor.value >= 0 ? '+' : '') + factor.value}`),
      factors
    };
  }
}

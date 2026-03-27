import Phaser from 'phaser';

import { AlchemySystem } from '@/game/systems/AlchemySystem';
import { ArtifactSystem } from '@/game/systems/ArtifactSystem';
import { BuildingSystem } from '@/game/systems/BuildingSystem';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
import { DiplomacySystem } from '@/game/systems/DiplomacySystem';
import { EndingSystem } from '@/game/systems/EndingSystem';
import { EventRuntimeSystem } from '@/game/systems/EventRuntimeSystem';
import { ExplorationSystem } from '@/game/systems/ExplorationSystem';
import { FeedbackSystem } from '@/game/systems/FeedbackSystem';
import { InventorySystem } from '@/game/systems/InventorySystem';
import { RealmSystem } from '@/game/systems/RealmSystem';
import { ResourceSystem } from '@/game/systems/ResourceSystem';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';
import { TechniqueSystem } from '@/game/systems/TechniqueSystem';
import { GameStateManager } from '@/game/state/GameStateManager';
import { TimeSystem } from '@/game/systems/TimeSystem';

export const REGISTRY_KEYS = {
  buildingSystem: 'building-system',
  discipleSystem: 'disciple-system',
  diplomacySystem: 'diplomacy-system',
  endingSystem: 'ending-system',
  eventRuntime: 'event-runtime',
  explorationSystem: 'exploration-system',
  feedbackSystem: 'feedback-system',
  inventorySystem: 'inventory-system',
  artifactSystem: 'artifact-system',
  alchemySystem: 'alchemy-system',
  realmSystem: 'realm-system',
  resourceSystem: 'resource-system',
  saveSystem: 'save-system',
  sectIdentitySystem: 'sect-identity-system',
  stateManager: 'state-manager',
  techniqueSystem: 'technique-system',
  timeSystem: 'time-system'
} as const;

export function getStateManager(scene: Phaser.Scene): GameStateManager {
  const manager = scene.registry.get(REGISTRY_KEYS.stateManager);

  if (!(manager instanceof GameStateManager)) {
    throw new Error('GameStateManager is not registered.');
  }

  return manager;
}

export function getSaveStore(scene: Phaser.Scene): SaveSystem {
  const store = scene.registry.get(REGISTRY_KEYS.saveSystem);

  if (!(store instanceof SaveSystem)) {
    throw new Error('SaveSystem is not registered.');
  }

  return store;
}

export function getBuildingSystem(scene: Phaser.Scene): BuildingSystem {
  const system = scene.registry.get(REGISTRY_KEYS.buildingSystem);

  if (!(system instanceof BuildingSystem)) {
    throw new Error('BuildingSystem is not registered.');
  }

  return system;
}

export function getSectIdentitySystem(scene: Phaser.Scene): SectIdentitySystem {
  const system = scene.registry.get(REGISTRY_KEYS.sectIdentitySystem);

  if (!(system instanceof SectIdentitySystem)) {
    throw new Error('SectIdentitySystem is not registered.');
  }

  return system;
}

export function getInventorySystem(scene: Phaser.Scene): InventorySystem {
  const system = scene.registry.get(REGISTRY_KEYS.inventorySystem);

  if (!(system instanceof InventorySystem)) {
    throw new Error('InventorySystem is not registered.');
  }

  return system;
}

export function getArtifactSystem(scene: Phaser.Scene): ArtifactSystem {
  const system = scene.registry.get(REGISTRY_KEYS.artifactSystem);

  if (!(system instanceof ArtifactSystem)) {
    throw new Error('ArtifactSystem is not registered.');
  }

  return system;
}

export function getAlchemySystem(scene: Phaser.Scene): AlchemySystem {
  const system = scene.registry.get(REGISTRY_KEYS.alchemySystem);

  if (!(system instanceof AlchemySystem)) {
    throw new Error('AlchemySystem is not registered.');
  }

  return system;
}

export function getDiscipleSystem(scene: Phaser.Scene): DiscipleSystem {
  const system = scene.registry.get(REGISTRY_KEYS.discipleSystem);

  if (!(system instanceof DiscipleSystem)) {
    throw new Error('DiscipleSystem is not registered.');
  }

  return system;
}

export function getDiplomacySystem(scene: Phaser.Scene): DiplomacySystem {
  const system = scene.registry.get(REGISTRY_KEYS.diplomacySystem);

  if (!(system instanceof DiplomacySystem)) {
    throw new Error('DiplomacySystem is not registered.');
  }

  return system;
}

export function getEndingSystem(scene: Phaser.Scene): EndingSystem {
  const system = scene.registry.get(REGISTRY_KEYS.endingSystem);

  if (!(system instanceof EndingSystem)) {
    throw new Error('EndingSystem is not registered.');
  }

  return system;
}

export function getTimeSystem(scene: Phaser.Scene): TimeSystem {
  const system = scene.registry.get(REGISTRY_KEYS.timeSystem);

  if (!(system instanceof TimeSystem)) {
    throw new Error('TimeSystem is not registered.');
  }

  return system;
}

export function getRealmSystem(scene: Phaser.Scene): RealmSystem {
  const system = scene.registry.get(REGISTRY_KEYS.realmSystem);

  if (!(system instanceof RealmSystem)) {
    throw new Error('RealmSystem is not registered.');
  }

  return system;
}

export function getResourceSystem(scene: Phaser.Scene): ResourceSystem {
  const system = scene.registry.get(REGISTRY_KEYS.resourceSystem);

  if (!(system instanceof ResourceSystem)) {
    throw new Error('ResourceSystem is not registered.');
  }

  return system;
}

export function getEventRuntimeSystem(scene: Phaser.Scene): EventRuntimeSystem {
  const system = scene.registry.get(REGISTRY_KEYS.eventRuntime);

  if (!(system instanceof EventRuntimeSystem)) {
    throw new Error('EventRuntimeSystem is not registered.');
  }

  return system;
}

export function getTechniqueSystem(scene: Phaser.Scene): TechniqueSystem {
  const system = scene.registry.get(REGISTRY_KEYS.techniqueSystem);

  if (!(system instanceof TechniqueSystem)) {
    throw new Error('TechniqueSystem is not registered.');
  }

  return system;
}

export function getExplorationSystem(scene: Phaser.Scene): ExplorationSystem {
  const system = scene.registry.get(REGISTRY_KEYS.explorationSystem);

  if (!(system instanceof ExplorationSystem)) {
    throw new Error('ExplorationSystem is not registered.');
  }

  return system;
}

export function getFeedbackSystem(scene: Phaser.Scene): FeedbackSystem {
  const system = scene.registry.get(REGISTRY_KEYS.feedbackSystem);

  if (!(system instanceof FeedbackSystem)) {
    throw new Error('FeedbackSystem is not registered.');
  }

  return system;
}

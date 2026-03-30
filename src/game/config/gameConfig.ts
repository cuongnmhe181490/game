import Phaser from 'phaser';

import { AlchemySystem } from '@/game/systems/AlchemySystem';
import { ArtifactSystem } from '@/game/systems/ArtifactSystem';
import { BeastSystem } from '@/game/systems/BeastSystem';
import { REGISTRY_KEYS } from '@/game/config/registry';
import { BootScene } from '@/game/scenes/BootScene';
import { BeastsScene } from '@/game/scenes/BeastsScene';
import { EndingScene } from '@/game/scenes/EndingScene';
import { ExplorationScene } from '@/game/scenes/ExplorationScene';
import { InventoryScene } from '@/game/scenes/InventoryScene';
import { MainMenuScene } from '@/game/scenes/MainMenuScene';
import { PreloadScene } from '@/game/scenes/PreloadScene';
import { SectScene } from '@/game/scenes/SectScene';
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
import { TribulationSystem } from '@/game/systems/TribulationSystem';
import type { GameStateManager } from '@/game/state/GameStateManager';
import { TimeSystem } from '@/game/systems/TimeSystem';
import { SettingsStore } from '@/game/systems/SettingsStore';
import { SaveSlotsScene } from '@/game/scenes/SaveSlotsScene';
import { SettingsScene } from '@/game/scenes/SettingsScene';
import { SystemMenuScene } from '@/game/scenes/SystemMenuScene';

export function createGameConfig(
  parent: HTMLElement,
  stateManager: GameStateManager,
  saveSystem: SaveSystem
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#081014',
    scene: [BootScene, PreloadScene, MainMenuScene, SectScene, BeastsScene, InventoryScene, ExplorationScene, EndingScene, SaveSlotsScene, SettingsScene, SystemMenuScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: true,
      width: 1280,
      height: 720
    },
    callbacks: {
      postBoot: (game) => {
        const resourceSystem = new ResourceSystem(stateManager, saveSystem);
        const buildingSystem = new BuildingSystem(stateManager, saveSystem, resourceSystem);
        const diplomacySystem = new DiplomacySystem(stateManager, saveSystem, resourceSystem);
        const endingSystem = new EndingSystem(stateManager, saveSystem);
        const sectIdentitySystem = new SectIdentitySystem(stateManager, saveSystem);
        const discipleSystem = new DiscipleSystem(stateManager, saveSystem, resourceSystem, sectIdentitySystem);
        const techniqueSystem = new TechniqueSystem(stateManager, saveSystem);
        const artifactSystem = new ArtifactSystem(stateManager, saveSystem);
        const beastSystem = new BeastSystem(stateManager, saveSystem);
        const tribulationSystem = new TribulationSystem(techniqueSystem, beastSystem, discipleSystem);
        const realmSystem = new RealmSystem(
          stateManager,
          saveSystem,
          resourceSystem,
          techniqueSystem,
          artifactSystem,
          sectIdentitySystem,
          tribulationSystem,
          discipleSystem
        );
        const inventorySystem = new InventorySystem(stateManager, saveSystem);
        const alchemySystem = new AlchemySystem(stateManager, saveSystem, buildingSystem, inventorySystem, sectIdentitySystem, discipleSystem);
        const eventRuntimeSystem = new EventRuntimeSystem(
          stateManager,
          saveSystem,
          discipleSystem,
          diplomacySystem,
          sectIdentitySystem,
          endingSystem
        );
        const explorationSystem = new ExplorationSystem(stateManager, saveSystem, resourceSystem, inventorySystem, artifactSystem, beastSystem, discipleSystem);
        const feedbackSystem = new FeedbackSystem();
        const settingsStore = new SettingsStore();
        const settings = settingsStore.getSettings();
        feedbackSystem.setVolumePreferences(settings.masterVolume, settings.sfxVolume);
        const timeSystem = new TimeSystem(
          stateManager,
          saveSystem,
          buildingSystem,
          discipleSystem,
          realmSystem,
          eventRuntimeSystem,
          sectIdentitySystem
        );

        game.registry.set(REGISTRY_KEYS.stateManager, stateManager);
        game.registry.set(REGISTRY_KEYS.saveSystem, saveSystem);
        game.registry.set(REGISTRY_KEYS.settingsStore, settingsStore);
        game.registry.set(REGISTRY_KEYS.buildingSystem, buildingSystem);
        game.registry.set(REGISTRY_KEYS.discipleSystem, discipleSystem);
        game.registry.set(REGISTRY_KEYS.diplomacySystem, diplomacySystem);
        game.registry.set(REGISTRY_KEYS.endingSystem, endingSystem);
        game.registry.set(REGISTRY_KEYS.sectIdentitySystem, sectIdentitySystem);
        game.registry.set(REGISTRY_KEYS.inventorySystem, inventorySystem);
        game.registry.set(REGISTRY_KEYS.beastSystem, beastSystem);
        game.registry.set(REGISTRY_KEYS.artifactSystem, artifactSystem);
        game.registry.set(REGISTRY_KEYS.alchemySystem, alchemySystem);
        game.registry.set(REGISTRY_KEYS.techniqueSystem, techniqueSystem);
        game.registry.set(REGISTRY_KEYS.tribulationSystem, tribulationSystem);
        game.registry.set(REGISTRY_KEYS.realmSystem, realmSystem);
        game.registry.set(REGISTRY_KEYS.resourceSystem, resourceSystem);
        game.registry.set(REGISTRY_KEYS.timeSystem, timeSystem);
        game.registry.set(REGISTRY_KEYS.eventRuntime, eventRuntimeSystem);
        game.registry.set(REGISTRY_KEYS.explorationSystem, explorationSystem);
        game.registry.set(REGISTRY_KEYS.feedbackSystem, feedbackSystem);
      }
    }
  };
}

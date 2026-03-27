import { alchemyRecipeCatalog, type AlchemyRecipeDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { BuildingId, GameState } from '@/game/state/types';
import { BuildingSystem } from '@/game/systems/BuildingSystem';
import { InventorySystem } from '@/game/systems/InventorySystem';
import { SaveSystem } from '@/game/systems/LocalSaveStore';
import { SectIdentitySystem } from '@/game/systems/SectIdentitySystem';

export interface AlchemyActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export class AlchemySystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem,
    private readonly buildingSystem: BuildingSystem,
    private readonly inventorySystem: InventorySystem,
    private readonly sectIdentitySystem: SectIdentitySystem
  ) {}

  getRecipeDefinition(recipeId: string): AlchemyRecipeDefinition | null {
    return alchemyRecipeCatalog.recipes.find((recipe) => recipe.id === recipeId) ?? null;
  }

  listRecipes(): AlchemyRecipeDefinition[] {
    return alchemyRecipeCatalog.recipes;
  }

  canCraft(recipeId: string, snapshot: Readonly<GameState> = this.stateManager.snapshot): { ok: boolean; reason: string } {
    const recipe = this.getRecipeDefinition(recipeId);

    if (!recipe) {
      return { ok: false, reason: 'Khong tim thay dan phuong.' };
    }

    const buildingState = snapshot.sect.buildings[recipe.requiredBuildingId as BuildingId];
    if (!buildingState?.isConstructed) {
      const buildingName = this.buildingSystem.getBuildingDefinition(recipe.requiredBuildingId as BuildingId)?.name ?? recipe.requiredBuildingId;
      return { ok: false, reason: `Can ${buildingName} da dung.` };
    }

    for (const ingredient of recipe.ingredients) {
      if (!this.inventorySystem.hasItem(ingredient.itemId, ingredient.amount, snapshot)) {
        const itemName = this.inventorySystem.getItemDefinition(ingredient.itemId)?.name ?? ingredient.itemId;
        return { ok: false, reason: `Thieu ${itemName}.` };
      }
    }

    return { ok: true, reason: 'ok' };
  }

  craft(recipeId: string): AlchemyActionResult {
    const before = this.stateManager.snapshot;
    const recipe = this.getRecipeDefinition(recipeId);
    const evaluation = this.canCraft(recipeId, before);

    if (!recipe || !evaluation.ok) {
      return { ok: false, message: evaluation.reason, snapshot: before };
    }

    const outputBonus = Math.max(0, this.sectIdentitySystem.getCombinedModifiers(before).alchemyOutputBonus ?? 0);
    const snapshot = this.stateManager.update((draft) => {
      for (const ingredient of recipe.ingredients) {
        draft.inventory.items[ingredient.itemId] = Math.max(0, (draft.inventory.items[ingredient.itemId] ?? 0) - ingredient.amount);
        if (draft.inventory.items[ingredient.itemId] <= 0) {
          delete draft.inventory.items[ingredient.itemId];
        }
      }

      for (const output of recipe.outputs) {
        const finalAmount = output.amount + outputBonus;
        draft.inventory.items[output.itemId] = (draft.inventory.items[output.itemId] ?? 0) + finalAmount;
      }

      draft.inventory.lastSummary = outputBonus > 0
        ? `Luyen thanh ${recipe.name} va duoc them ${outputBonus} nho ho tro tong vu.`
        : `Luyen thanh ${recipe.name}.`;
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: outputBonus > 0
        ? `Luyen thanh ${recipe.name} va nhan them ${outputBonus} thanh pham.`
        : `Luyen thanh ${recipe.name}.`,
      snapshot
    };
  }
}

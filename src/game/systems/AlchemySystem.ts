import { alchemyRecipeCatalog, type AlchemyRecipeDefinition } from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { BuildingId, GameState } from '@/game/state/types';
import { BuildingSystem } from '@/game/systems/BuildingSystem';
import { DiscipleSystem } from '@/game/systems/DiscipleSystem';
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
    private readonly sectIdentitySystem: SectIdentitySystem,
    private readonly discipleSystem: DiscipleSystem
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

    for (const ingredient of this.getAdjustedIngredients(recipe, snapshot)) {
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
    const adjustedIngredients = this.getAdjustedIngredients(recipe, before);
    const reduction = this.getAlchemySupport(before);
    const previousReputation = before.sect.reputation;
    const forgedArtifacts = recipe.outputs
      .map((output) => this.inventorySystem.getItemDefinition(output.itemId))
      .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition && definition.category === 'artifact'));
    const snapshot = this.stateManager.update((draft) => {
      for (const ingredient of adjustedIngredients) {
        if (ingredient.amount <= 0) {
          continue;
        }
        draft.inventory.items[ingredient.itemId] = Math.max(0, (draft.inventory.items[ingredient.itemId] ?? 0) - ingredient.amount);
        if (draft.inventory.items[ingredient.itemId] <= 0) {
          delete draft.inventory.items[ingredient.itemId];
        }
      }

      for (const output of recipe.outputs) {
        const finalAmount = output.amount + outputBonus;
        draft.inventory.items[output.itemId] = (draft.inventory.items[output.itemId] ?? 0) + finalAmount;
      }

      if (forgedArtifacts.length > 0) {
        draft.sect.reputation += 4;
        draft.sect.prestige += 1;
        this.discipleSystem.applyReputationMilestonesInDraft(draft, previousReputation);
      }

      draft.inventory.lastSummary = outputBonus > 0 || reduction > 0
        ? `Luyen thanh ${recipe.name}${outputBonus > 0 ? `, nhan them ${outputBonus}` : ''}${reduction > 0 ? `, giam ${reduction} nguyen lieu nho de tu ho tro` : ''}.`
        : `Luyen thanh ${recipe.name}.`;
      if (forgedArtifacts.length > 0) {
        draft.inventory.lastSummary = `${draft.inventory.lastSummary} Phap khi hiem da thanh hinh, uy danh tong mon tang len.`;
      }
      draft.ui.statusMessage = draft.inventory.lastSummary;
    });

    this.saveSystem.saveGame(snapshot);
    return {
      ok: true,
      message: outputBonus > 0 || reduction > 0
        ? `Luyen thanh ${recipe.name}${outputBonus > 0 ? ` va nhan them ${outputBonus} thanh pham` : ''}${reduction > 0 ? `, tiet kiem ${reduction} nguyen lieu` : ''}.`
        : `Luyen thanh ${recipe.name}.`,
      snapshot
    };
  }

  getAdjustedIngredients(
    recipe: AlchemyRecipeDefinition,
    snapshot: Readonly<GameState> = this.stateManager.snapshot
  ): Array<{ itemId: string; amount: number }> {
    let remainingReduction = this.getAlchemySupport(snapshot);
    return recipe.ingredients.map((ingredient) => {
      const appliedReduction = Math.min(remainingReduction, ingredient.amount);
      remainingReduction -= appliedReduction;
      return {
        itemId: ingredient.itemId,
        amount: Math.max(0, ingredient.amount - appliedReduction)
      };
    });
  }

  getAlchemySupport(snapshot: Readonly<GameState> = this.stateManager.snapshot): number {
    return this.discipleSystem.getSectManagementOverview(snapshot).alchemyCostReduction;
  }
}

import type { GameState } from '@/game/state/types';
import { SAVE_SCHEMA_VERSION } from '@/game/state/types';
import { deserializeGameState } from '@/game/state/codec';

export class GameStateManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = structuredClone(initialState);
  }

  get snapshot(): Readonly<GameState> {
    return structuredClone(this.state);
  }

  replace(nextState: GameState): Readonly<GameState> {
    this.state = this.withUpdatedTimestamp(nextState);
    return this.snapshot;
  }

  update(recipe: (draft: GameState) => void): Readonly<GameState> {
    const nextState = structuredClone(this.state);

    recipe(nextState);

    this.state = this.withUpdatedTimestamp(nextState);
    return this.snapshot;
  }

  serialize(): string {
    return JSON.stringify(this.state, null, 2);
  }

  hydrate(serializedState: string): boolean {
    const parsed = deserializeGameState(serializedState);

    if (!parsed) {
      return false;
    }

    this.state = this.withUpdatedTimestamp(parsed);
    return true;
  }

  private withUpdatedTimestamp(state: GameState): GameState {
    return {
      ...structuredClone(state),
      meta: {
        ...state.meta,
        saveVersion: SAVE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString()
      }
    };
  }
}

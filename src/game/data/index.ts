import gameContent from '@/game/data/game-content.json';
export * from '@/game/data/catalogs';
export * from '@/game/data/events';

export interface MainMenuContent {
  title: string;
  subtitle: string;
  introLines: string[];
  menuOptions: string[];
}

export interface GameContent {
  projectName: string;
  mainMenu: MainMenuContent;
}

export const content = gameContent satisfies GameContent;

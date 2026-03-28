import Phaser from 'phaser';

import { getBuildInfoLine } from '@/game/config/buildInfo';
import {
  getAlchemySystem,
  getArtifactSystem,
  getBuildingSystem,
  getDiscipleSystem,
  getDiplomacySystem,
  getEndingSystem,
  getEventRuntimeSystem,
  getExplorationSystem,
  getFeedbackSystem,
  getInventorySystem,
  getRealmSystem,
  getSaveStore,
  getSectIdentitySystem,
  getStateManager,
  getTechniqueSystem,
  getTimeSystem
} from '@/game/config/registry';
import {
  alchemyRecipeCatalog,
  buildingCatalog,
  discipleTraitCatalog,
  elderRoleCatalog,
  getEventById,
  governanceStyleCatalog,
  itemCatalog,
  realmCatalog,
  sectRuleCatalog,
  storyChapterCatalog,
  techniqueCatalog
} from '@/game/data';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import { createGameState } from '@/game/state';
import type { BuildingId, DiscipleTaskId, GameState } from '@/game/state/types';
import { TASK_LABELS } from '@/game/systems/DiscipleSystem';
import {
  AlchemyPanel,
  createTextButton,
  createPrimaryButton,
  createSecondaryButton,
  createResourceChip,
  CultivationPanel,
  DiplomacyPanel,
  drawSceneFrame,
  EventModal,
  GovernancePanel,
  createInventorySlot,
  InventoryPanel,
  NavBar,
  PanelFrame,
  menuPalette
} from '@/game/ui';

const CULTIVATION_MODE_LABELS = {
  balanced: 'Binh on',
  focused: 'Tu khi'
} as const;

const TUTORIAL_CHOICE_FLAGS = {
  introSeen: 'tutorial_intro_seen',
  skipped: 'tutorial_skipped',
  advancedDay: 'tutorial_day_advanced',
  checkedDisciple: 'tutorial_checked_disciple',
  openedCultivation: 'tutorial_opened_cultivation',
  resolvedEvent: 'tutorial_resolved_event',
  enteredExploration: 'tutorial_entered_exploration',
  returnedExploration: 'tutorial_returned_exploration'
} as const;

function getChapterName(snapshot: Readonly<GameState>): string {
  return storyChapterCatalog.chapters.find((chapter) => chapter.id === snapshot.story.currentChapterId)?.name ?? 'Chua ro chuong';
}

function formatDate(snapshot: Readonly<GameState>): string {
  return `Ngay ${snapshot.time.day} | Thang ${snapshot.time.month} | Nam ${snapshot.time.year}`;
}

function getDiscipleRealmName(realmId: string): string {
  return realmCatalog.realms.find((realm) => realm.id === realmId)?.name ?? realmId;
}

function getDiscipleStatusLabel(status: GameState['disciples']['roster'][number]['status']): string {
  switch (status) {
    case 'recovering':
      return 'Dang hoi suc';
    case 'dissatisfied':
      return 'Bat man';
    case 'unstable':
      return 'Bat on';
    default:
      return 'On dinh';
  }
}

export class SectScene extends Phaser.Scene {
  private resourceBarText!: Phaser.GameObjects.Text;
  private headerText!: Phaser.GameObjects.Text;
  private chapterText!: Phaser.GameObjects.Text;
  private cultivationText!: Phaser.GameObjects.Text;
  private buildingListText!: Phaser.GameObjects.Text;
  private buildingDetailText!: Phaser.GameObjects.Text;
  private discipleListText!: Phaser.GameObjects.Text;
  private discipleDetailText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private summaryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private scrollViewportY = 0;
  private scrollViewportHeight = 0;
  private scrollContent!: Phaser.GameObjects.Container;
  private scrollMask!: Phaser.Display.Masks.GeometryMask;
  private scrollOffset = 0;
  private contentHeight = 0;
  private navBar!: NavBar;
  private navAnchors: Record<string, number> = {};
  private resourceChips: Phaser.GameObjects.Container[] = [];
  private inventorySlots: Phaser.GameObjects.Container[] = [];
  private eventModal!: EventModal;
  private cultivationPanel!: CultivationPanel;
  private diplomacyPanel!: DiplomacyPanel;
  private governancePanel!: GovernancePanel;
  private inventoryPanel!: InventoryPanel;
  private alchemyPanel!: AlchemyPanel;
  private selectedBuildingIndex = 0;
  private selectedDiscipleIndex = 0;
  private selectedTechniqueIndex = 0;
  private selectedFactionIndex = 0;
  private selectedGovernanceStyleIndex = 0;
  private selectedRuleIndex = 0;
  private selectedElderRoleIndex = 0;
  private selectedItemIndex = 0;
  private selectedRecipeIndex = 0;
  private selectedMapIndex = 0;
  private feedbackState: {
    chapterId: string;
    breakthroughReady: boolean;
    prestige: number;
    fortune: number;
    unlockedMaps: number;
    activeEventId: string | null;
  } | null = null;

  constructor() {
    super(SCENE_KEYS.sect);
  }

  create(): void {
    const saveSystem = getSaveStore(this);
    const stateManager = getStateManager(this);
    const snapshot = stateManager.update((draft) => {
      draft.ui.activeScreen = 'sect-scene';
      draft.ui.activeTab = 'overview';
      draft.ui.modalEventId = null;
      draft.ui.isCultivationPanelOpen = false;
      draft.ui.isDiplomacyPanelOpen = false;
      draft.ui.isGovernancePanelOpen = false;
      draft.ui.isInventoryPanelOpen = false;
      draft.ui.isAlchemyPanelOpen = false;
    });

    saveSystem.saveGame(snapshot);
    getDiplomacySystem(this).syncState();
    getBuildingSystem(this).syncBuildingStates();
    const syncedSnapshot = stateManager.update((draft) => {
      getSectIdentitySystem(this).refreshSectIdentityInDraft(draft);
    });
    saveSystem.saveGame(syncedSnapshot);

    this.cameras.main.setBackgroundColor(menuPalette.background);
    drawSceneFrame(this);

    const { width, height } = this.scale;
    const shellWidth = Math.min(430, width - 32);
    const shellHeight = Math.min(844, height - 24);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);

    const shell = this.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(shellX + 10, shellY + 10, shellWidth - 20, shellHeight - 20, 28);

    const headerHeight = 150;
    const navHeight = 84;
    this.scrollViewportY = shellY + headerHeight;
    this.scrollViewportHeight = shellHeight - headerHeight - navHeight;

    const crest = this.add.image(shellX + 52, shellY + 52, 'sect-crest')
      .setDisplaySize(56, 56)
      .setOrigin(0.5);

    this.headerText = this.add.text(shellX + 92, shellY + 26, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '24px',
      wordWrap: { width: shellWidth - 116 }
    });

    this.chapterText = this.add.text(shellX + 92, shellY + 60, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      wordWrap: { width: shellWidth - 116 }
    });

    this.cultivationText = this.add.text(shellX + 20, shellY + 96, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      wordWrap: { width: shellWidth - 40 }
    });

    this.resourceBarText = this.add.text(-1000, -1000, '', { fontSize: '1px' }).setVisible(false);
    this.resourceChips = [
      createResourceChip(this, { width: 118, label: 'LT', value: '0' }),
      createResourceChip(this, { width: 118, label: 'LK', value: '0' }),
      createResourceChip(this, { width: 118, label: 'DT', value: '0' }),
      createResourceChip(this, { width: 118, label: 'KT', value: '0' }),
      createResourceChip(this, { width: 118, label: 'LM', value: '0' })
    ];
    this.resourceChips.forEach((chip, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      chip.setPosition(shellX + 20 + col * 126, shellY + 120 + row * 38);
    });

    this.scrollContent = this.add.container(shellX + 16, this.scrollViewportY + 12);
    const maskGraphic = this.make.graphics();
    maskGraphic.fillStyle(0xffffff, 1);
    maskGraphic.fillRect(shellX + 8, this.scrollViewportY, shellWidth - 16, this.scrollViewportHeight);
    this.scrollMask = maskGraphic.createGeometryMask();
    this.scrollContent.setMask(this.scrollMask);

    let contentY = 0;
    const panelWidth = shellWidth - 32;

    const quickFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 220,
      title: 'Cultivation',
      subtitle: 'Realm, daily actions, current chapter pulse'
    });
    this.scrollContent.add(quickFrame.root);
    this.statusText = this.add.text(quickFrame.root.x + 18, quickFrame.root.y + 88, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add(this.statusText);
    this.scrollContent.add(createPrimaryButton(this, {
      width: 182,
      label: 'Qua 1 ngay',
      detail: 'Advance day and resolve events',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.advancedDay);
        const result = getTimeSystem(this).advanceOneDay();
        this.refreshView(result.snapshot, 'Da qua mot ngay. Hay doc tong ket va xu ly event hien tai.');
        this.presentCurrentEvent('time');
      }
    }).setPosition(quickFrame.root.x + 18, quickFrame.root.y + 154));
    this.scrollContent.add(createSecondaryButton(this, {
      width: 182,
      label: 'Tu hanh',
      detail: 'Open cultivation details',
      onClick: () => this.toggleCultivationPanel(true)
    }).setPosition(quickFrame.root.x + 210, quickFrame.root.y + 154));

    contentY += 240;

    const buildingFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 360,
      title: 'Sect Buildings'
    });
    this.scrollContent.add(buildingFrame.root);
    this.buildingListText = this.add.text(buildingFrame.root.x + 18, buildingFrame.root.y + 78, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: 170 }
    });
    this.buildingDetailText = this.add.text(buildingFrame.root.x + 200, buildingFrame.root.y + 78, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 218 }
    });
    this.scrollContent.add([this.buildingListText, this.buildingDetailText]);
    this.scrollContent.add(createSecondaryButton(this, {
      width: 120,
      label: 'Truoc',
      detail: 'Building',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex - 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(buildingFrame.root.x + 18, buildingFrame.root.y + 274));
    this.scrollContent.add(createSecondaryButton(this, {
      width: 120,
      label: 'Sau',
      detail: 'Building',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex + 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(buildingFrame.root.x + 146, buildingFrame.root.y + 274));
    this.scrollContent.add(createPrimaryButton(this, {
      width: 120,
      label: 'Dung',
      detail: 'Construct',
      onClick: () => {
        const result = getBuildingSystem(this).constructBuilding(this.getSelectedBuildingId());
        this.refreshView(result.snapshot, result.message);
      }
    }).setPosition(buildingFrame.root.x + 274, buildingFrame.root.y + 274));
    this.scrollContent.add(createSecondaryButton(this, {
      width: 120,
      label: 'Nang cap',
      detail: 'Upgrade',
      onClick: () => {
        const result = getBuildingSystem(this).upgradeBuilding(this.getSelectedBuildingId());
        this.refreshView(result.snapshot, result.message);
      }
    }).setPosition(buildingFrame.root.x + 402, buildingFrame.root.y + 274));

    contentY += 380;

    const discipleFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 430,
      title: 'Disciples'
    });
    this.scrollContent.add(discipleFrame.root);
    this.discipleListText = this.add.text(discipleFrame.root.x + 18, discipleFrame.root.y + 78, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: 170 }
    });
    this.discipleDetailText = this.add.text(discipleFrame.root.x + 200, discipleFrame.root.y + 78, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 218 }
    });
    this.scrollContent.add([this.discipleListText, this.discipleDetailText]);

    const discipleButtons = [
      createSecondaryButton(this, {
        width: 120,
        label: 'Truoc',
        detail: 'Disciple',
        onClick: () => {
          this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
          this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex - 1, getStateManager(this).snapshot.disciples.roster.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      }).setPosition(discipleFrame.root.x + 18, discipleFrame.root.y + 330),
      createSecondaryButton(this, {
        width: 120,
        label: 'Sau',
        detail: 'Disciple',
        onClick: () => {
          this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
          this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex + 1, getStateManager(this).snapshot.disciples.roster.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      }).setPosition(discipleFrame.root.x + 146, discipleFrame.root.y + 330),
      createPrimaryButton(this, {
        width: 120,
        label: 'Thuong',
        detail: '+mood +loyalty',
        onClick: () => {
          const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);
          if (!disciple) return;
          const result = getDiscipleSystem(this).rewardDisciple(disciple.id);
          this.refreshView(result.snapshot, result.message);
        }
      }).setPosition(discipleFrame.root.x + 274, discipleFrame.root.y + 330),
      createSecondaryButton(this, {
        width: 120,
        label: 'Nghi',
        detail: 'Recover',
        onClick: () => {
          const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);
          if (!disciple) return;
          const result = getDiscipleSystem(this).restDisciple(disciple.id);
          this.refreshView(getBuildingSystem(this).syncBuildingStates(), result.message);
        }
      }).setPosition(discipleFrame.root.x + 402, discipleFrame.root.y + 330)
    ];
    this.scrollContent.add(discipleButtons);

    contentY += 450;

    const journalFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 500,
      title: 'Sect Journal'
    });
    this.scrollContent.add(journalFrame.root);
    this.eventText = this.add.text(journalFrame.root.x + 18, journalFrame.root.y + 78, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 36 }
    });
    this.summaryText = this.add.text(journalFrame.root.x + 18, journalFrame.root.y + 238, '', {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '13px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add([this.eventText, this.summaryText]);

    const journalButtons = [
      createSecondaryButton(this, { width: 120, label: 'Tri mon', detail: 'Rules', onClick: () => this.toggleGovernancePanel(true) }).setPosition(journalFrame.root.x + 18, journalFrame.root.y + 414),
      createSecondaryButton(this, { width: 120, label: 'Ngoai giao', detail: 'Factions', onClick: () => this.toggleDiplomacyPanel(true) }).setPosition(journalFrame.root.x + 146, journalFrame.root.y + 414),
      createSecondaryButton(this, { width: 120, label: 'Tui do', detail: 'Inventory', onClick: () => this.toggleInventoryPanel(true) }).setPosition(journalFrame.root.x + 274, journalFrame.root.y + 414),
      createSecondaryButton(this, { width: 120, label: 'Luyen dan', detail: 'Alchemy', onClick: () => this.toggleAlchemyPanel(true) }).setPosition(journalFrame.root.x + 402, journalFrame.root.y + 414)
    ];
    this.scrollContent.add(journalButtons);

    contentY += 520;

    const quickInventory = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 190,
      title: 'Quick Inventory'
    });
    this.scrollContent.add(quickInventory.root);
    this.inventorySlots = Array.from({ length: 8 }).map((_, index) => {
      const slot = createInventorySlot(this, { size: 72, label: '-', count: '' });
      const col = index % 4;
      const row = Math.floor(index / 4);
      slot.setPosition(quickInventory.root.x + 18 + col * 88, quickInventory.root.y + 78 + row * 88);
      this.scrollContent.add(slot);
      return slot;
    });

    this.contentHeight = contentY + 210;

    this.navBar = new NavBar(this, shellX + 10, shellY + shellHeight - navHeight + 4, shellWidth - 20, [
      { id: 'sect', label: 'Sect', onClick: () => this.scrollToAnchor('sect') },
      { id: 'cultivate', label: 'Cultivate', onClick: () => this.scrollToAnchor('cultivate') },
      { id: 'explore', label: 'Explore', onClick: () => this.scrollToAnchor('journal') },
      { id: 'backpack', label: 'Backpack', onClick: () => this.toggleInventoryPanel(true) }
    ]);
    this.navBar.setActive('sect');
    this.navAnchors = {
      sect: 0,
      cultivate: 0,
      journal: 240 + 380 + 450
    };
    this.setScrollOffset(0);

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.setScrollOffset(this.scrollOffset - dy * 0.35);
    });

    this.createCultivationPanel();
    this.createDiplomacyPanel();
    this.createGovernancePanel();
    this.createInventoryPanel();
    this.createAlchemyPanel();

    this.eventModal = new EventModal(this, () => {
      const modalSnapshot = getStateManager(this).update((draft) => {
        draft.ui.modalEventId = null;
        draft.ui.activeScreen = draft.ui.isCultivationPanelOpen
          ? 'cultivation-panel'
          : draft.ui.isDiplomacyPanelOpen
            ? 'diplomacy-panel'
            : draft.ui.isGovernancePanelOpen
              ? 'governance-panel'
            : draft.ui.isInventoryPanelOpen
              ? 'inventory-panel'
              : draft.ui.isAlchemyPanelOpen
                ? 'alchemy-panel'
            : 'sect-scene';
      });

      getSaveStore(this).saveGame(modalSnapshot);
      this.refreshView(modalSnapshot);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.eventModal.destroy();
      this.cultivationPanel.destroy();
      this.diplomacyPanel.destroy();
      this.governancePanel.destroy();
      this.inventoryPanel.destroy();
      this.alchemyPanel.destroy();
    });

    this.refreshView(syncedSnapshot);

    if (this.shouldPresentEndingThreshold(syncedSnapshot)) {
      this.openEndingThreshold(syncedSnapshot);
      return;
    }

    this.presentTutorialIntroIfNeeded(syncedSnapshot);
  }

  private createTopButtons(): void {
    const showDebugActions = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

    createTextButton(this, {
      x: 120,
      y: 602,
      width: 112,
      label: 'Qua 1 ngay',
      detail: 'Chay san xuat',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.advancedDay);
        const result = getTimeSystem(this).advanceOneDay();
        this.refreshView(result.snapshot, 'Da qua mot ngay. Hay doc tong ket de hieu tai nguyen, tu hanh va bien dong noi mon.');
        this.presentCurrentEvent('time');
      }
    });

    if (showDebugActions) {
      createTextButton(this, {
        x: 245,
        y: 602,
        width: 112,
        label: 'Goi event',
        detail: 'Nut debug chi hien khi ?debug=1',
        onClick: () => {
          this.presentCurrentEvent('system');
        }
      });
    } else {
      createTextButton(this, {
        x: 245,
        y: 602,
        width: 112,
        label: 'Ve menu',
        detail: 'Quay lai menu chinh, giu save hien tai',
        onClick: () => {
          const snapshot = getStateManager(this).snapshot;
          getSaveStore(this).saveGame(snapshot);
          this.scene.start(SCENE_KEYS.mainMenu);
        }
      });
    }

    createTextButton(this, {
      x: 370,
      y: 602,
      width: 112,
      label: 'Luu game',
      detail: 'Ghi vào máy này',
      onClick: () => {
        const nextSnapshot = getStateManager(this).snapshot;
        getSaveStore(this).saveGame(nextSnapshot);
        this.refreshView(nextSnapshot, 'Đã lưu game vào localStorage.');
      }
    });

    createTextButton(this, {
      x: 495,
      y: 602,
      width: 112,
      label: 'Tai save',
      detail: 'Doc lai save da ghi',
      onClick: () => {
        const loaded = getSaveStore(this).loadSave();
        const nextSnapshot = getStateManager(this).replace(loaded);
        getDiplomacySystem(this).syncState();
        getBuildingSystem(this).syncBuildingStates();
        const syncedSnapshot = getStateManager(this).update((draft) => {
          getSectIdentitySystem(this).refreshSectIdentityInDraft(draft);
        });
        getSaveStore(this).saveGame(syncedSnapshot);
        this.refreshView(syncedSnapshot, 'Đã tải lại save hiện có.');
      }
    });

    createTextButton(this, {
      x: 620,
      y: 602,
      width: 112,
      label: 'Túi đồ',
      detail: 'Kho tông môn',
      onClick: () => {
        this.toggleInventoryPanel(true);
      }
    });

    createTextButton(this, {
      x: 745,
      y: 602,
      width: 112,
      label: 'Luyện đan',
      detail: 'Đan phương cơ bản',
      onClick: () => {
        this.toggleAlchemyPanel(true);
      }
    });

    createTextButton(this, {
      x: 870,
      y: 602,
      width: 112,
      label: 'Tu hành',
      detail: 'Mở panel cảnh giới',
      onClick: () => {
        this.toggleCultivationPanel(true);
      }
    });

    createTextButton(this, {
      x: 995,
      y: 602,
      width: 112,
      label: 'Ngoại giao',
      detail: 'Mở panel phe phái',
      onClick: () => {
        this.toggleDiplomacyPanel(true);
      }
    });

    createTextButton(this, {
      x: 1128,
      y: 154,
      width: 120,
      label: 'Tri mon',
      detail: 'Uy danh va noi quy',
      onClick: () => {
        this.toggleGovernancePanel(true);
      }
    });

    createTextButton(this, {
      x: 1128,
      y: 96,
      width: 120,
      label: 'Am thanh',
      detail: 'Bat / tat phan hoi',
      onClick: () => {
        const muted = getFeedbackSystem(this).toggleMuted();
        this.refreshView(
          getStateManager(this).snapshot,
          muted
            ? 'Da tat am thanh phan hoi. Hieu ung hinh anh van hoat dong binh thuong.'
            : 'Da bat am thanh phan hoi. Trinh duyet chi phat sau tuong tac cua ban.'
        );
      }
    });

    createTextButton(this, {
      x: 1120,
      y: 602,
      width: 112,
      label: 'Game moi',
      detail: 'Xoa tien trinh hien tai',
      onClick: () => {
        getSaveStore(this).clear();
        getStateManager(this).replace(createGameState());
        const resetSnapshot = getStateManager(this).update((draft) => {
          draft.ui.statusMessage = 'Da tao lai game tu dau Chuong 1.';
        });
        getSaveStore(this).saveGame(resetSnapshot);
        getDiplomacySystem(this).syncState();
        getBuildingSystem(this).syncBuildingStates();
        const syncedSnapshot = getStateManager(this).update((draft) => {
          getSectIdentitySystem(this).refreshSectIdentityInDraft(draft);
        });
        getSaveStore(this).saveGame(syncedSnapshot);
        this.selectedBuildingIndex = 0;
        this.selectedDiscipleIndex = 0;
        this.selectedTechniqueIndex = 0;
        this.selectedFactionIndex = 0;
        this.selectedGovernanceStyleIndex = 0;
        this.selectedRuleIndex = 0;
        this.selectedElderRoleIndex = 0;
        this.selectedItemIndex = 0;
        this.selectedRecipeIndex = 0;
        this.selectedMapIndex = 0;
        this.refreshView(syncedSnapshot, 'Đã tạo save mới cho vertical slice.');
      }
    });
  }

  private createBuildingButtons(): void {
    createTextButton(this, {
      x: 150,
      y: 548,
      width: 120,
      label: 'Trước',
      detail: 'Công trình trước',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex - 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    createTextButton(this, {
      x: 284,
      y: 548,
      width: 120,
      label: 'Sau',
      detail: 'Công trình sau',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex + 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    createTextButton(this, {
      x: 150,
      y: 606,
      width: 120,
      label: 'Dá»±ng',
      detail: 'Xây công trình',
      onClick: () => {
        const buildingId = this.getSelectedBuildingId();
        const result = getBuildingSystem(this).constructBuilding(buildingId);
        this.refreshView(result.snapshot, result.message);
      }
    });

    createTextButton(this, {
      x: 284,
      y: 606,
      width: 120,
      label: 'Nâng cấp',
      detail: 'Tăng cấp hiện tại',
      onClick: () => {
        const buildingId = this.getSelectedBuildingId();
        const result = getBuildingSystem(this).upgradeBuilding(buildingId);
        this.refreshView(result.snapshot, result.message);
      }
    });
  }

  private createDiscipleButtons(): void {
    createTextButton(this, {
      x: 954,
      y: 548,
      width: 112,
      label: 'Map trước',
      detail: 'Đổi khu thám hiểm',
      onClick: () => {
        const maps = getExplorationSystem(this).getMaps();
        this.selectedMapIndex = this.wrapIndex(this.selectedMapIndex - 1, maps.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    createTextButton(this, {
      x: 1080,
      y: 548,
      width: 136,
      label: 'Vào map',
      detail: 'Khu đang chọn',
      onClick: () => {
        const explorationSystem = getExplorationSystem(this);
        const map = this.getSelectedMap();
        const check = explorationSystem.canEnterMap(map.id);

        if (!check.ok) {
          this.refreshView(getStateManager(this).snapshot, check.reason);
          return;
        }

        this.scene.start(SCENE_KEYS.exploration, { mapId: map.id });
      }
    });

    createTextButton(this, {
      x: 1206,
      y: 548,
      width: 112,
      label: 'Map sau',
      detail: 'Đổi khu thám hiểm',
      onClick: () => {
        const maps = getExplorationSystem(this).getMaps();
        this.selectedMapIndex = this.wrapIndex(this.selectedMapIndex + 1, maps.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    createTextButton(this, {
      x: 526,
      y: 548,
      width: 120,
      label: 'Trước',
      detail: 'Đệ tử trước',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
        this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex - 1, getStateManager(this).snapshot.disciples.roster.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    createTextButton(this, {
      x: 660,
      y: 548,
      width: 120,
      label: 'Sau',
      detail: 'Đệ tử sau',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
        this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex + 1, getStateManager(this).snapshot.disciples.roster.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    });

    const tasks: Array<{ task: DiscipleTaskId; x: number; y: number }> = [
      { task: 'tu_luyen', x: 486, y: 606 },
      { task: 'trong_duoc', x: 624, y: 606 },
      { task: 'luyen_dan', x: 762, y: 606 },
      { task: 'thu_thap', x: 486, y: 664 },
      { task: 'tuan_tra', x: 624, y: 664 },
      { task: 'nghi_ngoi', x: 762, y: 664 }
    ];

    for (const entry of tasks) {
      createTextButton(this, {
        x: entry.x,
        y: entry.y,
        width: 128,
        label: TASK_LABELS[entry.task],
        detail: entry.task,
        onClick: () => {
          const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);

          if (!disciple) {
            return;
          }

          const result = getDiscipleSystem(this).setCurrentTask(disciple.id, entry.task);
          const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
          this.refreshView(syncedSnapshot, result.message);
        }
      });
    }

    createTextButton(this, {
      x: 1080,
      y: 606,
      width: 220,
      label: 'Gán vào công trình',
      detail: 'Dùng công trình đang chọn',
      onClick: () => {
        const snapshot = getStateManager(this).snapshot;
        const disciple = this.getSelectedDisciple(snapshot);

        if (!disciple) {
          return;
        }

        const result = getDiscipleSystem(this).assignToBuilding(disciple.id, this.getSelectedBuildingId());
        const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
        this.refreshView(syncedSnapshot, result.message);
      }
    });

    createTextButton(this, {
      x: 1080,
      y: 664,
      width: 220,
      label: 'Rút khỏi công trình',
      detail: 'Giữ task hiện tại',
      onClick: () => {
        const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);

        if (!disciple) {
          return;
        }

        const result = getDiscipleSystem(this).assignToBuilding(disciple.id, null);
        const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
        this.refreshView(syncedSnapshot, result.message);
      }
    });

    createTextButton(this, {
      x: 486,
      y: 708,
      width: 128,
      label: 'Thưởng',
      detail: '+mood, +loyalty',
      onClick: () => {
        const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);

        if (!disciple) {
          return;
        }

        const result = getDiscipleSystem(this).rewardDisciple(disciple.id);
        this.refreshView(result.snapshot, result.message);
      }
    });

    createTextButton(this, {
      x: 624,
      y: 708,
      width: 128,
      label: 'Nghỉ',
      detail: 'Hồi sức và dịu tâm',
      onClick: () => {
        const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);

        if (!disciple) {
          return;
        }

        const result = getDiscipleSystem(this).restDisciple(disciple.id);
        const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
        this.refreshView(syncedSnapshot, result.message);
      }
    });

    createTextButton(this, {
      x: 762,
      y: 708,
      width: 128,
      label: 'Khiển trách',
      detail: 'Siết kỷ cương',
      onClick: () => {
        const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);

        if (!disciple) {
          return;
        }

        const result = getDiscipleSystem(this).reprimandDisciple(disciple.id);
        this.refreshView(result.snapshot, result.message);
      }
    });
  }

  private setScrollOffset(nextOffset: number): void {
    const maxOffset = Math.max(0, this.contentHeight - this.scrollViewportHeight + 24);
    this.scrollOffset = Phaser.Math.Clamp(nextOffset, 0, maxOffset);
    this.scrollContent.y = this.scrollViewportY + 12 - this.scrollOffset;
  }

  private scrollToAnchor(anchorId: string): void {
    if (!(anchorId in this.navAnchors)) {
      return;
    }

    this.setScrollOffset(this.navAnchors[anchorId]);

    if (anchorId === 'journal') {
      this.navBar.setActive('explore');
      return;
    }

    this.navBar.setActive(anchorId);
  }

  private createCultivationPanel(): void {
    this.cultivationPanel = new CultivationPanel(this, [
      {
        label: 'Đổi chế độ',
        detail: 'Bình ổn / Tụ khí',
        onClick: () => {
          const snapshot = getStateManager(this).update((draft) => {
            draft.player.cultivation.cultivationMode =
              draft.player.cultivation.cultivationMode === 'balanced' ? 'focused' : 'balanced';
            draft.ui.statusMessage = `Đã chuyển sang chế độ ${CULTIVATION_MODE_LABELS[draft.player.cultivation.cultivationMode]}.`;
          });
          getSaveStore(this).saveGame(snapshot);
          this.refreshView(snapshot);
        }
      },
      {
        label: 'Tụ khí thử',
        detail: 'Debug +10 tiến độ',
        onClick: () => {
          const snapshot = getRealmSystem(this).addCultivationProgress(10, 'Tụ khí thử: +10 tiến độ tu hành.');
          this.refreshView(snapshot, 'Tụ khí thử: +10 tiến độ tu hành.');
        }
      },
      {
        label: 'Pháp trước',
        detail: 'Đổi công pháp đang xem',
        onClick: () => {
          this.selectedTechniqueIndex = this.wrapIndex(this.selectedTechniqueIndex - 1, techniqueCatalog.techniques.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Pháp sau',
        detail: 'Đổi công pháp đang xem',
        onClick: () => {
          this.selectedTechniqueIndex = this.wrapIndex(this.selectedTechniqueIndex + 1, techniqueCatalog.techniques.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Học công pháp',
        detail: 'Nếu đủ cảnh giới',
        onClick: () => {
          const selectedTechnique = this.getSelectedTechnique();
          const result = getTechniqueSystem(this).learnTechnique(selectedTechnique.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Trang bị chính',
        detail: 'Dùng làm công pháp chính',
        onClick: () => {
          const selectedTechnique = this.getSelectedTechnique();
          const result = getTechniqueSystem(this).equipMainTechnique(selectedTechnique.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đột phá',
        detail: 'Khi đủ điều kiện',
        onClick: () => {
          const result = getRealmSystem(this).performBreakthrough();
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trở về sơn môn',
        onClick: () => {
          this.toggleCultivationPanel(false);
        }
      }
    ]);
  }

  private createDiplomacyPanel(): void {
    this.diplomacyPanel = new DiplomacyPanel(this, [
      {
        label: 'Phe trước',
        detail: 'Đổi phe đang xem',
        onClick: () => {
          this.selectedFactionIndex = this.wrapIndex(this.selectedFactionIndex - 1, getDiplomacySystem(this).getKnownFactions().length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Phe sau',
        detail: 'Đổi phe đang xem',
        onClick: () => {
          this.selectedFactionIndex = this.wrapIndex(this.selectedFactionIndex + 1, getDiplomacySystem(this).getKnownFactions().length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Mở thư chờ',
        detail: 'Ưu tiên thông điệp phe phái',
        onClick: () => {
          const presentation = getEventRuntimeSystem(this).presentPendingDiplomacyMessage();

          if (!presentation) {
            this.refreshView(getStateManager(this).snapshot, 'Không có thư ngoại giao đang chờ.');
            return;
          }

          this.refreshView(presentation.snapshot);
          this.showActiveEventModal(presentation.snapshot);
        }
      },
      {
        label: 'Hồi âm mềm',
        detail: '+1 quan hệ',
        onClick: () => {
          const result = getDiplomacySystem(this).sendPoliteResponse(this.getSelectedFactionId());
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Gửi lễ vật',
        detail: '-10 linh thạch',
        onClick: () => {
          const result = getDiplomacySystem(this).sendTribute(this.getSelectedFactionId());
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Bỏ qua',
        detail: '-2 quan hệ',
        onClick: () => {
          const result = getDiplomacySystem(this).ignoreFaction(this.getSelectedFactionId());
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Mua dược thảo',
        detail: 'Xích Luyện Bảo',
        onClick: () => {
          const result = getDiplomacySystem(this).executeTrade(this.getSelectedFactionId(), 'buy_herbs');
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Mua khoáng thạch',
        detail: 'Xích Luyện Bảo',
        onClick: () => {
          const result = getDiplomacySystem(this).executeTrade(this.getSelectedFactionId(), 'buy_ore');
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trở về sơn môn',
        onClick: () => {
          this.toggleDiplomacyPanel(false);
        }
      }
    ]);
  }

  private createGovernancePanel(): void {
    this.governancePanel = new GovernancePanel(this, [
      {
        label: 'Huong truoc',
        detail: 'Thien huong tri mon',
        onClick: () => {
          this.selectedGovernanceStyleIndex = this.wrapIndex(this.selectedGovernanceStyleIndex - 1, governanceStyleCatalog.styles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Huong sau',
        detail: 'Thien huong tri mon',
        onClick: () => {
          this.selectedGovernanceStyleIndex = this.wrapIndex(this.selectedGovernanceStyleIndex + 1, governanceStyleCatalog.styles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Ap dung huong',
        detail: 'Chon thien huong',
        onClick: () => {
          const result = getSectIdentitySystem(this).chooseGovernanceStyle(this.getSelectedGovernanceStyle().id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Noi quy truoc',
        detail: 'Dang xem noi quy',
        onClick: () => {
          this.selectedRuleIndex = this.wrapIndex(this.selectedRuleIndex - 1, sectRuleCatalog.rules.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Noi quy sau',
        detail: 'Dang xem noi quy',
        onClick: () => {
          this.selectedRuleIndex = this.wrapIndex(this.selectedRuleIndex + 1, sectRuleCatalog.rules.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Bat / tat noi quy',
        detail: 'Toi da 2 noi quy',
        onClick: () => {
          const result = getSectIdentitySystem(this).toggleSectRule(this.getSelectedRule().id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Vai tro truoc',
        detail: 'Dang xem truong lao',
        onClick: () => {
          this.selectedElderRoleIndex = this.wrapIndex(this.selectedElderRoleIndex - 1, elderRoleCatalog.roles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Vai tro sau',
        detail: 'Dang xem truong lao',
        onClick: () => {
          this.selectedElderRoleIndex = this.wrapIndex(this.selectedElderRoleIndex + 1, elderRoleCatalog.roles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Bo nhiem truong lao',
        detail: 'Dung de tu dang chon',
        onClick: () => {
          const disciple = this.getSelectedDisciple(getStateManager(this).snapshot);
          if (!disciple) {
            return;
          }

          const result = getSectIdentitySystem(this).appointElder(this.getSelectedElderRole().id, disciple.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Moi khach khanh',
        detail: 'Dung phe dang chon',
        onClick: () => {
          const result = getSectIdentitySystem(this).inviteGuestCultivator(this.getSelectedFactionId());
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Moi khach roi di',
        detail: 'Go khach dau tien',
        onClick: () => {
          const snapshot = getStateManager(this).snapshot;
          const guest = snapshot.sect.guestCultivators[0];
          if (!guest) {
            this.refreshView(snapshot, 'Chua co khach khanh de moi roi di.');
            return;
          }

          const result = getSectIdentitySystem(this).dismissGuestCultivator(guest.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Dong panel',
        detail: 'Tro ve son mon',
        onClick: () => {
          this.toggleGovernancePanel(false);
        }
      }
    ]);
  }

  private createInventoryPanel(): void {
    this.inventoryPanel = new InventoryPanel(this, [
      {
        label: 'Vật trước',
        detail: 'Đổi vật đang xem',
        onClick: () => {
          this.selectedItemIndex = this.wrapIndex(this.selectedItemIndex - 1, this.getInventoryEntries(getStateManager(this).snapshot).length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Vật sau',
        detail: 'Đổi vật đang xem',
        onClick: () => {
          this.selectedItemIndex = this.wrapIndex(this.selectedItemIndex + 1, this.getInventoryEntries(getStateManager(this).snapshot).length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Dùng vật phẩm',
        detail: 'Chỉ vật phẩm có hiệu ứng',
        onClick: () => {
          const entry = this.getSelectedInventoryEntry(getStateManager(this).snapshot);
          if (!entry) {
            return;
          }

          const result = getInventorySystem(this).useItem(entry.definition.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Trang bị pháp khí',
        detail: 'Một slot cho trưởng môn',
        onClick: () => {
          const entry = this.getSelectedInventoryEntry(getStateManager(this).snapshot);
          if (!entry) {
            return;
          }

          const result = getArtifactSystem(this).equipArtifact(entry.definition.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Tháo pháp khí',
        detail: 'Bỏ trang bị hiện tại',
        onClick: () => {
          const result = getArtifactSystem(this).unequipArtifact();
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trở về sơn môn',
        onClick: () => {
          this.toggleInventoryPanel(false);
        }
      }
    ]);
  }

  private createAlchemyPanel(): void {
    this.alchemyPanel = new AlchemyPanel(this, [
      {
        label: 'Phương trước',
        detail: 'Đổi đan phương đang xem',
        onClick: () => {
          this.selectedRecipeIndex = this.wrapIndex(this.selectedRecipeIndex - 1, alchemyRecipeCatalog.recipes.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Phương sau',
        detail: 'Đổi đan phương đang xem',
        onClick: () => {
          this.selectedRecipeIndex = this.wrapIndex(this.selectedRecipeIndex + 1, alchemyRecipeCatalog.recipes.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Luyện một mẻ',
        detail: 'Deterministic',
        onClick: () => {
          const recipe = this.getSelectedRecipe();
          const result = getAlchemySystem(this).craft(recipe.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trở về sơn môn',
        onClick: () => {
          this.toggleAlchemyPanel(false);
        }
      }
    ]);
  }

  private toggleCultivationPanel(visible: boolean): void {
    if (visible) {
      this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.openedCultivation);
    }

    this.setPanelVisibility('cultivation', visible);
  }

  private toggleDiplomacyPanel(visible: boolean): void {
    const snapshot = getStateManager(this).snapshot;

    if (visible && this.isEarlyDemoPhase(snapshot)) {
      this.playFeedback('ui-invalid');
      this.refreshView(
        snapshot,
        'Ngoai giao chua la uu tien dau. Hay qua ngay, xem de tu, va hoan tat mot chuyen tham hiem truoc.'
      );
      return;
    }

    this.setPanelVisibility('diplomacy', visible);
  }

  private toggleGovernancePanel(visible: boolean): void {
    this.setPanelVisibility('governance', visible);
  }

  private toggleInventoryPanel(visible: boolean): void {
    this.setPanelVisibility('inventory', visible);
  }

  private toggleAlchemyPanel(visible: boolean): void {
    this.setPanelVisibility('alchemy', visible);
  }

  private setPanelVisibility(panel: 'cultivation' | 'diplomacy' | 'governance' | 'inventory' | 'alchemy', visible: boolean): void {
    const snapshot = getStateManager(this).update((draft) => {
      draft.ui.isCultivationPanelOpen = visible && panel === 'cultivation';
      draft.ui.isDiplomacyPanelOpen = visible && panel === 'diplomacy';
      draft.ui.isGovernancePanelOpen = visible && panel === 'governance';
      draft.ui.isInventoryPanelOpen = visible && panel === 'inventory';
      draft.ui.isAlchemyPanelOpen = visible && panel === 'alchemy';
      draft.ui.activeScreen = !visible
        ? 'sect-scene'
        : panel === 'cultivation'
          ? 'cultivation-panel'
          : panel === 'diplomacy'
            ? 'diplomacy-panel'
            : panel === 'governance'
              ? 'governance-panel'
            : panel === 'inventory'
              ? 'inventory-panel'
              : 'alchemy-panel';
    });

    getSaveStore(this).saveGame(snapshot);
    this.playFeedback(visible ? 'ui-open' : 'ui-close');
    this.refreshView(snapshot);
  }

  private markTutorialFlag(flag: string, statusMessage?: string): Readonly<GameState> {
    const snapshot = getStateManager(this).update((draft) => {
      if (!draft.story.choiceFlags.includes(flag)) {
        draft.story.choiceFlags.push(flag);
      }

      if (statusMessage) {
        draft.ui.statusMessage = statusMessage;
      }
    });

    getSaveStore(this).saveGame(snapshot);
    return snapshot;
  }

  private shouldShowTutorial(snapshot: Readonly<GameState>): boolean {
    return !snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.skipped);
  }

  private getTutorialLines(snapshot: Readonly<GameState>): string[] {
    if (!this.shouldShowTutorial(snapshot)) {
      return [];
    }

    const steps = [
      {
        label: 'Nhan lay tan cuc cua tong mon',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.introSeen)
      },
      {
        label: 'Qua mot ngay dau tien',
        done: snapshot.time.day > 1 || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.advancedDay)
      },
      {
        label: 'Xem mot de tu',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.checkedDisciple)
      },
      {
        label: 'Mo panel tu hanh',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.openedCultivation)
      },
      {
        label: 'Giai quyet mot su kien',
        done: snapshot.events.history.length > 0 || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.resolvedEvent)
      },
      {
        label: 'Vao map tham hiem dau',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.enteredExploration)
      },
      {
        label: 'Tro ve voi phan thuong',
        done: snapshot.exploration.totalRuns > 0 || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.returnedExploration)
      }
    ];

    const currentStep = steps.find((step) => !step.done);
    const lines = ['Huong dan nhap mon'];

    if (currentStep) {
      lines.push(`Tiep theo: ${currentStep.label}`);
    } else {
      lines.push('Ban da di het vong huong dan dau tien.');
    }

    lines.push(...steps.map((step) => `${step.done ? '[x]' : '[ ]'} ${step.label}`));
    return lines;
  }

  private getChapterObjectiveLines(snapshot: Readonly<GameState>): string[] {
    const flags = new Set([...snapshot.story.storyFlags, ...snapshot.story.worldFlags, ...snapshot.story.choiceFlags]);

    if (snapshot.ending.completed) {
      return [
        'Base game da khop lai',
        `Ket cuc da dat: ${getEndingSystem(this).getPresentation(snapshot).definition.title}.`,
        'Ban co the ve menu de xem lai ending, hoac tiep tuc save nay nhu mot moc da hoan tat.'
      ];
    }

    if (snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao') {
      if (!flags.has('chapter4_started')) {
        return [
          'Moc chuong 4',
          'Mo beat chuyen doan cuoi cua pham gioi: Thien Khu Van Dao.',
          'Qua them ngay hoac doi major event de xac nhan Thanh Huyen Mon da buoc vao dai kiep lon hon moi tranh chap tong mon.'
        ];
      }

      if (!flags.has('first_great_crisis_seen')) {
        return [
          'Moc chuong 4',
          'Nhan dien dai kiep dang doi hinh quanh Thanh Huyen Mon.',
          'Tu nay, ap luc khong chi den tu phe phai ma con tu chinh vet nut cua thien dia va di san xua.'
        ];
      }

      if (!flags.has('first_core_truth_piece_obtained')) {
        return [
          'Moc chuong 4',
          'Tim manh chan tuong cot loi ve Thien Khu Bien va vai tro cua Thanh Huyen Mon.',
          'Chuong 4 can mot su that ro hon de bien dai kiep thanh lua chon co y nghia, khong chi la suc ep mu mo.'
        ];
      }

      if (!flags.has('first_doctrinal_choice_made')) {
        return [
          'Moc chuong 4',
          'Chot mot huong dao ly de noi mon biet tong mon dang giu thu gi.',
          'Day la buoc tu van hanh sang dinh nghia: giu cuong ky, giu quyen, hay mo mot loi di moi.'
        ];
      }

      if (!flags.has('first_major_sacrifice_or_compromise')) {
        return [
          'Moc chuong 4',
          'Tra mot cai gia thuc su de giu lai dieu ban da chon.',
          'Neu chua co hy sinh hay nhuong bo, tong mon chua thuc su bi dai kiep thu den tan cung.'
        ];
      }

      if (!flags.has('chapter4_ultimatum_resolved')) {
        return [
          'Moc chuong 4',
          'Vuot qua toi hau thu tu ben ngoai truoc nguong ket cuoc.',
          'Sau khi thu nay toi, Thanh Huyen Mon se khong con duoc xem la mot tieu tong co the bo qua.'
        ];
      }

      return [
        'Moc chuong 4',
        'Dung toi nguong cua ba dao va mo duong vao ket cuoc.',
        'Khi major event cuoi xuat hien, hay chot xem Thanh Huyen Mon se dua pham gioi nay qua dai kiep bang cach nao.'
      ];
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      if (!flags.has('archive_sky_crack_seen')) {
        return [
          'Moc chuong 3',
          'Theo doi manh thu luc dau tien cho thay Thien Khu Bien khong phai tai bien vo chu.',
          'Chuong nay khong con chi lap tong, ma bat dau de tong mon doi mat voi su that lon hon minh.'
        ];
      }

      if (!flags.has('ascension_trace_confirmed')) {
        return [
          'Moc chuong 3',
          'Ghep Linh Kinh va co luc thanh bang chung ve dau vet cuong hanh phi thang.',
          'Mot khi dau vet nay ro ra, Thanh Huyen Mon se khong the tiep tuc lon len ma gia nhu khong biet.'
        ];
      }

      if (!flags.has('first_serious_faction_probe')) {
        return [
          'Moc chuong 3',
          'Chiu dot thu the thuc su dau tien khi ben ngoai da nhin Thanh Huyen Mon nhu mot thuc the dang len.',
          'Giua chuong 3, tong mon bat dau bi can do boi nhung phe co suc nang hon.'
        ];
      }

      if (!flags.has('first_disciple_ambition_incident')) {
        return [
          'Moc chuong 3',
          'Xu ly su chenh khat vong trong noi mon khi de tu bat dau lon nhanh hon tong mon cu.',
          'Day la dau moc cho thay ap luc noi bo da khong con chiu dung bang tinh nghia don thuan.'
        ];
      }

      return [
        'Moc chuong 3',
        'Chot Chuong 3 bang viec thua nhan Thanh Huyen Mon da buoc vao dong phong van duoi troi rong.',
        'Major event ket chuong se mo ra giai doan dai kiep va dao ly nang ne hon cua Chuong 4.'
      ];
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      if (!flags.has('chapter2_started')) {
        return [
          'Moc chuong 2',
          'Chot buoc chuyen tu sinh ton sang lap tong.',
          'Qua them ngay hoac goi major event de mo beat Khai Son Lap Tong.'
        ];
      }

      if (!flags.has('first_formal_recruitment_opened')) {
        return [
          'Moc chuong 2',
          'Mo dot thu nhan mon sinh dau tien theo khuon phep.',
          'Chuong nay khong chi giu nguoi o lai, ma bat dau chon nguoi de lon cung tong mon.'
        ];
      }

      if (!flags.has('first_internal_rule_enforced')) {
        return [
          'Moc chuong 2',
          'Dat ne nep noi mon dau tien.',
          'Noi quy, ghi cong, va cach giu trat tu se bat dau dinh hinh Thanh Huyen Mon.'
        ];
      }

      if (!flags.has('first_external_contact_received')) {
        return [
          'Moc chuong 2',
          'Chuan bi don ben ngoai de mat toi Thanh Huyen Mon.',
          'Giu uy danh va on dinh de su gia dau tien khong thay mot ton mon roi rac.'
        ];
      }

      if (!flags.has('first_expansion_building_completed')) {
        return [
          'Moc chuong 2',
          'Dung them mot cong trinh mo rong de tong mon co them nhip van hanh.',
          'Moc nay dat khi noi mon co it nhat 4 cong trinh dang van hanh.'
        ];
      }

      if (!flags.has('first_faction_pressure_resolved')) {
        return [
          'Moc chuong 2',
          'Vuot qua dot thu the dau tien khi tong mon da bi nhin thay.',
          'On dinh va tu the ton mon quan trong hon viec an thua trong mot buoi doi dap.'
        ];
      }

      if (!flags.has('mirror_history_conflict')) {
        return [
          'Moc chuong 2',
          'Theo vet nut giua su luc cong khai va dieu Van Tuong Linh Kinh phan chieu.',
          'Day la dau moi cho thay viec lap tong khong chi la dung nha, ma con la chon cach giu su that.'
        ];
      }

      return [
        'Moc chuong 2',
        'Chot lai the dung cua mot tieu tong da dung chan.',
        'Khi major event cuoi xuat hien, hay chon cach xac lap Thanh Huyen Mon truoc ben ngoai.'
      ];
    }

    if (snapshot.story.currentChapterId !== 'chapter_1_du_tan_khai_son' || flags.has('chapter1_completed')) {
      return [
        'Chuong 1 da khop lai.',
        'Thanh Huyen Mon da giu duoc tan hoa.',
        'Hay tiep tuc mo rong tong mon cho chuong sau.'
      ];
    }

    if (!flags.has('sect_ruins_surveyed')) {
      return [
        'Moc chuong 1',
        'Khao sat tan tich va nhan lay Thanh Huyen Mon.',
        'Su kien mo dau se cho thay vi sao ban chua the bo di.'
      ];
    }

    if (!flags.has('first_resource_cycle_completed')) {
      return [
        'Moc chuong 1',
        'Qua mot ngay dau tien de giu nhip song con.',
        'Doc tong ket ngay de thay tong mon dang thieu dieu gi.'
      ];
    }

    if (!flags.has('first_building_restored')) {
      return [
        'Moc chuong 1',
        'Dung hoac nang cap them mot cong trinh cot loi.',
        'Chi can mot dau hieu khoi phuc de noi mon dung lai.'
      ];
    }

    if (!flags.has('first_major_threat_seen')) {
      return [
        'Moc chuong 1',
        'On dinh nhan tam va chuan bi cho bien co dau tien.',
        'Qua them ngay, giu tai nguyen va de tu o muc an toan.'
      ];
    }

    if (!flags.has('first_major_threat_survived')) {
      return [
        'Moc chuong 1',
        'Vuot qua moi de doa nghiem trong dau tien.',
        'Khi bien co lon den, phai chon cach giu lai son mon.'
      ];
    }

    if (!flags.has('linh_kinh_glimpse_seen')) {
      return [
        'Moc chuong 1',
        'Theo dau phan ung dau tien cua Van Tuong Linh Kinh.',
        'Day la dau vet cho thay tai bien nam xua chua thuc su ket lai.'
      ];
    }

    return [
      'Moc chuong 1',
      'Chot loi nguyen o lai va dung lai tong mon.',
      'Khi major event cuoi xuat hien, hay chon cach giu tan hoa Thanh Huyen Mon.'
    ];
  }

  private isEarlyDemoPhase(snapshot: Readonly<GameState>): boolean {
    return snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son'
      && !snapshot.story.storyFlags.includes('first_exploration_victory');
  }

  private getRecommendedNextStep(snapshot: Readonly<GameState>): string {
    const flags = new Set([...snapshot.story.storyFlags, ...snapshot.story.choiceFlags, ...snapshot.story.worldFlags]);

    if (snapshot.ending.completed) {
      return 'Ban da di het vong ket base game. Neu muon xem lai payoff, ve menu va bam Xem lai ket cuc, hoac Game moi de di lai tu dau.';
    }

    if (snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao') {
      if (!flags.has('chapter4_started')) {
        return 'Qua them ngay de mo beat mo dau Chuong 4, khi Thanh Huyen Mon buoc vao giai doan Thien Khu Van Dao.';
      }

      if (!flags.has('first_core_truth_piece_obtained')) {
        return 'Theo doi major event Chuong 4 de lay manh chan tuong cot loi; day la diem bien crisis thanh lua chon that su.';
      }

      if (!flags.has('first_doctrinal_choice_made')) {
        return 'Giu on dinh va uy danh o muc an toan, roi chot mot huong dao ly khi beat quyet dinh xuat hien.';
      }

      if (!flags.has('first_major_sacrifice_or_compromise')) {
        return 'Chuan bi cho mot quyet dinh doi gia: tich linh thach, giu on dinh, va san long chap nhan mat mot thu de giu mot thu khac.';
      }

      if (!flags.has('chapter4_ultimatum_resolved')) {
        return 'Theo doi ap luc phe phai va quyet xem Thanh Huyen Mon se cung hay nhuong truoc toi hau thu sap toi.';
      }

      return 'Theo doi Muc tieu chuong va thong so Dai kiep / Chan tuong o panel phai de mo nguong ket cuoc cua Chuong 4.';
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      if (!flags.has('archive_sky_crack_seen')) {
        return 'Theo doi major event lien quan co luc va Linh Kinh; Chuong 3 bat dau bang viec bien su nghi ngo thanh bang chung.';
      }

      if (!flags.has('ascension_trace_confirmed')) {
        return 'Giu uy danh tong mon va tiep tuc day mach su that cho toi khi dau vet cuong hanh phi thang lo ro.';
      }

      if (!flags.has('first_serious_faction_probe')) {
        return 'Chuan bi cho ben ngoai thu the thuc su: giu on dinh, co du linh thach, va san sang doi dap.';
      }

      if (!flags.has('first_disciple_ambition_incident')) {
        return 'De y mood, loyalty, va ne nep noi mon; Chuong 3 se bat dau thu xem tong mon xu ly khat vong ben trong the nao.';
      }

      return 'Theo doi Muc tieu chuong o panel phai va khop lai Chuong 3 bang major event ket chuong hien tai.';
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      if (!flags.has('chapter2_started')) {
        return 'Qua mot ngay nua hoac goi su kien de mo beat Khai Son Lap Tong cua Chuong 2.';
      }

      if (!flags.has('first_formal_recruitment_opened')) {
        return 'Cho beat thu nhan mon sinh dau tien, va de y suc chua de tu de co cho nhan nguoi.';
      }

      if (!flags.has('first_internal_rule_enforced')) {
        return 'Mo Tri mon de xem governance/rules, roi xu ly beat noi quy dau tien cua Chuong 2.';
      }

      if (!flags.has('first_external_contact_received')) {
        return 'Giu uy danh va on dinh o muc dep, vi ben ngoai sap bat dau de mat den Thanh Huyen Mon.';
      }

      if (!flags.has('first_expansion_building_completed')) {
        return 'Dung them mot cong trinh Chuong 2 nhu Linh Thach Kho, Luyen Khi Phong, Tiep Khach Duong, hoac Ho Son Tran Dai.';
      }

      if (!flags.has('first_faction_pressure_resolved')) {
        return 'Xu ly dot ap luc dau tien tu ben ngoai va tranh de on dinh tong mon roi xuong qua thap.';
      }

      if (!flags.has('mirror_history_conflict')) {
        return 'Theo doi major event lien quan Van Tuong Linh Kinh; Chuong 2 can mot vet nut lich su ro hon de khop lai.';
      }

      return 'Theo doi Muc tieu chuong o panel phai va khop lai Chuong 2 bang major event ket chuong hien tai.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.advancedDay) && snapshot.time.day <= 1) {
      return 'Qua mot ngay de thay tong ket tai nguyen va nhip van hanh dau tien.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.checkedDisciple)) {
      return 'Chon mot de tu de xem mood, loyalty, nhiem vu, va muc do on dinh.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.openedCultivation)) {
      return 'Mo panel Tu hanh de xem canh gioi, tien do, va dieu kien dot pha.';
    }

    if (!flags.has('first_building_restored')) {
      return 'Dung hoac nang cap them mot cong trinh cot loi de Chuong 1 co dau hieu phuc hoi.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.returnedExploration)) {
      return 'Vao Hau Son Coc, cham it nhat mot event spot, roi tro ve voi phan thuong.';
    }

    if (!flags.has('first_major_threat_survived')) {
      return 'Tiep tuc qua ngay, giu tai nguyen va on dinh noi mon de doi bien co lon cua Chuong 1.';
    }

    return 'Theo doi Muc tieu chuong o panel phai va khop lai Chuong 1 bang major event hien tai.';
  }

  private getDemoProgressLines(snapshot: Readonly<GameState>): string[] {
    const restoredBuildings = Object.values(snapshot.sect.buildings).filter((building) => building.level > 0).length;
    const currentChapter = storyChapterCatalog.chapters.find((chapter) => chapter.id === snapshot.story.currentChapterId);
    const chapterNumber = storyChapterCatalog.chapters.findIndex((chapter) => chapter.id === snapshot.story.currentChapterId) + 1;
    const chapterPrefix = `major.chapter${Math.max(1, chapterNumber)}`;
    const chapterLabel = `Chuong ${Math.max(1, chapterNumber)}`;
    const totalMajorEvents = currentChapter?.majorEventIds.length ?? 0;
    const majorEventsResolved = snapshot.story.resolvedMajorEventIds.filter((eventId) => eventId.startsWith(chapterPrefix)).length;

    return [
      `Ngay da qua: ${snapshot.time.day}`,
      `Cong trinh dang van hanh: ${restoredBuildings}`,
      `Su kien da giai: ${snapshot.events.history.length}`,
      `Boss da ha: ${snapshot.exploration.defeatedBossIds.length}`,
      `Canh gioi chuong mon: ${getRealmSystem(this).getCurrentRealm(snapshot).name}`,
      `Moc ${chapterLabel} da mo: ${majorEventsResolved}/${totalMajorEvents}`
    ];
  }

  private getPriorityNotice(snapshot: Readonly<GameState>, activeEventTitle: string | null): string {
    if (activeEventTitle) {
      return `Co su kien dang cho giai quyet: ${activeEventTitle}. Giai quyet no truoc de tranh mat mach chapter hoac phan thuong.`;
    }

    if (snapshot.player.cultivation.breakthroughReady) {
      return 'Chuong mon da san dot pha. Mo panel Tu hanh de xem dieu kien va chot buoc tien canh gioi.';
    }

    if (snapshot.diplomacy.pendingMessageEventIds.length > 0) {
      return 'Dang co thu phe phai cho xu ly. Ngoai giao co the doi event pressure va co hoi giao dich.';
    }

    const unstableDisciple = snapshot.disciples.roster.find((disciple) => disciple.mood <= 35 || disciple.loyalty <= 35 || disciple.riskFlags.length > 0);
    if (unstableDisciple) {
      return `${unstableDisciple.name} dang can duoc de y. Mood, loyalty hoac risk cua de tu nay co the gay them su kien noi mon.`;
    }

    return 'Neu dang phan van, hay qua 1 ngay hoac lam theo Muc tieu chuong o ben phai de day vong choi tien len.';
  }

  private getWhyThisMatters(snapshot: Readonly<GameState>): string {
    if (snapshot.ending.completed) {
      return 'Ket cuc nay la diem khop cua base game pham gioi: no tong hop cach Thanh Huyen Mon da chon giu trat tu, quyen luc, hay mo dao lo moi.';
    }

    if (snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son') {
      return 'Chuong 1 khong can lam moi thu. Chi can giu tong mon song, dung lai mot vai diem tu, va vuot qua moi de doa dau tien.';
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      return 'Chuong 2 kiem tra xem Thanh Huyen Mon co dung duoc thanh mot tieu tong co ne nep, co nguoi, va co tu the truoc ben ngoai hay khong.';
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      return 'Chuong 3 kiem tra xem Thanh Huyen Mon co giu duoc minh khi su that, khat vong, va ap luc ben ngoai cung luc day den hay khong.';
    }

    if (snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao') {
      return 'Chuong 4 khong con hoi tong mon co song noi hay khong, ma hoi thu gi dang xung dang duoc giu lai khi dai kiep va chan tuong cung ep toi tan cua.';
    }

    return 'Moi panel trong ban base game hien tai deu quay ve mot viec: giu tong mon on, lam chuong mon manh len, va mo them mach chapter.';
  }

  private getChapterPressureLines(snapshot: Readonly<GameState>): string[] {
    if (snapshot.story.currentChapterId !== 'chapter_4_nhat_niem_dinh_dao') {
      return [];
    }

    const alignmentEntries = Object.entries(snapshot.story.pathAlignment) as Array<[keyof typeof snapshot.story.pathAlignment, number]>;
    const dominantAlignment = alignmentEntries.reduce((best, entry) => (entry[1] > best[1] ? entry : best), alignmentEntries[0]);
    const alignmentLabelMap: Record<string, string> = {
      orthodox_alignment: 'Chinh dao',
      dominion_alignment: 'Ba dao',
      outsider_alignment: 'Ngoai dao'
    };

    return [
      `Dai kiep: ${snapshot.story.greatCrisisLevel}/100`,
      `Chan tuong da thu: ${snapshot.story.truthProgress}/100`,
      `Lech huong hien tai: ${alignmentLabelMap[dominantAlignment[0]] ?? 'Chua ro'} (${dominantAlignment[1]})`
    ];
  }

  private getMapValueHint(selectedMap: ReturnType<SectScene['getSelectedMap']>): string {
    const rewardLines: string[] = [];
    const itemRewardIds = Object.keys(selectedMap.rewardProfile.itemRewards ?? {});

    if ((selectedMap.rewardProfile.guaranteed?.duocThao ?? 0) > 0) {
      rewardLines.push('bo sung duoc thao cho luyen dan va sinh ton');
    }
    if ((selectedMap.rewardProfile.guaranteed?.khoangThach ?? 0) > 0 || (selectedMap.rewardProfile.guaranteed?.linhMoc ?? 0) > 0) {
      rewardLines.push('lay them vat lieu de dung va nang cap');
    }
    if ((selectedMap.rewardProfile.playerCultivationProgressBonus ?? 0) > 0) {
      rewardLines.push('co them ngo ra cho tu hanh');
    }
    if ((selectedMap.rewardProfile.sectPrestigeBonus ?? 0) > 0) {
      rewardLines.push('nang uy danh tong mon neu clear');
    }
    if (itemRewardIds.length > 0) {
      rewardLines.push(`co vat pham dac trung: ${itemRewardIds.slice(0, 2).join(', ')}`);
    }

    return rewardLines.length > 0
      ? `Map nay chu yeu de ${rewardLines.join('; ')}.`
      : 'Map nay chu yeu de lay tai nguyen va day chapter/exploration loop tien len.';
  }

  private getLatestChangeSummary(snapshot: Readonly<GameState>, statusOverride?: string): string {
    const primary = statusOverride ?? snapshot.ui.statusMessage;
    const compactDaySummary = snapshot.ui.daySummary.split('\n').filter(Boolean)[0];

    if (compactDaySummary && compactDaySummary !== primary) {
      return `${primary} | ${compactDaySummary}`;
    }

    return primary;
  }

  private getItemUseHint(itemId: string): string {
    const definition = itemCatalog.items.find((item) => item.id === itemId);

    if (!definition) {
      return 'Vat pham nay chua co mo ta muc dich ro hon.';
    }

    if (definition.category === 'artifact') {
      return 'Phap khi giup chuong mon manh len lau dai; hop khi muon day tu hanh hoac tham hiem on dinh hon.';
    }

    if (definition.category === 'pill') {
      return 'Dan duoc cho loi ich thay ngay, hop luc can day nhanh tu hanh hoac giu nen can.';
    }

    if (definition.category === 'herb' || definition.category === 'material' || definition.category === 'ore') {
      return 'Nhom nay chu yeu dung cho luyen dan, mo rong tong mon, hoac de danh doi gia tri trong cac event sau.';
    }

    if (definition.category === 'quest') {
      return 'Vat nay thuong quan trong vi no noi exploration voi chapter, uy danh, hoac dau moi truyen thua.';
    }

    return 'Vat pham nay chu yeu bo sung cho vong van hanh tong mon hien tai.';
  }

  private presentTutorialIntroIfNeeded(snapshot: Readonly<GameState>): void {
    if (!this.shouldShowTutorial(snapshot) || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.introSeen)) {
      return;
    }

    const nextSnapshot = this.markTutorialFlag(
      TUTORIAL_CHOICE_FLAGS.introSeen,
      'Mo dau Chuong 1 da bat dau. Hay giu lai nhip van hanh cua Thanh Huyen Mon.'
    );

    this.eventModal.show({
      title: 'Tan Hoa Chua Tat',
      subtitle: 'Mo dau Chuong 1',
      body: [
        'Thanh Huyen Mon chi con lai cot da nut va it nguoi khong bo di. Sau Thien Khu Bien, khong ai biet ton mon nay co con duoc tinh la mot tong mon nua hay khong.',
        'Ban la nguoi dung day giua tan tich. Trong Chinh dien toi, Van Tuong Linh Kinh van chua tat han. Viec truoc mat khong phai hung ba, ma la giu cho lu tro nay khong nguoi.',
        'Muc tieu dau tien: qua mot ngay, giu on noi mon, va dung lai mot dau moi de Thanh Huyen Mon co ly do o lai.'
      ],
      options: [
        {
          label: 'Nhan lay tong mon',
          detail: 'Giu objective va huong dan ngan tren man hinh',
          onSelect: () => {
            this.eventModal.hide();
            this.refreshView(nextSnapshot, 'Muc tieu dau: qua mot ngay va nhin ro Thanh Huyen Mon dang thieu dieu gi.');
          }
        },
        {
          label: 'Bo qua huong dan',
          detail: 'An checklist nhap mon, van giu mo dau chuong',
          onSelect: () => {
            const skippedSnapshot = this.markTutorialFlag(
              TUTORIAL_CHOICE_FLAGS.skipped,
              'Da tat huong dan nhap mon cho save nay.'
            );
            this.eventModal.hide();
            this.refreshView(skippedSnapshot);
          }
        }
      ]
    });
  }

  private shouldPresentEndingThreshold(snapshot: Readonly<GameState>): boolean {
    return snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao'
      && snapshot.story.storyFlags.includes('ending_path_opened')
      && !snapshot.ending.completed
      && !snapshot.ending.chosenPath;
  }

  private openEndingThreshold(snapshot: Readonly<GameState>): void {
    const nextSnapshot = getStateManager(this).update((draft) => {
      draft.ui.statusMessage = 'Thanh Huyen Mon da dung truoc nguong ket cuoc. Hay chot dao lo cuoi cung.';
    });
    getSaveStore(this).saveGame(nextSnapshot);
    this.scene.start(SCENE_KEYS.ending);
  }

  private presentCurrentEvent(source: 'system' | 'story' | 'time'): void {
    const eventRuntime = getEventRuntimeSystem(this);
    const presentation = eventRuntime.presentNextEligibleEvent(source);

    if (!presentation) {
      this.playFeedback('ui-invalid');
      this.refreshView(getStateManager(this).snapshot, 'Hôm nay chưa có biến cố phù hợp.');
      return;
    }

    this.refreshView(presentation.snapshot);
    this.showActiveEventModal(presentation.snapshot);
  }

  private showActiveEventModal(snapshot: Readonly<GameState>): void {
    const activeEventId = snapshot.events.activeEventId;

    if (!activeEventId) {
      return;
    }

    const event = getEventById(activeEventId);

    if (!event) {
      return;
    }

    const eventRuntime = getEventRuntimeSystem(this);

    this.eventModal.show({
      title: event.title,
      subtitle: `${event.kind === 'major' ? 'major' : event.category} • ngày ${snapshot.time.day} • ${getChapterName(snapshot)}`,
      variant:
        event.kind === 'major'
          ? 'major'
          : event.category === 'omen'
            ? 'omen'
            : event.category === 'faction'
              ? 'faction'
              : 'default',
      contextLines: eventRuntime.getRenderedContextLines(snapshot),
      body: [eventRuntime.getRenderedBody(snapshot, activeEventId)],
      options: event.choices.map((choice) => ({
        label: choice.label,
        detail: this.describeChoiceOutcome(choice.outcome, choice.effects),
        onSelect: () => {
          this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.resolvedEvent);
          const resolved = getEventRuntimeSystem(this).resolveActiveChoice(choice.id);

          if (!resolved) {
            return;
          }

          this.eventModal.hide();
          const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
          this.refreshView(syncedSnapshot, resolved.choice.outcome);

          if (this.shouldPresentEndingThreshold(syncedSnapshot)) {
            this.openEndingThreshold(syncedSnapshot);
          }
        }
      }))
    });
  }

  private describeChoiceOutcome(outcome: string, effects: unknown): string {
    const typedEffects = effects as {
      resources?: Record<string, number>;
      sectPrestige?: number;
      sectFortune?: number;
      sectStability?: number;
      factionReputation?: Array<{ factionId: string; delta: number }>;
      playerCultivationProgress?: number;
      foundationStability?: number;
      tamMaPressure?: number;
      discipleMoodDelta?: number;
      discipleLoyaltyDelta?: number;
      recruitDiscipleArchetype?: string;
      flags?: { story?: { add?: string[] } };
      queueEventIds?: string[];
    };
    const tags: string[] = [];

    if (typedEffects.resources) {
      const resourceBits = Object.entries(typedEffects.resources)
        .filter(([, value]) => typeof value === 'number' && value !== 0)
        .slice(0, 2)
        .map(([resourceId, value]) => `${value > 0 ? '+' : ''}${value} ${resourceId}`);

      if (resourceBits.length > 0) {
        tags.push(resourceBits.join(', '));
      }
    }

    if (typedEffects.sectPrestige) {
      tags.push(`${typedEffects.sectPrestige > 0 ? '+' : ''}${typedEffects.sectPrestige} uy danh`);
    }

    if (typedEffects.sectFortune) {
      tags.push(`${typedEffects.sectFortune > 0 ? '+' : ''}${typedEffects.sectFortune} khi van`);
    }

    if (typedEffects.sectStability) {
      tags.push(`${typedEffects.sectStability > 0 ? '+' : ''}${typedEffects.sectStability} on dinh`);
    }

    if (typedEffects.playerCultivationProgress) {
      tags.push(`+${typedEffects.playerCultivationProgress} tu hanh`);
    }

    if (typedEffects.foundationStability) {
      tags.push(`${typedEffects.foundationStability > 0 ? '+' : ''}${typedEffects.foundationStability} nen can`);
    }

    if (typedEffects.tamMaPressure) {
      tags.push(`${typedEffects.tamMaPressure > 0 ? '+' : ''}${typedEffects.tamMaPressure} tam ma`);
    }

    if (typedEffects.discipleMoodDelta) {
      tags.push(`${typedEffects.discipleMoodDelta > 0 ? '+' : ''}${typedEffects.discipleMoodDelta} mood de tu`);
    }

    if (typedEffects.discipleLoyaltyDelta) {
      tags.push(`${typedEffects.discipleLoyaltyDelta > 0 ? '+' : ''}${typedEffects.discipleLoyaltyDelta} loyalty de tu`);
    }

    if (typedEffects.factionReputation?.length) {
      const factionDelta = typedEffects.factionReputation[0];
      tags.push(`${factionDelta.delta > 0 ? '+' : ''}${factionDelta.delta} quan he ${this.getFactionName(factionDelta.factionId)}`);
    }

    if (typedEffects.recruitDiscipleArchetype) {
      tags.push('co the nhan nguoi moi');
    }

    if ((typedEffects.flags?.story?.add?.length ?? 0) > 0) {
      tags.push('mo them co truyen');
    }

    if ((typedEffects.queueEventIds?.length ?? 0) > 0) {
      tags.push('co he qua ve sau');
    }

    return tags.length > 0 ? `${outcome} | ${tags.join(' | ')}` : outcome;
  }

  private playFeedback(
    cue:
      | 'ui-open'
      | 'ui-close'
      | 'ui-invalid'
      | 'reward'
      | 'rare-reward'
      | 'breakthrough-ready'
      | 'breakthrough-success'
      | 'chapter'
      | 'map-unlock'
      | 'cultivation-gain'
  ): void {
    try {
      const feedback = getFeedbackSystem(this);
      feedback.unlockAudio();
      feedback.play(cue);
    } catch {
      // Keep the demo playable even if audio feedback is unavailable.
    }
  }

  private getStatusTone(message: string): 'neutral' | 'positive' | 'warning' | 'major' {
    const normalized = message.toLowerCase();

    if (
      normalized.includes('chuong') ||
      normalized.includes('dot pha') ||
      normalized.includes('mo khu') ||
      normalized.includes('truyen thua') ||
      normalized.includes('boss')
    ) {
      return 'major';
    }

    if (
      normalized.includes('chua') ||
      normalized.includes('khong') ||
      normalized.includes('thieu') ||
      normalized.includes('nguy') ||
      normalized.includes('bat man') ||
      normalized.includes('rut lui')
    ) {
      return 'warning';
    }

    if (
      normalized.includes('da ') ||
      normalized.includes('nhan') ||
      normalized.includes('thu duoc') ||
      normalized.includes('uy danh') ||
      normalized.includes('hoan tat')
    ) {
      return 'positive';
    }

    return 'neutral';
  }

  private applyRefreshFeedback(snapshot: Readonly<GameState>, latestChangeSummary: string): void {
    const previous = this.feedbackState;
    const feedback = getFeedbackSystem(this);
    const tone = this.getStatusTone(latestChangeSummary);

    if (tone === 'major') {
      this.statusText.setColor(menuPalette.warningText);
    } else if (tone === 'warning') {
      this.statusText.setColor(menuPalette.dangerText);
    } else if (tone === 'positive') {
      this.statusText.setColor(menuPalette.successText);
    } else {
      this.statusText.setColor(menuPalette.textStrong);
    }

    this.tweens.killTweensOf(this.statusText);
    this.tweens.add({
      targets: this.statusText,
      alpha: { from: 0.62, to: 1 },
      duration: 170,
      ease: 'Quad.Out'
    });

    if (!previous) {
      this.feedbackState = {
        chapterId: snapshot.story.currentChapterId,
        breakthroughReady: snapshot.player.cultivation.breakthroughReady,
        prestige: snapshot.sect.prestige,
        fortune: snapshot.sect.fortune,
        unlockedMaps: snapshot.exploration.unlockedMapIds.length,
        activeEventId: snapshot.events.activeEventId
      };
      return;
    }

    if (previous.chapterId !== snapshot.story.currentChapterId) {
      this.playFeedback('chapter');
      this.cameras.main.flash(180, 190, 152, 93, false);
    } else if (!previous.breakthroughReady && snapshot.player.cultivation.breakthroughReady) {
      this.playFeedback('breakthrough-ready');
      feedback.pulse(this.statusText, this, 0.03, 150);
    } else if (snapshot.story.currentChapterId === previous.chapterId && previous.activeEventId !== snapshot.events.activeEventId && snapshot.events.activeEventId) {
      this.playFeedback('cultivation-gain');
    }

    if (snapshot.sect.prestige - previous.prestige >= 4 || snapshot.sect.fortune - previous.fortune >= 4) {
      this.playFeedback('reward');
    }

    if (snapshot.exploration.unlockedMapIds.length > previous.unlockedMaps) {
      this.playFeedback('map-unlock');
    }

    if (tone === 'major' && latestChangeSummary.toLowerCase().includes('dot pha')) {
      this.playFeedback('breakthrough-success');
    }

    this.feedbackState = {
      chapterId: snapshot.story.currentChapterId,
      breakthroughReady: snapshot.player.cultivation.breakthroughReady,
      prestige: snapshot.sect.prestige,
      fortune: snapshot.sect.fortune,
      unlockedMaps: snapshot.exploration.unlockedMapIds.length,
      activeEventId: snapshot.events.activeEventId
    };
  }

  private refreshView(snapshot: Readonly<GameState>, statusOverride?: string): void {
    const chapterName = getChapterName(snapshot);
    const activeEvent = snapshot.events.activeEventId ? getEventById(snapshot.events.activeEventId) : null;
    const selectedBuildingId = this.getSelectedBuildingId();
    const selectedBuildingDefinition = buildingCatalog.buildings[this.selectedBuildingIndex];
    const selectedBuildingState = snapshot.sect.buildings[selectedBuildingId];
    const selectedDisciple = this.getSelectedDisciple(snapshot);
    const selectedTechnique = this.getSelectedTechnique();
    const selectedFaction = this.getSelectedFaction(snapshot);
    const selectedFactionState = selectedFaction ? getDiplomacySystem(this).getFactionState(selectedFaction.id, snapshot) : null;
    const selectedGovernanceStyle = this.getSelectedGovernanceStyle();
    const selectedRule = this.getSelectedRule();
    const selectedElderRole = this.getSelectedElderRole();
    const selectedItemEntry = this.getSelectedInventoryEntry(snapshot);
    const selectedRecipe = this.getSelectedRecipe();
    const inventoryEntries = this.getInventoryEntries(snapshot);
    const equippedArtifact = getArtifactSystem(this).getEquippedArtifact(snapshot);
    const currentRealm = getRealmSystem(this).getCurrentRealm(snapshot);
    const breakthrough = getRealmSystem(this).checkBreakthroughEligibility(snapshot);
    const selectedDiscipleBuildingName = selectedDisciple?.assignedBuildingId
      ? buildingCatalog.buildings.find((building) => building.id === selectedDisciple.assignedBuildingId)?.name ?? selectedDisciple.assignedBuildingId
      : 'Chưa gán';
    const notableFlags = [
      ...snapshot.story.storyFlags.slice(-3),
      ...snapshot.story.worldFlags.slice(-2),
      ...snapshot.story.choiceFlags.slice(-1)
    ];
    const chapterProgress = snapshot.story.chapterProgress[snapshot.story.currentChapterId] ?? 'active';
    const diplomacyAlerts = Object.values(snapshot.diplomacy.factions).filter((faction) => faction.warningLevel > 0 || faction.hostilityLevel > 0);
    const historyLines = snapshot.events.history.slice(-4).reverse().map((entry) => {
      const detail = entry.contextSummary ? ` | ${entry.contextSummary}` : '';
      return `Ngay ${entry.resolvedOnDay}: ${entry.title}${detail}`;
    });
    const explorationSystem = getExplorationSystem(this);
    const selectedMap = this.getSelectedMap();
    const starterMap = selectedMap;
    const mapUnlocked = explorationSystem.isMapUnlocked(selectedMap.id, snapshot);
    const mapAccessSummary = explorationSystem.getMapAccessSummary(selectedMap.id, snapshot);
    const mapBossCleared = snapshot.story.worldFlags.includes(`map_${selectedMap.id}_cleared`);
    const tutorialLines = this.getTutorialLines(snapshot);
    const chapterObjectiveLines = this.getChapterObjectiveLines(snapshot);
    const constructCheck = getBuildingSystem(this).canConstruct(selectedBuildingId);
    const upgradeCheck = getBuildingSystem(this).canUpgrade(selectedBuildingId);
    const recommendedNextStep = this.getRecommendedNextStep(snapshot);
    const demoProgressLines = this.getDemoProgressLines(snapshot);
    const priorityNotice = this.getPriorityNotice(snapshot, activeEvent?.title ?? null);
    const whyThisMatters = this.getWhyThisMatters(snapshot);
    const chapterPressureLines = this.getChapterPressureLines(snapshot);
    const mapValueHint = this.getMapValueHint(selectedMap);
    const latestChangeSummary = this.getLatestChangeSummary(snapshot, statusOverride);

    this.resourceBarText.setText([
      `Linh thach ${snapshot.resources.linhThach}`,
      `Linh khi ${snapshot.resources.linhKhi}`,
      `Duoc thao ${snapshot.resources.duocThao}`,
      `Khoang thach ${snapshot.resources.khoangThach}`,
      `Linh moc ${snapshot.resources.linhMoc}`
    ].join('   |   '));

    const chipValues = [
      snapshot.resources.linhThach,
      snapshot.resources.linhKhi,
      snapshot.resources.duocThao,
      snapshot.resources.khoangThach,
      snapshot.resources.linhMoc
    ];
    this.resourceChips.forEach((chip, index) => {
      const valueText = chip.getData('valueText') as Phaser.GameObjects.Text | undefined;
      valueText?.setText(`${chipValues[index] ?? 0}`);
    });

    this.headerText.setText(`${snapshot.sect.name} | ${formatDate(snapshot)}`);
    this.chapterText.setText(
      `Chuong hien tai: ${chapterName} (${chapterProgress}) | Uy danh ${snapshot.sect.prestige} | Khi van ${snapshot.sect.fortune} | On dinh ${snapshot.sect.stability} | Phong thu ${snapshot.sect.defense} | Suc chua de tu ${snapshot.sect.discipleCapacity} | Thu ngoai giao ${snapshot.diplomacy.pendingMessageEventIds.length} | Ket cuc ${snapshot.ending.completed ? getEndingSystem(this).getPresentation(snapshot).definition.routeName : 'chua mo'} | Am ${getFeedbackSystem(this).isMuted() ? 'tat' : 'bat'}`
    );
    this.cultivationText.setText(
      `Chuong mon: ${currentRealm.name} | Tien do ${snapshot.player.cultivation.cultivationProgress}/${currentRealm.progressRequired} | Nen can ${snapshot.player.cultivation.foundationStability} | Tam ma ${snapshot.player.cultivation.tamMaPressure} | Cong phap ${this.getEquippedTechniqueLabel(snapshot)} | Phap khi ${equippedArtifact?.name ?? 'Chua trang bi'}`
    );

    this.buildingListText.setText(
      buildingCatalog.buildings
        .map((building, index) => {
          const state = snapshot.sect.buildings[building.id as BuildingId];
          const marker = index === this.selectedBuildingIndex ? '>' : ' ';
          const status = state.isConstructed ? 'Da dung' : state.isUnlocked ? 'Co the dung' : 'Chua mo';
          return `${marker} ${building.name}\nCap ${state.level} | ${status} | Gan ${state.assignedDiscipleIds.length}`;
        })
        .join('\n\n')
    );

    this.buildingDetailText.setText([
      `Dang chon: ${selectedBuildingDefinition.name}`,
      `Trang thai: ${selectedBuildingState.status} | Cap ${selectedBuildingState.level}`,
      `Dung: ${constructCheck.ok ? 'Co the' : constructCheck.reason}`,
      `Nang cap: ${upgradeCheck.ok ? 'Co the' : upgradeCheck.reason}`,
      `Hieu qua: ${this.getBuildingEffectText(selectedBuildingId)}`,
      `Chi phi: ${this.formatCost(selectedBuildingDefinition.buildCost as Record<string, number>)}`
    ]);

    this.discipleListText.setText(
      snapshot.disciples.roster
        .map((disciple, index) => {
          const marker = index === this.selectedDiscipleIndex ? '>' : ' ';
          return [
            `${marker} ${disciple.name}`,
            `${getDiscipleRealmName(disciple.realmId)} | ${disciple.temperament}`,
            `Task: ${TASK_LABELS[disciple.currentTask]} | Tam trang ${disciple.mood} | Trung thanh ${disciple.loyalty} | ${disciple.breakthroughReady ? 'San dot pha' : getDiscipleStatusLabel(disciple.status)}`
          ].join('\n');
        })
        .join('\n\n')
    );

    this.discipleDetailText.setText(
      selectedDisciple
        ? [
            `Dang chon: ${selectedDisciple.name}`,
            `Canh gioi: ${getDiscipleRealmName(selectedDisciple.realmId)} | Tuoi ${selectedDisciple.age}`,
            `Nhiem vu: ${TASK_LABELS[selectedDisciple.currentTask]} | Cong trinh: ${selectedDiscipleBuildingName}`,
            `Tien do: ${selectedDisciple.cultivationProgress} | Dot pha: ${selectedDisciple.breakthroughReady ? 'San sang' : 'Chua'}`,
            `Tam trang ${selectedDisciple.mood} | Trung thanh ${selectedDisciple.loyalty} | The trang ${selectedDisciple.health}`,
            `Uu diem: ${selectedDisciple.positiveTraitIds.map((traitId) => this.getTraitLabel(traitId)).join(', ') || 'Chua co'}`,
            `Khuyet diem: ${selectedDisciple.flawTraitIds.map((traitId) => this.getTraitLabel(traitId)).join(', ') || 'Chua co'}`
          ].join('\n')
        : 'Chua co de tu.'
    );

    this.eventText.setText([
      getBuildInfoLine(),
      `Event active: ${activeEvent?.title ?? 'Khong co'}`,
      `Loai: ${snapshot.events.activeEventType ?? 'Khong co'} | Da giai ${snapshot.events.history.length}`,
      `Tham hiem: ${selectedMap.name} | ${mapUnlocked ? 'Da mo' : 'Chua mo'} | Nguy co ${selectedMap.riskLevel}`,
      `Ngoai giao: ${snapshot.diplomacy.lastSummary}`,
      '',
      'Canh bao phe phai',
      ...(diplomacyAlerts.length > 0
        ? diplomacyAlerts.slice(0, 2).map((entry) => `${this.getFactionName(entry.factionId)} | ${entry.relationStatus} | muc ${entry.warningLevel}`)
        : ['Chua co']),
      '',
      'Su kien gan day',
      ...(historyLines.slice(0, 3).length > 0 ? historyLines.slice(0, 3) : ['Chua co'])
    ]);

    this.summaryText.setText(
      [
        'Viec nen lam ngay',
        recommendedNextStep,
        '',
        'Uu tien hien tai',
        priorityNotice,
        '',
        'Muc tieu chuong',
        ...chapterObjectiveLines.slice(0, 3),
        '',
        'Thay doi gan nhat',
        latestChangeSummary,
        '',
        'Tong ket ngay',
        snapshot.ui.daySummary,
        '',
        'Map dang xem',
        `${selectedMap.name} | ${mapAccessSummary}`,
        mapValueHint,
        `Boss: ${mapBossCleared ? 'Da ha' : 'Chua ha'}`
      ].join('\n')
    );
    this.statusText.setText(`Trang thai: ${latestChangeSummary}`);

    inventoryEntries.slice(0, this.inventorySlots.length).forEach((entry, index) => {
      const slot = this.inventorySlots[index];
      const labelText = slot.getData('labelText') as Phaser.GameObjects.Text | undefined;
      const countText = slot.getData('countText') as Phaser.GameObjects.Text | undefined;
      labelText?.setText(entry.definition.name);
      countText?.setText(String(entry.quantity));
    });
    this.inventorySlots.slice(inventoryEntries.length).forEach((slot) => {
      const labelText = slot.getData('labelText') as Phaser.GameObjects.Text | undefined;
      const countText = slot.getData('countText') as Phaser.GameObjects.Text | undefined;
      labelText?.setText('-');
      countText?.setText('');
    });

    this.applyRefreshFeedback(snapshot, latestChangeSummary);
    if (snapshot.ui.isCultivationPanelOpen) {
      this.cultivationPanel.show({
        title: 'Tu hành',
        summaryLines: [
          `Cảnh giới hiện tại: ${currentRealm.name}`,
          `Tiến độ: ${snapshot.player.cultivation.cultivationProgress}/${currentRealm.progressRequired}`,
          `Sẵn sàng đột phá: ${snapshot.player.cultivation.breakthroughReady ? 'Có' : 'Chưa'}`,
          `Nền căn: ${snapshot.player.cultivation.foundationStability}`,
          `Tâm ma áp lực: ${snapshot.player.cultivation.tamMaPressure}`,
          `Chế độ: ${CULTIVATION_MODE_LABELS[snapshot.player.cultivation.cultivationMode]}`,
          `Lần tăng gần nhất: +${snapshot.player.cultivation.lastGain}`,
          `Ghi chú: ${snapshot.player.cultivation.lastSummary}`,
          `Điều kiện đột phá: ${breakthrough.reason}`
        ],
        techniqueLines: [
          `Công pháp chính: ${this.getEquippedTechniqueLabel(snapshot)}`,
          `Đang xem: ${selectedTechnique.name}`,
          `Phân loại: ${selectedTechnique.category} • Lộ: ${selectedTechnique.path}`,
          `Yêu cầu cảnh giới: ${selectedTechnique.requiredRealm}`,
          `Mô tả: ${selectedTechnique.description}`,
          `Thụ động: ${this.describeTechniqueEffects(selectedTechnique.passiveEffects)}`,
          '',
          `Đã biết: ${snapshot.player.cultivation.knownTechniqueIds.join(', ') || 'Chưa có'}`
        ]
      });
    } else {
      this.cultivationPanel.hide();
    }

    if (snapshot.ui.isDiplomacyPanelOpen && selectedFaction && selectedFactionState) {
      this.diplomacyPanel.show({
        title: 'Ngoai giao',
        summaryLines: [
          `Dang xem: ${selectedFaction.name}`,
          `Trang thai: ${selectedFactionState.relationStatus}`,
          `Diem quan he: ${selectedFactionState.relationScore}`,
          `Canh bao: ${selectedFactionState.warningLevel} • Thu dich: ${selectedFactionState.hostilityLevel}`,
          `Lien minh: ${selectedFactionState.allianceState}`,
          `Mo giao dich: ${selectedFactionState.tradeAccess ? 'Co' : 'Chua'}`,
          `Thu dang cho: ${snapshot.diplomacy.pendingMessageEventIds.length}`,
          `Mo ta ngan: ${selectedFaction.shortDescription}`
        ],
        detailLines: [
          `Vai tro: ${selectedFaction.gameplayRole}`,
          `Tag event: ${selectedFaction.eventTags.join(', ')}`,
          `Co phe phai: ${selectedFactionState.knownFlags.join(', ') || 'Chua co'}`,
          '',
          'Tuong tac gan day',
          ...(selectedFactionState.recentInteractions.length > 0
            ? selectedFactionState.recentInteractions.slice().reverse().map((entry) => `Ngay ${entry.day} • ${entry.type} • ${entry.summary}`)
            : ['Chua co']),
          '',
          `Trade nhanh: ${selectedFaction.id === 'xich_luyen_bao' ? 'Mua duoc thao / khoang thach bang linh thach.' : 'Phe nay chua co trade hook trong sprint nay.'}`
        ]
      });
    } else {
      this.diplomacyPanel.hide();
    }

    if (snapshot.ui.isGovernancePanelOpen) {
      const selectedDiscipleName = selectedDisciple?.name ?? 'Chua chon de tu';
      this.governancePanel.show({
        title: 'Tri mon',
        summaryLines: [
          `Uy danh: ${snapshot.sect.prestige}`,
          `Khi van: ${snapshot.sect.fortune}`,
          `On dinh tong mon: ${snapshot.sect.stability}`,
          `Thien huong hien tai: ${governanceStyleCatalog.styles.find((style) => style.id === snapshot.sect.governanceStyleId)?.name ?? snapshot.sect.governanceStyleId}`,
          `Noi quy dang ap dung: ${snapshot.sect.activeRuleIds.map((ruleId) => sectRuleCatalog.rules.find((rule) => rule.id === ruleId)?.name ?? ruleId).join(', ') || 'Chua co'}`,
          `Truong lao: ${snapshot.sect.elders.length}/${snapshot.sect.elderSlots}`,
          `Khach khanh: ${snapshot.sect.guestCultivators.length}/${snapshot.sect.guestCultivatorSlots}`,
          `De tu dang chon: ${selectedDiscipleName}`,
          `Phe dang chon de moi khach: ${selectedFaction?.name ?? 'Chua chon'}`
        ],
        detailLines: [
          `Dang xem thien huong: ${selectedGovernanceStyle.name}`,
          selectedGovernanceStyle.summary,
          `Tac dung: ${selectedGovernanceStyle.summary}`,
          '',
          `Dang xem noi quy: ${selectedRule.name}`,
          selectedRule.summary,
          `Tac dung: ${selectedRule.summary}`,
          '',
          `Vai tro truong lao: ${selectedElderRole.name}`,
          selectedElderRole.summary,
          `Tac dung: ${selectedElderRole.summary}`,
          '',
          'Danh sach truong lao',
          ...(snapshot.sect.elders.length > 0
            ? snapshot.sect.elders.map((elder) => {
                const roleName = elderRoleCatalog.roles.find((role) => role.id === elder.roleId)?.name ?? elder.roleId;
                const discipleName = snapshot.disciples.roster.find((disciple) => disciple.id === elder.discipleId)?.name ?? elder.discipleId;
                return `${roleName}: ${discipleName}`;
              })
            : ['Chua co']),
          '',
          'Danh sach khach khanh',
          ...(snapshot.sect.guestCultivators.length > 0
            ? snapshot.sect.guestCultivators.map((guest) => `${guest.name} • ${guest.bonusSummary} • ${guest.remainingDays} ngay`)
            : ['Chua co'])
        ]
      });
    } else {
      this.governancePanel.hide();
    }

    if (snapshot.ui.isInventoryPanelOpen) {
      this.inventoryPanel.show({
        title: 'Túi đồ',
        summaryLines: [
          `Đồ đang xem: ${selectedItemEntry?.definition.name ?? 'Kho trống'}`,
          `Số lượng: ${selectedItemEntry?.quantity ?? 0}`,
          `Loại: ${selectedItemEntry ? this.getItemCategoryLabel(selectedItemEntry.definition.category) : 'Chưa có'}`,
          `Độ hiếm: ${selectedItemEntry?.definition.rarity ?? 'Chưa có'}`,
          `Trang bị hiện tại: ${equippedArtifact?.name ?? 'Chưa trang bị'}`,
          `Tổng vật phẩm: ${inventoryEntries.length}`,
          `Ghi chú kho: ${snapshot.inventory.lastSummary}`
        ],
        detailLines: selectedItemEntry
          ? [
              `Mô tả: ${selectedItemEntry.definition.description}`,
              `Hiệu ứng: ${this.describeItem(selectedItemEntry.definition.id)}`,
              `Flavor: ${selectedItemEntry.definition.flavorText}`,
              '',
              `Dùng được: ${selectedItemEntry.definition.usableEffect ? 'Có' : 'Không'}`,
              `Pháp khí: ${selectedItemEntry.definition.category === 'artifact' ? 'Có' : 'Không'}`
            ]
          : ['Kho hiện chưa có vật phẩm nào.']
      });
    } else {
      this.inventoryPanel.hide();
    }

    if (snapshot.ui.isAlchemyPanelOpen) {
      const recipeCheck = getAlchemySystem(this).canCraft(selectedRecipe.id, snapshot);
      this.alchemyPanel.show({
        title: 'Luyện đan',
        summaryLines: [
          `Đan phương: ${selectedRecipe.name}`,
          `Yêu cầu công trình: ${buildingCatalog.buildings.find((building) => building.id === selectedRecipe.requiredBuildingId)?.name ?? selectedRecipe.requiredBuildingId}`,
          `Có thể luyện: ${recipeCheck.ok ? 'Có' : 'Chưa'}`,
          `Ghi chú: ${recipeCheck.reason === 'ok' ? 'Nguyên liệu đã đủ.' : recipeCheck.reason}`
        ],
        detailLines: [
          `Mô tả: ${selectedRecipe.description}`,
          '',
          'Nguyên liệu',
          ...selectedRecipe.ingredients.map((ingredient) => `${itemCatalog.items.find((item) => item.id === ingredient.itemId)?.name ?? ingredient.itemId} x${ingredient.amount} • đang có ${snapshot.inventory.items[ingredient.itemId] ?? 0}`),
          '',
          'Thành phẩm',
          ...selectedRecipe.outputs.map((output) => `${itemCatalog.items.find((item) => item.id === output.itemId)?.name ?? output.itemId} x${output.amount}`)
        ]
      });
    } else {
      this.alchemyPanel.hide();
    }
  }

  private getSelectedBuildingId(): BuildingId {
    const wrappedIndex = this.wrapIndex(this.selectedBuildingIndex, buildingCatalog.buildings.length);
    this.selectedBuildingIndex = wrappedIndex;
    return buildingCatalog.buildings[wrappedIndex].id as BuildingId;
  }

  private getSelectedDisciple(snapshot: Readonly<GameState>) {
    if (snapshot.disciples.roster.length === 0) {
      return null;
    }

    this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex, snapshot.disciples.roster.length);
    return snapshot.disciples.roster[this.selectedDiscipleIndex];
  }

  private getSelectedTechnique() {
    this.selectedTechniqueIndex = this.wrapIndex(this.selectedTechniqueIndex, techniqueCatalog.techniques.length);
    return techniqueCatalog.techniques[this.selectedTechniqueIndex];
  }

  private getSelectedMap() {
    const maps = getExplorationSystem(this).getMaps();

    this.selectedMapIndex = this.wrapIndex(this.selectedMapIndex, maps.length);
    return maps[this.selectedMapIndex];
  }

  private getSelectedFaction(snapshot: Readonly<GameState>) {
    const factions = getDiplomacySystem(this).getKnownFactions();

    if (factions.length === 0) {
      return null;
    }

    this.selectedFactionIndex = this.wrapIndex(this.selectedFactionIndex, factions.length);
    return factions[this.selectedFactionIndex];
  }

  private getSelectedFactionId(): string {
    return this.getSelectedFaction(getStateManager(this).snapshot)?.id ?? 'xich_luyen_bao';
  }

  private getSelectedGovernanceStyle() {
    this.selectedGovernanceStyleIndex = this.wrapIndex(this.selectedGovernanceStyleIndex, governanceStyleCatalog.styles.length);
    return governanceStyleCatalog.styles[this.selectedGovernanceStyleIndex];
  }

  private getSelectedRule() {
    this.selectedRuleIndex = this.wrapIndex(this.selectedRuleIndex, sectRuleCatalog.rules.length);
    return sectRuleCatalog.rules[this.selectedRuleIndex];
  }

  private getSelectedElderRole() {
    this.selectedElderRoleIndex = this.wrapIndex(this.selectedElderRoleIndex, elderRoleCatalog.roles.length);
    return elderRoleCatalog.roles[this.selectedElderRoleIndex];
  }

  private getInventoryEntries(snapshot: Readonly<GameState>) {
    return getInventorySystem(this).listItems(snapshot);
  }

  private getSelectedInventoryEntry(snapshot: Readonly<GameState>) {
    const entries = this.getInventoryEntries(snapshot);

    if (entries.length === 0) {
      return null;
    }

    this.selectedItemIndex = this.wrapIndex(this.selectedItemIndex, entries.length);
    return entries[this.selectedItemIndex];
  }

  private getSelectedRecipe() {
    this.selectedRecipeIndex = this.wrapIndex(this.selectedRecipeIndex, alchemyRecipeCatalog.recipes.length);
    return alchemyRecipeCatalog.recipes[this.selectedRecipeIndex];
  }

  private getFactionName(factionId: string): string {
    return getDiplomacySystem(this).getFactionDefinition(factionId)?.name ?? factionId;
  }

  private getTraitLabel(traitId: string): string {
    const trait = discipleTraitCatalog.traits.find((entry) => entry.id === traitId);
    return trait?.name ?? traitId;
  }

  private getItemCategoryLabel(category: string): string {
    switch (category) {
      case 'herb':
        return 'Linh thảo';
      case 'ore':
        return 'Khoáng liệu';
      case 'pill':
        return 'Đan dược';
      case 'material':
        return 'Vật liệu';
      case 'artifact':
        return 'Pháp khí';
      default:
        return category;
    }
  }

  private describeItem(entryId: string): string {
    const definition = itemCatalog.items.find((item) => item.id === entryId);

    if (!definition) {
      return entryId;
    }

    if (definition.usableEffect?.type === 'player_cultivation_progress') {
      return `Dùng: +${definition.usableEffect.value} tiến độ tu hành.`;
    }

    if (definition.usableEffect?.type === 'foundation_stability') {
      return `Dùng: +${definition.usableEffect.value} nền căn, ${definition.usableEffect.tamMaPressureDelta ?? 0} tâm ma.`;
    }

    if (definition.artifactEffect?.type === 'daily_cultivation_progress') {
      return `Trang bị: +${definition.artifactEffect.value} tiến độ tu hành mỗi ngày.`;
    }

    if (definition.artifactEffect?.type === 'exploration_max_health') {
      return `Trang bị: +${definition.artifactEffect.value} HP khi thám hiểm.`;
    }

    return definition.description;
  }

  private wrapIndex(index: number, size: number): number {
    if (size <= 0) {
      return 0;
    }

    return ((index % size) + size) % size;
  }

  private getEquippedTechniqueLabel(snapshot: Readonly<GameState>): string {
    const equipped = getTechniqueSystem(this).getEquippedTechnique(snapshot);
    return equipped?.name ?? 'Chưa trang bị';
  }

  private describeTechniqueEffects(effects: Record<string, number | undefined>): string {
    const lines: string[] = [];

    if (typeof effects.dailyCultivationProgress === 'number') {
      lines.push(`+${effects.dailyCultivationProgress} tiến độ/ngày`);
    }

    if (typeof effects.foundationStabilityBonus === 'number') {
      lines.push(`+${effects.foundationStabilityBonus} nền căn khi vận công`);
    }

    if (typeof effects.tamMaPressureMitigation === 'number') {
      lines.push(`-${effects.tamMaPressureMitigation} áp lực tâm ma`);
    }

    if (typeof effects.linhKhiDailyBonus === 'number') {
      lines.push(`+${effects.linhKhiDailyBonus} linh khí/ngày`);
    }

    return lines.join(', ') || 'Chưa có hiệu ứng rõ trong sprint này.';
  }

  private getBuildingEffectText(buildingId: BuildingId): string {
    switch (buildingId) {
      case 'tinh_tu_duong':
        return 'Tăng linh khí mỗi ngày và hỗ trợ tu hành của chưởng môn lẫn đệ tử.';
      case 'duoc_vien':
        return 'Tăng dược thảo, mạnh hơn khi gán người trồng dược.';
      case 'linh_thach_kho':
        return 'Ổn định linh thạch, hỗ trợ thu thập khoáng thạch.';
      case 'luyen_khi_phong':
        return 'Cho ít linh thạch tinh luyện khi có người luyện đan.';
      case 'ho_son_tran_dai':
        return 'Tăng phòng thủ nền và giúp giữ tâm ma ổn hơn ở chế độ bình ổn.';
      default:
        return 'Công trình nền cho sơn môn, mở thêm nhịp vận hành về sau.';
    }
  }

  private formatCost(cost: Record<string, number>): string {
    const labels: Record<string, string> = {
      spiritStone: 'linhThach',
      food: 'linhKhi',
      herbs: 'duocThao',
      wood: 'linhMoc'
    };
    const entries = Object.entries(cost).filter(([, value]) => typeof value === 'number' && value > 0);
    return entries.map(([key, value]) => `${labels[key] ?? key}:${value}`).join(', ') || 'Không tốn';
  }
}








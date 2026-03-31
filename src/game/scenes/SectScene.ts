import Phaser from 'phaser';

import { Icons } from '@/game/config/assets';
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
  getSettingsStore,
  getSectIdentitySystem,
  getStateManager,
  getTechniqueSystem,
  getTribulationSystem,
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
  CultivationPanel,
  DiplomacyPanel,
  drawSceneFrame,
  EventModal,
  GovernancePanel,
  Header,
  createInventorySlot,
  InventoryPanel,
  NavBar,
  PanelFrame,
  ProgressBar,
  ResourceBar,
  resolveItemTextureKey,
  menuPalette
} from '@/game/ui';

const CULTIVATION_MODE_LABELS = {
  balanced: 'Bình ổn',
  focused: 'Tụ khí'
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
  return storyChapterCatalog.chapters.find((chapter) => chapter.id === snapshot.story.currentChapterId)?.name ?? 'Chưa rõ chương';
}

function formatDate(snapshot: Readonly<GameState>): string {
  return `Ngày ${snapshot.time.day} | Tháng ${snapshot.time.month} | Năm ${snapshot.time.year}`;
}

function getDiscipleRealmName(realmId: string): string {
  return realmCatalog.realms.find((realm) => realm.id === realmId)?.name ?? realmId;
}

function getDiscipleStatusLabel(status: GameState['disciples']['roster'][number]['status']): string {
  switch (status) {
    case 'recovering':
      return 'Đang hồi sức';
    case 'dissatisfied':
      return 'Bất mãn';
    case 'unstable':
      return 'Bất ổn';
    default:
      return 'ổn định';
  }
}

function getSectLevel(snapshot: Readonly<GameState>): number {
  const builtCount = Object.values(snapshot.sect.buildings).filter((building) => building.level > 0).length;
  const totalBuildingLevels = Object.values(snapshot.sect.buildings).reduce((sum, building) => sum + building.level, 0);
  const score = snapshot.sect.prestige + builtCount * 8 + totalBuildingLevels * 4 + snapshot.sect.defense;
  return Math.max(1, Math.min(9, 1 + Math.floor(score / 30)));
}

export class SectScene extends Phaser.Scene {
  private resourceBarText!: Phaser.GameObjects.Text;
  private buildingListText!: Phaser.GameObjects.Text;
  private buildingDetailText!: Phaser.GameObjects.Text;
  private discipleListText!: Phaser.GameObjects.Text;
  private discipleDetailText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private summaryText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private cultivationProgressBar!: ProgressBar;
  private cultivationEmblem!: Phaser.GameObjects.Image;
  private headerShell!: Header;
  private scrollViewportY = 0;
  private scrollViewportHeight = 0;
  private scrollContent!: Phaser.GameObjects.Container;
  private scrollMask!: Phaser.Display.Masks.GeometryMask;
  private scrollOffset = 0;
  private contentHeight = 0;
  private navBar!: NavBar;
  private navAnchors: Record<string, number> = {};
  private resourceBars: ResourceBar[] = [];
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

    const openSystemMenu = (): void => {
      if (!this.scene.isActive(SCENE_KEYS.systemMenu)) {
        this.scene.launch(SCENE_KEYS.systemMenu, { returnScene: SCENE_KEYS.sect });
      }
    };
    this.input.keyboard?.on('keydown-ESC', openSystemMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', openSystemMenu);
    });
    createTextButton(this, {
      x: shellX + shellWidth - 62,
      y: shellY + 34,
      width: 84,
      label: 'Menu',
      detail: 'Esc',
      onClick: openSystemMenu
    });

    const headerHeight = 238;
    const navHeight = 84;
    this.scrollViewportY = shellY + headerHeight;
    this.scrollViewportHeight = shellHeight - headerHeight - navHeight;

    this.headerShell = new Header(this, {
      width: shellWidth - 24,
      playerName: syncedSnapshot.player.name,
      playerTitle: syncedSnapshot.player.title,
      realm: realmCatalog.realms.find((realm) => realm.id === syncedSnapshot.player.cultivation.currentRealmId)?.name ?? syncedSnapshot.player.cultivation.currentRealmId,
      avatarKey: Icons.ui.sectCrest
    }).setPosition(shellX + 12, shellY + 14);

    this.resourceBarText = this.add.text(-1000, -1000, '', { fontSize: '1px' }).setVisible(false);
    this.resourceBars = [
      new ResourceBar(this, { width: shellWidth - 104, name: 'Linh thạch', current: 0, max: 10000, iconKey: Icons.resource.spiritStone, color: 'gold' }),
      new ResourceBar(this, { width: shellWidth - 104, name: 'Tu vi', current: 0, max: 100, iconKey: Icons.resource.spiritualEnergy, color: 'gold' }),
      new ResourceBar(this, { width: shellWidth - 104, name: 'Linh lực', current: 0, max: 100, iconKey: Icons.resource.linhKhi, color: 'spirit' })
    ];
    this.resourceBars.forEach((bar, index) => {
      bar.setPosition(shellX + 86, shellY + 102 + index * 40);
    });

    this.scrollContent = this.add.container(shellX + 16, this.scrollViewportY + 12);
    const maskGraphic = this.make.graphics();
    maskGraphic.fillStyle(0xffffff, 1);
    maskGraphic.fillRect(shellX + 8, this.scrollViewportY, shellWidth - 16, this.scrollViewportHeight);
    this.scrollMask = maskGraphic.createGeometryMask();
    this.scrollContent.setMask(this.scrollMask);

    let contentY = 0;
    const panelWidth = shellWidth - 32;
    const threeBtnWidth = Math.floor((panelWidth - 36 - 20) / 3);
    const halfBtnWidth = Math.floor((panelWidth - 36 - 10) / 2);

    const sectFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 290,
      title: 'Tông môn',
      subtitle: 'Danh vọng, cấp tông, và nhịp điều hành hiện tại',
      iconKey: Icons.ui.sectCrest
    });
    this.scrollContent.add(sectFrame.root);

    this.eventText = this.add.text(sectFrame.root.x + 18, sectFrame.root.y + 84, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '14px',
      lineSpacing: 5,
      wordWrap: { width: panelWidth - 36 }
    });
    this.summaryText = this.add.text(sectFrame.root.x + 18, sectFrame.root.y + 176, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add([this.eventText, this.summaryText]);

    contentY += 310;

    const buildingsFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 342,
      title: 'Công trình',
      subtitle: 'Các công trình đang vận hành hoặc chờ phục hồi'
    });
    this.scrollContent.add(buildingsFrame.root);
    this.buildingListText = this.add.text(buildingsFrame.root.x + 18, buildingsFrame.root.y + 84, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 6,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add(this.buildingListText);
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Trước',
      detail: 'Công trình trước',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex - 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(buildingsFrame.root.x + 18, buildingsFrame.root.y + 258));
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Sau',
      detail: 'Công trình tiếp theo',
      onClick: () => {
        this.selectedBuildingIndex = this.wrapIndex(this.selectedBuildingIndex + 1, buildingCatalog.buildings.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(buildingsFrame.root.x + 18 + threeBtnWidth + 10, buildingsFrame.root.y + 258));
    this.scrollContent.add(createPrimaryButton(this, {
      width: threeBtnWidth,
      label: 'Dựng / nâng',
      detail: 'Tác động lên mục đang chọn',
      onClick: () => {
        const snapshotNow = getStateManager(this).snapshot;
        const buildingId = this.getSelectedBuildingId();
        const buildingState = snapshotNow.sect.buildings[buildingId];
        const result = buildingState.isConstructed
          ? getBuildingSystem(this).upgradeBuilding(buildingId)
          : getBuildingSystem(this).constructBuilding(buildingId);
        this.refreshView(result.snapshot, result.message);
      }
    }).setPosition(buildingsFrame.root.x + 18 + (threeBtnWidth + 10) * 2, buildingsFrame.root.y + 258));

    contentY += 362;

    const membersFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 452,
      title: 'Môn nhân',
      subtitle: 'Xem nhanh đệ tử, nhiệm vụ, và trạng thái trung thành'
    });
    this.scrollContent.add(membersFrame.root);
    this.discipleListText = this.add.text(membersFrame.root.x + 18, membersFrame.root.y + 84, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 6,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add(this.discipleListText);
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Trước',
      detail: 'Đệ tử trước',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
        this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex - 1, getStateManager(this).snapshot.disciples.roster.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(membersFrame.root.x + 18, membersFrame.root.y + 302));
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Sau',
      detail: 'Đệ tử tiếp theo',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.checkedDisciple);
        this.selectedDiscipleIndex = this.wrapIndex(this.selectedDiscipleIndex + 1, getStateManager(this).snapshot.disciples.roster.length);
        this.refreshView(getStateManager(this).snapshot);
      }
    }).setPosition(membersFrame.root.x + 18 + threeBtnWidth + 10, membersFrame.root.y + 302));
    this.scrollContent.add(createPrimaryButton(this, {
      width: threeBtnWidth,
      label: 'Tu luyện',
      detail: 'Tăng tổng lực tu hành',
      onClick: () => this.assignSelectedDiscipleTask('tu_luyen')
    }).setPosition(membersFrame.root.x + 18 + (threeBtnWidth + 10) * 2, membersFrame.root.y + 302));
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Thu gom',
      detail: 'Trồng dược chậm',
      onClick: () => this.assignSelectedDiscipleTask('trong_duoc')
    }).setPosition(membersFrame.root.x + 18, membersFrame.root.y + 354));
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Trợ đan',
      detail: 'Hỗ trợ tiết kiệm liệu',
      onClick: () => this.assignSelectedDiscipleTask('luyen_dan')
    }).setPosition(membersFrame.root.x + 18 + threeBtnWidth + 10, membersFrame.root.y + 354));
    this.scrollContent.add(createSecondaryButton(this, {
      width: threeBtnWidth,
      label: 'Hỗ trợ bí cảnh',
      detail: 'Tăng thưởng thám hiểm',
      onClick: () => this.assignSelectedDiscipleTask('tuan_tra')
    }).setPosition(membersFrame.root.x + 18 + (threeBtnWidth + 10) * 2, membersFrame.root.y + 354));

    contentY += 472;

    const actionsFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 220,
      title: 'Điều hành',
      subtitle: 'Thao tác nhanh cho nâng cấp, nhân sự, và ngoại giao'
    });
    this.scrollContent.add(actionsFrame.root);
    this.statusText = this.add.text(actionsFrame.root.x + 18, actionsFrame.root.y + 84, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    });
    this.scrollContent.add(this.statusText);
    this.scrollContent.add(createPrimaryButton(this, {
      width: halfBtnWidth,
      label: 'Nâng cấp tông',
      detail: 'Đi tới khu công trình',
      onClick: () => this.scrollToAnchor('buildings')
    }).setPosition(actionsFrame.root.x + 18, actionsFrame.root.y + 122));
    this.scrollContent.add(createSecondaryButton(this, {
      width: halfBtnWidth,
      label: 'Quản lý môn nhân',
      detail: 'Đi tới danh sách đệ tử',
      onClick: () => this.scrollToAnchor('members')
    }).setPosition(actionsFrame.root.x + 18 + halfBtnWidth + 10, actionsFrame.root.y + 122));
    this.scrollContent.add(createSecondaryButton(this, {
      width: panelWidth - 36,
      label: 'Ngoại giao',
      detail: 'Mở bảng phe phái hiện có',
      onClick: () => this.toggleDiplomacyPanel(true)
    }).setPosition(actionsFrame.root.x + 18, actionsFrame.root.y + 174));

    contentY += 232;

    const cultivationFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 248,
      title: 'Tu hành',
      subtitle: 'Theo dõi cảnh giới và mở panel tu luyện'
    });
    this.scrollContent.add(cultivationFrame.root);

    const cultivationIconRing = this.add.circle(cultivationFrame.root.x + 54, cultivationFrame.root.y + 122, 38, 0x0b1812, 0.82)
      .setStrokeStyle(2, 0x8c6b22, 0.95);
    const cultivationIcon = this.add.image(cultivationFrame.root.x + 54, cultivationFrame.root.y + 122, 'icon_status_qi_refining')
      .setDisplaySize(44, 44);
    const cultivationProgressBar = new ProgressBar(this, {
      width: panelWidth - 118,
      value: 0,
      max: 100,
      label: 'Tiến độ cảnh giới',
      iconKey: 'icon_status_qi_refining'
    }).setPosition(cultivationFrame.root.x + 92, cultivationFrame.root.y + 104);
    this.cultivationEmblem = cultivationIcon;
    this.cultivationProgressBar = cultivationProgressBar;
    this.scrollContent.add([cultivationIconRing, cultivationIcon, cultivationProgressBar]);
    this.scrollContent.add(createPrimaryButton(this, {
      width: halfBtnWidth,
      label: 'Qua 1 ngày',
      detail: 'Qua một ngày và xử lý biến động',
      onClick: () => {
        this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.advancedDay);
        const result = getTimeSystem(this).advanceOneDay();
        this.refreshView(result.snapshot, 'Đã qua một ngày. Hãy đọc tổng kết và xử lý sự kiện hiện tại.');
        this.presentCurrentEvent('time');
      }
    }).setPosition(cultivationFrame.root.x + 18, cultivationFrame.root.y + 194));
    this.scrollContent.add(createSecondaryButton(this, {
      width: halfBtnWidth,
      label: 'Tu hành',
      detail: 'Mở bảng tu hành chi tiết',
      onClick: () => this.toggleCultivationPanel(true)
    }).setPosition(cultivationFrame.root.x + 18 + halfBtnWidth + 10, cultivationFrame.root.y + 194));

    contentY += 268;

    const inventoryFrame = new PanelFrame(this, {
      x: 0,
      y: contentY,
      width: panelWidth,
      height: 270,
      title: 'Túi đồ nhanh',
      subtitle: 'Xem nhanh vài vật phẩm chính trước khi mở trang túi đồ'
    });
    this.scrollContent.add(inventoryFrame.root);
    this.inventorySlots = Array.from({ length: 8 }).map((_, index) => {
      const slot = createInventorySlot(this, { size: 72, label: '-', count: '' });
      const col = index % 4;
      const row = Math.floor(index / 4);
      slot.setPosition(inventoryFrame.root.x + 18 + col * 88, inventoryFrame.root.y + 88 + row * 88);
      this.scrollContent.add(slot);
      return slot;
    });

    contentY += 290;

    this.contentHeight = contentY;

    this.buildingDetailText = this.add.text(-1000, -1000, '', { fontSize: '1px' }).setVisible(false);
    this.discipleDetailText = this.add.text(-1000, -1000, '', { fontSize: '1px' }).setVisible(false);

    this.navBar = new NavBar(this, shellX + 10, shellY + shellHeight - navHeight + 4, shellWidth - 20, [
      { id: 'sect', label: 'Tông môn', iconKey: Icons.ui.sectCrest, onClick: () => this.scrollToAnchor('sect') },
      { id: 'cultivate', label: 'Tu hành', iconKey: Icons.status.qiRefining, onClick: () => this.scrollToAnchor('cultivate') },
      {
        id: 'explore',
        label: 'Bí cảnh',
        iconKey: Icons.resource.spiritualEnergy,
        badge: 1,
        onClick: () => {
          const snapshotNow = getStateManager(this).snapshot;
          const map = this.getSelectedMap();
          const unlocked = snapshotNow.exploration.unlockedMapIds.includes(map.id);
          if (!unlocked) {
            this.refreshView(snapshotNow, `Khu ${map.name} chưa đủ điều kiện mở.`);
            return;
          }
          this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.enteredExploration);
          getSaveStore(this).saveGame(snapshotNow);
          this.scene.start(SCENE_KEYS.exploration, { mapId: map.id });
        }
      },
      { id: 'backpack', label: 'Túi đồ', iconKey: Icons.resource.spiritStone, badge: 3, onClick: () => this.scene.start(SCENE_KEYS.inventory) }
    ]);
    this.navBar.setActive('sect');
    this.navAnchors = {
      sect: 0,
      buildings: 280,
      members: 618,
      cultivate: 1274,
      inventory: 1542
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
    this.navBar.setActive(anchorId);
  }

  private createCultivationPanel(): void {
    const allowDebugCultivation = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
    this.cultivationPanel = new CultivationPanel(this, [
      {
        label: 'Đổi chế độ',
        detail: 'Bình ổn / Tụ khí',
        onClick: () => {
          const snapshot = getStateManager(this).update((draft) => {
            draft.player.cultivation.cultivationMode =
              draft.player.cultivation.cultivationMode === 'balanced' ? 'focused' : 'balanced';
            draft.ui.statusMessage = `ÄÃ£ chuyá»ƒn sang cháº¿ Ä‘á»™ ${CULTIVATION_MODE_LABELS[draft.player.cultivation.cultivationMode]}.`;
          });
          getSaveStore(this).saveGame(snapshot);
          this.refreshView(snapshot);
        }
      },
      {
        label: 'Tụ khí thử',
        detail: allowDebugCultivation ? 'Debug +10 tiến độ' : 'Chỉ mở trong chế độ debug',
        disabled: !allowDebugCultivation,
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
          this.presentTribulationPreview();
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
        detail: 'Äá»•i phe Ä‘ang xem',
        onClick: () => {
          this.selectedFactionIndex = this.wrapIndex(this.selectedFactionIndex - 1, getDiplomacySystem(this).getKnownFactions().length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Phe sau',
        detail: 'Äá»•i phe Ä‘ang xem',
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
        detail: '-10 linh tháº¡ch',
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
        detail: 'XÃ­ch Luyá»‡n Báº£o',
        onClick: () => {
          const result = getDiplomacySystem(this).executeTrade(this.getSelectedFactionId(), 'buy_herbs');
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Mua khoáng thạch',
        detail: 'XÃ­ch Luyá»‡n Báº£o',
        onClick: () => {
          const result = getDiplomacySystem(this).executeTrade(this.getSelectedFactionId(), 'buy_ore');
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trá»Ÿ vá» sÆ¡n mÃ´n',
        onClick: () => {
          this.toggleDiplomacyPanel(false);
        }
      }
    ]);
  }

  private createGovernancePanel(): void {
    this.governancePanel = new GovernancePanel(this, [
      {
        label: 'Hướng trước',
        detail: 'Thiên hướng trị môn',
        onClick: () => {
          this.selectedGovernanceStyleIndex = this.wrapIndex(this.selectedGovernanceStyleIndex - 1, governanceStyleCatalog.styles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Hướng sau',
        detail: 'Thiên hướng trị môn',
        onClick: () => {
          this.selectedGovernanceStyleIndex = this.wrapIndex(this.selectedGovernanceStyleIndex + 1, governanceStyleCatalog.styles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Áp dụng hướng',
        detail: 'Chọn thiên hướng',
        onClick: () => {
          const result = getSectIdentitySystem(this).chooseGovernanceStyle(this.getSelectedGovernanceStyle().id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Nội quy trước',
        detail: 'Đang xem nội quy',
        onClick: () => {
          this.selectedRuleIndex = this.wrapIndex(this.selectedRuleIndex - 1, sectRuleCatalog.rules.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Nội quy sau',
        detail: 'Đang xem nội quy',
        onClick: () => {
          this.selectedRuleIndex = this.wrapIndex(this.selectedRuleIndex + 1, sectRuleCatalog.rules.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Bật / tắt nội quy',
        detail: 'Tối đa 2 nội quy',
        onClick: () => {
          const result = getSectIdentitySystem(this).toggleSectRule(this.getSelectedRule().id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Vai trò trước',
        detail: 'Đang xem trưởng lão',
        onClick: () => {
          this.selectedElderRoleIndex = this.wrapIndex(this.selectedElderRoleIndex - 1, elderRoleCatalog.roles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Vai trò sau',
        detail: 'Đang xem trưởng lão',
        onClick: () => {
          this.selectedElderRoleIndex = this.wrapIndex(this.selectedElderRoleIndex + 1, elderRoleCatalog.roles.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Bổ nhiệm trưởng lão',
        detail: 'Dùng đệ tử đang chọn',
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
        label: 'Mời khách khanh',
        detail: 'Dùng phe đang chọn',
        onClick: () => {
          const result = getSectIdentitySystem(this).inviteGuestCultivator(this.getSelectedFactionId());
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Mời khách rời đi',
        detail: 'Gỡ khách đầu tiên',
        onClick: () => {
          const snapshot = getStateManager(this).snapshot;
          const guest = snapshot.sect.guestCultivators[0];
          if (!guest) {
            this.refreshView(snapshot, 'Chưa có khách khanh để mời rời đi.');
            return;
          }

          const result = getSectIdentitySystem(this).dismissGuestCultivator(guest.id);
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trở về sơn môn',
        onClick: () => {
          this.toggleGovernancePanel(false);
        }
      }
    ]);
  }

  private createInventoryPanel(): void {
    this.inventoryPanel = new InventoryPanel(this, [
      {
        label: 'Váº­t trước',
        detail: 'Äá»•i váº­t Ä‘ang xem',
        onClick: () => {
          this.selectedItemIndex = this.wrapIndex(this.selectedItemIndex - 1, this.getInventoryEntries(getStateManager(this).snapshot).length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'Váº­t sau',
        detail: 'Äá»•i váº­t Ä‘ang xem',
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
        detail: 'Má»™t slot cho trÆ°á»Ÿng mÃ´n',
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
        detail: 'Bá» trang bá»‹ hiá»‡n táº¡i',
        onClick: () => {
          const result = getArtifactSystem(this).unequipArtifact();
          this.refreshView(result.snapshot, result.message);
        }
      },
      {
        label: 'Đóng panel',
        detail: 'Trá»Ÿ vá» sÆ¡n mÃ´n',
        onClick: () => {
          this.toggleInventoryPanel(false);
        }
      }
    ]);
  }

  private createAlchemyPanel(): void {
    this.alchemyPanel = new AlchemyPanel(this, [
      {
        label: 'PhÆ°Æ¡ng trước',
        detail: 'Äá»•i Ä‘an phÆ°Æ¡ng Ä‘ang xem',
        onClick: () => {
          this.selectedRecipeIndex = this.wrapIndex(this.selectedRecipeIndex - 1, alchemyRecipeCatalog.recipes.length);
          this.refreshView(getStateManager(this).snapshot);
        }
      },
      {
        label: 'PhÆ°Æ¡ng sau',
        detail: 'Äá»•i Ä‘an phÆ°Æ¡ng Ä‘ang xem',
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
        detail: 'Trá»Ÿ vá» sÆ¡n mÃ´n',
        onClick: () => {
          this.toggleAlchemyPanel(false);
        }
      }
    ]);
  }

  private assignSelectedDiscipleTask(task: DiscipleTaskId): void {
    const snapshot = getStateManager(this).snapshot;
    const disciple = this.getSelectedDisciple(snapshot);

    if (!disciple) {
      this.refreshView(snapshot, 'Chưa có đệ tử để phân công.');
      return;
    }

    const result = getDiscipleSystem(this).setCurrentTask(disciple.id, task);
    const syncedSnapshot = getBuildingSystem(this).syncBuildingStates();
    this.refreshView(syncedSnapshot, result.message);
  }

  private toggleCultivationPanel(visible: boolean): void {
    if (visible) {
      this.markTutorialFlag(TUTORIAL_CHOICE_FLAGS.openedCultivation);
    }

    this.setPanelVisibility('cultivation', visible);
  }

  private presentTribulationPreview(): void {
    const snapshot = getStateManager(this).snapshot;
    const eligibility = getRealmSystem(this).checkBreakthroughEligibility(snapshot);

    if (!eligibility.eligible || !eligibility.nextRealm) {
      this.playFeedback('ui-invalid');
      this.refreshView(snapshot, eligibility.reason);
      return;
    }

    const assessment = getTribulationSystem(this).assess(snapshot);
    if (!assessment) {
      const result = getRealmSystem(this).performBreakthrough();
      this.refreshView(result.snapshot, result.message);
      return;
    }

    this.eventModal.show({
      title: `Thiên Kiếp ${assessment.nextRealmName}`,
      subtitle: `Từ ${assessment.currentRealmName} lên ${assessment.nextRealmName}`,
      variant: 'omen',
      contextLines: [
        `Xác suất hiện tại: ${assessment.score}/100`,
        `Dược lực đan dược: +${snapshot.player.cultivation.breakthroughBonus}`,
        `Nền căn: ${snapshot.player.cultivation.foundationStability} | Tâm ma: ${snapshot.player.cultivation.tamMaPressure}`
      ],
      body: [
        assessment.summary,
        '',
        ...assessment.factorLines
      ],
      options: [
        {
          label: 'Chống kiếp ngay',
          detail: 'Thử đột phá với trạng thái hiện tại',
          onSelect: () => {
            this.eventModal.hide();
            this.time.delayedCall(120, () => {
              const result = getRealmSystem(this).performBreakthrough();
              this.refreshView(result.snapshot, result.message);
              this.eventModal.show({
                title: result.ok ? 'Thiên kiếp đã qua' : 'Kiếp vận để lại vết',
                subtitle: result.ok ? 'Cảnh giới đã đổi nhịp' : 'Cần thêm một nhịp chuẩn bị',
                variant: result.ok ? 'major' : 'omen',
                body: [result.message],
                options: [
                  {
                    label: 'Lùi về tu hành',
                    detail: 'Đóng thông báo và tiếp tục điều tức',
                    onSelect: () => this.eventModal.hide()
                  }
                ]
              });
            });
          }
        },
        {
          label: 'Trì hoãn',
          detail: 'Bổ sung đan dược, linh thú và công pháp trước khi thử lại',
          onSelect: () => this.eventModal.hide()
        }
      ]
    });
  }

  private toggleDiplomacyPanel(visible: boolean): void {
    const snapshot = getStateManager(this).snapshot;

    if (visible && this.isEarlyDemoPhase(snapshot)) {
      this.playFeedback('ui-invalid');
      this.refreshView(
        snapshot,
        'Ngoại giao chưa là ưu tiên đầu. Hãy qua ngày, xem đệ tử và hoàn tất một chuyến thám hiểm trước.'
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
    return getSettingsStore(this).getSettings().tutorialHintsEnabled
      && !snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.skipped);
  }

  private getTutorialLines(snapshot: Readonly<GameState>): string[] {
    if (!this.shouldShowTutorial(snapshot)) {
      return [];
    }

    const steps = [
      {
        label: 'Nhận lấy tàn cục của tông môn',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.introSeen)
      },
      {
        label: 'Qua một ngày đầu tiên',
        done: snapshot.time.day > 1 || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.advancedDay)
      },
      {
        label: 'Xem một đệ tử',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.checkedDisciple)
      },
      {
        label: 'Mở panel tu hành',
        done: snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.openedCultivation)
      },
      {
        label: 'Giải quyết một sự kiện',
        done: snapshot.events.history.length > 0 || snapshot.story.choiceFlags.includes(TUTORIAL_CHOICE_FLAGS.resolvedEvent)
      },
      {
        label: 'Vào map thám hiểm đầu',
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
          'Mốc chương 4',
          'Mở beat chuyển đoạn cuối của phàm giới: Thiên Khu Vấn Đạo.',
          'Qua thêm ngày hoặc đợi major event để xác nhận Thanh Huyền Môn đã bước vào đại kiếp lớn hơn mọi tranh chấp tông môn.'
        ];
      }

      if (!flags.has('first_great_crisis_seen')) {
        return [
          'Mốc chương 4',
          'Nhận diện đại kiếp đang đổi hình quanh Thanh Huyền Môn.',
          'Từ nay, áp lực không chỉ đến từ phe phái mà còn từ chính vết nứt của thiên địa và di sản xưa.'
        ];
      }

      if (!flags.has('first_core_truth_piece_obtained')) {
        return [
          'Mốc chương 4',
          'Tìm mảnh chân tướng cốt lõi về Thiên Khu Biến và vai trò của Thanh Huyền Môn.',
          'Chương 4 cần một sự thật rõ hơn để biến đại kiếp thành lựa chọn có ý nghĩa, không chỉ là sức ép mù mờ.'
        ];
      }

      if (!flags.has('first_doctrinal_choice_made')) {
        return [
          'Mốc chương 4',
          'Chốt một hướng đạo lý để nội môn biết tông môn đang giữ thứ gì.',
          'Đây là bước từ vận hành sang định nghĩa: giữ cương kỷ, giữ quyền, hay mở một lối đi mới.'
        ];
      }

      if (!flags.has('first_major_sacrifice_or_compromise')) {
        return [
          'Mốc chương 4',
          'Trả một cái giá thực sự để giữ lại điều bạn đã chọn.',
          'Nếu chưa có hy sinh hay nhượng bộ, tông môn chưa thực sự bị đại kiếp thử đến tận cùng.'
        ];
      }

      if (!flags.has('chapter4_ultimatum_resolved')) {
        return [
          'Mốc chương 4',
          'Vượt qua tối hậu thư từ bên ngoài trước ngưỡng kết cuộc.',
          'Sau khi thư này tới, Thanh Huyền Môn sẽ không còn được xem là một tiểu tông có thể bỏ qua.'
        ];
      }

      return [
        'Mốc chương 4',
        'Đứng tới ngưỡng của ba đạo và mở đường vào kết cuộc.',
        'Khi major event cuối xuất hiện, hãy chốt xem Thanh Huyền Môn sẽ đưa phàm giới này qua đại kiếp bằng cách nào.'
      ];
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      if (!flags.has('archive_sky_crack_seen')) {
        return [
          'Mốc chương 3',
          'Theo dõi manh thư lục đầu tiên cho thấy Thiên Khu Biến không phải tai biến vô chủ.',
          'Chương này không còn chỉ lập tông, mà bắt đầu để tông môn đối mặt với sự thật lớn hơn mình.'
        ];
      }

      if (!flags.has('ascension_trace_confirmed')) {
        return [
          'Mốc chương 3',
          'Ghép Linh Kính và cổ lục thành bằng chứng về dấu vết cưỡng hành phi thăng.',
          'Một khi dấu vết này rõ ra, Thanh Huyền Môn sẽ không thể tiếp tục lớn lên mà giả như không biết.'
        ];
      }

      if (!flags.has('first_serious_faction_probe')) {
        return [
          'Mốc chương 3',
          'Chịu đợt thử thế thực sự đầu tiên khi bên ngoài đã nhìn Thanh Huyền Môn như một thực thể đang lên.',
          'Giữa chương 3, tông môn bắt đầu bị cân đo bởi những phe có sức nặng hơn.'
        ];
      }

      if (!flags.has('first_disciple_ambition_incident')) {
        return [
          'Mốc chương 3',
          'Xử lý sự chênh khát vọng trong nội môn khi đệ tử bắt đầu lớn nhanh hơn tông môn cũ.',
          'Đây là dấu mốc cho thấy áp lực nội bộ đã không còn chịu đựng bằng tình nghĩa đơn thuần.'
        ];
      }

      return [
        'Mốc chương 3',
        'Chốt Chương 3 bằng việc thừa nhận Thanh Huyền Môn đã bước vào dòng phong vân dưới trời rộng.',
        'Major event kết chương sẽ mở ra giai đoạn đại kiếp và đạo lý nặng nề hơn của Chương 4.'
      ];
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      if (!flags.has('chapter2_started')) {
        return [
          'Mốc chương 2',
          'Chốt bước chuyển từ sinh tồn sang lập tông.',
          'Qua thêm ngày hoặc gọi major event để mở beat Khai Sơn Lập Tông.'
        ];
      }

      if (!flags.has('first_formal_recruitment_opened')) {
        return [
          'Mốc chương 2',
          'Mở đợt thu nhận môn sinh đầu tiên theo khuôn phép.',
          'Chương này không chỉ giữ người ở lại, mà bắt đầu chọn người để lớn cùng tông môn.'
        ];
      }

      if (!flags.has('first_internal_rule_enforced')) {
        return [
          'Mốc chương 2',
          'Đặt nề nếp nội môn đầu tiên.',
          'Nội quy, ghi công, và cách giữ trật tự sẽ bắt đầu định hình Thanh Huyền Môn.'
        ];
      }

      if (!flags.has('first_external_contact_received')) {
        return [
          'Mốc chương 2',
          'Chuẩn bị đón bên ngoài để mắt tới Thanh Huyền Môn.',
          'Giữ uy danh và ổn định để sứ giả đầu tiên không thấy một tàn môn rời rạc.'
        ];
      }

      if (!flags.has('first_expansion_building_completed')) {
        return [
          'Mốc chương 2',
          'Dựng thêm một công trình mở rộng để tông môn có thêm nhịp vận hành.',
          'Mốc này đạt khi nội môn có ít nhất 4 công trình đang vận hành.'
        ];
      }

      if (!flags.has('first_faction_pressure_resolved')) {
        return [
          'Mốc chương 2',
          'Vượt qua đợt thử thế đầu tiên khi tông môn đã bị nhìn thấy.',
          'Ổn định và tư thế tông môn quan trọng hơn việc ăn thua trong một buổi đối đáp.'
        ];
      }

      if (!flags.has('mirror_history_conflict')) {
        return [
          'Mốc chương 2',
          'Theo vết nứt giữa sử lục công khai và điều Vân Tượng Linh Kính phản chiếu.',
          'Đây là đầu mối cho thấy việc lập tông không chỉ là dựng nhà, mà còn là chọn cách giữ sự thật.'
        ];
      }

      return [
        'Mốc chương 2',
        'Chốt lại thế đứng của một tiểu tông đã đứng chân.',
        'Khi major event cuối xuất hiện, hãy chọn cách xác lập Thanh Huyền Môn trước bên ngoài.'
      ];
    }

    if (snapshot.story.currentChapterId !== 'chapter_1_du_tan_khai_son' || flags.has('chapter1_completed')) {
      return [
        'Chương 1 đã khớp lại.',
        'Thanh Huyền Môn đã giữ được tàn hỏa.',
        'Hãy tiếp tục mở rộng tông môn cho chương sau.'
      ];
    }

    if (!flags.has('sect_ruins_surveyed')) {
      return [
        'Mốc chương 1',
        'Khảo sát tàn tích và nhận lấy Thanh Huyền Môn.',
        'Sự kiện mở đầu sẽ cho thấy vì sao bạn chưa thể bỏ đi.'
      ];
    }

    if (!flags.has('first_resource_cycle_completed')) {
      return [
        'Mốc chương 1',
        'Qua một ngày đầu tiên để giữ nhịp sống còn.',
        'Đọc tổng kết ngày để thấy tông môn đang thiếu điều gì.'
      ];
    }

    if (!flags.has('first_building_restored')) {
      return [
        'Mốc chương 1',
        'Dựng hoặc nâng cấp thêm một công trình cốt lõi.',
        'Chỉ cần một dấu hiệu khôi phục để nội môn đứng lại.'
      ];
    }

    if (!flags.has('first_major_threat_seen')) {
      return [
        'Mốc chương 1',
        'Ổn định nhân tâm và chuẩn bị cho biến cố đầu tiên.',
        'Qua thêm ngày, giữ tài nguyên và đệ tử ở mức an toàn.'
      ];
    }

    if (!flags.has('first_major_threat_survived')) {
      return [
        'Mốc chương 1',
        'Vượt qua mối đe dọa nghiêm trọng đầu tiên.',
        'Khi biến cố lớn đến, phải chọn cách giữ lại sơn môn.'
      ];
    }

    if (!flags.has('linh_kinh_glimpse_seen')) {
      return [
        'Mốc chương 1',
        'Theo dấu phản ứng đầu tiên của Vân Tượng Linh Kính.',
        'Đây là dấu vết cho thấy tai biến năm xưa chưa thực sự khép lại.'
      ];
    }

    return [
      'Mốc chương 1',
      'Chốt lời nguyện ở lại và dựng lại tông môn.',
      'Khi major event cuối xuất hiện, hãy chọn cách giữ tàn hỏa Thanh Huyền Môn.'
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
        return 'Qua thêm ngày để mở beat mở đầu Chương 4, khi Thanh Huyền Môn bước vào giai đoạn Thiên Khu Vấn Đạo.';
      }

      if (!flags.has('first_core_truth_piece_obtained')) {
        return 'Theo dõi major event Chương 4 để lấy mảnh chân tướng cốt lõi; đây là điểm biến crisis thành lựa chọn thật sự.';
      }

      if (!flags.has('first_doctrinal_choice_made')) {
        return 'Giữ ổn định và uy danh ở mức an toàn, rồi chốt một hướng đạo lý khi beat quyết định xuất hiện.';
      }

      if (!flags.has('first_major_sacrifice_or_compromise')) {
        return 'Chuẩn bị cho một quyết định đổi giá: tích linh thạch, giữ ổn định, và sẵn lòng chấp nhận mất một thứ để giữ một thứ khác.';
      }

      if (!flags.has('chapter4_ultimatum_resolved')) {
        return 'Theo dõi áp lực phe phái và quyết xem Thanh Huyền Môn sẽ cứng hay nhường trước tối hậu thư sắp tới.';
      }

      return 'Theo dõi Mục tiêu chương và thông số Đại kiếp / Chân tướng ở panel phải để mở ngưỡng kết cuộc của Chương 4.';
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      if (!flags.has('archive_sky_crack_seen')) {
        return 'Theo dõi major event liên quan cổ lục và Linh Kính; Chương 3 bắt đầu bằng việc biến sự nghi ngờ thành bằng chứng.';
      }

      if (!flags.has('ascension_trace_confirmed')) {
        return 'Giữ uy danh tông môn và tiếp tục đẩy mạch sự thật cho tới khi dấu vết cưỡng hành phi thăng lộ rõ.';
      }

      if (!flags.has('first_serious_faction_probe')) {
        return 'Chuẩn bị cho bên ngoài thử thế thực sự: giữ ổn định, có đủ linh thạch, và sẵn sàng đối đáp.';
      }

      if (!flags.has('first_disciple_ambition_incident')) {
        return 'Để ý mood, loyalty và nề nếp nội môn; Chương 3 sẽ bắt đầu thử xem tông môn xử lý khát vọng bên trong thế nào.';
      }

      return 'Theo dõi Mục tiêu chương ở panel phải và khớp lại Chương 3 bằng major event kết chương hiện tại.';
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      if (!flags.has('chapter2_started')) {
        return 'Qua một ngày nữa hoặc gọi sự kiện để mở beat Khai Sơn Lập Tông của Chương 2.';
      }

      if (!flags.has('first_formal_recruitment_opened')) {
        return 'Chờ beat thu nhận môn sinh đầu tiên, và để ý sức chứa đệ tử để có chỗ nhận người.';
      }

      if (!flags.has('first_internal_rule_enforced')) {
        return 'Mở Trị môn để xem governance/rules, rồi xử lý beat nội quy đầu tiên của Chương 2.';
      }

      if (!flags.has('first_external_contact_received')) {
        return 'Giữ uy danh và ổn định ở mức đẹp, vì bên ngoài sắp bắt đầu để mắt đến Thanh Huyền Môn.';
      }

      if (!flags.has('first_expansion_building_completed')) {
        return 'Dựng thêm một công trình Chương 2 như Linh Thạch Kho, Luyện Khí Phòng, Tiếp Khách Đường, hoặc Hộ Sơn Trận Đài.';
      }

      if (!flags.has('first_faction_pressure_resolved')) {
        return 'Xử lý đợt áp lực đầu tiên từ bên ngoài và tránh để ổn định tông môn rơi xuống quá thấp.';
      }

      if (!flags.has('mirror_history_conflict')) {
        return 'Theo dõi major event liên quan Vân Tượng Linh Kính; Chương 2 cần một vết nứt lịch sử rõ hơn để khớp lại.';
      }

      return 'Theo dõi Mục tiêu chương ở panel phải và khớp lại Chương 2 bằng major event kết chương hiện tại.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.advancedDay) && snapshot.time.day <= 1) {
      return 'Qua một ngày để thấy tổng kết tài nguyên và nhịp vận hành đầu tiên.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.checkedDisciple)) {
      return 'Chọn một đệ tử để xem mood, loyalty, nhiệm vụ, và mức độ ổn định.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.openedCultivation)) {
      return 'Mở panel Tu hành để xem cảnh giới, tiến độ và điều kiện đột phá.';
    }

    if (!flags.has('first_building_restored')) {
      return 'Dựng hoặc nâng cấp thêm một công trình cốt lõi để Chương 1 có dấu hiệu phục hồi.';
    }

    if (!flags.has(TUTORIAL_CHOICE_FLAGS.returnedExploration)) {
      return 'Vào Hậu Sơn Cốc, chạm ít nhất một event spot, rồi trở về với phần thưởng.';
    }

    if (!flags.has('first_major_threat_survived')) {
      return 'Tiếp tục qua ngày, giữ tài nguyên và ổn định nội môn để đợi biến cố lớn của Chương 1.';
    }

    return 'Theo dõi Mục tiêu chương ở panel phải và khớp lại Chương 1 bằng major event hiện tại.';
  }

  private getDemoProgressLines(snapshot: Readonly<GameState>): string[] {
    const restoredBuildings = Object.values(snapshot.sect.buildings).filter((building) => building.level > 0).length;
    const currentChapter = storyChapterCatalog.chapters.find((chapter) => chapter.id === snapshot.story.currentChapterId);
    const chapterNumber = storyChapterCatalog.chapters.findIndex((chapter) => chapter.id === snapshot.story.currentChapterId) + 1;
    const chapterPrefix = `major.chapter${Math.max(1, chapterNumber)}`;
    const chapterLabel = `Chương ${Math.max(1, chapterNumber)}`;
    const totalMajorEvents = currentChapter?.majorEventIds.length ?? 0;
    const majorEventsResolved = snapshot.story.resolvedMajorEventIds.filter((eventId) => eventId.startsWith(chapterPrefix)).length;

    return [
      `Ngày đã qua: ${snapshot.time.day}`,
      `Công trình đang vận hành: ${restoredBuildings}`,
      `Sự kiện đã giải: ${snapshot.events.history.length}`,
      `Boss đã hạ: ${snapshot.exploration.defeatedBossIds.length}`,
      `Cảnh giới chưởng môn: ${getRealmSystem(this).getCurrentRealm(snapshot).name}`,
      `Mốc ${chapterLabel} đã mở: ${majorEventsResolved}/${totalMajorEvents}`
    ];
  }

  private getPriorityNotice(snapshot: Readonly<GameState>, activeEventTitle: string | null): string {
    if (activeEventTitle) {
      return `Có sự kiện đang chờ giải quyết: ${activeEventTitle}. Giải quyết nó trước để tránh mất mạch chapter hoặc phần thưởng.`;
    }

    if (snapshot.player.cultivation.breakthroughReady) {
      return 'Chưởng môn đã sẵn đột phá. Mở panel Tu hành để xem điều kiện và chốt bước tiến cảnh giới.';
    }

    if (snapshot.diplomacy.pendingMessageEventIds.length > 0) {
      return 'Đang có thư phe phái chờ xử lý. Ngoại giao có thể đổi event pressure và cơ hội giao dịch.';
    }

    const unstableDisciple = snapshot.disciples.roster.find((disciple) => disciple.mood <= 35 || disciple.loyalty <= 35 || disciple.riskFlags.length > 0);
    if (unstableDisciple) {
      return `${unstableDisciple.name} đang cần được để ý. Mood, loyalty hoặc risk của đệ tử này có thể gây thêm sự kiện nội môn.`;
    }

    return 'Nếu đang phân vân, hãy qua 1 ngày hoặc làm theo Mục tiêu chương ở bên phải để đẩy vòng chơi tiến lên.';
  }

  private getWhyThisMatters(snapshot: Readonly<GameState>): string {
    if (snapshot.ending.completed) {
      return 'Kết cục này là điểm khớp của base game phàm giới: nó tổng hợp cách Thanh Huyền Môn đã chọn giữ trật tự, quyền lực, hay mở đạo lộ mới.';
    }

    if (snapshot.story.currentChapterId === 'chapter_1_du_tan_khai_son') {
      return 'Chương 1 không cần làm mọi thứ. Chỉ cần giữ tông môn sống, dựng lại một vài điểm tựa, và vượt qua mối đe dọa đầu tiên.';
    }

    if (snapshot.story.currentChapterId === 'chapter_2_tong_mon_lap_the') {
      return 'Chương 2 kiểm tra xem Thanh Huyền Môn có đứng được thành một tiểu tông có nề nếp, có người, và có tư thế trước bên ngoài hay không.';
    }

    if (snapshot.story.currentChapterId === 'chapter_3_kinh_chieu_cuu_thien') {
      return 'Chương 3 kiểm tra xem Thanh Huyền Môn có giữ được mình khi sự thật, khát vọng, và áp lực bên ngoài cùng lúc đẩy đến hay không.';
    }

    if (snapshot.story.currentChapterId === 'chapter_4_nhat_niem_dinh_dao') {
      return 'Chương 4 không còn hỏi tông môn có sống nổi hay không, mà hỏi thứ gì đang xứng đáng được giữ lại khi đại kiếp và chân tướng cùng ép tới tận cửa.';
    }

    return 'Mọi panel trong bản base game hiện tại đều quay về một việc: giữ tông môn ổn, làm chưởng môn mạnh lên, và mở thêm mạch chapter.';
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
      `Lệch hướng hiện tại: ${alignmentLabelMap[dominantAlignment[0]] ?? 'Chưa rõ'} (${dominantAlignment[1]})`
    ];
  }

  private getMapValueHint(selectedMap: ReturnType<SectScene['getSelectedMap']>): string {
    const rewardLines: string[] = [];
    const itemRewardIds = Object.keys(selectedMap.rewardProfile.itemRewards ?? {});

    if (selectedMap.isSecretRealm) {
      rewardLines.push('san linh tai hiem va tang danh vong tong mon');
    }

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
      ? `Map này chủ yếu để ${rewardLines.join('; ')}.`
      : 'Map này chủ yếu để lấy tài nguyên và đẩy chapter/exploration loop tiến lên.';
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
      return 'Vật phẩm này chưa có mô tả mục đích rõ hơn.';
    }

    if (definition.category === 'artifact') {
      return 'Pháp khí giúp chưởng môn mạnh lên lâu dài; hợp khi muốn đẩy tu hành hoặc thám hiểm ổn định hơn.';
    }

    if (definition.category === 'pill') {
      return 'Đan dược cho lợi ích thấy ngay, hợp lúc cần đẩy nhanh tu hành hoặc giữ nền căn.';
    }

    if (definition.category === 'herb' || definition.category === 'material' || definition.category === 'ore') {
      return 'Nhóm này chủ yếu dùng cho luyện đan, mở rộng tông môn, hoặc để đánh đổi giá trị trong các event sau.';
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
      'Mở đầu Chương 1 đã bắt đầu. Hãy giữ lại nhịp vận hành của Thanh Huyền Môn.'
    );

    this.eventModal.show({
      title: 'Tàn Hỏa Chưa Tắt',
      subtitle: 'Mở đầu Chương 1',
      body: [
        'Thanh Huyền Môn chỉ còn lại cột đá nứt vỡ và ít người không bỏ đi. Sau Thiên Khu Biến, không ai biết tông môn này còn được tính là một tông môn nữa hay không.',
        'Bạn là người đứng dậy giữa tàn tích. Trong Chính Điện tối, Vân Tượng Linh Kính vẫn chưa tắt hẳn. Việc trước mắt không phải hùng bá, mà là giữ cho lửa tro này không nguội.',
        'Mục tiêu đầu tiên: qua một ngày, giữ ổn nội môn, và dựng lại một đầu mối để Thanh Huyền Môn có lý do ở lại.'
      ],
      options: [
        {
          label: 'Nhận lấy tông môn',
          detail: 'Giữ objective và hướng dẫn ngắn trên màn hình',
          onSelect: () => {
            this.eventModal.hide();
            this.refreshView(nextSnapshot, 'Mục tiêu đầu: qua một ngày và nhận ra Thanh Huyền Môn đang thiếu điều gì.');
          }
        },
        {
          label: 'Bỏ qua hướng dẫn',
          detail: 'Ẩn checklist nhập môn, vẫn giữ mở đầu chương',
          onSelect: () => {
            const skippedSnapshot = this.markTutorialFlag(
              TUTORIAL_CHOICE_FLAGS.skipped,
              'Đã tắt hướng dẫn nhập môn cho save này.'
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
      subtitle: `${event.kind === 'major' ? 'biến cố chính' : event.category} • ngày ${snapshot.time.day} • ${getChapterName(snapshot)}`,
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
      tags.push(`${typedEffects.sectFortune > 0 ? '+' : ''}${typedEffects.sectFortune} khí vận`);
    }

    if (typedEffects.sectStability) {
      tags.push(`${typedEffects.sectStability > 0 ? '+' : ''}${typedEffects.sectStability} ổn định`);
    }

    if (typedEffects.playerCultivationProgress) {
      tags.push(`+${typedEffects.playerCultivationProgress} tu hanh`);
    }

    if (typedEffects.foundationStability) {
      tags.push(`${typedEffects.foundationStability > 0 ? '+' : ''}${typedEffects.foundationStability} nền căn`);
    }

    if (typedEffects.tamMaPressure) {
      tags.push(`${typedEffects.tamMaPressure > 0 ? '+' : ''}${typedEffects.tamMaPressure} tâm ma`);
    }

    if (typedEffects.discipleMoodDelta) {
      tags.push(`${typedEffects.discipleMoodDelta > 0 ? '+' : ''}${typedEffects.discipleMoodDelta} tâm trạng đệ tử`);
    }

    if (typedEffects.discipleLoyaltyDelta) {
      tags.push(`${typedEffects.discipleLoyaltyDelta > 0 ? '+' : ''}${typedEffects.discipleLoyaltyDelta} trung thành đệ tử`);
    }

    if (typedEffects.factionReputation?.length) {
      const factionDelta = typedEffects.factionReputation[0];
      tags.push(`${factionDelta.delta > 0 ? '+' : ''}${factionDelta.delta} quan hệ ${this.getFactionName(factionDelta.factionId)}`);
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
    const managementOverview = getDiscipleSystem(this).getSectManagementOverview(snapshot);
    const equippedArtifact = getArtifactSystem(this).getEquippedArtifact(snapshot);
    const currentRealm = getRealmSystem(this).getCurrentRealm(snapshot);
    const breakthrough = getRealmSystem(this).checkBreakthroughEligibility(snapshot);
    const selectedDiscipleBuildingName = selectedDisciple?.assignedBuildingId
      ? buildingCatalog.buildings.find((building) => building.id === selectedDisciple.assignedBuildingId)?.name ?? selectedDisciple.assignedBuildingId
      : 'ChÆ°a gÃ¡n';
    const notableFlags = [
      ...snapshot.story.storyFlags.slice(-3),
      ...snapshot.story.worldFlags.slice(-2),
      ...snapshot.story.choiceFlags.slice(-1)
    ];
    const chapterProgress = snapshot.story.chapterProgress[snapshot.story.currentChapterId] ?? 'active';
    const diplomacyAlerts = Object.values(snapshot.diplomacy.factions).filter((faction) => faction.warningLevel > 0 || faction.hostilityLevel > 0);
    const historyLines = snapshot.events.history.slice(-4).reverse().map((entry) => {
      const detail = entry.contextSummary ? ` | ${entry.contextSummary}` : '';
      return `Ngày ${entry.resolvedOnDay}: ${entry.title}${detail}`;
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
      `Linh thạch ${snapshot.resources.linhThach}`,
      `Linh khí ${snapshot.resources.linhKhi}`,
      `Dược thảo ${snapshot.resources.duocThao}`,
      `Khoáng thạch ${snapshot.resources.khoangThach}`,
      `Linh mộc ${snapshot.resources.linhMoc}`
    ].join('   |   '));

    const chipValues = [
      snapshot.resources.linhThach,
      snapshot.player.cultivation.cultivationProgress,
      snapshot.player.cultivation.foundationStability
    ];
    const chipMaxValues = [
      Math.max(snapshot.resources.linhThach, 10000),
      currentRealm.progressRequired,
      100
    ];
    this.resourceBars.forEach((bar, index) => {
      bar.setValue(chipValues[index] ?? 0, chipMaxValues[index] ?? 100);
    });

    this.headerShell
      .setPlayerName(snapshot.player.name)
      .setPlayerTitle(`${snapshot.player.title} • ${formatDate(snapshot)}`)
      .setRealm(`${currentRealm.name} • ${chapterName}`);
    this.cultivationProgressBar
      .setLabel(`Tiến độ ${currentRealm.name}`)
      .setProgress(snapshot.player.cultivation.cultivationProgress, currentRealm.progressRequired);
    const realmIconMap: Record<string, string> = {
      pham_the: 'icon_status_qi_refining',
      luyen_khi: 'icon_status_qi_refining',
      truc_co: 'icon_status_foundation_establishment',
      kim_dan: 'icon_status_golden_core',
      nguyen_anh: 'icon_status_nascent_soul',
      hoa_than: 'icon_status_spirit_transformation'
    };
    const realmIconKey = realmIconMap[snapshot.player.cultivation.currentRealmId] ?? 'icon_status_qi_refining';
    if (this.textures.exists(realmIconKey)) {
      this.cultivationEmblem.setTexture(realmIconKey);
    }

    this.buildingListText.setText(
      [
        `Đang xem: ${selectedBuildingDefinition.name}`,
        `Cấp ${selectedBuildingState.level} | ${selectedBuildingState.isConstructed ? 'Đã dựng' : selectedBuildingState.isUnlocked ? 'Có thể dựng' : 'Chưa mở'} | Gắn ${selectedBuildingState.assignedDiscipleIds.length}`,
        `Hiệu quả: ${this.getBuildingEffectText(selectedBuildingId)}`,
        '',
        'Công trình nổi bật',
        ...buildingCatalog.buildings
          .slice(0, 2)
          .map((building) => {
            const state = snapshot.sect.buildings[building.id as BuildingId];
            return `${building.name}: cấp ${state.level} | ${state.isConstructed ? 'đang vận hành' : state.isUnlocked ? 'sẵn sàng dựng' : 'chưa mở'}`;
          })
      ].join('\n')
    );

    this.buildingDetailText.setText([
      `Đang chọn: ${selectedBuildingDefinition.name}`,
      `Trạng thái: ${selectedBuildingState.status} | Cấp ${selectedBuildingState.level}`,
      `Dựng: ${constructCheck.ok ? 'Có thể' : constructCheck.reason}`,
      `Nâng cấp: ${upgradeCheck.ok ? 'Có thể' : upgradeCheck.reason}`,
      `Hiệu quả: ${this.getBuildingEffectText(selectedBuildingId)}`,
      `Chi phí: ${this.formatCost(selectedBuildingDefinition.buildCost as Record<string, number>)}`
    ]);

    this.discipleListText.setText(
      selectedDisciple
        ? [
            `Đang chọn: ${selectedDisciple.name}`,
            `${getDiscipleRealmName(selectedDisciple.realmId)} | ${getDiscipleStatusLabel(selectedDisciple.status)}`,
            `Nhiệm vụ: ${TASK_LABELS[selectedDisciple.currentTask]} | Công trình: ${selectedDiscipleBuildingName}`,
            `Tâm trạng ${selectedDisciple.mood} | Trung thành ${selectedDisciple.loyalty}`,
            '',
            'Môn nhân khác',
            ...snapshot.disciples.roster
              .slice(0, 2)
              .map((disciple) => `${disciple.name}: ${TASK_LABELS[disciple.currentTask]}`)
          ].join('\n')
        : 'Chưa có đệ tử. Hãy tiếp tục event và tuyển nhân để lập lại tông môn.'
    );

    this.discipleDetailText.setText(
      selectedDisciple
        ? [
            `Đang chọn: ${selectedDisciple.name}`,
            `Cảnh giới: ${getDiscipleRealmName(selectedDisciple.realmId)} | Tuổi ${selectedDisciple.age}`,
            `Nhiệm vụ: ${TASK_LABELS[selectedDisciple.currentTask]} | Công trình: ${selectedDiscipleBuildingName}`,
            `Tiến độ: ${selectedDisciple.cultivationProgress} | Đột phá: ${selectedDisciple.breakthroughReady ? 'Sẵn sàng' : 'Chưa'}`,
            `Tâm trạng ${selectedDisciple.mood} | Trung thành ${selectedDisciple.loyalty} | Thể trạng ${selectedDisciple.health}`,
            `Ưu điểm: ${selectedDisciple.positiveTraitIds.map((traitId) => this.getTraitLabel(traitId)).join(', ') || 'Chưa có'}`,
            `Khuyết điểm: ${selectedDisciple.flawTraitIds.map((traitId) => this.getTraitLabel(traitId)).join(', ') || 'Chưa có'}`
          ].join('\n')
        : 'Chưa có đệ tử.'
    );

    this.eventText.setText([
      snapshot.sect.name,
      `Cấp tông môn ${getSectLevel(snapshot)} | Uy danh ${snapshot.sect.prestige} | Danh vọng ${snapshot.sect.reputation}`,
      `Đệ tử ${snapshot.disciples.roster.length}/${snapshot.sect.discipleCapacity} | Tổng lực tu hành ${managementOverview.cultivationPower}`,
      `Tài nguyên: LT ${snapshot.resources.linhThach} | Dược ${snapshot.resources.duocThao} | Khoáng ${snapshot.resources.khoangThach}`
    ].join('\n'));

    this.summaryText.setText([
      `Mục tiêu ngày: ${recommendedNextStep}`,
      `Ưu tiên hiện tại: ${priorityNotice}`,
      `Thay đổi gần nhất: ${latestChangeSummary}`
    ].join('\n'));
    this.statusText.setText(
      [
        `Nhắc nhanh: ${whyThisMatters}`,
        `Trợ đan: -${managementOverview.alchemyCostReduction} nguyên liệu | Hỗ trợ bí cảnh: x${managementOverview.explorationRewardMultiplier.toFixed(2)} thưởng`
      ].join('\n')
    );

    inventoryEntries.slice(0, this.inventorySlots.length).forEach((entry, index) => {
      const slot = this.inventorySlots[index];
      const labelText = slot.getData('labelText') as Phaser.GameObjects.Text | undefined;
      const countText = slot.getData('countText') as Phaser.GameObjects.Text | undefined;
      const iconSetter = slot as unknown as { setIcon?: (iconKey?: string) => unknown };
      labelText?.setText(entry.definition.name);
      countText?.setText(String(entry.quantity));
      iconSetter.setIcon?.(resolveItemTextureKey(this, entry.definition.id, entry.definition.category));
    });
    this.inventorySlots.slice(inventoryEntries.length).forEach((slot) => {
      const labelText = slot.getData('labelText') as Phaser.GameObjects.Text | undefined;
      const countText = slot.getData('countText') as Phaser.GameObjects.Text | undefined;
      const iconSetter = slot as unknown as { setIcon?: (iconKey?: string) => unknown };
      labelText?.setText('-');
      countText?.setText('');
      iconSetter.setIcon?.(undefined);
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
          `Đang xem: ${selectedFaction.name}`,
          `Trang thai: ${selectedFactionState.relationStatus}`,
          `Diem quan he: ${selectedFactionState.relationScore}`,
          `Cảnh báo: ${selectedFactionState.warningLevel} • Thù địch: ${selectedFactionState.hostilityLevel}`,
          `Liên minh: ${selectedFactionState.allianceState}`,
          `Mở giao dịch: ${selectedFactionState.tradeAccess ? 'Có' : 'Chưa'}`,
          `Thư đang chờ: ${snapshot.diplomacy.pendingMessageEventIds.length}`,
          `Mô tả ngắn: ${selectedFaction.shortDescription}`
        ],
        detailLines: [
          `Vai trò: ${selectedFaction.gameplayRole}`,
          `Tag event: ${selectedFaction.eventTags.join(', ')}`,
          `Cờ phe phái: ${selectedFactionState.knownFlags.join(', ') || 'Chưa có'}`,
          '',
          'Tương tác gần đây',
          ...(selectedFactionState.recentInteractions.length > 0
            ? selectedFactionState.recentInteractions.slice().reverse().map((entry) => `Ngày ${entry.day} • ${entry.type} • ${entry.summary}`)
            : ['Chưa có']),
          '',
          `Trade nhanh: ${selectedFaction.id === 'xich_luyen_bao' ? 'Mua dược thảo / khoáng thạch bằng linh thạch.' : 'Phe này chưa có trade hook trong sprint này.'}`
        ]
      });
    } else {
      this.diplomacyPanel.hide();
    }

    if (snapshot.ui.isGovernancePanelOpen) {
      const selectedDiscipleName = selectedDisciple?.name ?? 'Chưa chọn đệ tử';
      this.governancePanel.show({
        title: 'Trị môn',
        summaryLines: [
          `Uy danh: ${snapshot.sect.prestige}`,
          `Khí vận: ${snapshot.sect.fortune}`,
          `Ổn định tông môn: ${snapshot.sect.stability}`,
          `Thiên hướng hiện tại: ${governanceStyleCatalog.styles.find((style) => style.id === snapshot.sect.governanceStyleId)?.name ?? snapshot.sect.governanceStyleId}`,
          `Nội quy đang áp dụng: ${snapshot.sect.activeRuleIds.map((ruleId) => sectRuleCatalog.rules.find((rule) => rule.id === ruleId)?.name ?? ruleId).join(', ') || 'Chưa có'}`,
          `Trưởng lão: ${snapshot.sect.elders.length}/${snapshot.sect.elderSlots}`,
          `Khách khanh: ${snapshot.sect.guestCultivators.length}/${snapshot.sect.guestCultivatorSlots}`,
          `Đệ tử đang chọn: ${selectedDiscipleName}`,
          `Phe đang chọn để mời khách: ${selectedFaction?.name ?? 'Chưa chọn'}`
        ],
        detailLines: [
          `Đang xem thiên hướng: ${selectedGovernanceStyle.name}`,
          selectedGovernanceStyle.summary,
          `Tác dụng: ${selectedGovernanceStyle.summary}`,
          '',
          `Đang xem nội quy: ${selectedRule.name}`,
          selectedRule.summary,
          `Tác dụng: ${selectedRule.summary}`,
          '',
          `Vai trò trưởng lão: ${selectedElderRole.name}`,
          selectedElderRole.summary,
          `Tác dụng: ${selectedElderRole.summary}`,
          '',
          'Danh sách trưởng lão',
          ...(snapshot.sect.elders.length > 0
            ? snapshot.sect.elders.map((elder) => {
                const roleName = elderRoleCatalog.roles.find((role) => role.id === elder.roleId)?.name ?? elder.roleId;
                const discipleName = snapshot.disciples.roster.find((disciple) => disciple.id === elder.discipleId)?.name ?? elder.discipleId;
                return `${roleName}: ${discipleName}`;
              })
            : ['Chưa co']),
          '',
          'Danh sách khách khanh',
          ...(snapshot.sect.guestCultivators.length > 0
            ? snapshot.sect.guestCultivators.map((guest) => `${guest.name} • ${guest.bonusSummary} • ${guest.remainingDays} ngày`)
            : ['Chưa co'])
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
          ...selectedRecipe.outputs.flatMap((output) => {
            const itemName = itemCatalog.items.find((item) => item.id === output.itemId)?.name ?? output.itemId;
            return [
              `${itemName} x${output.amount}`,
              `â†’ ${this.describeItem(output.itemId)}`
            ];
          })
        ],
        iconKeys: [
          ...selectedRecipe.ingredients.slice(0, 2).map((ingredient) => {
            const definition = itemCatalog.items.find((item) => item.id === ingredient.itemId);
            return definition ? resolveItemTextureKey(this, definition.id, definition.category) : undefined;
          }),
          ...selectedRecipe.outputs.slice(0, 2).map((output) => {
            const definition = itemCatalog.items.find((item) => item.id === output.itemId);
            return definition ? resolveItemTextureKey(this, definition.id, definition.category) : undefined;
          })
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
        return 'Linh tháº£o';
      case 'ore':
        return 'KhoÃ¡ng liá»‡u';
      case 'pill':
        return 'Äan dÆ°á»£c';
      case 'material':
        return 'Váº­t liá»‡u';
      case 'artifact':
        return 'PhÃ¡p khÃ­';
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

    if (definition.category === 'herb' || definition.category === 'ore' || definition.category === 'material') {
      return `Nguyên liệu luyện đan / chế tác. ${definition.description}`;
    }

    if (definition.category === 'pill') {
      return `Đan dược dùng trực tiếp để hỗ trợ tu hành. ${definition.description}`;
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








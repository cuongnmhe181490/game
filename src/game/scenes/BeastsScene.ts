import Phaser from 'phaser';

import { Enemies, Icons, Items } from '@/game/config/assets';
import { getBeastSystem, getRealmSystem, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import {
  Header,
  NavBar,
  PanelFrame,
  ProgressBar,
  ResourceBar,
  createPrimaryButton,
  createSecondaryButton,
  menuPalette,
  resolveBeastPortraitKey
} from '@/game/ui';

export class BeastsScene extends Phaser.Scene {
  private headerShell!: Header;
  private resourceBars: ResourceBar[] = [];
  private navBar!: NavBar;
  private scrollContent!: Phaser.GameObjects.Container;
  private scrollMask!: Phaser.Display.Masks.GeometryMask;
  private scrollOffset = 0;
  private scrollViewportY = 0;
  private scrollViewportHeight = 0;
  private contentHeight = 0;
  private selectedBeastId: string | null = null;

  constructor() {
    super(SCENE_KEYS.beasts);
  }

  init(data?: { selectedBeastId?: string | null }): void {
    this.selectedBeastId = data?.selectedBeastId ?? null;
  }

  create(): void {
    const snapshot = getStateManager(this).snapshot;
    const beastSystem = getBeastSystem(this);
    const ownedBeasts = beastSystem.listOwned(snapshot);
    const selected =
      ownedBeasts.find((entry) => entry.state.beastId === this.selectedBeastId)
      ?? ownedBeasts.find((entry) => entry.state.beastId === snapshot.beasts.activeBeastId)
      ?? ownedBeasts[0]
      ?? null;

    this.selectedBeastId = selected?.state.beastId ?? null;

    const { width, height } = this.scale;
    const shellWidth = Math.min(430, width - 32);
    const shellHeight = Math.min(844, height - 24);
    const shellX = Math.floor((width - shellWidth) / 2);
    const shellY = Math.floor((height - shellHeight) / 2);
    const headerHeight = 238;
    const navHeight = 84;

    this.cameras.main.setBackgroundColor(menuPalette.background);

    const shell = this.add.graphics();
    shell.fillStyle(0x070e0b, 0.98);
    shell.lineStyle(2, 0x1f2f27, 1);
    shell.fillRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.strokeRoundedRect(shellX, shellY, shellWidth, shellHeight, 32);
    shell.lineStyle(1, menuPalette.frame, 0.45);
    shell.strokeRoundedRect(shellX + 10, shellY + 10, shellWidth - 20, shellHeight - 20, 28);

    const openSystemMenu = (): void => {
      if (!this.scene.isActive(SCENE_KEYS.systemMenu)) {
        this.scene.launch(SCENE_KEYS.systemMenu, { returnScene: SCENE_KEYS.beasts });
      }
    };
    this.input.keyboard?.on('keydown-ESC', openSystemMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', openSystemMenu);
    });

    this.headerShell = new Header(this, {
      width: shellWidth - 24,
      playerName: snapshot.player.name,
      playerTitle: `${snapshot.player.title} • Linh thú`,
      realm: getRealmSystem(this).getCurrentRealm(snapshot).name,
      avatarKey: Icons.ui.sectCrest
    }).setPosition(shellX + 12, shellY + 14);

    this.resourceBars = [
      new ResourceBar(this, {
        width: shellWidth - 104,
        name: 'Linh thạch',
        current: snapshot.resources.linhThach,
        max: Math.max(snapshot.resources.linhThach, 10000),
        iconKey: Icons.resource.spiritStone,
        color: 'gold'
      }),
      new ResourceBar(this, {
        width: shellWidth - 104,
        name: 'Tu vi',
        current: snapshot.player.cultivation.cultivationProgress,
        max: getRealmSystem(this).getCurrentRealm(snapshot).progressRequired,
        iconKey: Icons.resource.spiritualEnergy,
        color: 'gold'
      }),
      new ResourceBar(this, {
        width: shellWidth - 104,
        name: 'Linh lực',
        current: snapshot.resources.linhKhi,
        max: Math.max(snapshot.resources.linhKhi, 100),
        iconKey: Icons.resource.linhKhi,
        color: 'spirit'
      })
    ];
    this.resourceBars.forEach((bar, index) => {
      bar.setPosition(shellX + 86, shellY + 102 + index * 40);
    });

    this.scrollViewportY = shellY + headerHeight;
    this.scrollViewportHeight = shellHeight - headerHeight - navHeight;
    this.scrollContent = this.add.container(shellX + 16, this.scrollViewportY + 12);

    const maskGraphic = this.make.graphics();
    maskGraphic.fillStyle(0xffffff, 1);
    maskGraphic.fillRect(shellX + 8, this.scrollViewportY, shellWidth - 16, this.scrollViewportHeight);
    this.scrollMask = maskGraphic.createGeometryMask();
    this.scrollContent.setMask(this.scrollMask);

    this.buildContent(shellWidth - 32, selected, ownedBeasts);

    this.navBar = new NavBar(this, shellX + 16, shellY + shellHeight - navHeight, shellWidth - 32, [
      { id: 'cultivation', label: 'Tu luyện', iconKey: Icons.status.qiRefining, onClick: () => this.scene.start(SCENE_KEYS.sect) },
      {
        id: 'character',
        label: 'Linh thú',
        iconKey: selected ? resolveBeastPortraitKey(this, selected.definition) : Enemies.demonBeast,
        badge: ownedBeasts.length,
        onClick: () => undefined
      },
      { id: 'inventory', label: 'Túi đồ', iconKey: Items.pill.spirit, onClick: () => this.scene.start(SCENE_KEYS.inventory) },
      { id: 'exploration', label: 'Bí cảnh', iconKey: Items.relic.ancientScroll, onClick: () => this.scene.start(SCENE_KEYS.sect) },
      { id: 'sect', label: 'Tông môn', iconKey: Icons.ui.sectCrest, onClick: () => this.scene.start(SCENE_KEYS.sect) }
    ]);
    this.navBar.setActive('character');

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      if (this.contentHeight <= this.scrollViewportHeight) {
        return;
      }

      this.setScrollOffset(this.scrollOffset + dy * 0.6);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scrollMask.destroy();
    });

    this.fadeInShell([this.headerShell, ...this.resourceBars, this.scrollContent]);
  }

  private buildContent(
    panelWidth: number,
    selected: ReturnType<ReturnType<typeof getBeastSystem>['listOwned']>[number] | null,
    ownedBeasts: ReturnType<ReturnType<typeof getBeastSystem>['listOwned']>
  ): void {
    const beastSystem = getBeastSystem(this);
    const snapshot = getStateManager(this).snapshot;
    const support = beastSystem.getExplorationBonuses(snapshot);

    if (!selected) {
      const emptyFrame = new PanelFrame(this, {
        x: 0,
        y: 0,
        width: panelWidth,
        height: 186,
        title: 'Chưa có linh thú',
        subtitle: 'Save hiện tại chưa sở hữu linh thú nào.'
      });
      this.scrollContent.add(emptyFrame.root);
      emptyFrame.content.add(this.add.text(0, 0, 'Hệ linh thú đã có dữ liệu thật. Hãy dùng save mới hoặc save có linh thú để xem thẻ linh thú, chỉ số và phần bồi dưỡng.', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        lineSpacing: 4,
        wordWrap: { width: panelWidth - 36 }
      }));
      this.contentHeight = 220;
      return;
    }

    const portraitFrame = new PanelFrame(this, {
      x: 0,
      y: 0,
      width: panelWidth,
      height: 244,
      title: selected.definition.name,
      subtitle: `${selected.definition.title} • ${this.formatRarity(selected.definition.rarity)} • Cấp ${selected.state.level}`
    });
    this.scrollContent.add(portraitFrame.root);

    const portraitRing = this.add.circle(panelWidth / 2, 134, 58, 0x0b1812, 0.82).setStrokeStyle(2, 0x8c6b22, 0.95);
    this.scrollContent.add(portraitRing);
    const portraitKey = resolveBeastPortraitKey(this, selected.definition);
    if (portraitKey && this.textures.exists(portraitKey)) {
      this.scrollContent.add(this.add.image(panelWidth / 2, 134, portraitKey).setDisplaySize(98, 98));
    }

    const portraitStatus = selected.definition.portraitKey === portraitKey
      ? 'Đang dùng portrait riêng của linh thú.'
      : 'Đang dùng portrait fallback tạm thời từ enemy assets.';
    this.scrollContent.add(this.add.text(18, 194, portraitStatus, {
      color: selected.definition.portraitKey === portraitKey ? menuPalette.textSoft : menuPalette.warningText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      wordWrap: { width: panelWidth - 36 }
    }));

    const statsFrame = new PanelFrame(this, {
      x: 0,
      y: 260,
      width: panelWidth,
      height: 214,
      title: 'Chỉ số',
      subtitle: `Huấn luyện ${selected.state.training} • Rarity ${this.formatRarity(selected.definition.rarity)}`
    });
    this.scrollContent.add(statsFrame.root);
    [
      new ProgressBar(this, { width: panelWidth - 36, value: selected.state.attack, max: 100, label: 'Tấn công', iconKey: Icons.resource.spiritualEnergy }),
      new ProgressBar(this, { width: panelWidth - 36, value: selected.state.defense, max: 100, label: 'Phòng thủ', iconKey: Icons.resource.spiritStone }),
      new ProgressBar(this, { width: panelWidth - 36, value: selected.state.health, max: 120, label: 'Sinh lực', iconKey: Icons.resource.linhKhi })
    ].forEach((bar, index) => {
      bar.setPosition(18, 98 + index * 40);
      statsFrame.content.add(bar);
    });

    const metaText = this.add.text(0, 0, `Cấp linh thú: ${selected.state.level}\nHuấn luyện: ${selected.state.training}\nNền chỉ số: ${selected.definition.baseStats.attack}/${selected.definition.baseStats.defense}/${selected.definition.baseStats.health}`, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    });
    statsFrame.content.add(metaText);

    const skillFrame = new PanelFrame(this, {
      x: 0,
      y: 490,
      width: panelWidth,
      height: 156,
      title: 'Kỹ năng đặc biệt',
      subtitle: selected.definition.skillName
    });
    this.scrollContent.add(skillFrame.root);
    skillFrame.content.add(this.add.text(0, 0, selected.definition.skillText, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    }));

    const actionsFrame = new PanelFrame(this, {
      x: 0,
      y: 662,
      width: panelWidth,
      height: 214,
      title: 'Bồi dưỡng',
      subtitle: snapshot.beasts.lastSummary || support.summary
    });
    this.scrollContent.add(actionsFrame.root);

    const upgradeEval = beastSystem.canUpgrade(selected.state.beastId, snapshot);
    const trainEval = beastSystem.canTrain(selected.state.beastId, snapshot);
    this.scrollContent.add(this.add.text(actionsFrame.root.x + 18, actionsFrame.root.y + 84, `${support.summary}\nHai hành động dưới đây đã có gameplay thật. Nếu không đủ tài nguyên, nút sẽ tự khóa và hiển thị lý do.`, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '12px',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 36 }
    }));
    this.scrollContent.add(createPrimaryButton(this, {
      width: 182,
      label: 'Nâng cấp',
      detail: upgradeEval.ok
        ? `${beastSystem.getUpgradeCost(selected.state.beastId, snapshot)} Linh thạch`
        : upgradeEval.reason,
      disabled: !upgradeEval.ok,
      onClick: () => this.handleUpgrade(selected.state.beastId)
    }).setPosition(actionsFrame.root.x + 18, actionsFrame.root.y + 142));
    this.scrollContent.add(createSecondaryButton(this, {
      width: 182,
      label: 'Huấn luyện',
      detail: trainEval.ok
        ? `${beastSystem.getTrainCost(selected.state.beastId, snapshot)} Linh lực`
        : trainEval.reason,
      disabled: !trainEval.ok,
      onClick: () => this.handleTrain(selected.state.beastId)
    }).setPosition(actionsFrame.root.x + 210, actionsFrame.root.y + 142));

    const listFrameHeight = 96 + ownedBeasts.length * 94;
    const listFrame = new PanelFrame(this, {
      x: 0,
      y: 892,
      width: panelWidth,
      height: listFrameHeight,
      title: 'Danh sách linh thú',
      subtitle: 'Dữ liệu hiển thị trực tiếp từ beast state hiện tại.'
    });
    this.scrollContent.add(listFrame.root);

    ownedBeasts.forEach((beast, index) => {
      const card = this.add.container(0, 0);
      const bg = this.add.graphics();
      const active = beast.state.beastId === selected.state.beastId;
      bg.fillStyle(0x0d1a15, 0.74);
      bg.lineStyle(1, active ? 0xd4af37 : 0x294d3c, 1);
      bg.fillRoundedRect(0, 0, panelWidth - 36, 78, 18);
      bg.strokeRoundedRect(0, 0, panelWidth - 36, 78, 18);
      const portraitBg = this.add.circle(36, 39, 20, 0x10261c, 0.9).setStrokeStyle(1, active ? 0xd4af37 : 0x52635c, 1);
      card.add([bg, portraitBg]);
      const smallPortraitKey = resolveBeastPortraitKey(this, beast.definition);
      if (smallPortraitKey && this.textures.exists(smallPortraitKey)) {
        card.add(this.add.image(36, 39, smallPortraitKey).setDisplaySize(30, 30));
      }
      card.add(this.add.text(68, 14, `${beast.definition.name} • Cấp ${beast.state.level}`, {
        color: active ? menuPalette.textStrong : menuPalette.accentText,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold'
      }));
      card.add(this.add.text(68, 34, `${this.formatRarity(beast.definition.rarity)} • ATK ${beast.state.attack} • DEF ${beast.state.defense} • HP ${beast.state.health}`, {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        wordWrap: { width: panelWidth - 120 }
      }));
      card.add(this.add.text(68, 52, beast.definition.skillName, {
        color: menuPalette.textSoft,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '10px',
        wordWrap: { width: panelWidth - 120 }
      }));
      const hit = this.add.rectangle(0, 0, panelWidth - 36, 78, 0xffffff, 0.001)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.scene.restart({ selectedBeastId: beast.state.beastId });
      });
      card.add(hit);
      card.setPosition(18, 84 + index * 94);
      listFrame.content.add(card);
    });

    this.contentHeight = 892 + listFrameHeight + 24;
  }

  private fadeInShell(targets: Array<{ setAlpha: (value: number) => unknown }>): void {
    targets.forEach((target) => target.setAlpha(0));
    this.tweens.add({
      targets: targets as never,
      alpha: 1,
      duration: 170,
      ease: 'Quad.Out',
      stagger: 26
    });
  }

  private handleUpgrade(beastId: string): void {
    const result = getBeastSystem(this).upgrade(beastId);
    if (!result.ok) {
      this.scene.restart({ selectedBeastId: beastId });
      return;
    }

    this.scene.restart({ selectedBeastId: beastId });
  }

  private handleTrain(beastId: string): void {
    const result = getBeastSystem(this).train(beastId);
    if (!result.ok) {
      this.scene.restart({ selectedBeastId: beastId });
      return;
    }

    this.scene.restart({ selectedBeastId: beastId });
  }

  private formatRarity(rarity: string): string {
    switch (rarity) {
      case 'legendary':
        return 'Truyền kỳ';
      case 'epic':
        return 'Cực phẩm';
      case 'rare':
        return 'Hiếm';
      case 'uncommon':
        return 'Tốt';
      default:
        return 'Thường';
    }
  }

  private setScrollOffset(nextOffset: number): void {
    const maxOffset = Math.max(0, this.contentHeight - this.scrollViewportHeight + 24);
    this.scrollOffset = Phaser.Math.Clamp(nextOffset, 0, maxOffset);
    this.tweens.killTweensOf(this.scrollContent);
    this.tweens.add({
      targets: this.scrollContent,
      y: this.scrollViewportY + 12 - this.scrollOffset,
      duration: 120,
      ease: 'Quad.Out'
    });
  }
}

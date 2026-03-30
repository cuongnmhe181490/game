import Phaser from 'phaser';

import { Icons, Items } from '@/game/config/assets';
import { getInventorySystem, getRealmSystem, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import type { GameState } from '@/game/state/types';
import {
  findDedicatedItemTextureKey,
  Header,
  ItemCard,
  NavBar,
  PanelFrame,
  ResourceBar,
  resolveItemTextureKey,
  menuPalette
} from '@/game/ui';

type InventoryEntry = ReturnType<ReturnType<typeof getInventorySystem>['listItems']>[number];

export class InventoryScene extends Phaser.Scene {
  private headerShell!: Header;
  private resourceBars: ResourceBar[] = [];
  private navBar!: NavBar;
  private scrollContent!: Phaser.GameObjects.Container;
  private scrollMask!: Phaser.Display.Masks.GeometryMask;
  private scrollOffset = 0;
  private scrollViewportY = 0;
  private scrollViewportHeight = 0;
  private contentHeight = 0;

  constructor() {
    super(SCENE_KEYS.inventory);
  }

  create(): void {
    const snapshot = getStateManager(this).snapshot;
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
        this.scene.launch(SCENE_KEYS.systemMenu, { returnScene: SCENE_KEYS.inventory });
      }
    };
    this.input.keyboard?.on('keydown-ESC', openSystemMenu);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', openSystemMenu);
    });

    this.headerShell = new Header(this, {
      width: shellWidth - 24,
      playerName: snapshot.player.name,
      playerTitle: snapshot.player.title,
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
        current: snapshot.player.cultivation.foundationStability,
        max: 100,
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

    this.buildContent(snapshot, shellWidth - 32);

    this.navBar = new NavBar(this, shellX + 16, shellY + shellHeight - navHeight, shellWidth - 32, [
      { id: 'cultivation', label: 'Tu luyện', iconKey: Icons.status.qiRefining, onClick: () => this.scene.start(SCENE_KEYS.sect) },
      { id: 'character', label: 'Linh thú', iconKey: Icons.realm.luyenKhi, badge: 0, onClick: () => this.scene.start(SCENE_KEYS.beasts) },
      { id: 'inventory', label: 'Túi đồ', iconKey: Items.pill.spirit, badge: this.getInventoryEntries(snapshot).length, onClick: () => undefined },
      { id: 'exploration', label: 'Bí cảnh', iconKey: Items.relic.ancientScroll, onClick: () => this.scene.start(SCENE_KEYS.sect) },
      { id: 'sect', label: 'Tông môn', iconKey: Icons.ui.sectCrest, onClick: () => this.scene.start(SCENE_KEYS.sect) }
    ]);
    this.navBar.setActive('inventory');

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

  private buildContent(snapshot: Readonly<GameState>, panelWidth: number): void {
    const inventoryEntries = this.getInventoryEntries(snapshot);
    const titleFrame = new PanelFrame(this, {
      x: 0,
      y: 0,
      width: panelWidth,
      height: 162,
      title: 'Túi đồ',
      subtitle: 'Vật phẩm, đan dược và di vật đang giữ trong kho cá nhân.'
    });
    this.scrollContent.add(titleFrame.root);

    const totalStacks = inventoryEntries.length;
    const totalItems = inventoryEntries.reduce((sum, entry) => sum + entry.quantity, 0);
    const fallbackCount = inventoryEntries.filter((entry) => !findDedicatedItemTextureKey(this, entry.definition.id, entry.definition.category)).length;
    const raritySummary = [
      `Tổng ô vật phẩm: ${totalStacks}`,
      `Tổng số lượng: ${totalItems}`,
      `Vật phẩm hiếm: ${inventoryEntries.filter((entry) => ['rare', 'epic', 'legendary'].includes(entry.definition.rarity)).length}`,
      `Trang bị chính: ${snapshot.inventory.equippedArtifactItemId ? 'Đã gắn' : 'Chưa gắn'}`,
      fallbackCount > 0
        ? `Art tạm thời: ${fallbackCount} vật phẩm vẫn đang dùng icon fallback.`
        : 'Art vật phẩm: tất cả vật phẩm hiện có đang dùng icon riêng.'
    ];

    raritySummary.forEach((line, index) => {
      titleFrame.content.add(this.add.text(0, index * 20, line, {
        color: index <= 1 ? menuPalette.textStrong : menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        lineSpacing: 2,
        wordWrap: { width: panelWidth - 36 }
      }));
    });

    const gridStartY = 202;
    const cols = 2;
    const gap = 14;
    const cardWidth = Math.floor((panelWidth - gap) / cols) - 2;
    const cardHeight = 150;

    inventoryEntries.forEach((entry, index) => {
      const card = new ItemCard(this, {
        width: cardWidth,
        height: cardHeight,
        name: entry.definition.name,
        quantity: entry.quantity,
        rarity: entry.definition.rarity,
        iconKey: resolveItemTextureKey(this, entry.definition.id, entry.definition.category)
      });
      const col = index % cols;
      const row = Math.floor(index / cols);
      card.setPosition(col * (cardWidth + gap), gridStartY + row * (cardHeight + gap));
      this.scrollContent.add(card.root);
    });

    if (inventoryEntries.length === 0) {
      const emptyFrame = new PanelFrame(this, {
        x: 0,
        y: gridStartY,
        width: panelWidth,
        height: 148,
        title: 'Kho đang trống',
        subtitle: 'Hãy đi bí cảnh, giải sự kiện hoặc luyện đan để nhận vật phẩm mới.'
      });
      this.scrollContent.add(emptyFrame.root);
      emptyFrame.content.add(this.add.text(0, 0, 'Khi có vật phẩm, mỗi ô sẽ hiển thị icon, bậc hiếm và số lượng. Nếu art riêng còn thiếu, game sẽ dùng icon fallback an toàn và gắn nhãn Art tạm.', {
        color: menuPalette.textMuted,
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        lineSpacing: 4,
        wordWrap: { width: panelWidth - 36 }
      }));
      this.contentHeight = gridStartY + 160;
      return;
    }

    const rows = Math.ceil(inventoryEntries.length / cols);
    this.contentHeight = gridStartY + rows * (cardHeight + gap);
  }

  private fadeInShell(targets: Array<{ setAlpha: (value: number) => unknown }>): void {
    targets.forEach((target) => {
      target.setAlpha(0);
    });
    this.tweens.add({
      targets: targets as never,
      alpha: 1,
      duration: 170,
      ease: 'Quad.Out',
      stagger: 26
    });
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

  private getInventoryEntries(snapshot: Readonly<GameState>): InventoryEntry[] {
    return getInventorySystem(this).listItems(snapshot);
  }
}

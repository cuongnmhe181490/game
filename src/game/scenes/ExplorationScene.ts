import Phaser from 'phaser';

import { getExplorationSystem, getFeedbackSystem, getSaveStore, getStateManager } from '@/game/config/registry';
import { SCENE_KEYS } from '@/game/scenes/sceneKeys';
import type { BossDefinition, EnemyDefinition, ExplorationMapDefinition } from '@/game/data';
import type { ExplorationRunOutcome } from '@/game/entities';
import type { ResourceDeltaState } from '@/game/state/types';
import { EventModal, createTextButton, drawInsetPanel, menuPalette } from '@/game/ui';

type PhysicsCircle = Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
type PhysicsRectangle = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

interface EnemyRuntime {
  definition: EnemyDefinition | BossDefinition;
  sprite: PhysicsRectangle;
  currentHealth: number;
  isBoss: boolean;
  attackReadyAt: number;
  alive: boolean;
}

interface LootPickup {
  resourceId: keyof ResourceDeltaState;
  amount: number;
  sprite: PhysicsCircle;
}

interface EventSpot {
  eventId: string;
  sprite: PhysicsCircle;
  triggered: boolean;
}

interface MapVisualTheme {
  background: number;
  field: number;
  accent: number;
  bossZone: number;
  note: string;
  enemyPositions: Array<{ x: number; y: number }>;
  eventPositions: Array<{ x: number; y: number }>;
}

function addDelta(target: ResourceDeltaState, source: ResourceDeltaState): ResourceDeltaState {
  const next: ResourceDeltaState = { ...target };

  for (const [resourceId, value] of Object.entries(source)) {
    if (typeof value !== 'number' || value === 0) {
      continue;
    }

    const key = resourceId as keyof ResourceDeltaState;
    next[key] = (next[key] ?? 0) + Math.trunc(value);
  }

  return next;
}

function formatRewards(rewards: ResourceDeltaState): string {
  const labels: Record<string, string> = {
    linhThach: 'linh thạch',
    linhKhi: 'linh khí',
    duocThao: 'dược thảo',
    khoangThach: 'khoáng thạch',
    linhMoc: 'linh má»™c'
  };

  const entries = Object.entries(rewards).filter(([, value]) => typeof value === 'number' && value > 0);
  return entries.map(([key, value]) => `+${value} ${labels[key] ?? key}`).join(', ') || 'chưa có';
}

function getMapTheme(map: ExplorationMapDefinition): MapVisualTheme {
  switch (map.id) {
    case 'hac_moc_lam':
      return {
        background: 0x061010,
        field: 0x10211a,
        accent: 0x264433,
        bossZone: 0x1f2028,
        note: 'Rừng đen nhiều sương thấp, thu hoạch quý hơn nhưng đòn đánh cũng nặng hơn.',
        enemyPositions: [
          { x: 500, y: 790 },
          { x: 720, y: 640 },
          { x: 950, y: 730 },
          { x: 1140, y: 510 },
          { x: 1330, y: 360 }
        ],
        eventPositions: [
          { x: 620, y: 860 },
          { x: 1060, y: 420 }
        ]
      };
    case 'tan_tich_thanh_huyen':
      return {
        background: 0x0a0c14,
        field: 0x181b28,
        accent: 0x3a4458,
        bossZone: 0x2a2432,
        note: 'Di tích cũ giữ nhịp trầm và nặng, phần thưởng truyền thừa đáng giá hơn tài nguyên thường.',
        enemyPositions: [
          { x: 540, y: 760 },
          { x: 780, y: 610 },
          { x: 980, y: 500 },
          { x: 1220, y: 380 },
          { x: 1410, y: 300 }
        ],
        eventPositions: [
          { x: 690, y: 820 },
          { x: 1020, y: 560 },
          { x: 1320, y: 250 }
        ]
      };
    default:
      return {
        background: 0x071013,
        field: 0x162523,
        accent: 0x2f4a40,
        bossZone: 0x2c1d1d,
        note: 'Map đầu giữ combat nhẹ, chủ yếu để mang tài nguyên và vật phẩm nhập môn về sect.',
        enemyPositions: [
          { x: 520, y: 790 },
          { x: 760, y: 700 },
          { x: 940, y: 460 },
          { x: 1160, y: 560 },
          { x: 1260, y: 380 }
        ],
        eventPositions: [
          { x: 660, y: 820 },
          { x: 1080, y: 470 }
        ]
      };
  }
}

export class ExplorationScene extends Phaser.Scene {
  private player!: PhysicsCircle;
  private playerHealth = 0;
  private maxPlayerHealth = 0;
  private enemyRuntimes: EnemyRuntime[] = [];
  private lootPickups: LootPickup[] = [];
  private eventSpots: EventSpot[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'R', Phaser.Input.Keyboard.Key>;
  private hudText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private eventModal!: EventModal;
  private attackReadyAt = 0;
  private playerDamageReadyAt = 0;
  private mapId = 'hau_son_coc';
  private pendingRewards: ResourceDeltaState = {};
  private pendingItems: Record<string, number> = {};
  private pendingStoryFlags: string[] = [];
  private pendingWorldFlags: string[] = [];
  private pendingChoiceFlags: string[] = [];
  private pendingFactionRelations: Record<string, number> = {};
  private pendingSectPrestige = 0;
  private pendingCultivationProgress = 0;
  private pendingFoundationStability = 0;
  private statusLines: string[] = ['Rời sơn môn, giữ nhịp thăm dò trước khi lao sâu vào địa giới lạ.'];
  private latestStatusTone: 'neutral' | 'reward' | 'danger' | 'major' = 'neutral';
  private runResolved = false;
  private inputLocked = false;
  private hudDirty = true;

  constructor() {
    super(SCENE_KEYS.exploration);
  }

  create(data?: { mapId?: string }): void {
    this.mapId = data?.mapId ?? 'hau_son_coc';
    const explorationSystem = getExplorationSystem(this);
    const map = explorationSystem.getMapDefinition(this.mapId) ?? explorationSystem.getStarterMap();
    const eligibility = explorationSystem.canEnterMap(map.id);

    if (!eligibility.ok) {
      this.scene.start(SCENE_KEYS.sect);
      return;
    }

    const snapshot = getStateManager(this).update((draft) => {
      draft.ui.activeScreen = 'exploration-scene';
      draft.ui.modalEventId = null;

      if (!draft.story.choiceFlags.includes('tutorial_entered_exploration')) {
        draft.story.choiceFlags.push('tutorial_entered_exploration');
        draft.ui.statusMessage = 'Đã vào khu thám hiểm đầu tiên. Hạ boss hoặc rút lui an toàn để mang phần thưởng về sơn môn.';
      }
    });
    getSaveStore(this).saveGame(snapshot);

    this.mapId = map.id;
    this.cameras.main.setBackgroundColor(getMapTheme(map).background);
    this.physics.world.setBounds(0, 0, 1920, 1080);
    this.cameras.main.setBounds(0, 0, 1920, 1080);

    this.drawMap(map);
    this.createPlayer();
    this.spawnEnemies(map);
    this.spawnBoss(map.bossId);
    this.spawnEventSpots(map);
    this.createHud(map);
    this.createControls();

    this.eventModal = new EventModal(this, () => {
      this.inputLocked = false;
      this.markHudDirty();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.eventModal.destroy();
    });

    this.refreshHud();
    this.playFeedback('ui-open');
    this.cameras.main.fadeIn(180, 8, 16, 20);
  }

  update(time: number): void {
    if (this.runResolved) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    this.handleMovement();

    if (!this.inputLocked && Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time >= this.attackReadyAt) {
      this.performAttack(time);
    }

    if (!this.inputLocked && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.finishRun('retreat', false, ['Tự rút về trước khi khí lực hao thêm.']);
      return;
    }

    this.updateEnemies(time);
    this.checkEventSpots();

    if (this.hudDirty) {
      this.refreshHud();
    }
  }

  private drawMap(map: ExplorationMapDefinition): void {
    const theme = getMapTheme(map);
    this.add.rectangle(960, 540, 1920, 1080, theme.background);
    this.add.rectangle(960, 540, 1800, 940, theme.field).setStrokeStyle(2, theme.accent, 1);
    this.add.rectangle(960, 120, 1740, 96, 0x0b1014, 0.42).setStrokeStyle(1, menuPalette.frameSoft, 0.7);
    this.add.rectangle(380, 820, 460, 180, theme.accent, 0.42);
    this.add.rectangle(980, 520, 520, 140, theme.accent, 0.35);
    this.add.rectangle(1540, 280, 420, 220, theme.bossZone, 0.8).setStrokeStyle(2, 0x8f744a, 0.8);
    this.add.text(110, 96, map.name, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '30px'
    });
    this.add.text(110, 132, theme.note, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      wordWrap: { width: 900 }
    });
  }

  private createPlayer(): void {
    const profile = getExplorationSystem(this).getPlayerCombatProfile();
    this.maxPlayerHealth = profile.maxHealth;
    this.playerHealth = profile.maxHealth;
    this.player = this.add.circle(180, 860, 18, 0xc9b27c) as PhysicsCircle;
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setCircle(18);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.markHudDirty();
  }

  private spawnEnemies(map: ExplorationMapDefinition): void {
    const positions = getMapTheme(map).enemyPositions;
    const explorationSystem = getExplorationSystem(this);

    map.enemyPool.forEach((enemyId, index) => {
      const definition = explorationSystem.getEnemyDefinition(enemyId);

      if (!definition) {
        return;
      }

      const position = positions[index % positions.length];
      const color = map.id === 'tan_tich_thanh_huyen' ? 0x8b7ba0 : map.id === 'hac_moc_lam' ? 0x597251 : 0x9b4d3f;
      const sprite = this.add.rectangle(position.x, position.y, 28 + index, 28 + index, color) as PhysicsRectangle;
      this.physics.add.existing(sprite);
      sprite.body.setCollideWorldBounds(true);

      this.enemyRuntimes.push({
        definition,
        sprite,
        currentHealth: definition.maxHealth,
        isBoss: false,
        attackReadyAt: 0,
        alive: true
      });
    });
  }

  private spawnBoss(bossId: string): void {
    const boss = getExplorationSystem(this).getBossDefinition(bossId);

    if (!boss) {
      return;
    }

    const sprite = this.add.rectangle(1600, 260, 56, 56, 0x7e2f2f) as PhysicsRectangle;
    this.physics.add.existing(sprite);
    sprite.body.setCollideWorldBounds(true);

    this.enemyRuntimes.push({
      definition: boss,
      sprite,
      currentHealth: boss.maxHealth,
      isBoss: true,
      attackReadyAt: 0,
      alive: true
    });
  }

  private spawnEventSpots(map: ExplorationMapDefinition): void {
    const positions = getMapTheme(map).eventPositions;

    map.eventPool.forEach((eventId, index) => {
      const spot = this.add.circle(positions[index]?.x ?? 760, positions[index]?.y ?? 760, 24, 0x4f7f66, 0.35) as PhysicsCircle;
      this.physics.add.existing(spot);
      spot.body.setCircle(24);
      this.eventSpots.push({
        eventId,
        sprite: spot,
        triggered: false
      });
    });
  }

  private createHud(map: ExplorationMapDefinition): void {
    drawInsetPanel(this, {
      x: 16,
      y: 14,
      width: 540,
      height: 190,
      fill: menuPalette.panel,
      alpha: 0.86
    }).setScrollFactor(0);
    drawInsetPanel(this, {
      x: 16,
      y: 642,
      width: 556,
      height: 124,
      fill: menuPalette.panelAlt,
      alpha: 0.9
    }).setScrollFactor(0);

    this.add.text(32, 24, 'Trang thai tham hiem', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '22px'
    }).setScrollFactor(0);

    this.add.text(32, 654, 'Tong ket chuyen di', {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '21px'
    }).setScrollFactor(0);

    this.hudText = this.add.text(32, 56, '', {
      color: menuPalette.textStrong,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px'
    }).setScrollFactor(0);

    this.bossText = this.add.text(32, 84, '', {
      color: menuPalette.warningText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px'
    }).setScrollFactor(0);

    this.logText = this.add.text(32, 112, '', {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '15px',
      lineSpacing: 5,
      wordWrap: { width: 500 }
    }).setScrollFactor(0);

    this.statusText = this.add.text(32, 688, map.name, {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      lineSpacing: 5,
      wordWrap: { width: 520 }
    }).setScrollFactor(0);

    const retreatButton = createTextButton(this, {
      x: 1120,
      y: 56,
      width: 180,
      label: 'Rut lui',
      detail: 'Mang phan thuong dang co ve sect',
      onClick: () => {
        if (!this.inputLocked && !this.runResolved) {
          this.finishRun('retreat', false, ['Tu rut lui truoc khi cham sau hon vao dia gioi nay.']);
        }
      }
    });
    retreatButton.setScrollFactor(0);
  }

  private createControls(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,R') as Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'R', Phaser.Input.Keyboard.Key>;
  }

  private handleMovement(): void {
    if (this.inputLocked) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const profile = getExplorationSystem(this).getPlayerCombatProfile();
    let moveX = 0;
    let moveY = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      moveX -= 1;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      moveX += 1;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      moveY -= 1;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      moveY += 1;
    }

    const vector = new Phaser.Math.Vector2(moveX, moveY).normalize().scale(profile.moveSpeed);
    this.player.body.setVelocity(vector.x, vector.y);
  }

  private performAttack(time: number): void {
    const profile = getExplorationSystem(this).getPlayerCombatProfile();
    let landedHit = false;
    this.attackReadyAt = time + profile.attackCooldownMs;
    this.playFeedback('attack');
    this.tweens.killTweensOf(this.player);
    this.tweens.add({
      targets: this.player,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 70,
      ease: 'Quad.Out',
      yoyo: true
    });
    this.flashStatus(`Xuất thủ trong phạm vi ${profile.attackRange}.`);

    for (const enemy of this.enemyRuntimes) {
      if (!enemy.alive) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);

      if (distance <= profile.attackRange) {
        landedHit = true;
        enemy.currentHealth = Math.max(0, enemy.currentHealth - profile.attackDamage);
        this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 26, `-${profile.attackDamage}`, menuPalette.warningText);
        enemy.sprite.setFillStyle(enemy.isBoss ? 0xb85a5a : 0xcb7b5a);
        this.time.delayedCall(100, () => {
          if (enemy.alive) {
            enemy.sprite.setFillStyle(enemy.isBoss ? 0x7e2f2f : 0x9b4d3f);
          }
        });

        if (enemy.currentHealth <= 0) {
          this.defeatEnemy(enemy);
        }
      }
    }

    if (!landedHit) {
      this.flashStatus('Don danh truot khoi muc tieu.', 'neutral');
    }

    this.markHudDirty();
  }

  private updateEnemies(time: number): void {
    for (const enemy of this.enemyRuntimes) {
      if (!enemy.alive) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);

      if (distance <= enemy.definition.detectionRange) {
        this.physics.moveToObject(enemy.sprite, this.player, enemy.definition.moveSpeed);
      } else {
        enemy.sprite.body.setVelocity(0, 0);
      }

      if (distance <= 32 && time >= enemy.attackReadyAt && time >= this.playerDamageReadyAt) {
        enemy.attackReadyAt = time + enemy.definition.attackCooldownMs;
        this.playerDamageReadyAt = time + 450;
        this.playerHealth = Math.max(0, this.playerHealth - enemy.definition.damage);
        this.playFeedback('damage');
        this.cameras.main.shake(85, enemy.isBoss ? 0.0048 : 0.0028);
        this.spawnFloatingText(this.player.x, this.player.y - 28, `-${enemy.definition.damage}`, menuPalette.dangerText);
        this.flashStatus(`${enemy.definition.name} gây ${enemy.definition.damage} sát thương.`);

        this.markHudDirty();
        if (this.playerHealth <= 0) {
          this.finishRun('defeat', false, ['Khí lực cạn, buộc phải rút người về sơn môn.']);
          return;
        }
      }
    }
  }

  private defeatEnemy(enemy: EnemyRuntime): void {
    enemy.alive = false;
    enemy.sprite.body.setVelocity(0, 0);
    enemy.sprite.body.enable = false;
    enemy.sprite.setVisible(false);
    this.playFeedback(enemy.isBoss ? 'boss-defeat' : 'enemy-defeat');
    this.spawnFloatingText(
      enemy.sprite.x,
      enemy.sprite.y - 20,
      enemy.isBoss ? 'PHA VONG GIU' : 'Ha xong',
      enemy.isBoss ? menuPalette.successText : menuPalette.accentText
    );
    if (enemy.isBoss) {
      this.cameras.main.shake(150, 0.005);
      this.cameras.main.flash(180, 182, 209, 165, false);
    }
    this.flashStatus(`${enemy.definition.name} bị hạ.`);

    for (const drop of enemy.definition.dropTable) {
      if (Math.random() <= drop.chance) {
        this.spawnLoot(enemy.sprite.x, enemy.sprite.y, drop.resourceId as keyof ResourceDeltaState, drop.amount);
      }
    }

    if (enemy.isBoss) {
      const bossDefinition = enemy.definition as BossDefinition;

      for (const itemDrop of bossDefinition.itemDrops ?? []) {
        if (Math.random() <= itemDrop.chance) {
          this.pendingItems[itemDrop.itemId] = (this.pendingItems[itemDrop.itemId] ?? 0) + itemDrop.amount;
          this.playFeedback('rare-reward');
          this.flashStatus(`Thu được ${itemDrop.amount} ${itemDrop.itemId}.`);
        }
      }
    }

    if (enemy.isBoss) {
      const map = getExplorationSystem(this).getMapDefinition(this.mapId);
      this.pendingRewards = addDelta(this.pendingRewards, map?.rewardProfile.bossBonus ?? {});
      this.finishRun('victory', true, [`Đã hạ ${enemy.definition.name} và khép lại chuyến đi ở ${map?.name ?? 'khu vực này'}.`], 550);
    }
    this.markHudDirty();
  }

  private spawnLoot(x: number, y: number, resourceId: keyof ResourceDeltaState, amount: number): void {
    const pickup = this.add.circle(x, y, 10, 0xbe985d) as PhysicsCircle;
    this.physics.add.existing(pickup);
    pickup.body.setCircle(10);
    this.lootPickups.push({
      resourceId,
      amount,
      sprite: pickup
    });
  }

  private checkEventSpots(): void {
    if (this.inputLocked) {
      return;
    }

    for (const spot of this.eventSpots) {
      if (spot.triggered) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.sprite.x, spot.sprite.y);

      if (distance <= 34) {
        spot.triggered = true;
        spot.sprite.body.enable = false;
        spot.sprite.setVisible(false);
        this.presentExplorationEvent(spot.eventId);
        break;
      }
    }

    for (const pickup of [...this.lootPickups]) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.sprite.x, pickup.sprite.y);

      if (distance <= 24) {
        this.pendingRewards = addDelta(this.pendingRewards, {
          [pickup.resourceId]: pickup.amount
        });
        this.playFeedback('reward');
        this.spawnFloatingText(pickup.sprite.x, pickup.sprite.y - 16, `+${pickup.amount}`, menuPalette.accentText);
        pickup.sprite.destroy();
        this.lootPickups = this.lootPickups.filter((entry) => entry !== pickup);
        this.markHudDirty();
        this.flashStatus(`Thu được +${pickup.amount} ${pickup.resourceId}.`);
      }
    }
  }

  private presentExplorationEvent(eventId: string): void {
    const definition = getExplorationSystem(this).getExplorationEvent(eventId);
    const map = getExplorationSystem(this).getMapDefinition(this.mapId);

    if (!definition || !map) {
      return;
    }

    if (definition.allowedMapIds && !definition.allowedMapIds.includes(map.id)) {
      return;
    }

    if (definition.requiredEnvironmentTags && definition.requiredEnvironmentTags.some((tag) => !map.environmentTags.includes(tag))) {
      return;
    }

    this.inputLocked = true;
    this.player.body.setVelocity(0, 0);

    this.eventModal.show({
      title: definition.title,
      subtitle: `${map.name} | lua chon tai hien truong`,
      variant:
        eventId.includes('altar') || eventId.includes('records') || map.id === 'tan_tich_thanh_huyen'
          ? 'discovery'
          : eventId.includes('fog') || map.id === 'hac_moc_lam'
            ? 'omen'
            : 'default',
      body: [definition.body],
      options: definition.choices.map((choice) => ({
        label: choice.label,
        detail: choice.outcome,
        onSelect: () => {
          const effect = definition.effects[choice.id];
          const isSpecialDiscovery = Boolean(
            Object.keys(effect?.itemAdds ?? {}).length > 0 ||
            (effect?.addFlags?.length ?? 0) > 0 ||
            (effect?.addWorldFlags?.length ?? 0) > 0
          );

          if (effect?.resources) {
            this.pendingRewards = addDelta(this.pendingRewards, effect.resources);
          }

          for (const [itemId, amount] of Object.entries(effect?.itemAdds ?? {})) {
            if (typeof amount !== 'number' || amount <= 0) {
              continue;
            }

            this.pendingItems[itemId] = (this.pendingItems[itemId] ?? 0) + Math.trunc(amount);
          }

          if (typeof effect?.healthDelta === 'number') {
            this.playerHealth = Math.max(0, Math.min(this.maxPlayerHealth, this.playerHealth + effect.healthDelta));
          }

          if (typeof effect?.playerCultivationProgress === 'number') {
            this.pendingCultivationProgress += Math.trunc(effect.playerCultivationProgress);
          }

          if (typeof effect?.foundationStability === 'number') {
            this.pendingFoundationStability += Math.trunc(effect.foundationStability);
          }

          if (typeof effect?.sectPrestige === 'number') {
            this.pendingSectPrestige += Math.trunc(effect.sectPrestige);
          }

          for (const [factionId, value] of Object.entries(effect?.factionRelations ?? {})) {
            if (typeof value !== 'number') {
              continue;
            }

            this.pendingFactionRelations[factionId] = (this.pendingFactionRelations[factionId] ?? 0) + Math.trunc(value);
          }

          for (const flag of effect?.addFlags ?? []) {
            if (!this.pendingStoryFlags.includes(flag)) {
              this.pendingStoryFlags.push(flag);
            }
          }

          for (const flag of effect?.addWorldFlags ?? []) {
            if (!this.pendingWorldFlags.includes(flag)) {
              this.pendingWorldFlags.push(flag);
            }
          }

          for (const flag of effect?.addChoiceFlags ?? []) {
            if (!this.pendingChoiceFlags.includes(flag)) {
              this.pendingChoiceFlags.push(flag);
            }
          }

          this.playFeedback(isSpecialDiscovery ? 'rare-reward' : 'reward');
          this.statusLines.push(choice.outcome);
          this.statusLines = this.statusLines.slice(-5);
          this.markHudDirty();
          this.eventModal.hide();
        }
      }))
    });
  }

  private finishRun(
    result: ExplorationRunOutcome['result'],
    defeatedBoss: boolean,
    notes: string[],
    delayMs = 0
  ): void {
    if (this.runResolved) {
      return;
    }

    this.runResolved = true;
    this.inputLocked = true;
    this.player.body.setVelocity(0, 0);
    this.playFeedback(
      result === 'victory'
        ? 'boss-defeat'
        : result === 'defeat'
          ? 'damage'
          : 'ui-close'
    );
    this.flashStatus(
      result === 'victory'
        ? 'Chuyen di ket lai voi thang loi. Dang chuan bi tro ve sect.'
        : result === 'defeat'
          ? 'That thu, dang dua chuong mon rut ve an toan.'
          : 'Rut lui an toan, thu xep thuong va tro ve tong mon.',
      result === 'victory' ? 'major' : result === 'defeat' ? 'danger' : 'reward'
    );
    this.markHudDirty();

    const applyReturn = () => {
      const outcome: ExplorationRunOutcome = {
        mapId: this.mapId,
        rewards: this.pendingRewards,
        itemRewards: this.pendingItems,
        sectPrestigeDelta: this.pendingSectPrestige,
        playerCultivationProgressDelta: this.pendingCultivationProgress,
        foundationStabilityDelta: this.pendingFoundationStability,
        factionRelationDeltas: this.pendingFactionRelations,
        defeatedBoss,
        result,
        notes,
        storyFlags: this.pendingStoryFlags,
        worldFlags: this.pendingWorldFlags,
        choiceFlags: this.pendingChoiceFlags
      };
      getExplorationSystem(this).completeRun(outcome);
      this.scene.start(SCENE_KEYS.sect);
    };

    if (delayMs > 0) {
      this.time.delayedCall(delayMs, applyReturn);
      return;
    }

    this.time.delayedCall(160, applyReturn);
  }

  private playFeedback(
    cue:
      | 'ui-open'
      | 'ui-close'
      | 'attack'
      | 'reward'
      | 'rare-reward'
      | 'damage'
      | 'enemy-defeat'
      | 'boss-defeat'
  ): void {
    try {
      const feedback = getFeedbackSystem(this);
      feedback.unlockAudio();
      feedback.play(cue);
    } catch {
      // Exploration should stay fully playable even if feedback is unavailable.
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const marker = this.add.text(x, y, text, {
      color,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: marker,
      y: y - 28,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => {
        marker.destroy();
      }
    });
  }

  private refreshHud(): void {
    const map = getExplorationSystem(this).getMapDefinition(this.mapId);
    const livingBoss = this.enemyRuntimes.find((enemy) => enemy.isBoss && enemy.alive);
    const itemSummary = Object.entries(this.pendingItems)
      .map(([itemId, amount]) => `${itemId} x${amount}`)
      .join(', ');

    this.hudText.setText([
      `HP ${this.playerHealth}/${this.maxPlayerHealth}`,
      `Thu duoc: ${formatRewards(this.pendingRewards)}`,
      `Vat pham dac biet: ${itemSummary || 'chua co'}`,
      `Tien ich chuyen di: +${this.pendingCultivationProgress} tu hanh | +${this.pendingSectPrestige} uy danh`,
      'Dieu khien: WASD hoac mui ten | SPACE danh | R rut lui'
    ]);

    this.bossText.setText(
      livingBoss
        ? `Boss: ${livingBoss.definition.name} | HP ${livingBoss.currentHealth}/${livingBoss.definition.maxHealth}`
        : `Boss: ${map?.name ?? 'Khu vuc'} da mat the giu sau.`
    );
    this.bossText.setColor(livingBoss ? menuPalette.warningText : menuPalette.successText);

    this.logText.setText(this.statusLines.slice(-5).join('\n'));
    this.statusText.setText(
      `${map?.name ?? 'Khu vuc'} | Nguy co ${map?.riskLevel ?? 1} | Khuyen nghi ${map?.recommendedRealm ?? 'pham_the'} | Event ${this.eventSpots.filter((spot) => spot.triggered).length}/${this.eventSpots.length}
Muc tieu: ${livingBoss ? 'Ha boss hoac rut lui an toan voi phan thuong dang co.' : 'Da pha vong giu sau, san sang quay ve sect.'}
Nhip gan nhat: ${this.statusLines[this.statusLines.length - 1] ?? 'Dang do tham dia hinh.'}`
    );
    this.statusText.setColor(
      this.latestStatusTone === 'major'
        ? menuPalette.warningText
        : this.latestStatusTone === 'danger'
          ? menuPalette.dangerText
          : this.latestStatusTone === 'reward'
            ? menuPalette.successText
            : menuPalette.accentText
    );
    this.hudDirty = false;
  }

  private flashStatus(line: string, tone: 'neutral' | 'reward' | 'danger' | 'major' = 'neutral'): void {
    this.statusLines.push(line);
    this.statusLines = this.statusLines.slice(-5);
    this.latestStatusTone = tone;
    this.tweens.killTweensOf(this.logText);
    this.tweens.add({
      targets: this.logText,
      alpha: { from: 0.68, to: 1 },
      duration: 140,
      ease: 'Quad.Out'
    });
    this.markHudDirty();
  }

  private markHudDirty(): void {
    this.hudDirty = true;
  }
}


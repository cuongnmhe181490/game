import Phaser from 'phaser';

import { menuPalette } from '@/game/ui/theme';

const DISPLAY_FIXUPS: Array<[RegExp, string]> = [
  [/\bKhai Tong Chu\b/g, 'Khai Tông Chủ'],
  [/\bThanh Huyen Mon\b/g, 'Thanh Huyền Môn'],
  [/\bPham The\b/g, 'Phàm Thể'],
  [/\bLuyen Khi\b/g, 'Luyện Khí'],
  [/\bTruc Co\b/g, 'Trúc Cơ'],
  [/\bKim Dan\b/g, 'Kim Đan'],
  [/\bNguyen Anh\b/g, 'Nguyên Anh'],
  [/\bHoa Than\b/g, 'Hóa Thần'],
  [/\bDu Tan Khai Son\b/g, 'Dư Tàn Khai Sơn'],
  [/\bTong Mon Lap The\b/g, 'Tông Môn Lập Thế'],
  [/\bKinh Chieu Cuu Thien\b/g, 'Kinh Chiếu Cửu Thiên'],
  [/\bNhat Niem Dinh Dao\b/g, 'Nhất Niệm Định Đạo']
];

function normalizeDisplayText(value: string): string {
  return DISPLAY_FIXUPS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export interface HeaderOptions {
  width: number;
  playerName: string;
  playerTitle: string;
  realm: string;
  avatarKey?: string;
}

export class Header extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly avatarRing: Phaser.GameObjects.Arc;
  private readonly avatarImage: Phaser.GameObjects.Image;
  private readonly avatarFallback: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly realmText: Phaser.GameObjects.Text;
  private widthValue: number;

  constructor(scene: Phaser.Scene, options: HeaderOptions) {
    const bg = scene.add.graphics();
    const avatarRing = scene.add.circle(36, 36, 28, 0x0f1b2e, 0.92).setStrokeStyle(2, 0xd4af37, 0.95);
    const avatarImage = scene.add.image(36, 36, '').setVisible(false);
    const avatarFallback = scene.add.text(36, 36, options.playerName.slice(0, 1).toUpperCase(), {
      color: '#f3e5ab',
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '22px',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    const nameText = scene.add.text(74, 12, options.playerName, {
      color: menuPalette.textStrong,
      fontFamily: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
      fontSize: '22px'
    });
    const titleText = scene.add.text(74, 40, options.playerTitle, {
      color: menuPalette.accentText,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px'
    });
    const realmText = scene.add.text(74, 60, options.realm, {
      color: menuPalette.textMuted,
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
      fontSize: '11px'
    });

    super(scene, 0, 0, [bg, avatarRing, avatarImage, avatarFallback, nameText, titleText, realmText]);
    scene.add.existing(this);
    this.bg = bg;
    this.avatarRing = avatarRing;
    this.avatarImage = avatarImage;
    this.avatarFallback = avatarFallback;
    this.nameText = nameText;
    this.titleText = titleText;
    this.realmText = realmText;
    this.widthValue = options.width;

    this.resize(options.width);
    this.setPlayerName(options.playerName);
    this.setPlayerTitle(options.playerTitle);
    this.setRealm(options.realm);
    this.setAvatar(options.avatarKey);
  }

  setPlayerName(name: string): this {
    const normalized = normalizeDisplayText(name);
    this.nameText.setText(normalized);
    this.avatarFallback.setText(normalized.slice(0, 1).toUpperCase() || '?');
    return this;
  }

  setPlayerTitle(title: string): this {
    this.titleText.setText(normalizeDisplayText(title));
    return this;
  }

  setRealm(realm: string): this {
    this.realmText.setText(normalizeDisplayText(realm));
    return this;
  }

  setAvatar(assetKey?: string): this {
    if (assetKey && this.scene.textures.exists(assetKey)) {
      this.avatarImage.setTexture(assetKey).setVisible(true).setDisplaySize(40, 40);
      this.avatarFallback.setVisible(false);
      return this;
    }

    this.avatarImage.setVisible(false);
    this.avatarFallback.setVisible(true);
    return this;
  }

  resize(width: number): this {
    this.widthValue = width;
    this.bg.clear();
    this.bg.fillStyle(0x0d1a15, 0.66);
    this.bg.lineStyle(1, 0x294d3c, 0.85);
    this.bg.fillRoundedRect(0, 0, this.widthValue, 84, 24);
    this.bg.strokeRoundedRect(0, 0, this.widthValue, 84, 24);

    this.nameText.setWordWrapWidth(this.widthValue - 92);
    this.titleText.setWordWrapWidth(this.widthValue - 92);
    this.realmText.setWordWrapWidth(this.widthValue - 92);
    return this;
  }
}

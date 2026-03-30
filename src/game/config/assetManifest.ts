import { generatedBeastAssetManifest } from '@/game/config/generatedBeastAssetManifest';
import { generatedItemAssetManifest } from '@/game/config/generatedItemAssetManifest';

export type AssetManifestType = 'image' | 'svg';

export interface AssetManifestEntry {
  key: string;
  path: string;
  type: AssetManifestType;
  svgConfig?: {
    width: number;
    height: number;
  };
}

// Prefer filename-based keys. Add a short category prefix only when filenames collide.
export const assetManifest: AssetManifestEntry[] = [
  { key: 'bg_event_inheritance_discovery_01', path: 'assets/backgrounds/events/event_inheritance_discovery_01.png', type: 'image' },
  { key: 'sect_main_restored_01', path: 'assets/backgrounds/sect/sect_main_restored_01.png', type: 'image' },

  { key: 'building_alchemy_room', path: 'assets/buildings/building_alchemy_room.png', type: 'image' },
  { key: 'building_main_hall', path: 'assets/buildings/building_main_hall.png', type: 'image' },
  { key: 'building_meditation_cave', path: 'assets/buildings/building_meditation_cave.png', type: 'image' },
  { key: 'building_scripture_library', path: 'assets/buildings/building_scripture_library.png', type: 'image' },

  { key: 'enemy_ancient_golem', path: 'assets/enemies/enemy_ancient_golem.png', type: 'image' },
  { key: 'enemy_corrupt_cultivator', path: 'assets/enemies/enemy_corrupt_cultivator.png', type: 'image' },
  { key: 'enemy_demon_beast', path: 'assets/enemies/enemy_demon_beast.png', type: 'image' },
  { key: 'enemy_spirit_wolf', path: 'assets/enemies/enemy_spirit_wolf.png', type: 'image' },

  { key: 'event_breakthrough', path: 'assets/events/event_breakthrough.png', type: 'image' },
  { key: 'event_inheritance_discovery_01', path: 'assets/events/event_inheritance_discovery_01.png', type: 'image' },
  { key: 'event_mystic_merchant', path: 'assets/events/event_mystic_merchant.png', type: 'image' },
  { key: 'event_sect_attack', path: 'assets/events/event_sect_attack.png', type: 'image' },

  { key: 'icon_realm_hoa_than', path: 'assets/icons/icon_realm_hoa_than.png', type: 'image' },
  { key: 'icon_realm_kim_dan', path: 'assets/icons/icon_realm_kim_dan.png', type: 'image' },
  { key: 'icon_realm_luyen_hu', path: 'assets/icons/icon_realm_luyen_hu.png', type: 'image' },
  { key: 'icon_realm_luyen_khi', path: 'assets/icons/icon_realm_luyen_khi.png', type: 'image' },
  { key: 'icon_realm_nguyen_anh', path: 'assets/icons/icon_realm_nguyen_anh.png', type: 'image' },
  { key: 'icon_realm_truc_co', path: 'assets/icons/icon_realm_truc_co.png', type: 'image' },
  { key: 'icon_resource_ancient_ore', path: 'assets/icons/icon_resource_ancient_ore.png', type: 'image' },
  { key: 'icon_resource_herbs', path: 'assets/icons/icon_resource_herbs.png', type: 'image' },
  { key: 'icon_resource_karma', path: 'assets/icons/icon_resource_karma.png', type: 'image' },
  { key: 'icon_resource_linh_khi', path: 'assets/icons/icon_resource_linh_khi.png', type: 'image' },
  { key: 'icon_resource_linh_thach', path: 'assets/icons/icon_resource_linh_thach.png', type: 'image' },
  { key: 'icon_resource_merit', path: 'assets/icons/icon_resource_merit.png', type: 'image' },
  { key: 'icon_resource_sect_reputation', path: 'assets/icons/icon_resource_sect_reputation.png', type: 'image' },
  { key: 'icon_resource_spirit_grass', path: 'assets/icons/icon_resource_spirit_grass.png', type: 'image' },
  { key: 'icon_resource_spirit_stone', path: 'assets/icons/icon_resource_spirit_stone.png', type: 'image' },
  { key: 'icon_resource_spiritual_energy', path: 'assets/icons/icon_resource_spiritual_energy.png', type: 'image' },
  { key: 'icon_status_foundation_establishment', path: 'assets/icons/icon_status_foundation_establishment.png', type: 'image' },
  { key: 'icon_status_golden_core', path: 'assets/icons/icon_status_golden_core.png', type: 'image' },
  { key: 'icon_status_karma', path: 'assets/icons/icon_status_karma.png', type: 'image' },
  { key: 'icon_status_merit', path: 'assets/icons/icon_status_merit.png', type: 'image' },
  { key: 'icon_status_nascent_soul', path: 'assets/icons/icon_status_nascent_soul.png', type: 'image' },
  { key: 'icon_status_qi_refining', path: 'assets/icons/icon_status_qi_refining.png', type: 'image' },
  { key: 'icon_status_reputation', path: 'assets/icons/icon_status_reputation.png', type: 'image' },
  { key: 'icon_status_sect_influence', path: 'assets/icons/icon_status_sect_influence.png', type: 'image' },
  { key: 'icon_status_spirit_transformation', path: 'assets/icons/icon_status_spirit_transformation.png', type: 'image' },
  { key: 'icon_ui_sect_crest', path: 'assets/icons/ui/icon_ui_sect_crest.svg', type: 'svg', svgConfig: { width: 256, height: 256 } },

  ...generatedBeastAssetManifest,
  ...generatedItemAssetManifest,

  { key: 'ui_divider_horizontal', path: 'assets/ui/ui_divider_horizontal.png', type: 'image' },
  { key: 'ui_frame_modal_ornate_01', path: 'assets/ui/ui_frame_modal_ornate_01.png', type: 'image' },
  { key: 'ui_progress_bar_bg', path: 'assets/ui/ui_progress_bar_bg.png', type: 'image' },
  { key: 'ui_tab_active', path: 'assets/ui/ui_tab_active.png', type: 'image' },
  { key: 'ui_tab_inactive', path: 'assets/ui/ui_tab_inactive.png', type: 'image' },
  { key: 'ui_frames_modal_ornate_01', path: 'assets/ui/frames/ui_frame_modal_ornate_01.png', type: 'image' },

  // Legacy aliases used by current scenes/UI.
  { key: 'sect-crest', path: 'assets/icons/ui/icon_ui_sect_crest.svg', type: 'svg', svgConfig: { width: 256, height: 256 } },
  { key: 'sect-main-bg', path: 'assets/backgrounds/sect/sect_main_restored_01.png', type: 'image' },
  { key: 'event-discovery', path: 'assets/backgrounds/events/event_inheritance_discovery_01.png', type: 'image' },
  { key: 'ui-frame-modal', path: 'assets/ui/frames/ui_frame_modal_ornate_01.png', type: 'image' }
];

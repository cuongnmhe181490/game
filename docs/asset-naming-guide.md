# Asset Naming and Integration Guide

This document establishes strict rules for naming visual assets and integrating new art files into the `Nhất Niệm Khai Tông` repository. Following these rules ensures that assets remain clean, scalable, and easy to reuse across the project without breaking references.

## 1. Asset Directory Structure
The existing asset folders are located at the root inside:
`public/assets/`

The directories correspond to major art categories. **Do not create new asset roots or duplicate category folders.** If you are adding a new asset, it MUST go into one of the following existing folders:
- `backgrounds/`
- `portraits/`
- `icons/`
- `buildings/`
- `items/`
- `ui/`

## 2. General Naming Conventions
All asset files must strictly adhere to the following rules:
- **Lowercase Only**: Use only lowercase letters (`a-z`).
- **Underscore Separators**: Words must be separated by underscores (`_`).
- **No Spaces**: Never use spaces in file names.
- **ASCII Only**: No Vietnamese diacritics, accents, or special characters.
- **Descriptive & Stable**: The name must describe what the file visually represents, not how it is currently being used. Avoid generic or temporary names. 

**Forbidden Patterns:**
Do not use vague or versioned names such as:
- `final.png`, `final_v2.png`
- `new.png`, `temp.png`
- `image1.png`, `bg.jpg`

### General Naming Format
`<category>_<subject>_<variant>_<index>.png`

---

## 3. Category-Specific Naming Rules

### Backgrounds (`public/assets/backgrounds/`)
- `sect_<location_or_state>_<index>.png`
  - *Example:* `sect_main_ruined_01.png`, `sect_main_restored_01.png`
- `map_<map_id>_bg_<index>.png`
  - *Example:* `map_hau_son_coc_bg_01.png`, `map_tan_tich_thanh_huyen_bg_01.png`
- `chapter_<chapter_id>_<scene>_<index>.png`
  - *Example:* `chapter_01_opening_illustration_01.png`
- `event_<event_theme>_<index>.png`
  - *Example:* `event_inheritance_discovery_01.png`

### Portraits (`public/assets/portraits/`)
- `portrait_disciple_<gender_or_type>_<index>.png`
  - *Example:* `portrait_disciple_male_01.png`, `portrait_disciple_female_03.png`
- `portrait_elder_<gender_or_type>_<index>.png`
  - *Example:* `portrait_elder_male_01.png`
- `portrait_guest_<type>_<index>.png`
  - *Example:* `portrait_guest_mysterious_01.png`
- `portrait_faction_<faction_id>_<type>_<index>.png`

### Icons (`public/assets/icons/`)
- `icon_resource_<resource_id>.png`
  - *Example:* `icon_resource_linh_thach.png`, `icon_resource_linh_khi.png`
- `icon_status_<status_id>.png`
  - *Example:* `icon_status_loyalty.png`, `icon_status_mood.png`
- `icon_ui_<ui_purpose>.png`
  - *Example:* `icon_ui_warning.png`

### Buildings (`public/assets/buildings/`)
- `building_<building_id>_card_<index>.png`
  - *Example:* `building_main_hall_card_01.png`, `building_alchemy_room_card_01.png`
- `building_<building_id>_icon_<index>.png`

### Items (`public/assets/items/`)
- `item_relic_<item_id>_<index>.png`
  - *Example:* `item_relic_fragment_01.png`
- `item_pill_<item_id>_<index>.png`
  - *Example:* `item_pill_tu_khi_dan_01.png`
- `item_material_<item_id>_<index>.png`
- `item_artifact_<item_id>_<index>.png`

### UI Elements (`public/assets/ui/`)
- `ui_panel_<size_or_style>_<index>.png`
  - *Example:* `ui_panel_large_dark_01.png`
- `ui_button_<style_or_state>_<index>.png`
  - *Example:* `ui_button_primary_gold_01.png`
- `ui_frame_<purpose_or_style>_<index>.png`
  - *Example:* `ui_frame_modal_ornate_01.png`
- `ui_ornament_<purpose>_<index>.png`

---

## 4. File Formats
- Prefer `.png` for UI elements, icons, portraits, item art, and cards, especially where transparency is useful.
- `.jpg` or `.png` are acceptable for large background images, if they are already in use or to save file size.

## 5. Intake Rules for New Art (For Contributors and Agents)
When new incoming art files are added to the project, the following intake protocol must be followed:
1. **Detect Purpose:** Determine the probable category based on the filename and the intended visual purpose.
2. **Move if Necessary:** Move the file into the correct subfolder in `public/assets/` if it was misplaced. Do NOT redesign directory structures.
3. **Normalize Name:** Rename the asset strictly according to the format rules above without losing the semantic meaning.
4. **Handle Collisions:** If the proposed filename already exists, DO NOT silently overwrite it. Instead, increment the final index (e.g., from `_01` to `_02`).
5. **Update References:** If the file name or path changes during intake, carefully and safely update all references in the source code or JSON data to prevent broken images.

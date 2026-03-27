# AGENTS.md

## Project
Tên dự án: Nhất Niệm Khai Tông

## Vision
Đây là game 2D web-first về tu tiên sinh tồn, phát triển tông môn, tăng cảnh giới, event ngẫu nhiên và thám hiểm theo map.
Tone: huyền bí, tiết chế, dễ đọc, không quá cổ văn, không màu mè rẻ tiền.

## Tech stack
- Phaser 3
- TypeScript
- Vite
- JSON data-driven
- localStorage save cho bản đầu

## Product rules
- Single-player
- Đệ tử là NPC do hệ thống sinh ra
- Tông môn là trung tâm gameplay
- Main story cố định, event thường bán-ngẫu nhiên theo state
- Deploy web trước, app sau

## Architecture rules
- Ưu tiên data-driven, không hardcode content nếu có thể đưa vào JSON
- Save schema phải có version
- UI không tự chứa gameplay logic phức tạp
- Không thêm dependency lớn nếu chưa cần
- Không refactor ngoài phạm vi task

## Key directories
- src/game/scenes
- src/game/systems
- src/game/state
- src/game/data
- src/game/ui
- src/game/entities

## Agent ownership
- Lead Architect: điều phối, tích hợp, review cuối
- Core Systems Agent: systems/state/save/resources/buildings/realm
- Content/Event Agent: data/content/story/events/localization
- UI/UX Agent: scenes/ui/hud/modals/panels
- Exploration/Combat Agent: exploration/combat/maps/enemies/bosses

## Definition of done
- npm install chạy được
- npm run dev chạy được
- TypeScript không có lỗi mới
- File đặt đúng thư mục
- Có ghi chú ngắn cách test

## Working style
- Plan ngắn trước khi code nếu task nhiều bước
- Patch nhỏ, review được
- Nêu assumptions rõ ràng
- Đọc AGENTS.md trước khi thay đổi kiến trúc lớn

# Nhat Niem Khai Tong

Game 2D web-first ve tu tien sinh ton va phuc hung tong mon, xay bang Phaser 3 + TypeScript + Vite.

Ban repo hien tai dong scope o base game pham gioi:
- mo dau tu tan tich Thanh Huyen Mon
- Chuong 1 den Chuong 4
- 3 ket cuc base game
- replay nhe sau khi clear

## Doc gi truoc

1. [AGENTS.md](D:/game/AGENTS.md)
2. [docs/README.md](D:/game/docs/README.md)
3. Tai lieu chuyen biet phu hop voi task hien tai

## Chay du an

```bash
npm install
npm run dev
```

Game vao preload ngan roi mo menu chinh.

## Kiem tra build

```bash
npm run typecheck
npm run build
npm run preview
```

`npm run build` tao static files trong thu muc `dist/`.
Day la kieu build uu tien cho Vercel, Netlify, Cloudflare Pages, hoac bat ky static host nao phuc vu thu muc build nhu mot website tinh.

## Scope dang playable

- quan ly tong mon theo ngay
- cong trinh, de tu, tu hanh, event, ngoai giao co ban
- tham hiem theo map, loot, inventory, luyen dan, phap khi
- Chapter 1-4 voi spine co dinh + event state-aware
- 3 ending routes:
  - `Chinh Dao Trung Lap`
  - `Ba Dao Xung Ton`
  - `Ngoai Dao Khai Thien`
- replay nhe:
  - track ending da thay
  - mo `Hanh trinh moi`
  - mang theo 1 `du am hanh trinh` nho

## Khong nam trong scope hien tai

- hau ending campaign hoac arc sau pham gioi
- gameplay Hoa Than, Linh gioi, Tien gioi
- full NG+, multi-slot save, import save
- mobile portrait nhu target UI chinh
- combat sau theo huong action RPG

## Save / reset co ban

- `Tiep tuc`: vao lai save hien tai
- `Game moi`: tao run sach tu Chuong 1
- `Xoa save hien tai` / `Xoa du lieu save`: xoa run hien tai va backup
- `Xuat save JSON`: tai save hien tai de gui kem bug report
- replay meta duoc giu rieng voi ordinary run save
- save loi se thu fallback sang backup truoc khi tao save moi
- save duoc luu trong `localStorage` cua trinh duyet va theo tung origin/domain

## Replay sau khi clear

- Sau khi hoan tat mot ending, menu mo `Hanh trinh moi`
- Replay khong mang theo toan bo tong mon cu
- Replay chi giu:
  - ending da thay
  - so lan clear
  - 1 du am hanh trinh nho gan voi ending da mo
- Muc tieu la khuyen khich thu route khac, khong bien game thanh meta-progression nang

## Han che dang biet

- nhieu panel van con day thong tin
- audio hien tai la cue procedural nhe
- tham hiem chi persist ket qua sau khi roi map
- da co xuat save JSON, chua co import save
- `vite build` van con warning chunk size, nhung build pass
- neu deploy duoi mot subpath, can cau hinh lai `base` cua Vite cho dung host path

## Tai lieu quan trong trong `docs/`

- [docs/README.md](D:/game/docs/README.md): so do tai lieu va thu tu doc
- [docs/story-bible.md](D:/game/docs/story-bible.md): macro story truth
- [docs/world-lore.md](D:/game/docs/world-lore.md): lore va phe phai
- [docs/chapters.md](D:/game/docs/chapters.md): chapter spine va escalation
- [docs/event-rules.md](D:/game/docs/event-rules.md): quy tac event va content authoring
- [docs/expansion-architecture.md](D:/game/docs/expansion-architecture.md): hook kien truc da co
- [docs/expansion-roadmap.md](D:/game/docs/expansion-roadmap.md): roadmap expansion dai han
- [docs/playtest-guide.md](D:/game/docs/playtest-guide.md): huong dan test build hien tai
- [docs/deployment-notes.md](D:/game/docs/deployment-notes.md): note deploy public/static host
- [docs/pre-release-checklist.md](D:/game/docs/pre-release-checklist.md): checklist cuoi truoc khi share build

## Ghi chu contributor

- Doc `AGENTS.md` truoc
- Dung `docs/README.md` de chon dung source-of-truth cho task
- Neu cap nhat he thong hay scope, uu tien sua tai lieu nguon thay vi them note moi rong rai

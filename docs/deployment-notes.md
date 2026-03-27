# Deployment Notes

Tai lieu nay dung cho viec dua build hien tai len static host cong khai hoac semi-public.

## Kieu deploy khuyen nghi

- build tinh tu `vite build`
- deploy thu muc `dist/`
- khong can backend cho flow choi binh thuong

Host phu hop:
- Vercel
- Netlify
- Cloudflare Pages
- bat ky web server nao phuc vu static files

## Quy trinh de xuat

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. `npm run preview` de smoke test local
5. Deploy thu muc `dist/`

## Assumption hien tai

- Build duoc phuc vu o web root `/`
- Save dung `localStorage`, nen moi domain/subdomain se co save rieng
- Khong co server routing phuc tap; game la single-page static build
- Audio co the bi browser chan cho den khi nguoi choi tuong tac lan dau

## Neu deploy duoi subpath

Ban hien tai chua tu dong suy ra subpath deploy.
Neu can deploy duoi mot path nhu `/games/nhat-niem-khai-tong/`, hay cau hinh lai `base` cua Vite truoc khi build.

## Smoke test truoc khi chia se

- Trang mo ra co boot card thay vi trang trang
- Vao duoc menu chinh
- `Bat dau` / `Tiep tuc` / `Game moi` hoat dong
- Refresh trang giua session khong lam vo save hop le
- `Xuat save JSON` van tai duoc file
- `Xoa save hien tai` van dua game ve run sach
- Audio bi chan van khong can game

Neu can mot checklist day du va lap lai de phat hanh:
- xem [pre-release-checklist.md](D:/game/docs/pre-release-checklist.md)

## Caveat nen noi truoc

- mobile portrait chua phai target chinh
- da co fallback save backup, nhung chua co import save UI
- audio hien tai la cue procedural, khong phai bo asset cuoi
- build van con warning chunk size cua Vite, nhung build pass va chay duoc

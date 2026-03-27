# Pre-release Checklist

Dung checklist nay truoc khi chia se ban build cho tester ngoai hoac public nho.

## 1. Build

- `npm install`
- `npm run typecheck`
- `npm run build`
- `npm run preview`
- Xac nhan build label trong menu dung voi ban dinh chia se

## 2. Startup

- Mo build tren browser moi hoac tab an danh
- Xac nhan co boot card, khong co trang trang
- Xac nhan vao duoc menu chinh
- Xac nhan menu co:
  - `Bat dau` hoac `Tiep tuc`
  - `Game moi`
  - `Xoa save hien tai` hoac `Xoa du lieu save`
  - `Xuat save JSON`

## 3. Fresh-save smoke test

- Bat dau save moi
- Doc opening ngan
- Qua 1 ngay
- Xem 1 de tu
- Mo `Tu hanh`
- Dung hoac nang cap 1 cong trinh
- Giai 1 event
- Vao `Hau Son Coc`, roi tro ve voi phan thuong
- Mo `Tui do` hoac `Luyen dan`

## 4. Save / reload / reset

- `Luu game`
- Refresh trang
- `Tiep tuc` van vao dung state
- `Xoa save hien tai` / `Xoa du lieu save` dua game ve run sach
- `Xuat save JSON` van tai duoc file

## 5. Chapter / ending / replay sanity

- Xac nhan `Muc tieu chuong` van hien
- Neu dang co save sau:
  - vao duoc ending threshold hoac ending summary
  - `Ve menu` va `Tiep tuc save` hoat dong
  - `Hanh trinh moi` chi xuat hien sau khi da clear base game

## 6. Mobile-width sanity

- Mo build o viewport hep
- Xac nhan boot card va menu van doc duoc
- Xac nhan nut bam chinh van trong tam voi
- Xac nhan khong co panel/modal quan trong bi cat khoi man hinh trong flow dau

## 7. Known-issues review

- README da phan anh dung scope hien tai
- `docs/release-candidate-notes.md` va `docs/deployment-notes.md` khong noi qua scope
- Cac rough edges hien tai van duoc disclosed:
  - mobile portrait chua toi uu
  - audio la cue procedural
  - chua co import save
  - build van con warning chunk size

## 8. Bug report note

Neu build duoc gui cho tester, nhac ho ghi kem:
- build label
- chapter hien tai
- dang o fresh save hay continued save
- nut / panel / event vua thao tac
- desktop hay mobile browser

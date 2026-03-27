# Expansion Architecture

## Muc dich

Tai lieu nay khoa cac hook kien truc de noi base game pham gioi sang cac arc mo rong ve sau ma khong pha vo flow hien tai.
Day la tai lieu ve `nhung gi da duoc chuan bi trong code/save/data`.
No khong co nghia la cac arc mo rong da playable.

Doc cung:
- [README.md](D:/game/README.md)
- [expansion-roadmap.md](D:/game/docs/expansion-roadmap.md)

## Endpoint hien tai

- Base game hien tai ket o mach `base_game_pham_gioi`
- Chuong 1-4 va 3 ending van la mot san pham hoan chinh
- Sau ending, game khong mo noi dung moi ngay lap tuc
- Save chi danh dau cac hook continuation cho tuong lai

## Hook da duoc dat

### 1. Arc / world layer

- `story_chapters.json` co:
  - `worldLayers`
  - `arcs`
  - `arcId`
  - `worldLayerId`
- Base game hien tai dung:
  - `pham_gioi`
  - `base_game_pham_gioi`
- Arc tuong lai duoc dat moc:
  - `future_linh_gioi_arc`
  - `linh_gioi`

### 2. Save state

- `GameState.expansion` giu:
  - `currentWorldLayerId`
  - `currentArcId`
  - `completedBaseGame`
  - `completedArcIds`
  - `unlockedArcIds`
  - `availableContinuationHookIds`
  - `nextArcId`
  - `nextWorldLayerId`
  - `canContinueBeyondEnding`
- Muc dich:
  - tach `da hoan tat base game` khoi `da hoan tat toan bo noi dung`
  - luu duoc fallout sau ending ma khong can mo UI expansion ngay

### 3. Ending continuity

- `endings.json` co them:
  - `continuationHookIds`
  - `nextArcId`
  - `nextWorldLayerId`
- `EndingSystem` seed cac hook nay vao `expansion` khi ket thuc base game

### 4. Realm scaling

- `realms.json` co them:
  - `tierId`
  - `worldLayerId`
  - `implemented`
  - `nextRealmHintId`
  - `futureArcHint`
- `futureRealms` duoc dung lam moc du lieu, khong phai noi dung choi duoc
- Realm hien tai van dung logic base game; realm tuong lai chua bi lo trong flow thuong

## Nguyen tac cho arc mo rong sau nay

- Khong doi nghia `ending.completed` thanh `het game`; dung `expansion.completedBaseGame` va `nextArcId`
- Neu mo arc moi:
  - them chapter moi vao `story_chapters.json`
  - gan `arcId` va `worldLayerId` ro rang
  - mo UI continue-beyond-ending chi khi `canContinueBeyondEnding = true`
- Realm moi nen duoc them vao `realms.json` chi khi da co gameplay that su
- Hook text trong menu/ending scene phai giu tone: base game da tron ven, chan troi moi chi la loi hua

## Chua lam trong sprint nay

- khong co gameplay Hoa Than
- khong co Linh gioi playable
- khong co chapter hau ending
- khong co route-fallout campaign rieng theo tung ending
- khong co migration framework lon; hien tai van dung normalize/save-version pragmatically

## Khi bat dau mo rong that

- mo rong `ChapterId`/chapter progression neu so chapter vuot khoi base-game union hien tai
- quyet dinh xem `Hoa Than` con thuoc `pham_gioi` hay la nguong chuyen layer
- them UI `tiep dien sau ket` chi khi da co mot arc choi duoc dau tien
- xem lai `SectScene` va `MainMenuScene` de khong dong cung wording "base game" o cac flow mo rong

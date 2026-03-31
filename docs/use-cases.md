# Use Cases

Tai lieu nay tom tat cac use case chinh cua ban Early Access hien tai. Muc tieu la giup:
- agent moi nhanh hieu nguoi choi dang lam gi
- nguoi review nhanh kiem tra flow co mach lac khong
- future task bam dung vao playable loop, khong suy dien qua scope

Scope hien tai:
- base game pham gioi
- sect management + exploration + alchemy + cultivation
- replay nhe sau khi clear

## Use Case 1: Vao game lan dau

Muc tieu:
- nguoi choi mo game va vao duoc run dau tien ma khong bi roi

Flow:
1. Mo build web
2. Thay `Main Menu`
3. Bam `Bat dau` hoac `Game moi`
4. Vao `SectScene`
5. Doc opening ngan va bat dau ngay 1

Expected result:
- vao duoc game ma khong can save cu
- thay tong mon, tai nguyen, de tu, va action chinh

## Use Case 2: Quan ly tong mon co ban

Muc tieu:
- nguoi choi hieu tong mon la trung tam gameplay

Flow:
1. Vao `SectScene`
2. Xem overview tong mon
3. Chon de tu
4. Gan task cho de tu
5. Xem cong trinh va bonus noi mon
6. Qua ngay de thay thay doi

Expected result:
- thay de tu co task
- thay resource / nhip noi mon / tong luc thay doi

## Use Case 3: Di tham hiem lay nguyen lieu

Muc tieu:
- lay reward de nuoi inventory va alchemy

Flow:
1. Tu `SectScene`, vao `ExplorationScene`
2. Chon khu tham hiem
3. Danh / di chuyen / cham event spot
4. Hoan tat chuyen di
5. Tro ve tong mon

Expected result:
- nhan reward summary ro rang
- inventory co them herb / ore / material / loot

## Use Case 4: Mo tui do va kiem tra loot

Muc tieu:
- xac nhan reward da ve inventory va co the dung tiep

Flow:
1. Tu shell chinh, vao `InventoryScene`
2. Xem item grid
3. Kiem tra so luong, rarity, icon
4. Doc mo ta item / fallback note neu art tam

Expected result:
- item moi hien ro trong inventory
- fallback texture neu co van khong gay vo flow

## Use Case 5: Luyen dan

Muc tieu:
- bien nguyen lieu tham hiem thanh pill / artifact

Flow:
1. Tu shell chinh, mo `AlchemyPanel`
2. Chon recipe
3. Kiem tra nguyen lieu du hay khong
4. Craft

Expected result:
- recipe tieu hao dung inventory item
- thanh pham vao inventory
- UI cho thay craft thanh cong va item tao ra de lam gi

## Use Case 6: Dung pill de tang tu vi

Muc tieu:
- noi loop inventory -> cultivation

Flow:
1. Mo inventory
2. Dung pill tu hanh
3. Mo `CultivationPanel`
4. Kiem tra tien do canh gioi

Expected result:
- pill bi tieu hao
- tien do / trang thai tu hanh tang len

## Use Case 7: Dot pha canh gioi

Muc tieu:
- nguoi choi cam nhan duoc progression core

Flow:
1. Dat du tien do tu hanh
2. Bam `Dot pha` trong `CultivationPanel`
3. Neu co, xem `Thien Kiep`
4. Nhan ket qua success / partial / failure

Expected result:
- realm thay doi neu thanh cong
- neu that bai hoac partial thi co feedback ro

## Use Case 8: Linh thu ho tro hanh trinh

Muc tieu:
- linh thu la lop bo sung nhe, khong phai system tach roi

Flow:
1. Mo `BeastsScene`
2. Xem beast dang so huu
3. Nang cap hoac huan luyen
4. Quay lai tham hiem

Expected result:
- beast stats thay doi
- exploration bonus / support duoc hien ro

## Use Case 9: Save / Load / Settings

Muc tieu:
- nguoi choi co the quan ly phien choi an toan

Flow:
1. Tu `Main Menu`, vao `Load Game` hoac `Settings`
2. Trong game, nhan `Esc` de mo `System Menu`
3. Chon `Save / Load`
4. Ghi de, nap, tao moi, hoac xoa slot
5. Quay lai game hoac main menu

Expected result:
- khong bi chong panel
- save slot co du lieu tom tat ro
- settings luu duoc va quay lai duoc

## Use Case 10: Replay nhe sau khi clear

Muc tieu:
- khuyen khich thu route khac ma khong bien game thanh meta system nang

Flow:
1. Clear mot ending
2. Quay lai menu
3. Thay `Hanh trinh moi`
4. Bat dau run replay

Expected result:
- replay mo dung luc
- carryover chi o muc nhe
- khong pha vo base-game pacing

## Use Case 11: Vong choi doc dung cho demo

Muc tieu:
- day la flow nen test dau tien khi share build

Flow:
1. Bat dau game
2. Qua vai ngay
3. Gan task de tu
4. Di tham hiem
5. Loot nguyen lieu
6. Luyen dan
7. Dung pill
8. Tu hanh / dot pha
9. Luu game
10. Load lai

Expected result:
- toan bo loop chay thong
- khong can unlock system moi hay expansion content

## Ngoai scope

Nhung use case duoi day chua phai muc tieu hien tai:
- campaign hau ending sau pham gioi
- Linh gioi / Tien gioi gameplay
- beast breeding / gacha / combat system rieng
- sect war / grand diplomacy overhaul
- full import save / cloud save

# Playtest Guide

Tai lieu nay chi dung cho vong test build hien tai. Scope chi la base game pham gioi.

Doc truoc:
1. [README.md](D:/game/README.md)
2. [release-candidate-notes.md](D:/game/docs/release-candidate-notes.md) neu can tom tat ban chia se

## Build focus

Hay test 4 tru cot nay:
- nguoi moi co biet lam gi tiep theo khong
- event va reward co de hieu khong
- loop `sect -> event -> exploration -> reward -> cultivation` co mach lac khong
- save/load/reset co dang tin cho vong test lap lai khong

## Recommended first session

1. Bat dau tu menu bang `Bat dau` hoac `Game moi`
2. Doc opening ngan
3. Qua 1 ngay
4. Xem 1 de tu
5. Mo `Tu hanh`
6. Dung hoac nang cap 1 cong trinh
7. Giai 1 event
8. Vao `Hau Son Coc`, roi tro ve voi phan thuong
9. Mo `Tui do` hoac `Luyen dan` de kiem tra reward loop

## Neu muon test sau hon

- Theo `Muc tieu chuong` de day save toi Chuong 2-4
- Di den `Nguong Cua Ba Dao` de test 3 ending
- Sau khi clear, thu `Hanh trinh moi` de test replay nhe

## Feedback huu ich nhat

- Luc nao khong biet phai bam gi tiep
- Event nao doc xong van khong hieu he qua
- Reward nao nhan duoc nhung khong ro dung de lam gi
- Panel nao mo ra nhung khong ro dung cho viec gi
- Diem nao game cho cam giac bi ket, roi, hoac qua tai thong tin
- Bug nao lap lai duoc va xay ra sau buoc nao

Khi bao bug, them:
- build label
- chapter hien tai
- fresh save hay continued save
- desktop hay mobile browser

## Reset va repro

- `Ve menu`: quay lai menu chinh, giu save hien tai
- `Xoa save hien tai` / `Xoa du lieu save`: xoa ordinary run save va backup
- `Xuat save JSON`: tai save hien tai de gui kem mo ta loi hoac buoc tai hien
- Replay meta duoc giu rieng, nen reset run khong xoa ending da thay

## Known rough edges

- mobile portrait chua phai trai nghiem muc tieu
- combat/tham hiem van co y don gian de phuc vu loop tong mon
- nhieu panel van la HUD thong tin, chua phai UI cuoi
- audio hien tai la cue procedural nhe, chua phai bo asset am thanh cuoi
- ending la ket cuc cua base game hien tai, chua phai mo rong hau ket

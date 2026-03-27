# Naming Style

## Mục Đích
Tài liệu này chuẩn hóa cách đặt tên và viết text cho toàn dự án. Mục tiêu là để dữ liệu JSON, UI text, event text và lore text dùng cùng một giọng, không lệch sang màu kiếm hiệp sặc sỡ hoặc fantasy chung chung.

## Nguyên Tắc Chung
- Ưu tiên tên ngắn đến vừa, dễ nhớ, có hình rõ.
- Dùng Hán-Việt ở mức vừa phải: đủ tạo chất tu tiên, không biến câu thành văn biền ngẫu.
- Tên phải gợi chức năng, xuất thân, khí chất hoặc vị trí trong thế giới.
- Tránh tên nghe như game mobile phô trương hoặc truyện tiên hiệp parody.
- Mỗi hệ đối tượng nên có pattern riêng để người chơi nhìn tên là đoán được loại nội dung.

## Naming Rules By Type

### 1. Tông Môn
- Cấu trúc khuyến nghị:
  - `[Tính chất/biểu tượng] + [màu/khí/ý] + Môn`
  - `[địa danh/ý niệm] + Tông`
  - `[học phái/triết ý] + Phái`
- Nên nghe có truyền thừa, không nên nghe như băng nhóm.
- Ví dụ tốt:
  - `Thanh Huyền Môn`
  - `Huyền Minh Điện`
  - `Cửu Tiêu Quan`
- Ví dụ xấu:
  - `Thiên Hạ Vô Địch Bang`
  - `Long Bá Thiên Tông`
  - `Ma Thần Hủy Diệt Môn`
- Lý do thất bại:
  - phô trương rẻ tiền
  - nói thẳng sức mạnh thay vì gợi bản sắc
  - lệch tone tiết chế

### 2. Nhân Vật
- Tên người nên đọc tự nhiên bằng tiếng Việt Hán-Việt hóa nhẹ.
- Một số pattern hợp lệ:
  - họ + tên hai âm
  - đạo hiệu ngắn
  - chức vị + tên
- Ví dụ tốt:
  - `Tạ Minh Chu`
  - `Lục Thanh Trì`
  - `Hà Vân Mặc`
  - `Mặc sư thúc`
- Ví dụ xấu:
  - `Long傲天`
  - `Sát Thần Quân Vương`
  - `Băng Hỏa Lôi Điện Tử`
- Lý do thất bại:
  - quá meme, quá meta, hoặc ghép motif vô tội vạ

### 3. Công Pháp, Kỹ Pháp, Bí Thuật
- Nên gợi công năng hoặc triết lý, không nên nêu đủ mọi thuộc tính trong một tên.
- Cấu trúc khuyến nghị:
  - `[ý/khí/tượng] + quyết`
  - `[động tác/trạng thái] + ấn`
  - `[hình tượng] + pháp`
  - `[địa danh/đạo ý] + kinh`
- Ví dụ tốt:
  - `Thanh Tức Quyết`
  - `Tĩnh Tâm Ấn`
  - `Huyền Mộc Pháp`
  - `Khai Trần Kinh`
- Ví dụ xấu:
  - `Cửu Thiên Thập Địa Vô Thượng Diệt Thần Quyết`
  - `Lôi Hỏa Băng Độc Song Long Hợp Kích`
- Lý do thất bại:
  - quá dài
  - khoe hiệu ứng thay vì bản chất
  - khó đưa vào UI

### 4. Pháp Khí, Di Vật, Artifact
- Tên nên có cảm giác vật thật, có lai lịch, không chỉ là item hiếm.
- Cấu trúc khuyến nghị:
  - `[vật] + [ý niệm/tính chất]`
  - `[ý niệm] + [vật]`
- Ví dụ tốt:
  - `Vạn Tượng Linh Kính`
  - `Túc Mệnh Đăng`
  - `Trấn Mạch Bàn`
- Ví dụ xấu:
  - `Thần Cấp SSR Cổ Kính`
  - `Vô Hạn Sáng Thế Thần Bảo`
- Lý do thất bại:
  - meta game hóa
  - mất chất thế giới nội tại

### 5. Địa Danh
- Địa danh nên gắn địa hình hoặc dấu tích hậu tai biến.
- Ví dụ tốt:
  - `Thanh Huyền Sơn`
  - `Khuyết Vân Cốc`
  - `Tàn Mạch Nguyên`
  - `Kính Hà`
- Ví dụ xấu:
  - `Map 7`
  - `Thiên Đường Bất Tử`
  - `Địa Ngục Vĩnh Cửu`
- Lý do thất bại:
  - chung chung
  - không có chất địa lý cụ thể

### 6. Kiến Trúc, Công Trình
- Tên công trình phải giúp UI hiểu ngay chức năng.
- Cấu trúc khuyến nghị:
  - `[chức năng] + điện/đường/các/khố/viện`
- Ví dụ tốt:
  - `Chính Điện`
  - `Tĩnh Tu Đường`
  - `Dược Viên`
  - `Tàng Kinh Các`
- Ví dụ xấu:
  - `Siêu Điện Max`
  - `Nhà Farm VIP`
- Lý do thất bại:
  - lệch tone và thiếu nghiêm túc nội tại

### 7. Tên Event
- Nên gọn, gợi hình, có vật hoặc dấu hiệu cụ thể.
- Thường dài 3-6 từ.
- Ví dụ tốt:
  - `Tro Mỏng Trước Sơn Môn`
  - `Chuông Rạn Giờ Dần`
  - `Khách Đêm Từ Hắc Sa`
- Ví dụ xấu:
  - `Một Chuyện Rất Bí Ẩn Xảy Ra`
  - `Event Siêu Khủng`
  - `Thiên Tai Vô Cùng Kinh Hoàng`
- Lý do thất bại:
  - vô hình ảnh
  - không dùng được như nhan đề modal

## Vietnamese Writing Style Guidelines
- Câu chính nên thẳng, ít đảo.
- Ưu tiên động từ cụ thể: `mở`, `đóng`, `giữ`, `ép`, `dò`, `soi`, `khuyết`.
- Hạn chế dấu chấm than.
- Hạn chế ẩn dụ nếu nó làm mờ nghĩa gameplay.
- Trong text hiển thị, một câu nên giữ dưới khoảng 25 từ nếu không phải lore đoạn dài.
- Khi viết mô tả hệ quả, dùng ngôn ngữ nhìn được hậu quả chứ không chỉ cảm xúc.

## Recommended Level Of Hán-Việt Usage
- Khoảng `60-70%` từ khóa trọng tâm nên mang sắc Hán-Việt.
- Phần còn lại nên là tiếng Việt tự nhiên để đọc nhanh trên UI.
- Mục tiêu:
  - tên gọi nghe đúng chất tu tiên
  - phần thân câu vẫn rõ, không nặng giải mã

## Good Name Examples
- Tông môn: `Thanh Huyền Môn`, `Huyền Minh Điện`, `Vân Tàng Thư Viện`
- Nhân vật: `Tạ Minh Chu`, `Lục Thanh Trì`, `Doãn Kính An`
- Công pháp: `Dưỡng Mạch Quyết`, `Trấn Tâm Ấn`, `Tụ Linh Pháp`
- Pháp khí: `Túc Mệnh Đăng`, `Hộ Sơn Bàn`, `Vạn Tượng Linh Kính`
- Địa danh: `Khuyết Vân Cốc`, `Tàn Mạch Nguyên`, `Kính Hà`
- Event: `Giếng Linh Đục Khí`, `Kho Lương Vơi Dấu`, `Mặt Kính Loang Một Vệt Máu`

## Bad Name Examples And Why
- `Thiên Hạ Đệ Nhất Tông`: sáo, phô, không có bản sắc riêng.
- `Lôi Hỏa Băng Ám Quang Minh Thần Công`: tham thuộc tính, không thể nhớ.
- `Đế Thần Ma Vương`: chỉ khoe ngầu, không có vị trí xã hội hay văn hóa.
- `Map Rừng Bí Ẩn`: placeholder lộ liễu, không phải tên thế giới.
- `Sự Kiện Siêu Hot`: phá tone hoàn toàn.

## Glossary Of Approved Tone Words
- `u tĩnh`
- `khuyết`
- `rạn`
- `lắng`
- `huyền`
- `tàn`
- `kín`
- `đè nặng`
- `dư vang`
- `vô thanh`
- `lệch pha`
- `gượng ổn`
- `bền`
- `giữ`
- `trấn`

## UI Text Style Vs Lore Text Style Vs Event Text Style

### UI Text Style
- Ngắn, rõ, ưu tiên chức năng.
- Dùng từ quen thuộc hơn.
- Ví dụ:
  - `Mở kho lương`
  - `Thiếu linh thạch`
  - `Uy danh tăng`

### Lore Text Style
- Có thể dài hơn, nhưng vẫn phải rõ ý.
- Dùng nhiều Hán-Việt hơn UI.
- Mỗi đoạn nên chứa ít nhất một thông tin lịch sử, phe phái, hoặc pháp tắc.

### Event Text Style
- Nằm giữa UI và lore.
- Dòng đầu gợi hình cụ thể.
- Dòng sau chốt tình thế để người chơi chọn.
- Không biến event modal thành truyện ngắn.

## Naming Consistency Rules For Future Data
- Một khái niệm chỉ dùng một tên chuẩn trong dữ liệu.
- Nếu có biệt danh, phải chỉ rõ cái nào là tên chuẩn để code dùng.
- Tên trong UI nên khớp tên trong data, không tự đổi thơ hóa ở từng nơi.
- Khi thêm phe, địa danh, công trình mới, phải kiểm tra xem nó có cùng trường ngôn ngữ với các tên cũ không.

## Implications For Implementation
- Nên có `canonical_name`, `short_name`, `ui_label` cho các thực thể quan trọng nếu cần rút gọn.
- Future agents sinh JSON event hoặc localization phải kiểm tra tên mới theo pattern đã khóa ở đây.
- UI nên ưu tiên nhãn ngắn, còn text lore/event có thể dùng tên đầy đủ nhưng không được đổi khác chuẩn dữ liệu.

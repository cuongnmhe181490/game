# Event Rules

## Mục Đích
Tài liệu này quy định cách thiết kế event cho `Nhất Niệm Khai Tông` theo hướng dùng được ngay cho JSON data, state flags và UI modal. Event trong game phải làm rõ áp lực của việc giữ tông môn, không được chỉ là đoạn văn trang trí.

Doc cung:
- [chapters.md](D:/game/docs/chapters.md)
- [naming-style.md](D:/game/docs/naming-style.md)
- [world-lore.md](D:/game/docs/world-lore.md)

Noi thuong them content:
- `src/game/data/events_random.json`
- `src/game/data/events_major.json`

## Ba Loại Event

### 1. Fixed Major Events
- Là event cốt truyện lớn, có vị trí cố định trong chapter spine.
- Không dùng weighted random selection thông thường.
- Có điều kiện mở khóa rõ.
- Thường tạo hoặc giải quyết chapter flag quan trọng.
- Ví dụ: phản ứng then chốt của `Vạn Tượng Linh Kính`, đối đầu với phe lớn, reveal về `Thiên Khư Biến`.

### 2. Weighted Random Events
- Là event bán-ngẫu nhiên, phụ thuộc state hiện tại.
- Dùng trọng số, tag và điều kiện.
- Có thể lặp dạng chủ đề nhưng không lặp đúng nội dung quá gần nhau.
- Là lớp nội dung nuôi cảm giác thế giới sống theo trạng thái tông môn.

### 3. Flavor Events
- Là event nhẹ, ít hoặc không có lựa chọn lớn.
- Mục đích: làm đầy nhịp sinh hoạt nội môn, tạo màu thế giới, chuẩn bị cảm xúc.
- Không nên chiếm tỷ trọng quá cao.
- Không được mâu thuẫn chapter, phe phái hay chân tướng đã biết.

## Canonical Implementation Categories
- `resource`: kho lương, linh thạch, dược liệu, vật tư, hao hụt, thu hoạch.
- `maintenance`: công trình, đường núi, pháp trận, sửa chữa, xuống cấp.
- `discipline`: đệ tử, chấp sự, trực đêm, nội quy, bất đồng nội môn.
- `trade`: giao dịch, thương lộ, giá cả, vật tư từ bên ngoài.
- `court`: chính trị nội môn hoặc đối ngoại ở cấp quyết định/quyền uy.
- `omen`: dị tượng, điềm báo, thiên tượng, phản ứng từ linh kính.
- `ritual`: nghi lễ, tế cáo, bế quan, khai đàn, thử pháp.

Không tự thêm category mới nếu chưa thật cần. Nếu cần nhóm nội dung mới, ưu tiên gắn thêm `tags` thay vì mở rộng enum category.

## Event Trigger Philosophy
- Event phải là kết quả của state, không phải kết quả tung xúc xắc thuần túy.
- Chọn event theo logic “bây giờ tông môn này dễ gặp chuyện gì nhất”.
- Nếu player đang thiếu lương, event về lương thực phải tăng xác suất.
- Nếu đang bị một phe chú ý, event liên quan phe đó phải chen vào nhịp chơi.
- Event tốt không chỉ hỏi “có gì xảy ra”, mà hỏi “vì sao nó xảy ra lúc này”.

## Các Trục Phụ Thuộc Bắt Buộc

### Chapter
- Là bộ lọc cứng đầu tiên.
- Event reveal sâu không được vào chương sớm.
- Event thường nhật nên đổi tông theo chương.

### Sect Strength
- Dùng các chỉ số như uy danh, cấp công trình, số đệ tử, trữ lượng tài nguyên.
- Tông môn yếu nên gặp áp lực sống sót, sửa chữa, nghi ngờ nội bộ.
- Tông môn mạnh nên gặp chính trị, mặc cả, tranh đoạt, dị tượng cấp cao.

#### Suggested Strength Buckets
- `fragile`: `prestige < 15` hoặc thiếu ít nhất 2 tài nguyên lõi.
- `stable`: `prestige 15-39`, có nhịp vận hành cơ bản.
- `rising`: `prestige 40-64`, có thể gánh event phe phái nặng.
- `dominant`: `prestige >= 65`, phù hợp event cuối chương và event định đạo.

### Disciple Traits
- Event liên quan nhân sự phải xét trait hoặc vai trò đệ tử.
- Ví dụ trait phù hợp: `cẩn trọng`, `hiếu thắng`, `đa nghi`, `trung hậu`, `tham công`, `ưa dị học`.
- Không viết event “đệ tử bất kỳ” nếu gameplay sau này cần nhân quả theo nhân sự.

### Faction Relations
- Quan hệ phe phái phải tác động rõ lên pool event.
- Quan hệ tốt mở event thương lượng, hỗ trợ, đề nghị liên minh.
- Quan hệ xấu mở event gây sức ép, dò xét, ngáng đường, bôi uy danh.

### Current Resources
- Là bộ lọc thực dụng nhất.
- Tài nguyên thiếu phải sinh áp lực tương ứng.
- Tài nguyên dồi dào có thể mở cơ hội đầu tư, nhưng cũng kéo theo dòm ngó.

#### Suggested Resource Pressure Rules
- `food < 20`: tăng mạnh event thiếu ăn, kỷ luật, xin mở kho.
- `wood < 15`: tăng event sửa chữa trì hoãn, đường núi hỏng, công trình xuống cấp.
- `spiritStone < 30`: giảm xác suất event nghi lễ lợi lớn, tăng event mặc cả bất lợi.
- `herbs < 10`: tăng event bệnh nhẹ, dược điền, xin dùng dược khẩn.

### Previous Choices And Flags
- Event phải biết người chơi đã làm gì.
- Flag về đạo lộ, phe phái, dị tượng, quyết định trước đây phải ảnh hưởng chọn event.
- Nếu không dùng flag, game sẽ nhanh chóng thành lặp vô nghĩa.

## Event Text Style Rules
- Mở đầu bằng một tình huống cụ thể, không kể lan man.
- 1 event modal chuẩn nên có:
  - 1 đoạn mô tả tình huống
  - 0-1 câu nhấn hệ quả hoặc không khí
  - 2-4 lựa chọn
- Tránh viết “văn bia”, tránh mở đầu bằng các câu quá kêu.
- Tông văn: huyền bí, tiết chế, dễ hiểu, hơi nặng khí hậu sau đại nạn.
- Không dùng tiếng lóng hiện đại, nhưng cũng không viết cổ văn dày đặc.

## Event Choice Design Rules
- Mỗi lựa chọn phải phản ánh một lập trường quản trị hoặc đạo lộ.
- Lựa chọn phải đọc là hiểu khác nhau ở đâu.
- Không tạo 3 lựa chọn chỉ khác con số thưởng/phạt.
- Nhóm mẫu thường dùng:
  - `giữ ổn định`
  - `đánh đổi tài nguyên lấy uy tín`
  - `liều lĩnh lấy lợi lớn`
  - `tránh va chạm nhưng để lại hệ quả`
- Không nên có “lựa chọn đúng tuyệt đối” xuất hiện liên tục.

## Consequence Design Rules
- Hệ quả nên là tổ hợp 2-3 lớp thay vì một con số đơn.
- Các lớp hệ quả ưu tiên:
  - tài nguyên
  - uy danh tông môn
  - quan hệ phe phái
  - flag cốt truyện
  - nguy cơ mở event tiếp theo
- Với event thường nhật, hệ quả nên vừa đủ để đáng kể nhưng không phá game.
- Với fixed major events, hệ quả có thể đổi chapter state hoặc kết hướng đạo lộ.

## Tần Suất Và Chống Lặp
- Một event cụ thể phải có cooldown.
- Một nhóm tag event cũng nên có soft cooldown để tránh 5 event liền đều về thiếu lương.
- Nếu một lựa chọn đã bị dùng quá gần, ưu tiên đẩy sang loại event khác.
- Event flavor không được chen lấp event hệ thống khi người chơi đang khủng hoảng tài nguyên hay đứng trước mốc chapter.

## Trigger Evaluation Order
1. Lọc theo `chapter`.
2. Lọc theo `requiredFlags` và `forbiddenFlags`.
3. Lọc theo `sect strength bucket`.
4. Lọc theo `resource pressure`.
5. Lọc theo `faction relation`.
6. Lọc theo `disciple traits` hoặc `disciple roles` nếu event cần người cụ thể.
7. Áp cooldown event và soft cooldown category/tag.
8. Mới áp trọng số để chọn event.

Nếu event không qua được bước nào ở trên, không được “cố ép” vào pool chỉ để đủ số lượng.

## Mẫu Cấu Trúc JSON-like

```json
{
  "id": "grain_store_shortage",
  "type": "weighted_random",
  "chapter": 1,
  "category": "resource",
  "weight": 12,
  "cooldownDays": 3,
  "triggers": {
    "minDay": 2,
    "maxSectPrestige": 20,
    "resourceBelow": {
      "food": 40
    },
    "requiredFlags": [],
    "forbiddenFlags": ["chapter_2_started"]
  },
  "text": {
    "title": "Kho Lương Vơi Dấu",
    "body": "Chấp sự kho báo số thóc hụt không lớn, nhưng sổ và bao lương không còn khớp nhau."
  },
  "choices": [
    {
      "id": "audit_publicly",
      "label": "Kiểm kho công khai",
      "effects": {
        "resources": { "food": -5 },
        "sectPrestige": 1,
        "flagsAdd": ["storehouse_audited"]
      }
    }
  ]
}
```

## Recommended Event Data Shape

```json
{
  "id": "ash_at_the_gate",
  "type": "weighted_random",
  "chapter": 1,
  "category": "omen",
  "tags": ["sect", "mirror", "morning"],
  "weight": 10,
  "cooldownDays": 2,
  "priority": 0,
  "triggers": {
    "requiredFlags": [],
    "forbiddenFlags": [],
    "minPrestige": 0,
    "maxPrestige": 20,
    "resourceBelow": {},
    "resourceAbove": {},
    "requiredFactionStates": [],
    "requiredDiscipleTraits": []
  },
  "text": {
    "title": "Tro Mỏng Trước Sơn Môn",
    "body": "Một lớp tro mỏng đọng trước cổng ngoài trước khi trời sáng hẳn."
  },
  "choices": [
    {
      "id": "seal_gate",
      "label": "Đóng cổng, đốt hương trấn môn",
      "effects": {
        "resources": { "spiritStone": -5 },
        "sectPrestige": 1,
        "flagsAdd": ["ash_omen_sealed"],
        "queueEvents": [],
        "advanceDays": 0
      }
    }
  ]
}
```

```json
{
  "id": "mirror_reveals_ascension_trace",
  "type": "fixed_major",
  "chapter": 3,
  "triggers": {
    "requiredFlags": ["mirror_second_resonance", "faction_archive_open"],
    "sectPrestigeAtLeast": 45
  },
  "text": {
    "title": "Kính Chiếu Thiên Khư",
    "body": "Trong mặt kính hiện ra không phải điềm trời, mà là hình người đang cưỡng ép mở đường vượt giới."
  },
  "choices": [
    {
      "id": "seal_truth",
      "label": "Niêm phong chân tướng",
      "effects": {
        "flagsAdd": ["truth_sealed"],
        "factionRelation": { "Huyền Minh Điện": 1, "Cửu Tiêu Quan": -2 }
      }
    }
  ]
}
```

## 20 Ý Tưởng Event Mẫu

### Resource
1. `Kho Lương Vơi Dấu`: hụt lương nhỏ, chọn điều tra hay che lại.
2. `Giếng Linh Đục Khí`: nước linh đục, cần lọc hay tạm đóng khu giếng.
3. `Mộc Liêu Mục Rỗng`: gỗ dự trữ bị mục, phải thay hay tận dụng.
4. `Dược Điền Nhiễm Sương`: luống dược bị sương dị bám, xử lý gấp hay chờ quan sát.

### Sect Management
5. `Đệ Tử Trực Đêm Trễ Kỳ`: xử phạt, nhắc nhở, hay đổi ca.
6. `Chấp Sự Xin Mở Kho`: cho quyền linh hoạt hay siết quy trình.
7. `Điện Trưởng Lão Im Đèn`: một vị trưởng lão đóng cửa nhiều ngày, nên gõ cửa hay bỏ qua.
8. `Danh Bạ Nội Môn Sai Một Dòng`: lỗi nhỏ trong ghi chép gợi nghi vấn người chỉnh sửa hồ sơ.

### Faction And Diplomacy
9. `Sứ Giả Huyền Minh Ghé Núi`: họ đến thăm hỏi hay dò xét.
10. `Thương Xa Xích Luyện Trễ Hẹn`: ép giá, giữ quan hệ, hay hủy giao dịch.
11. `Người Đưa Bản Sao Cổ Lục`: Vân Tàng Thư Viện cho mồi thông tin.
12. `Khách Đêm Từ Hắc Sa`: đề nghị hàng hiếm với điều kiện mờ ám.

### Omen And Mystery
13. `Tro Mỏng Trước Sơn Môn`: dấu dị tượng đầu ngày.
14. `Tiếng Chuông Không Người Gõ`: công trình phản ứng với linh khí lệch.
15. `Mặt Kính Loang Một Vệt Máu`: Vạn Tượng Linh Kính tự hiện hình ảnh khó hiểu.
16. `Sao Tàn Không Bóng`: thiên tượng xuất hiện rồi biến mất như bị xóa.

### Disciple-Driven
17. `Đệ Tử Xin Học Dị Pháp`: mở đường mới hay cấm từ đầu.
18. `Hai Người Tranh Một Chỗ Trực`: chuyện nhỏ nhưng lộ tính cách và ảnh hưởng kỷ luật.
19. `Kẻ Mới Nhập Môn Biết Quá Nhiều`: gốc gác đáng nghi nhưng năng lực hữu dụng.
20. `Người Cũ Xin Xuống Núi`: giữ lại, cho đi, hay giao nhiệm vụ thử lòng.

## Guidance On Avoiding Repetition
- Không dùng cùng một cấu trúc “một người tới, xin X, chọn 3 nút” quá nhiều lần.
- Xen nhịp giữa:
  - sự cố nội bộ
  - dị tượng
  - ngoại giao
  - tài nguyên
  - nhân sự
- Nếu event cùng category lặp, phải đổi ít nhất một trong các thứ:
  - nguyên nhân
  - tác nhân
  - mức độ rủi ro
  - loại hệ quả
- Một event không được phá lore đã khóa:
  - không để người dân thường biết hết chân tướng Thiên Khư Biến quá sớm
  - không để Thanh Huyền Môn đột nhiên có quân lực vượt phe lớn ở giai đoạn đầu
  - không để event thường nhật giải quyết bí mật lớn một cách dễ dãi

## Checklist Trước Khi Thêm Event Mới
- Nó thuộc loại nào: fixed, weighted, hay flavor?
- Nó phụ thuộc state nào?
- Nó có tạo quyết định quản trị thật hay chỉ là flavor trá hình?
- Nó có đụng chapter gate hoặc lore gate nào không?
- Hệ quả có đủ cụ thể để code và test không?

## Implications For Implementation
- JSON schema event nên có `type`, `chapter`, `category`, `weight`, `cooldown`, `triggers`, `choices`, `effects`.
- Event runtime cần lưu `history`, `last_seen_by_category`, `recent_flags_used` để chống lặp tốt hơn.
- Future agents viết event phải map mỗi event vào ít nhất một `state dependency` cụ thể, không viết event “đẹp câu chữ nhưng vô hệ thống”.

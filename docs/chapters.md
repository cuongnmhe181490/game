# Chapters

## Mục Đích Tài Liệu
Tài liệu này khóa cấu trúc tiến trình từ `Chương 1` đến `Chương 4`, dùng làm chuẩn cho:
- chapter flags
- unlock conditions
- fixed story events
- weighted random event pools
- escalation của bí mật `Thiên Khư Biến`

Doc cung:
- [story-bible.md](D:/game/docs/story-bible.md)
- [world-lore.md](D:/game/docs/world-lore.md)
- [event-rules.md](D:/game/docs/event-rules.md)

Noi thuong them chapter content:
- `src/game/data/story_chapters.json`
- `src/game/data/events_major.json`
- `src/game/data/events_random.json`

## Chương 1: Dư Tàn Khai Sơn

### Emotional Goal
Người chơi phải cảm thấy `thiếu`, `mong manh`, nhưng vẫn nhìn thấy khả năng dựng lại nền móng.

### Player Progression Goal
- Ổn định chu kỳ ngày đầu.
- Sửa các công trình cốt lõi của sơn môn.
- Có nguồn lương, gỗ, linh thạch tối thiểu.
- Thiết lập nhóm đệ tử nòng cốt đầu tiên.

### Major Fixed Events
- Tiếp quản tàn tích Thanh Huyền Môn.
- Kích hoạt phản ứng đầu tiên của `Vạn Tượng Linh Kính`.
- Xử lý khủng hoảng thiếu vật tư khởi đầu.
- Gặp dấu hiệu đầu tiên cho thấy dị tượng quanh sơn môn không bình thường.

### Unlock Conditions
- Hoàn thành công trình nền tảng tối thiểu.
- Sống sót qua số ngày mở đầu được chỉ định.
- Đạt ngưỡng ổn định tài nguyên cơ bản.
- Kích hoạt ít nhất một lần soi chiếu từ `Vạn Tượng Linh Kính`.

### Suggested Implementation Gates
- `chapter_1_start` bật ngay khi bắt đầu save mới.
- `chapter_1_complete` khi thỏa tối thiểu:
  - `realm.day >= 8`
  - `sect.buildings.mainHall >= 1`
  - `sect.buildings.meditationHall >= 1`
  - `resources.food >= 25`
  - `resources.wood >= 15`
  - `resources.spiritStone >= 40`
  - `disciples.count >= 3`
  - cờ `mirror_first_resonance = true`
- Không cho vào chương 2 nếu tông môn vẫn ở trạng thái thiếu ăn kéo dài hoặc chưa giữ được nhịp vận hành cơ bản.

### Recommended Random Event Categories
- Thiếu hụt tài nguyên
- Kỷ luật nội môn
- Dị tượng nhẹ
- Sửa chữa công trình
- Đệ tử sơ khởi

### Boss Or Conflict Focus
- Không cần boss theo nghĩa chiến đấu lớn.
- Xung đột chính là `sống sót`, `thiếu nguồn`, `giữ kỷ cương`.
- Nếu có đối đầu, nên là nguy cơ cục bộ: thú lạ, người lạ dò xét, tàn dư dị tượng.

### Thiên Khư Biến Escalation
- Chỉ lộ ở mức “đại nạn còn để lại vết thương sống”.
- Người chơi mới biết rằng dị tượng quanh sơn môn có mô thức, không phải ngẫu nhiên hoàn toàn.

## Chương 2: Tông Môn Lập Thế

### Emotional Goal
Từ tự giữ mạng chuyển sang `dám đứng ra`, nhưng phải trả giá vì bị thế lực khác nhìn thấy.

### Player Progression Goal
- Mở rộng quy mô tông môn.
- Thiết lập quan hệ đầu tiên với các phe lớn.
- Có năng lực xử lý event chứ không chỉ chống đỡ.
- Bắt đầu định hình phong cách cai quản của người chơi.

### Major Fixed Events
- Đón tiếp sứ giả hoặc thương lộ đầu tiên.
- Xảy ra tranh chấp về danh phận hoặc quyền chiếm hữu tài nguyên.
- `Vạn Tượng Linh Kính` phản chiếu mảnh ký ức không khớp với lịch sử công khai.
- Người chơi buộc chọn cách ứng xử với một phe lớn.

### Unlock Conditions
- Đạt ngưỡng uy danh hoặc kiến trúc tông môn.
- Có đủ đệ tử và công trình để vận hành mở rộng.
- Hoàn thành các cờ chương 1 về ổn định nội môn.

### Suggested Implementation Gates
- `chapter_2_start` khi `chapter_1_complete = true`.
- `chapter_2_complete` khi thỏa tối thiểu:
  - `sect.prestige >= 18`
  - `disciples.count >= 6`
  - tổng cấp công trình chính `>= 5`
  - đã gặp ít nhất `2` phe lớn qua fixed event hoặc relation event
  - cờ `mirror_history_conflict = true`
  - cờ `first_faction_stance_chosen = true`
- Chương 2 là giai đoạn mở thế. Nếu chỉ số tài nguyên cao nhưng chưa có va chạm phe phái, vẫn chưa nên sang chương 3.

### Recommended Random Event Categories
- Giao thương
- Sứ giả phe phái
- Tranh chấp nhỏ
- Dị tượng có người chứng kiến
- Khen thưởng/kỷ luật đệ tử

### Boss Or Conflict Focus
- Trọng tâm là `áp lực bên ngoài` hơn là sinh vật mạnh.
- Đối thủ phù hợp: thủ lĩnh nhóm cướp linh tài, chấp sự phe khác, đại diện thế lực thử phản ứng.

### Thiên Khư Biến Escalation
- Xuất hiện nghi ngờ rằng có bàn tay người can dự vào đại nạn.
- Một số tư liệu mâu thuẫn bắt đầu trỏ tới “phi thăng” như nguyên nhân cấm nói.

## Chương 3: Kính Chiếu Cựu Thiên

### Emotional Goal
Người chơi phải cảm thấy `đã đủ mạnh để chạm sự thật`, nhưng càng biết càng khó quay đầu.

### Player Progression Goal
- Mở các chức năng sâu hơn của `Vạn Tượng Linh Kính`.
- Xử lý hệ quả chính trị khi nắm thông tin nguy hiểm.
- Tối ưu nhịp tài nguyên để chịu được các event lớn và quyết định tầm cao.

### Major Fixed Events
- Kính chiếu ra mảnh quá khứ trực tiếp liên quan tới một nghi lễ phi thăng thất bại.
- Một phe lớn tìm cách ép hợp tác, mua chuộc hoặc tước đoạt thông tin.
- Xảy ra biến cố khiến nội bộ Thanh Huyền Môn phải chọn giữa an toàn và đào sâu chân tướng.
- Một khu vực hoặc cấm địa mở lối vì cộng hưởng với linh kính.

### Unlock Conditions
- Quan hệ với ít nhất một phe đạt ngưỡng mở cốt truyện.
- Hoàn thành số lần hoặc số tầng soi chiếu từ linh kính.
- Đạt sức mạnh tông môn đủ chống chịu event hậu quả nặng.

### Suggested Implementation Gates
- `chapter_3_start` khi `chapter_2_complete = true`.
- `chapter_3_complete` khi thỏa tối thiểu:
  - `sect.prestige >= 40`
  - `disciples.count >= 10`
  - đã mở `mirror_second_resonance`
  - đã giải `1` tuyến archive hoặc witness liên quan `Thiên Khư Biến`
  - quan hệ với ít nhất `1` phe ở mức `trusted` hoặc `hostile`
  - cờ `ascension_trace_confirmed = true`
- Không cho sang chương 4 nếu người chơi mới chỉ “nghe đồn” mà chưa có bằng chứng trực tiếp từ linh kính hoặc nguồn tri thức tương đương.

### Recommended Random Event Categories
- Dị tượng cấp cao
- Phe phái mặc cả
- Nội môn bất đồng
- Cổ vật, thư tịch, nhân chứng
- Rò rỉ thông tin

### Boss Or Conflict Focus
- Xung đột trọng điểm là `ai được chạm sự thật`.
- Boss phù hợp: hộ pháp phe khác, kẻ giữ bí mật, thực thể dị hóa do hậu quả Thiên Khư Biến.

### Thiên Khư Biến Escalation
- Xác nhận rõ ràng đây không phải thiên tai thuần túy.
- Lộ ra khái niệm `cưỡng hành phi thăng` như nguyên nhân cốt lõi, nhưng chưa đủ để biết ai chủ mưu cuối.

## Chương 4: Nhất Niệm Định Đạo

### Emotional Goal
`Quyết định cuối cùng phải có trọng lượng`: người chơi hiểu cái giá của đạo lộ mình chọn.

### Player Progression Goal
- Hoàn thiện bản sắc Thanh Huyền Môn.
- Chốt lập trường với các phe lớn.
- Mở và đi hết một trong ba hướng kết thúc.

### Major Fixed Events
- Đối diện trực tiếp với chân tướng hoàn chỉnh của `Thiên Khư Biến`.
- Xung đột quyết định với phe hoặc lực lượng giữ chìa khóa cuối.
- Kích hoạt quyết nghị cuối liên quan tới `Vạn Tượng Linh Kính`.
- Kết giới hoặc trật tự mới được xác lập theo hướng người chơi chọn.

### Unlock Conditions
- Hoàn thành tuyến reveal của linh kính.
- Có đủ cờ lựa chọn nghiêng về một trong ba đạo lộ kết.
- Đạt ngưỡng tông môn có thể gánh hệ quả cuối.

### Suggested Implementation Gates
- `chapter_4_start` khi `chapter_3_complete = true`.
- Trước khi mở nhánh kết, phải chốt đủ cả:
  - `sect.prestige >= 65`
  - tổng cấp công trình chính `>= 9`
  - đã hoàn tất `final_mirror_revelation`
  - có `ending_alignment` đạt ít nhất `3` điểm nghiêng về một trục:
    - `orthodox_alignment`
    - `dominion_alignment`
    - `outsider_alignment`
- Ba ending không nên chỉ mở bằng một lựa chọn cuối. Chúng phải là kết quả của tích lũy flag và quyết định xuyên suốt chương 2-4.

### Recommended Random Event Categories
- Trung thành/phản bội
- Dị tượng cực hạn
- Đề nghị liên minh cuối
- Event chuẩn bị chiến lược
- Event nhân tâm nội môn

### Boss Or Conflict Focus
- Không nhất thiết chỉ là một boss vật lý.
- Xung đột cuối có thể là phe đối địch, nghi lễ, thực thể sinh ra từ phản chấn thiên địa, hoặc một bài toán chọn đạo lộ.
- Encounter cuối phải phản ánh triết lý người chơi, không chỉ chỉ số.

### Thiên Khư Biến Escalation
- Chân tướng được ghép hoàn chỉnh.
- Người chơi hiểu vì sao đạo cũ thất bại và phải chọn: phục hồi, thống trị, hay mở đạo mới.

## Escalation Rules Across Chapters
- Chương 1 cho dấu hiệu.
- Chương 2 cho nghi vấn có chủ ý.
- Chương 3 cho bằng chứng về cưỡng hành phi thăng.
- Chương 4 buộc người chơi đưa ra đáp án.

## Chapter Data Rules
- Mỗi chapter cần có `unlock_flags`, `required_state_thresholds`, `fixed_event_ids`, `random_event_pool_tags`.
- Random event pool không được dùng chung hoàn toàn giữa các chương.
- Event đã biết chân tướng sâu không được xuất hiện ở chương sớm dưới dạng đầy đủ.

## Recommended Chapter Data Shape

```json
{
  "chapter": 2,
  "id": "tong_mon_lap_the",
  "requiredFlags": ["chapter_1_complete"],
  "requiredStateThresholds": {
    "prestige": 18,
    "disciples": 6,
    "mainHallLevel": 2,
    "meditationHallLevel": 2
  },
  "requiredStoryFlags": [
    "mirror_first_resonance",
    "first_faction_stance_chosen"
  ],
  "fixedEventIds": [
    "envoy_at_the_gate",
    "mirror_history_conflict"
  ],
  "randomEventPoolTags": [
    "chapter2_trade",
    "chapter2_faction",
    "chapter2_internal_discipline"
  ]
}
```

## Implications For Implementation
- Hệ chapter nên là state machine đơn giản với điều kiện rõ, không phụ thuộc cutscene dài.
- Mỗi chapter cần pool event ưu tiên riêng để tránh cảm giác game đứng yên dù state đã tăng.
- Boss/conflict data nên lưu dưới dạng `encounter focus` thay vì mặc định là combat thuần túy.

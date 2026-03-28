# Docs Index

Tai lieu trong repo duoc chia theo vai tro ro rang. Neu dang mo mot task moi, doc theo thu tu:

1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. Tai lieu nguon phu hop voi loai viec dang lam

## Nguon su that theo nhom

### Project rules
- [AGENTS.md](D:/game/AGENTS.md)
  - Dung cho: moi task
  - Chua: product rules, architecture rules, working style, definition of done
  - Day la nguon su that cao nhat cho cach lam viec trong repo

### Repo entry point va scope hien tai
- [README.md](D:/game/README.md)
  - Dung cho: nguoi moi vao repo, build/run/share
  - Chua: game la gi, phan nao dang playable, save/reset basics, gioi han hien tai
  - Day la entry point chinh, khong phai noi chua moi chi tiet thiet ke

### Story / lore / naming
- [story-bible.md](D:/game/docs/story-bible.md)
  - Macro story truth cho base game
- [world-lore.md](D:/game/docs/world-lore.md)
  - Lore truth cho the gioi, phe phai, Thien Khu Bien, Van Tuong Linh Kinh
- [naming-style.md](D:/game/docs/naming-style.md)
  - Naming va voice/tone truth cho text, event, faction, chapter labels
- [asset-naming-guide.md](D:/game/docs/asset-naming-guide.md)
  - Naming truth cho art asset, file path, va intake rule khi them file moi vao `public/assets`

### Chapter / content design
- [chapters.md](D:/game/docs/chapters.md)
  - Chapter progression truth, escalation spine, chapter gates
- [event-rules.md](D:/game/docs/event-rules.md)
  - Event design truth, event categories, trigger philosophy, content authoring rules

### Expansion planning
- [expansion-architecture.md](D:/game/docs/expansion-architecture.md)
  - Hook da duoc dat trong code va save de noi sang arc sau
  - Day la tai lieu ve `implemented architecture`, khong phai roadmap noi dung
- [expansion-roadmap.md](D:/game/docs/expansion-roadmap.md)
  - Ban do dai han cho arc sau base game
  - Day la `planning doc`, khong co nghia la content da playable
- [future-arc-template.md](D:/game/docs/future-arc-template.md)
  - Template planning de dung khi bat dau mot arc/chapter moi sau base game

### Release / testing / deployment
- [playtest-guide.md](D:/game/docs/playtest-guide.md)
  - Dung cho external tester hoac vong playtest ngan
- [release-candidate-notes.md](D:/game/docs/release-candidate-notes.md)
  - Dung cho nguoi can tom tat build RC hien tai de chia se nhanh
- [deployment-notes.md](D:/game/docs/deployment-notes.md)
  - Dung cho public/static hosting va smoke test truoc khi chia se
- [pre-release-checklist.md](D:/game/docs/pre-release-checklist.md)
  - Dung truoc moi lan share build de chay checklist cuoi

## Thu tu doc theo loai task

### Neu lam narrative / content / event
1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. [story-bible.md](D:/game/docs/story-bible.md)
4. [world-lore.md](D:/game/docs/world-lore.md)
5. [chapters.md](D:/game/docs/chapters.md)
6. [event-rules.md](D:/game/docs/event-rules.md)
7. [naming-style.md](D:/game/docs/naming-style.md)

### Neu lam art asset / icon / portrait / background integration
1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. [asset-naming-guide.md](D:/game/docs/asset-naming-guide.md)
4. [naming-style.md](D:/game/docs/naming-style.md) neu asset co lien quan ten rieng trong the gioi

### Neu lam gameplay / systems / save / state
1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. [chapters.md](D:/game/docs/chapters.md)
4. [event-rules.md](D:/game/docs/event-rules.md)
5. [expansion-architecture.md](D:/game/docs/expansion-architecture.md) neu task co lien quan arc/ending/replay/save hook

### Neu lam expansion planning
1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. [expansion-architecture.md](D:/game/docs/expansion-architecture.md)
4. [expansion-roadmap.md](D:/game/docs/expansion-roadmap.md)
5. [future-arc-template.md](D:/game/docs/future-arc-template.md)
6. Quay lai [story-bible.md](D:/game/docs/story-bible.md) va [world-lore.md](D:/game/docs/world-lore.md) de tranh lech tone

### Neu lam release / testing / external handoff
1. [AGENTS.md](D:/game/AGENTS.md)
2. [README.md](D:/game/README.md)
3. [playtest-guide.md](D:/game/docs/playtest-guide.md)
4. [release-candidate-notes.md](D:/game/docs/release-candidate-notes.md)
5. [deployment-notes.md](D:/game/docs/deployment-notes.md)
6. [pre-release-checklist.md](D:/game/docs/pre-release-checklist.md)

## Where to add X

- Them random event / event variant:
  - doc [event-rules.md](D:/game/docs/event-rules.md)
  - sua du lieu trong `src/game/data/events_random.json`
- Them major event / chapter beat:
  - doc [chapters.md](D:/game/docs/chapters.md)
  - sua du lieu trong `src/game/data/events_major.json` va `src/game/data/story_chapters.json`
- Them disciple archetype / recruitment variation:
  - doc [naming-style.md](D:/game/docs/naming-style.md) + [world-lore.md](D:/game/docs/world-lore.md)
  - sua du lieu trong `src/game/data/disciple_traits.json` va event data lien quan
- Them faction letter / diplomacy flavor:
  - doc [world-lore.md](D:/game/docs/world-lore.md)
  - sua random/major events hoac faction-facing content data
- Them map flavor / exploration discoveries / rare loot:
  - doc [world-lore.md](D:/game/docs/world-lore.md) + [event-rules.md](D:/game/docs/event-rules.md)
  - sua `src/game/data/maps.json`, `src/game/data/exploration_events.json`, `src/game/data/items.json`
- Them art asset / portrait / icon / UI frame:
  - doc [asset-naming-guide.md](D:/game/docs/asset-naming-guide.md)
  - them vao dung nhanh con trong `public/assets`
  - neu doi ten hoac doi thu muc, cap nhat reference code/data cung luc
- Them chapter hoac arc tuong lai:
  - doc [expansion-architecture.md](D:/game/docs/expansion-architecture.md) truoc
  - planning theo [future-arc-template.md](D:/game/docs/future-arc-template.md)

## Quy tac giam roi docs

- Neu mot thong tin da la source-of-truth o file khac, uu tien link den file do thay vi viet lai
- README chi giu entry-point, scope, run/build, deploy basics, va pointer den docs
- Tai lieu roadmap khong duoc mo ta nhu content da playable
- Tai lieu kien truc chi nen noi ve hook da co hoac assumption can code theo

---
name: proposal-writer
description: 將課程大綱、講稿或筆記整理成標準格式的企業內訓提案文件（Markdown），再透過 build script 產生簡潔的單欄 PDF。當使用者說「寫一份課程提案」「把課綱整理成提案」「生成提案 PDF」「企業內訓提案」「客戶提案文件」「整理成提案版型」「write a course proposal」時使用。提案版型固定包含課程簡介、使用工具、預計成效、適合對象、課程目錄、課程大綱六大區塊；客戶名稱自動取自上層資料夾，講師介紹與品牌色由 config.yaml 統一注入。
version: 0.1.0
---

# Proposal Writer

把一份課程大綱／講稿／筆記，整理成結構固定、可直接遞交客戶的企業內訓提案，並產出簡潔的 PDF。

```
來源內容（課綱／講稿／筆記）
   → 套用版型寫入 <提案資料夾>/README.md（frontmatter + 六大區塊）
   → node build-pdf.mjs <提案資料夾>
   → <客戶名稱>-提案.pdf
```

## 用途

每次接洽企業內訓都要產出一份提案。手工排版耗時、各份格式不一致、講師介紹反覆複製貼上。這個 skill 把提案拆成三層：

- **內容層** —— 每份提案一個資料夾，`README.md` 用固定版型撰寫。
- **共用層** —— `config.yaml` 放講師介紹與品牌色，所有提案共用，更新一次全部同步。
- **產出層** —— `build-pdf.mjs` 把上述兩者合成簡潔單欄 PDF。

客戶名稱自動取自提案資料夾名稱，不需手填。

## 何時使用

- 使用者提供課程大綱／講稿／筆記，要求整理成提案。
- 使用者要為某個企業客戶撰寫內訓提案。
- 使用者要把既有的提案 Markdown 產生 PDF。

## 專案結構

```
.agents/skills/proposal-writer/
├── SKILL.md
├── references/
│   ├── template.md          # 提案 README.md 版型範本與 config.yaml 範例
│   └── theme.css            # PDF 樣式（商務雅緻）—— 美化只需改這檔
└── scripts/
    └── build-pdf.mjs        # Markdown → PDF（依賴 Puppeteer）

<proposal-root>/             # 提案內容根目錄（建議獨立 repo）
├── config.yaml              # 講師介紹、品牌色、頁尾（所有提案共用）
├── todo/  processing/  done/
│   └── <客戶名稱>/
│       ├── README.md        # 單份提案（本 skill 產出）
│       └── <客戶名稱>-提案.pdf
```

## Workflow

### Step 0 — 確定提案資料夾

提案放在 `<proposal-root>/<狀態>/<客戶名稱>/`。

- 客戶名稱即資料夾名稱，`build-pdf.mjs` 會自動帶入，frontmatter 的 `client` 可留空。
- 狀態資料夾慣例：`todo`（提案中）、`processing`（洽談中）、`done`（已結案）。
- 若使用者未指定位置，沿用 repo 既有慣例；找不到既有提案夾時向使用者確認。

### Step 1 — 讀取來源內容

完整讀取使用者提供的課綱／講稿／筆記，理解：

- 課程主軸與要解決的痛點
- 會教到哪些工具
- 章節結構與每章重點

### Step 2 — 套用版型撰寫 README.md

依 `references/template.md` 的版型，把內容寫進 `<提案資料夾>/README.md`。

**YAML frontmatter：**

| 欄位 | 說明 |
|------|------|
| `course_title` | 課程名稱（PDF 第一頁大標） |
| `client` | 客戶名稱；留空則自動採用上層資料夾名 |
| `duration` | 時數，例：`2 次 × 6 小時`；不確定填 `待確認` |
| `date` | 提案日期 |
| `status` | `提案中` / `洽談中` / `已確認` / `已結案` |
| `cover` | `true` / `false`（選填）；啟用後 PDF 第一頁為正式封面，可被 `--cover` / `--no-cover` 旗標覆寫 |

**六大區塊（順序固定、用 `##` 標題、不可增刪改名）：**

1. **課程簡介** —— 200 字以內，說清楚課程定位、痛點、學員帶走什麼。
2. **使用工具** —— 條列課程會用到的工具。
3. **預計成效** —— 條列上完課的具體成果（能做到什麼）。
4. **適合對象** —— 條列這門課設計給誰。
5. **課程目錄** —— 章節層級的編號清單，讓客戶快速掌握全貌。
6. **課程大綱** —— 詳細內容，每章用 `###` 標題、下面條列重點。每個 `###` 章節在 PDF 會包成一個區塊、整章不跨頁，因此單章內容不宜超過一頁。章節標題前會自動加上「1.」「2.」… 編號（藍色），與課程目錄對應。

**多場次課程**：在「課程目錄」與「課程大綱」用 `=== 場次標題 ===` 插入場次分隔帶（例如 `=== 第 1 場：Chat 模式 ===`），模組仍用 `###`；課程目錄與課程大綱的各場次編號都會獨立從 1 起算（透過 CSS counter-set 在場次分隔帶歸零）。

> 講師介紹**不要**寫進 README.md —— build 時會自動從 `config.yaml` 注入 PDF。

### Step 3 — 確認 config.yaml

確認 `<proposal-root>/config.yaml` 存在，且含 `instructor`（`name`、`tagline`、`bio`、`highlights`、`links`）與 `brand.accent`。首次使用時若不存在，參考 `references/template.md` 末段建立。

### Step 4 — 產生 PDF

從 repo 根目錄執行：

```bash
node .agents/skills/proposal-writer/scripts/build-pdf.mjs <提案資料夾> [--cover|--no-cover]
```

例：

```bash
# 依 frontmatter 的 cover 設定產生（預設無封面）
node .agents/skills/proposal-writer/scripts/build-pdf.mjs proposal/todo/睿華國際

# 強制啟用封面頁（覆寫 frontmatter）
node .agents/skills/proposal-writer/scripts/build-pdf.mjs proposal/todo/睿華國際 --cover
```

輸出 `<提案資料夾>/<客戶名稱>-提案.pdf`，每頁頁尾有頁碼。兩種版型：

- **無封面（預設）**：第一頁頂部為課程名稱與「客戶 · 講師 · 時數 · 日期」資訊行，內頁緊接六大區塊，最後附「關於講師」區塊。適合內部快速遞交。
- **有封面（`cover: true` 或 `--cover`）**：第一頁為整頁滿版品牌色封面，第二頁起進入六大區塊（不再顯示重複的頂部資訊行）。適合正式對外提案。
  - **封面設計原則**：滿版（撐到 A4 物理四邊）× 資訊清楚（所有文字 ≥ 14px、白色透明度 ≥ 0.85）× 不靠對比裝飾（不放背景圖形、不打小字、不用半透明灰白製造層次）。
  - **封面結構**：頂部「企業內訓提案」kicker（白色下底線）→ 中段客戶名（60px）+ 分隔線 + 課程名（30px）+ 課程簡介第一句（17px 副述）→ 底部時數／日期／講師三欄等寬資訊（標籤 14px、值 24px）。

每個 `##` 區塊標題會自動帶上一句副標（例如「使用工具」右側顯示「課程中實際操作的工具」），協助客戶第一眼讀懂該區塊用途；副標映射定義於 `build-pdf.mjs` 的 `SECTION_HINT`。

## 撰寫指引

- **使用工具項目不要加粗體** —— `工具名 — 說明` 即可，PDF 會把工具名自動渲染成有色塊標籤；額外加 `**` 會疊上螢光筆背景。
- **萃取，不搬運** —— 把課綱長句提煉成精簡條列，移除口語贅字。
- **課程簡介控制在 200 字內** —— 這是客戶第一眼看的段落。
- **預計成效寫「成果」不寫「會教什麼」** —— 用「能獨立完成 X」這類句式。
- **使用工具／預計成效／適合對象**若來源沒明寫，依課程大綱合理推導，並在回覆中告知使用者這幾項是推導的、請確認。
- **frontmatter 欄位不確定就留佔位**（如 `duration: 待確認`），不要編造。
- **留空的內容會自動隱藏** —— 沒有內容的 `##` 區塊、以及空白的 frontmatter 欄位，都不會出現在 PDF。
- Markdown 行內語法支援 **粗體**、*斜體*、`` `行內碼` ``、`[超連結](url)`。

- **巢狀條列** —— 條列項目下用空白縮排即可加入子項目，課程大綱支援多階層展開。

## 品質檢查清單

- [ ] frontmatter 五個欄位齊全（不確定的用佔位字）
- [ ] 六大區塊都在、順序正確、用 `##` 標題
- [ ] 課程簡介 200 字以內
- [ ] 課程目錄與課程大綱的章節一致
- [ ] 沒有把講師介紹寫進 README.md
- [ ] `config.yaml` 存在且 `instructor` 完整
- [ ] `build-pdf.mjs` 執行成功、PDF 已產生

## 參考文件

- `references/template.md` —— 提案 README.md 版型範本與 config.yaml 範例
- `references/theme.css` —— PDF 樣式表；美化或調整版型只需編輯此檔，不需動 `build-pdf.mjs`

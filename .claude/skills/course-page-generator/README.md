# Course Page Generator

提供主題 or Markdown 講稿，透過 Agent Skills 單一 HTML 課程頁面。

## Quick Start

```bash
# 安裝依賴（OG 縮圖產生需要 puppeteer）
npm install
```

在 AI 對話窗輸入「幫我生成課程頁面」這類指令，AI 會自動觸發 `course-page-generator` Skill 完成所有步驟。

### 情境一：給主題，從零生成

只提供主題，AI 自動生成完整課程內容：

```
扮演一位擅長用實際案例解說的資安專家，設計"生成式 AI 資訊安全"的講義並生成網頁，完成後直接啟動
```

AI 會依序：生成 `content.md` + `config.yaml` → build `index.html` → 產生 OG 縮圖 → 啟動本地預覽

### 情境二：給講稿，輔助轉換

提供現有的講稿、筆記或大綱，AI 將其轉換為結構化課程頁面：

```
幫我把這份講稿轉成課程頁面（貼上講稿內容，或指定檔案路徑）
```

AI 會依序：萃取重點轉為結構化 `content.md` → 建立 `config.yaml` → build `index.html` → 產生 OG 縮圖

## 專案結構

```
course/
├── config/
│   ├── global.yaml          # 全域設定（講者、社群、頁尾）
│   └── assets/              # 共用圖片（avatar 等）
├── build.mjs                # 課程頁 build script
├── generate-og.mjs          # 針對課程頁截 1200x1200 OG 圖
├── cake/                    # ← 課程目錄（可新增更多）
│   ├── config.yaml          # 課程專屬設定（覆蓋 global）
│   ├── content.md           # 結構化 Markdown 講稿
│   ├── index.html           # 產出（課程頁）
│   └── assets/
│       └── og-cake.jpg      # OG 縮圖（generate-og.mjs 產出）
└── .cursor/skills/
    └── course-page-generator/
        └── reference/       # HTML 模板、格式範例
```

## Config 機制

兩層設定，deep merge：

| 層級 | 檔案 | 內容 |
|------|------|------|
| 全域 | `config/global.yaml` | 講者資訊、社群連結、頁尾 |
| 課程 | `<dir>/config.yaml` | 頁面標題、badge、hero、引言、導覽按鈕 |

課程 config 只需寫要覆蓋的欄位，其餘繼承全域。陣列欄位（如 `socials`）會整個取代。

`nav`（Hero 導覽按鈕）預設從 `content.md` 的 `#` 章節自動產生，不需在 config 維護。

### 課程 config 範例

```yaml
page:
  title: "課程標題"
  badge: "BADGE 文字"
  hero_title: "Hero 大標題<br>支援換行"
  subtitle: "副標題"

quotes:
  opening:
    text: "開場引言"
  closing:
    text: >
      結尾引言

# nav 自動從 content.md 的 # 章節產生
# 需要自訂時才寫：
# nav:
#   - text: "自訂文字"
#     href: "#section-id"
```

## Markdown 語法

| 語法 | 用途 |
|------|------|
| `# LABEL：TITLE` | 主章節 |
| `> lead text`（緊接 `#`） | 章節引言 |
| `## Title` | 子章節 |
| `### 🔧 Title` | 卡片 |
| `` ```prompt [label="..."] `` | 終端機 / Prompt 區塊 |
| `> **Bold Title**` | 洞察框 |
| `[flow]...[/flow]` | 流程步驟 |
| `[tags]...[/tags]` | 標籤（green / orange / purple / blue，必須用此區塊包裹） |
| `[summary]...[/summary]` | 總結卡片 |
| `[bonus title="..."]...[/bonus]` | Bonus 按鈕 + 彈窗 |
| `- [x] item` | 勾選清單（僅用於已驗證/已完成的事項，不適合一般觀點條列） |
| `![alt](src)` | 獨立圖片（置中、含說明文字） |
| `[image-text]...[/image-text]` | 圖文並排（圖片＋文字左右排列，預設圖片佔 40%） |
| `[youtube id="..." title="..."]` | YouTube 影片嵌入（16:9 響應式） |
| `[html]...[/html]` | 自訂 HTML 區塊（CSS 隔離，以 iframe 渲染） |
| `---` | 章節分隔線 |

詳細語法與 HTML 對照見 `.cursor/skills/course-page-generator/reference/components.md`。

`[flow]...[/flow]` 內支援 `1. ` 與 `- ` 兩種列表格式；每列可用 `—`、`–` 或 ` - ` 分隔標題與描述。

### 圖片

**獨立圖片（置中顯示）：**
```markdown
![架構示意圖](images/architecture.png)
```
- `alt` 文字自動成為圖片說明（figcaption）
- 行內使用時（段落或列表中）會以 inline 方式渲染

**圖文並排：**
```markdown
[image-text position="left" width="50"]
![產品截圖](images/screenshot.png)
這是產品的主要介面，提供了 **直覺式操作** 體驗。
- 支援拖放操作
- 即時預覽結果
[/image-text]
```
- `position="left"`（預設）：圖片在左、文字在右
- `position="right"`：圖片在右、文字在左
- `width="N"` 設定圖片佔比百分比（預設 40），例如 `width="30"` 或 `width="60"`
- 文字區域支援段落、粗體、程式碼、連結、列表
- 平板（≤ 900px）及手機自動改為上下排列

### YouTube 影片嵌入

**單行（帶標題）：**
```markdown
[youtube id="dQw4w9WgXcQ" title="Demo 影片"]
```

**區塊（帶說明文字）：**
```markdown
[youtube id="dQw4w9WgXcQ"]
這是一段示範影片的說明
[/youtube]
```

- `id` 為 YouTube 影片 ID（網址中 `v=` 後面的值）
- `title` 為選填的標題/說明，顯示在影片下方
- 影片以 16:9 比例響應式嵌入
- 列印模式下顯示 YouTube 連結取代 iframe

### Raw HTML（自訂 HTML 區塊）

在 markdown 中嵌入完整的自訂 HTML，CSS 完全隔離不影響外層頁面：

```markdown
[html]
<div style="display:flex;gap:12px">
  <div style="flex:1;padding:16px;border:1px solid #ccc;border-radius:8px">
    <h3>面板 A</h3>
    <p>自訂內容</p>
  </div>
  <div style="flex:1;padding:16px;border:1px solid #ccc;border-radius:8px">
    <h3>面板 B</h3>
    <p>自訂內容</p>
  </div>
</div>
[/html]
```

- 內容以 `<iframe srcdoc>` 渲染，CSS 完全隔離
- 可包含完整 HTML 文件（含 `<!DOCTYPE html>`、`<style>` 等），也可以是 HTML 片段
- iframe 載入後自動調整高度
- 適合互動元件、對比圖表、需要獨立樣式的自訂排版

### Bonus 彈窗

在任何章節（通常放在總結最下方）加入 `[bonus]` 區塊，build 後會產出一個按鈕，點擊開啟 Modal 彈窗，彈窗內容支援 Markdown。

```markdown
[bonus title="🎁 幕後製作心得"]
這裡是**彈窗內容**，支援基本 Markdown：

- 段落間用空行分隔
- 清單用 `- item`
- 粗體用 `**文字**`
- 行內程式碼用 `` `code` ``

連續非空行會自動以 `<br>` 合併成同一段落。
[/bonus]
```

彈窗互動：
- 點擊遮罩或右上角 ✕ 可關閉
- 按 `Esc` 亦可關閉

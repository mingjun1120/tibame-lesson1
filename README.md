# tibame-lesson1

> 多 Skill 整合的 AI 教學內容工作坊。
> 一個 repo，把 **講稿 → 課程網頁**、**課綱 → 內訓提案 PDF**、**音檔 → 字幕 → 字卡 → 社群文案**、**簡報文件 → 乾淨 Markdown** 都封裝成可重複使用的 Agent Skills，AI 對話一句話就能完成。

---

## 為什麼是這個專案

每次備課、接案、剪片，總是要重複做同一套工作流：把一份原始素材轉成「能直接給觀眾看的成品」。
本專案把這些重複動作拆解成幾個**單一職責的 Agent Skill**，AI 看到關鍵字就會自動串起來：

- 給主題或講稿 → 自動產出**單檔課程網頁** + OG 縮圖
- 給課綱 → 自動套版型輸出**企業內訓提案 PDF**
- 給音檔 → 自動產出 **SRT 字幕**、**字卡標註**、**社群平台文案**
- 給一堆簡報／文件／會議記錄 → 自動抽成**乾淨的 Markdown 文字版**（`files/` → `doc/`）

不再每次都從零開始 vibe coding，而是「給我這份內容，請幫我跑這條 pipeline」。

除了上述內容 pipeline，repo 也內建幾個**通用輔助 Skill**（資訊圖、前端設計、找 Skill、寫 commit 訊息）。其中部分由 `skills-lock.json` 從外部 repo 引入，詳見下方「Skills 全集」。

---

## 專案架構

```
tibame-lesson1/
├── README.md                   # 你正在看的這份
├── package.json / package-lock.json   # Node 入口（course / proposal 的 build script）
├── requirements.txt            # Python 依賴（文件抽取工具用）
├── extract_docs.py             # files/ 的 PDF/PPTX/DOCX → doc/_raw/ 結構化傾印
├── skills-lock.json            # 外部來源 Skill 的版本鎖定
│
├── .agents/                    # Skill 與 Command 的正本（Claude Code / Codex 共用）
│   ├── skills/                 #   ↳ 每個子資料夾 = 一個 Skill（共 10 個，見下表）
│   └── commands/               #   ↳ slash command：把多個 Skill 串成一條 pipeline
│       └── video-srt-card-des.md
│
├── .claude/                    # Claude Code 實際載入位置
│   ├── skills/                 #   與 .agents/skills 為 hardlink 同步（同一份檔案）
│   ├── commands/               #   與 .agents/commands 同步
│   ├── hooks/                  #   （目前為空）
│   └── scheduled_tasks.lock    #   Claude Code 本機狀態
│
├── course/                     # 課程網頁工作區
│   ├── config/                 #   ★ 全域 config 預設位置
│   │   ├── global.yaml         #     講者資訊、社群連結、頁尾、SEO 預設值
│   │   └── assets/             #     講師頭像等共用素材
│   ├── README.md               #   原始設計講稿（範例素材）
│   ├── claude-code-101/        #   一個課程 = 一個子資料夾
│   │   ├── content.md          #     結構化 Markdown 講稿（輸入）
│   │   ├── config.yaml         #     該課程的設定（覆蓋 global.yaml）
│   │   ├── index.html          #     產出：單檔課程頁
│   │   └── assets/og-image.jpg #     產出：OG 縮圖
│   └── vibe-coding-lecture-builder/   # 同上結構
│
├── proposal/                   # 企業內訓提案工作區
│   ├── config.yaml             #   講師介紹、品牌色（所有提案共用）
│   ├── example.md              #   範例提案
│   └── todo/<客戶>/            #   每個客戶一個資料夾（README.md + <客戶>-提案.pdf）
│
├── audio/                      # 音檔 → 字幕 pipeline 工作區
│   ├── audio-example.m4a       #   輸入：音檔
│   ├── origin.md               #   輸入：原稿（給 srt-enhancer 比對）
│   └── origin.srt / enhanced.srt / reference-cards.srt / summary.md   # 產出範例
│
├── files/                      # 原始素材（簡報、文件、會議記錄：PDF / PPTX / DOCX / MD）
├── doc/                        # files/ 抽取整理後的 Markdown 文字版
└── images/                     # 迷因圖庫（動漫／卡通／名人／影視劇／惡搞／貓咪），課程內容素材
```

> **約定**：產出物（`index.html`、`*.srt`、`*-提案.pdf`、`assets/og-*.jpg`）一律就地寫回對應的工作區，不要分散到根目錄。

---

## Skills 全集

`.agents/skills/` 下共 10 個 Skill，分成兩類。

### 內容生產 pipeline

| Skill | 觸發時機（口語關鍵字） | 主要產出 |
|-------|--------------------|---------|
| **[course-page-generator](.agents/skills/course-page-generator/SKILL.md)** | 「幫我做課程頁」「把講稿轉成網頁」「設計講義網站」 | `index.html`（單檔內嵌 CSS/JS 與 base64 圖片） + `assets/og-*.jpg` |
| **[proposal-writer](.agents/skills/proposal-writer/SKILL.md)** | 「寫一份課程提案」「把課綱整理成提案」「企業內訓提案 PDF」 | `<提案資料夾>/README.md`（六大區塊版型） + `<客戶>-提案.pdf` |
| **[audio-to-srt](.agents/skills/audio-to-srt/SKILL.md)** | 「把音檔轉成字幕」「generate subtitles from audio」「轉逐字稿」 | `origin.srt`（含 timestamp 的字幕檔） |
| **[srt-enhancer](.agents/skills/srt-enhancer/SKILL.md)** | 「優化 SRT」「比對原稿修正字幕」「修正字幕錯字」 | `enhanced.srt`（修正錯字、補上英數空格） |
| **[srt-card-annotator](.agents/skills/srt-card-annotator/SKILL.md)** | 「在字幕加字卡」「annotate srt with cards」「設計字卡」 | `reference-cards.srt`（在字幕下方插入 `[字卡]` 標註） |
| **[srt-social-summary](.agents/skills/srt-social-summary/SKILL.md)** | 「生成影片介紹」「根據逐字稿寫 FB/YT 貼文」「social media summary」 | `summary.md`（FB / Threads / YouTube 三個版本的平台文案） |

### 通用 / 輔助 Skill

| Skill | 觸發時機（口語關鍵字） | 主要產出 | 來源 |
|-------|--------------------|---------|------|
| **[baoyu-infographic](.agents/skills/baoyu-infographic/SKILL.md)** | 「做資訊圖」「infographic」「visual summary」「高密度資訊大圖」 | 資訊圖（21 種版面 × 22 種視覺風格） | 外部 `jimliu/baoyu-skills` |
| **[frontend-design](.agents/skills/frontend-design/SKILL.md)** | 「做個網頁/元件/落地頁」「美化 UI」「dashboard」 | 高品質前端介面與程式碼 | 外部 `anthropics/skills` |
| **[find-skills](.agents/skills/find-skills/SKILL.md)** | 「有沒有能做 X 的 skill」「找/安裝 skill」 | 發現並安裝合適的 agent skill | 外部 `vercel-labs/skills` |
| **[commit-message-writer](.agents/skills/commit-message-writer/SKILL.md)** | 「幫我寫 commit message」「設計 commit 訊息」 | 符合 Conventional Commits 的英文 commit 訊息 | 本地自研 |

> 標示「外部」的 Skill 由 `skills-lock.json` 從外部 GitHub repo 鎖定來源與版本引入；其餘為本 repo 自研。每個 Skill 的 `SKILL.md` 都有完整的 workflow、I/O 規格、品質檢查清單，AI 會依 `description` 自動判斷觸發時機。

### Skill 之間的關係

```
              ┌──────────────────────┐
   音檔 ───→  │   audio-to-srt       │ ──→ origin.srt
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
 原稿 ───→    │   srt-enhancer       │ ──→ enhanced.srt
              └──────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
   ┌───────────────────┐   ┌─────────────────────┐
   │ srt-card-annotator│   │ srt-social-summary  │
   └───────────────────┘   └─────────────────────┘
        │                        │
        ▼                        ▼
   reference-cards.srt       summary.md
```

`course-page-generator` 與 `proposal-writer` 是獨立 pipeline，不依賴其他 Skill。通用 / 輔助 Skill 則各自獨立、不屬於上面任何一條 pipeline。

---

## Commands

`.agents/commands/` 放的是 **slash command**：把多個 Skill 依固定順序串成一條 pipeline，讓使用者一句指令跑完整流程。

| Command | 用途 | 串接的 Skill |
|---------|------|------------|
| **[/video-srt-card-des](.agents/commands/video-srt-card-des.md)** | 一鍵把音檔變成「乾淨字幕 + 字卡 + 三平台貼文」 | `audio-to-srt` → `srt-enhancer` → `srt-card-annotator` → `srt-social-summary` |

Command 與 Skill 的差異：
- **Skill** = 一個技能單元，由 AI 自動依關鍵字觸發
- **Command** = 一條 pipeline，由使用者明確輸入 `/<name>` 來啟動

要新增 command，在 `.agents/commands/` 加一個 `<name>.md`，frontmatter 寫 `description:`，內文用 `STEP 1 / STEP 2 ...` 描述要呼叫的 Skill。

---

## 文件抽取（files → doc）

把 `files/` 裡的簡報／文件／會議記錄轉成乾淨、可被 Skill 取用的 Markdown，分兩段：

- **Phase A（自動傾印）**：`python extract_docs.py` 讀 `files/` 內的 PDF / PPTX / DOCX，連同結構標記（DOCX 段落樣式、PPTX 投影片分頁、PDF 頁碼、表格）傾印到 `doc/_raw/<檔名>.txt`。`doc/_raw/` 是中繼產物，已被 `.gitignore` 忽略。
- **Phase B（整理）**：把 `doc/_raw/*.txt` 整理成正式的 `doc/<檔名>.md`（納入版控）。

依賴是 **Python 套件**（見 `requirements.txt`：`pdfplumber` / `python-docx` / `python-pptx`），與其餘走 Node 的 build script 不同，安裝方式也不一樣（見下方 Quick Start）。

---

## Quick Start

### 0. 安裝

```bash
npm install                       # course / proposal 的 build 需要（puppeteer）
pip install -r requirements.txt   # 文件抽取工具 extract_docs.py 需要
```

Node.js 需要 **18 以上**（build script 用了 ES module 與較新的 fs API）；文件抽取需要 Python 3。

### 1. 課程網頁

```bash
# 開發模式（自動 rebuild + live reload）
npm run dev -- course/<課程目錄>

# 一次性 build
npm run build -- course/<課程目錄>

# 產生 OG 縮圖（build 完一定要接著跑這個，不然社群分享預覽會空白）
npm run og -- course/<課程目錄>
```

實務上不需要記指令 —— 在 AI 對話直接說「**幫我把這份講稿做成課程網頁**」即可，`course-page-generator` 會自動跑完三步。

**Config 怎麼放：**
- 預設集中放在 `course/config/global.yaml`（不管課程在 `course/`、`lecture/` 還是其他資料夾，都會自動讀到）
- 每個課程在自己的子資料夾放 `content.md`（內容）與 `config.yaml`（覆蓋 `global.yaml` 的課程專屬設定）
- 也可用 `COURSE_GLOBAL_CONFIG=/path/to/global.yaml` 環境變數明確指定全域 config

### 2. 企業內訓提案

```bash
# 把 proposal/<狀態>/<客戶名稱>/README.md 編譯成 PDF
npm run proposal -- proposal/todo/<客戶名稱>
```

對 AI 說：「**幫我把這份課綱寫成提案，客戶是 XX**」，`proposal-writer` 會自動建立資料夾、套版型、產 PDF。

### 3. 音檔 → 字幕 → 字卡 → 文案

四個 SRT 系列 Skill 沒有 npm script（不是純 Node script，需要 Python 與 AI 協作）。直接對 AI 說：

```
/video-srt-card-des

來源：audio/audio-example.m4a
原稿：audio/origin.md
```

或拆開單獨呼叫：「**用 audio-to-srt 把這個檔案轉成字幕**」、「**用 srt-enhancer 優化這份字幕**」。

### 4. 文件素材 → Markdown

```bash
python extract_docs.py            # files/*.{pdf,pptx,docx} → doc/_raw/*.txt
```

接著把 `doc/_raw/*.txt` 整理成正式的 `doc/*.md`（可交給 AI 處理）。

---

## 開發約定

- **每個 Skill 自帶 `scripts/` 與 `references/`**：可單獨複製到別的 repo 也能跑，不依賴外部設定。
- **產出物寫回工作區**：`course/<dir>/index.html`、`proposal/<...>/<客戶>-提案.pdf`、`audio/enhanced.srt` 等，不要散到根目錄。
- **`config/global.yaml` 走深合併（deep merge）**：陣列欄位（如 `socials`）會整個取代，物件欄位才會合併。
- **Skill 有兩種來源**：
  - *本地自研* —— 在 `.agents/skills/<name>/SKILL.md` 寫好 `name` / `description` / workflow，AI 就能自動發現並依關鍵字觸發。
  - *外部引入* —— 由 `skills-lock.json` 鎖定來源 repo 與版本（例如 `baoyu-infographic`、`find-skills`、`frontend-design`）。
- **`.agents/` 與 `.claude/` 透過 hardlink 同步**：`.claude/skills`、`.claude/commands` 與 `.agents/` 下對應檔案是同一個 inode，改任一邊即同時生效，不要兩邊各維護一份。
- **新增 Command 時**：在 `.agents/commands/<name>.md` 寫好 frontmatter 與步驟，使用者輸入 `/<name>` 即可啟動。

---

## 延伸閱讀

- 各 Skill 的詳細規格 → `.agents/skills/<name>/SKILL.md`
- 課程網頁的元件對照 → `.agents/skills/course-page-generator/reference/components.md`
- 提案版型範本 → `.agents/skills/proposal-writer/references/template.md`
- 抽取整理後的文件素材 → `doc/`

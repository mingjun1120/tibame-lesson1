---
name: commit-message-writer
description: 分析目前的 git 變更（diff）並產生符合 Conventional Commits 規範的英文 commit 訊息。當使用者說「幫我寫 commit message」「設計 commit 訊息」「產生 commit 訊息」「這次變更要怎麼 commit」「commit 要怎麼寫」「write a commit message」「generate a commit message」「conventional commit」，或剛改完一段程式準備提交時使用。預設只分析 staged 變更、輸出可直接複製的訊息，不會自動執行 git commit。
version: 0.2.0
---

# Commit Message Writer

讀取目前的 git 變更，理解「改了什麼、為什麼改」，再產生一則符合 **Conventional Commits** 規範的**英文** commit 訊息，讓使用者直接複製使用。

```
git 變更（預設 staged）
   → 讀 diff，判斷意圖
   → 依固定規範選 type / scope，寫 subject（必要時加 body）
   → 自我檢查 → 輸出可直接複製的 commit 訊息（不自動 commit）
```

這個 skill 的價值在於**根據真實 diff 來寫**、且**每次都套用同一套規範**，讓格式跨時間保持一致。所以兩件事不能省：先讀變更內容，再對照下面的規範下筆。

## 何時使用

- 使用者改完程式、準備 commit，想要一則訊息。
- 使用者直接說「幫我寫 / 設計 commit message」。
- 使用者問「這次變更要怎麼 commit」「commit 要怎麼分」。

## 工作流程

### 1. 先看變更範圍

訊息要描述「實際提交的內容」，而 commit 預設只會提交 **staged** 變更，所以優先看 staged：

```bash
git status --short      # 總覽哪些檔案 staged / unstaged / untracked
git diff --staged       # staged 的實際內容（要描述的對象）
```

- **有 staged 變更** → 只根據 staged 內容寫訊息。
- **沒有任何 staged 變更** → 改看 unstaged + untracked（`git diff`，未追蹤檔案用 `git status` 看清單，必要時讀檔），並**明確告知**使用者「目前沒有 staged，我是根據工作區全部變更來寫；若只想提交部分檔案，請先 `git add` 想要的檔案」。

diff 很大時，先用 `git diff --staged --stat` 看全貌，再針對關鍵檔案看細部，避免被雜訊淹沒。

### 2. 理解意圖

讀 diff 時要分清兩件事：

- **What** —— 程式碼層面改了什麼（新增函式、改參數、刪檔…）。
- **Why** —— 這個改動解決什麼問題、達成什麼目的。

subject 寫的是 What 的精煉版，body（若需要）補的是 Why。看不出 Why 時，根據程式碼合理推斷即可，不要編造不存在的需求。

### 3. 選 type（封閉清單）

type 只能從下表挑，**不自創**。多個都沾得上邊時，依「主要目的」挑一個；為了消除模糊，**由上而下取第一個成立的**：

| 判斷順序 | type | 成立條件 |
|------|------|------|
| 1 | `revert` | 這個 commit 是還原先前的 commit |
| 2 | `fix` | 修正錯誤行為 / bug |
| 3 | `feat` | 新增使用者可見功能，或新增**可執行的腳本／工具** |
| 4 | `docs` | 只新增或修改**純說明／內容／素材**文件（README、註解、課程內容、文案） |
| 5 | `test` | 只新增或修改測試 |
| 6 | `build` | 只動建置系統、依賴清單、打包設定（如 `requirements.txt`、`package.json`、lock 檔） |
| 7 | `ci` | 只動 CI 設定與腳本 |
| 8 | `refactor` | 不改外部行為、也非修 bug 的重構 |
| 9 | `perf` | 純效能提升 |
| 10 | `style` | 不影響邏輯的格式調整（空白、排版、分號） |
| 11 | `chore` | 以上皆非的雜項（repo 設定如 `.gitignore`、版號、瑣碎維護） |

**常見模糊點**：新增 `.py` / `.mjs` 等可執行工具算 `feat`（不是 docs）；新增純 markdown 內容／素材算 `docs`；只改 `.gitignore`、編輯器設定算 `chore`；只改依賴清單算 `build`。

### 4. 選 scope（登記表）

scope 是受影響的模組／區域。為了讓「同一塊地方每次都用同一個名字」，**scope 一律從下表選**：

| scope | 對應區域 |
|-------|---------|
| `audio` | `audio/` 音訊檔與字幕產出 |
| `srt` | SRT 字幕處理的 skill 或邏輯 |
| `course` | `course/` 課程頁面與素材 |
| `proposal` | `proposal/` 提案內容與產出 |
| `doc` | `doc/` 文件與文件抽取工具 |
| `images` | `images/` 圖片資源 |
| `skills` | `.agents/skills`、`.claude/skills` 內的 skill 定義 |
| `og` | OG 縮圖生成相關 |
| `deps` | 跨專案的依賴（`requirements.txt`、`package-lock.json` 等） |

規則：

- 改動**橫跨多區**、或屬於 **repo 級設定**（`.gitignore`、CI、根目錄雜項）→ **省略 scope**，只寫 `type: description`。不要硬湊。
- 該區域**不在表內** → 先用語意最接近的既有 scope；真的沒有，才在輸出時**明講「建議新增 scope `xxx` 到登記表」**，讓登記表是有意識地成長，而非每次隨手發明新詞。

### 5. 寫 subject

`<type>(<scope>): <description>`，description 遵守：

- **祈使句、現在式**：用 `add` / `fix` / `update`，不是 `added` / `fixes`。可想成「這個 commit 會 _____」。
- **小寫開頭、結尾不加句點**。
- **精煉**：盡量 ≤ 50 字元，描述「做了什麼」而非「怎麼做的」。
- **具體**：`fix(audio): handle missing ffmpeg binary` 勝過 `fix: bug fix`。

### 6. 決定要不要加 body

別為了湊格式硬加 body。**多數小改動只要 subject 一行**。出現以下情況才補 body：

- 改動的**原因**不明顯，需要解釋背景或取捨。
- subject 一行裝不下重要資訊。
- 有**破壞性變更** → 在 footer 加 `BREAKING CHANGE: <說明>`。
- 關聯 issue → footer 加 `Closes #123`。

body 與 subject 間空一行；body 用條列或短句說明 Why 與必要的上下文，每行盡量 ≤ 72 字元。

### 7. 處理多個不相關的變更

若 diff 明顯包含**數個彼此無關**的改動（例如同時改了文件、修了 bug、又加了新功能），別硬塞進一則訊息。提醒使用者拆成多個 commit 較清楚，並**分別**給出每個 commit 的建議訊息與對應要 `git add` 的檔案。

**拆分啟發式**（讓每次切群一致）：先按**頂層目錄／scope 登記表**分群，同一 scope 內若混了不同 type（例如 `doc` 區同時有新工具與純文件），再按 type 細分。repo 級設定（`.gitignore`、lock 檔）獨立成一個 `chore` / `build` commit。

## 語言政策

- **subject 一律英文** Conventional Commits——即使這個 repo 既有歷史多為繁中，新訊息統一英文，以保持格式一致並相容工具鏈。
- **body 預設英文**；若使用者明確要求中文 body，可改中文，但同一專案內應擇一風格、不混用。

## 輸出前自我檢查

送出訊息前，逐項確認（不符就改到符合再輸出）：

- [ ] type 來自第 3 節封閉清單，且依判斷順序選對。
- [ ] scope 來自第 4 節登記表，或為跨區／repo 級而**刻意省略**；沒有自創未登記的 scope（若需新增已在輸出中註明）。
- [ ] subject 祈使句、小寫開頭、無結尾句點、≤ 50 字元，描述 what 而非 how。
- [ ] 多個不相關變更已拆分或已提醒。
- [ ] 破壞性變更已加 `BREAKING CHANGE:` footer。
- [ ] 語言符合政策（subject 英文）。

## 輸出格式

把最終訊息放進獨立 code block，方便整段複製。先一句話說明你分析的範圍（staged / 全部變更）與選 type / scope 的理由，再給訊息：

````
分析範圍：staged 變更（2 個檔案）。新增可執行工具屬 feat，scope 取 audio。

```
feat(audio): add faster-whisper fallback backend
```
````

需要 body 時：

````
```
fix(audio): fall back to faster-whisper when ffmpeg is missing

The system ffmpeg CLI is absent on some Windows setups, which broke
audio decoding. faster-whisper bundles ffmpeg via PyAV, so route
decoding through it when the CLI is not found.
```
````

## 邊界

- **不要自動執行 `git commit`**。這個 skill 只負責產生訊息；commit 的時機與內容由使用者決定。除非使用者在這次明確要求「順便幫我 commit」，否則只輸出訊息文字。
- 不要新增、刪除或 stage 檔案；讀取 diff 用唯讀指令即可。

## 範例

**範例 1 —— 純文件**
變更：更新 README 的安裝步驟與一個錯字
輸出：`docs: update install steps and fix typo in README`

**範例 2 —— 新功能含 scope**
變更：在 proposal-writer 加上單欄 PDF 輸出
輸出：`feat(proposal): render proposals as single-column PDF`

**範例 3 —— 重構**
變更：把重複的字幕解析邏輯抽成共用函式，行為不變
輸出：`refactor(srt): extract shared subtitle parser`

**範例 4 —— 新增可執行工具（feat 而非 docs）**
變更：新增 `extract_docs.py` 與其依賴，用來抽取 doc/ 內容
輸出：`feat(doc): add document extraction script and deps`

**範例 5 —— 需要 body 的修正**
變更：修正在缺少 ffmpeg 時整個流程崩潰的問題
輸出：
```
fix(audio): fall back to faster-whisper when ffmpeg is missing

ffmpeg CLI is not installed on some machines, causing decode to crash.
Use the faster-whisper backend, which bundles ffmpeg via PyAV.
```

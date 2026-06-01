---
name: commit-message-writer
description: 分析目前的 git 變更（diff）並產生符合 Conventional Commits 規範的英文 commit 訊息。當使用者說「幫我寫 commit message」「設計 commit 訊息」「產生 commit 訊息」「這次變更要怎麼 commit」「commit 要怎麼寫」「write a commit message」「generate a commit message」「conventional commit」，或剛改完一段程式準備提交時使用。預設只分析 staged 變更、輸出可直接複製的訊息，不會自動執行 git commit。
version: 0.1.0
---

# Commit Message Writer

讀取目前的 git 變更，理解「改了什麼、為什麼改」，再產生一則符合 **Conventional Commits** 規範的**英文** commit 訊息，讓使用者直接複製使用。

```
git 變更（預設 staged）
   → 讀 diff，判斷意圖
   → 選 type / scope，寫 subject（必要時加 body）
   → 輸出可直接複製的 commit 訊息（不自動 commit）
```

## 用途

每次提交都要想 commit 訊息很花心力，手寫又容易格式不一、語意含糊。這個 skill 直接看 diff 推斷意圖，產出格式統一、語意清楚的英文 Conventional Commits 訊息。它的價值在於**根據真實 diff 來寫**，而不是憑使用者口述猜測——所以務必先讀變更內容，再下筆。

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

### 3. 選 type 與 scope

**type**（必填，挑最貼近此次變更主要目的的一個）：

| type | 用於 |
|------|------|
| `feat` | 新增功能 |
| `fix` | 修 bug |
| `docs` | 只改文件（README、註解、說明） |
| `style` | 不影響邏輯的格式調整（空白、排版、分號） |
| `refactor` | 重構，不改外部行為也非修 bug |
| `perf` | 提升效能 |
| `test` | 新增或修改測試 |
| `build` | 建置系統、依賴、打包設定 |
| `ci` | CI 設定與腳本 |
| `chore` | 其他雜項（設定、版號、瑣碎維護） |
| `revert` | 還原先前的 commit |

**scope**（選填）：受影響的模組／元件，通常取自路徑或套件名，用小寫，例如 `feat(auth):`、`fix(audio):`。改動橫跨多區、找不到單一焦點時就**省略 scope**，不要硬湊。

### 4. 寫 subject

`<type>(<scope>): <description>`，description 遵守：

- **祈使句、現在式**：用 `add` / `fix` / `update`，不是 `added` / `fixes`。可想成「這個 commit 會 _____」。
- **小寫開頭、結尾不加句點**。
- **精煉**：盡量 ≤ 50 字元，描述「做了什麼」而非「怎麼做的」。
- **具體**：`fix(audio): handle missing ffmpeg binary` 勝過 `fix: bug fix`。

### 5. 決定要不要加 body

別為了湊格式硬加 body。**多數小改動只要 subject 一行**。出現以下情況才補 body：

- 改動的**原因**不明顯，需要解釋背景或取捨。
- subject 一行裝不下重要資訊。
- 有**破壞性變更** → 在 footer 加 `BREAKING CHANGE: <說明>`。
- 關聯 issue → footer 加 `Closes #123`。

body 與 subject 間空一行；body 用條列或短句說明 Why 與必要的上下文，每行盡量 ≤ 72 字元。

### 6. 處理多個不相關的變更

若 diff 明顯包含**數個彼此無關**的改動（例如同時改了文件、修了 bug、又加了新功能），別硬塞進一則訊息。提醒使用者拆成多個 commit 較清楚，並**分別**給出每個 commit 的建議訊息與對應要 `git add` 的檔案，讓使用者能照著分批提交。

## 輸出格式

把最終訊息放進獨立 code block，方便整段複製。先一句話說明你分析的範圍（staged / 全部變更）與選 type 的理由，再給訊息：

````
分析範圍：staged 變更（2 個檔案）。這是新增功能，scope 取 audio。

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

**範例 4 —— 需要 body 的修正**
變更：修正在缺少 ffmpeg 時整個流程崩潰的問題
輸出：
```
fix(audio): fall back to faster-whisper when ffmpeg is missing

ffmpeg CLI is not installed on some machines, causing decode to crash.
Use the faster-whisper backend, which bundles ffmpeg via PyAV.
```

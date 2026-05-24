---
name: commit-message-writer
description: 根據 staged 變更（git diff --cached）產生符合 Conventional Commits 規範的中文 commit 訊息建議，並詢問是否直接 commit。當使用者說「幫我寫 commit message」「設計 commit 訊息」「產生 commit 描述」「commit 變更」「寫一個 commit」「help me write a commit message」「generate commit message」時使用。Skill 只分析已 git add 的內容，不會自動 stage；訊息採用 `type(scope): 中文描述` 格式，scope 非必要，必要時補上條列式 body。
version: 0.1.0
---

# Commit Message Writer

把 `git diff --cached` 的內容濃縮成一則符合 Conventional Commits 規範的中文 commit 訊息，並在使用者確認後執行 `git commit`。

```
git diff --cached
   → 判讀變更性質（type、scope、要不要 body）
   → 產生建議訊息（中文 subject，必要時加條列 body）
   → 詢問使用者是否直接 commit
   → 使用者同意 → git commit -m "..." (HEREDOC)
```

## 用途

寫 commit message 是 daily ritual：要決定 type、決定 scope、決定要不要寫 body、還要顧及中文用詞統一。這個 skill 把這些判斷集中起來，讓使用者只需要 stage、呼叫 skill、確認，就完成 commit。

## 何時使用

- 使用者已 `git add` 某些檔案，準備 commit。
- 使用者明說要產生 / 設計 / 寫一則 commit message。
- 使用者貼上一段 diff 並問「這個怎麼 commit 比較好」。

如果使用者只是想 review diff、沒打算 commit，不要主動觸發這個 skill。

## 工作流程

### 1. 取得 staged 變更

執行下列指令收集資訊（可以並行）：

- `git diff --cached --stat` — 看哪些檔案被改、改動量級。
- `git diff --cached` — 看實際內容差異。決定 type 與 scope 都靠這份。
- `git log -5 --oneline` — 取近期 commit 風格參考（中英文偏好、scope 命名）。

**若 `git diff --cached` 為空**：不要自作主張 `git add`。改告訴使用者「目前沒有 staged 變更，要先 `git add` 哪些檔案？」並列出 `git status` 的結果讓他選擇。

### 2. 判讀變更性質

讀 diff 時，依下面這個優先級判斷 **type**：

| type | 觸發條件 |
|------|----------|
| `feat` | 新增使用者感知得到的功能、Skill、頁面、CLI flag |
| `fix` | 修正一個壞掉的行為（bug、錯誤訊息、邏輯錯誤） |
| `refactor` | 改寫內部結構但對外行為不變（重命名、抽函式、調目錄） |
| `perf` | 為效能而改（更快、更省記憶體） |
| `docs` | 只改文件、README、註解、提案內容 |
| `style` | 只改排版、格式、空白、引號（**不改邏輯**） |
| `test` | 新增或修改測試 |
| `build` | 改 build 流程、依賴、bundler 設定 |
| `ci` | 改 CI/CD pipeline、GitHub Actions |
| `chore` | 雜事：升級依賴、清理檔案、初始化、調設定 |
| `revert` | 撤回某個 commit |

判斷時的常見陷阱：

- **混合變更**：如果同一個 commit 既有 feat 又有 docs，以「使用者最有感的那一個」為主 type，其他放到 body 列點。但若兩者完全獨立，建議使用者拆成兩個 commit。
- **改測試碰到實作**：如果是為了讓新功能可測而新增測試，type 仍是 `feat`；如果只是補測試覆蓋率，才是 `test`。
- **重命名檔案算 refactor，不是 chore**。
- **新增一整個 Skill** → `feat`（不是 chore，因為對外行為有增加）。

### 3. 推測 scope（可選）

scope 的目的是讓人一眼看到「這次改的是哪一塊」。它**不是必填**——硬塞錯誤的 scope 比沒寫更糟。

推測規則：

- **單一頂層目錄** → 用目錄名當 scope。例如全部變更在 `audio/` 下，scope 用 `audio`。
- **單一 skill** → 用 skill 名當 scope。例如全部變更在 `.agents/skills/audio-to-srt/`，scope 用 `audio-to-srt`。
- **跨多個無關區域** → **不要寫 scope**。寫 `type: description` 就好，由 subject 自己交代清楚。不要為了硬湊 scope 而寫 `feat(misc): ...` 或 `feat(multi): ...`。
- **設定檔、根目錄文件** → 通常不寫 scope，或視內容寫 `config`、`docs`。

### 4. 撰寫 subject

格式：`type(scope): 中文描述` 或 `type: 中文描述`。

Subject 要求：

- **動詞開頭，現在式**：新增、修正、優化、移除、重構、調整、補上、改寫。避免「我新增了」「已修正」這種帶語氣的寫法。
- **70 字（中英文混合大致）以內**，能精簡就精簡。
- **講做了什麼、不講為什麼**：原因放 body。
- **不加句號**。

### 5. 決定要不要寫 body

預設**不寫 body**。下列情況才加：

1. **改動橫跨多個面向**：需要列點告訴讀者「這個 commit 同時改了 A、B、C」。
2. **有 breaking change 或非顯而易見的副作用**：例如 API 介面改了、預設值換了、行為從同步變非同步。
3. **變更動機在 diff 裡看不出來**：例如「為了解決某個 race condition 而把鎖移到外層」。

body 的格式：

- subject 與 body 中間空一行。
- 用 `-` 開頭的條列，每點一行一個事實。
- 條列各點與 subject 講同一件事的不同面向，不要重複 subject 已說過的內容。

### 6. 把建議呈現給使用者並詢問

呈現時用程式碼區塊（```）包住完整訊息，方便使用者複製或檢視。然後問一句：

> 要直接 commit 嗎？或是想改哪邊？

如果使用者說要改 → 改後再問一次。
如果使用者同意 → 跳到第 7 步。
如果使用者說不用了 → 結束，不要 commit。

### 7. 執行 commit

使用 HEREDOC 確保多行訊息格式正確：

```bash
git commit -m "$(cat <<'EOF'
type(scope): 中文描述

- body 第一點
- body 第二點
EOF
)"
```

只有 subject 時也用 HEREDOC（保持一致）。執行後再跑一次 `git status` 確認 commit 成功。

**注意**：
- 永遠不要加 `--no-verify`。pre-commit hook 失敗就讓使用者知道。
- 不要 `--amend` 既有 commit，除非使用者明說要 amend。

## 範例

### 範例 1：新增功能，單一 scope

diff 範圍：`.agents/skills/audio-to-srt/scripts/run.sh` 加了 GPU 自動偵測邏輯。

```
feat(audio-to-srt): 自動偵測 GPU 後端並切換 whisper 實作
```

不需 body——subject 已說完。

### 範例 2：修正 bug，無 scope

diff 範圍：跨三個 skill 各改了一個小錯字。

```
fix: 修正多個 Skill 的拼字與標點錯誤
```

不寫 scope（跨多個區域），不寫 body（內容過於瑣碎）。

### 範例 3：feat 帶 body

diff 範圍：新增 `commit-message-writer` skill，包含 SKILL.md 與一個範例 script。

```
feat(commit-message-writer): 新增 commit 訊息產生 Skill

- 基於 git diff --cached 分析變更並產生 Conventional Commits 訊息
- 訊息採中文 subject，必要時加條列 body
- 確認後自動執行 git commit
```

### 範例 4：refactor，無 body

diff 範圍：把 `proposal-writer/scripts/build-pdf.mjs` 內的工具函式抽到新檔。

```
refactor(proposal-writer): 將 PDF 共用工具抽成獨立模組
```

### 範例 5：純文件

diff 範圍：只改 `README.md` 補充安裝步驟。

```
docs: 補充 uv 與 ffmpeg 安裝指引
```

### 範例 6：依賴升級

diff 範圍：`package.json` 把 `marked` 從 9.x 升到 12.x。

```
chore: 升級 marked 至 v12
```

若這次升級有 breaking change，就要寫 body：

```
chore: 升級 marked 至 v12

- v12 將 sanitize 選項移除，呼叫端需自行處理 HTML escape
- 改用 DOMPurify 補上 sanitization
```

## 反例（不要這樣寫）

- ❌ `feat: 新增了功能` — 太空泛，沒講做了什麼。
- ❌ `修正 bug` — 沒有 type 前綴，subject 也太空泛。
- ❌ `feat(misc): 一些更新` — scope 是湊的，subject 是廢話。
- ❌ `feat(audio-to-srt): 新增 SRT 轉換功能, 修正字幕對齊, 更新 README` — 用逗號塞三件事進 subject，該拆 commit 或用 body。
- ❌ `fix: 修正 SRT 字幕在某些情況下會出現時間軸不對齊的問題，這個問題的根本原因是因為...` — subject 寫得像論文摘要，超過 70 字。原因放 body。

## 與其他 Skill 的關係

- 這個 skill **不取代** Claude Code 內建的 commit 流程說明（系統 prompt 裡的 "Committing changes with git" 章節）。系統 prompt 的安全規範（不 amend、不 force push、HEREDOC、不加 `--no-verify`）仍然全部適用，本 skill 只是補上「中文 + Conventional Commits + 自動判讀 type/scope」的具體判斷邏輯。
- 如果使用者要產生 PR 描述而非 commit 訊息，這個 skill 不適用。

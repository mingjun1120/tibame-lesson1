# Enhancement Rules

This document provides detailed rules for enhancing SRT subtitles by comparing them with `origin.md` reference documents.

## Semantic Matching Strategies

### Understanding Context

When matching SRT content with `origin.md`:

1. **Conceptual Matching**: Match based on meaning, not exact words
   - SRT: "今天我們來聊聊機器學習"
   - origin.md: "今天要討論機器學習的概念"
   - Match: ✓ (same concept, different wording)

2. **Sequential Context**: Use surrounding subtitles for context
   - Consider previous and next subtitle segments
   - Identify topic flow and narrative structure
   - Match based on position in content flow

3. **Keyword Anchoring**: Use distinctive terms as anchors
   - Technical terms (Python, API, Docker)
   - Proper nouns (人名, 地名, 產品名)
   - Numbers and statistics
   - Unique phrases

4. **Fuzzy Matching**: Account for transcription variations
   - Homophones in Chinese (的/得/地)
   - Similar-sounding words
   - Abbreviated vs. full forms
   - Colloquial vs. formal language

### Matching Algorithm

For each subtitle segment:

1. Extract key terms (proper nouns, technical terms, numbers)
2. Search for these terms in `origin.md`
3. Identify candidate matches within reasonable proximity
4. Compare context and meaning
5. Select best match based on:
   - Keyword overlap
   - Semantic similarity
   - Sequential position
   - Context alignment

## Typo Detection and Correction

### Common Transcription Errors

1. **Homophone Errors**:
   - 的/得/地 confusion
   - 在/再 confusion
   - 做/作 confusion
   - 他/她/它 confusion

2. **Similar Character Errors**:
   - 工具/工俱
   - 功能/公能
   - 設定/設訂
   - 資料/資料

3. **Missing Characters**:
   - Dropped particles (的, 了, 著)
   - Incomplete words
   - Truncated phrases

4. **Extra Characters**:
   - Duplicate words
   - Filler words (那個, 就是, 然後)
   - Transcription artifacts

### Correction Strategy

1. **Identify Discrepancy**: Compare SRT text with matched `origin.md` content
2. **Verify Error**: Confirm it's a typo, not intentional variation
3. **Apply Correction**: Replace with reference version
4. **Validate Context**: Ensure correction makes sense in subtitle context

### Conservative Approach

When uncertain:
- Preserve original text
- Don't force corrections
- Only correct clear errors
- Maintain speaker's voice and style

## Proper Noun Extraction

### Categories of Proper Nouns

1. **Personal Names**:
   - Chinese names: 李明, 王小華
   - English names: Steve Jobs, Bill Gates
   - Nicknames and aliases

2. **Company/Organization Names**:
   - Tech companies: Google, Microsoft, Apple
   - Organizations: WHO, UNESCO
   - Brands: iPhone, Windows

3. **Product Names**:
   - Software: Python, Docker, Kubernetes
   - Hardware: MacBook, ThinkPad
   - Services: GitHub, AWS, Azure

4. **Technical Terms**:
   - Programming languages: JavaScript, TypeScript
   - Frameworks: React, Vue, Django
   - Concepts: API, REST, GraphQL

5. **Place Names**:
   - Cities: 台北, 上海, New York
   - Countries: 美國, 日本, Singapore
   - Landmarks: 101, 故宮

### Extraction Process

From `origin.md`:

1. **Identify Proper Nouns**:
   - Scan for capitalized English words
   - Identify Chinese proper nouns by context
   - Extract technical terminology
   - Note product and brand names

2. **Build Reference Dictionary**:
   - Create mapping of proper nouns
   - Include variations and abbreviations
   - Note correct capitalization
   - Record context for disambiguation

3. **Apply to SRT**:
   - Match proper nouns in subtitles
   - Standardize to reference version
   - Correct capitalization
   - Fix spacing around proper nouns

### Standardization Rules

1. **Capitalization**:
   - Follow reference document exactly
   - Maintain brand-specific styling (iPhone, macOS, GitHub)
   - Preserve acronym capitalization (API, REST, HTTP)

2. **Spacing**:
   - Add spaces around English proper nouns in Chinese text
   - Maintain internal spacing in multi-word names
   - Follow brand guidelines (e.g., "App Store" not "AppStore")

3. **Consistency**:
   - Use same form throughout (不要 Python/python 混用)
   - Standardize abbreviations (API vs. A.P.I.)
   - Maintain terminology consistency

## Terminology Consistency

### Building Terminology Database

From `origin.md`, extract:

1. **Domain-Specific Terms**:
   - Technical vocabulary
   - Industry jargon
   - Specialized concepts

2. **Preferred Translations**:
   - English → Chinese mappings
   - Consistent translation choices
   - Standard terminology

3. **Abbreviations and Acronyms**:
   - Full form vs. abbreviated form
   - When to use which
   - Correct formatting

### Application Strategy

1. **First Occurrence**: Establish terminology from reference
2. **Subsequent Uses**: Apply consistently throughout SRT
3. **Context Sensitivity**: Adjust for spoken vs. written context
4. **Preserve Meaning**: Don't force terminology that changes meaning

## Edge Cases and Special Handling

### Multiple Matches

When SRT content matches multiple sections in `origin.md`:
- Use sequential context to determine correct match
- Consider timestamp position in video
- Match based on topic flow
- Choose most semantically similar match

### No Match Found

When SRT content has no clear match in `origin.md`:
- Still apply spacing rules
- Don't invent corrections
- Preserve original text
- Flag for manual review if critical

### Paraphrasing

When SRT paraphrases `origin.md`:
- Recognize semantic equivalence
- Don't force exact wording
- Correct only clear errors
- Preserve speaker's phrasing style

### Colloquial Language

When SRT uses colloquial speech:
- Respect spoken language style
- Don't over-formalize
- Correct typos, not style
- Maintain natural flow

### Filler Words

Common in spoken transcripts:
- 那個, 就是, 然後, 嗯, 啊
- Generally preserve unless clearly errors
- Remove only if reference omits them
- Maintain natural speech patterns

## Quality Assurance

### Pre-Enhancement Checks

- [ ] `origin.md` exists and is readable
- [ ] SRT file is valid and parseable
- [ ] Both files use consistent encoding (UTF-8)

### During Enhancement

- [ ] Each correction has reference basis
- [ ] Timestamps remain unchanged
- [ ] Subtitle numbering preserved
- [ ] No content added from markdown
- [ ] Spacing rules applied consistently

### Post-Enhancement Validation

- [ ] Output file is `enhanced.srt`
- [ ] Subtitle count matches original
- [ ] All timestamps identical to original
- [ ] Proper nouns standardized
- [ ] English/numbers have proper spacing
- [ ] No semantic meaning changed
- [ ] SRT format is valid

## Examples

### Example 1: Typo Correction

**origin.md**: "這個工具非常強大"
**SRT Original**: "這個工俱非常強大"
**SRT Enhanced**: "這個工具非常強大"
**Reason**: 工俱 → 工具 (typo correction)

### Example 2: Proper Noun Standardization

**origin.md**: "使用 Python 3.9 開發"
**SRT Original**: "使用python3.9開發"
**SRT Enhanced**: "使用 Python 3.9 開發"
**Reason**: Capitalization + spacing

### Example 3: Terminology Consistency

**origin.md**: "機器學習模型"
**SRT Original**: "機器學習模形"
**SRT Enhanced**: "機器學習模型"
**Reason**: 模形 → 模型 (correct terminology)

### Example 4: No Change Needed

**origin.md**: "今天要討論這個主題"
**SRT Original**: "今天我們來聊這個主題"
**SRT Enhanced**: "今天我們來聊這個主題"
**Reason**: Paraphrasing is acceptable, no errors

### Example 5: Spacing Only

**origin.md**: "使用 API 進行整合"
**SRT Original**: "使用API進行整合"
**SRT Enhanced**: "使用 API 進行整合"
**Reason**: Add spacing around English acronym

## Best Practices

1. **Be Conservative**: When in doubt, preserve original
2. **Context is Key**: Use surrounding content for validation
3. **Respect Speech Patterns**: Don't over-formalize spoken language
4. **Verify Changes**: Each correction should have clear justification
5. **Maintain Flow**: Ensure corrections don't disrupt reading rhythm
6. **Test Output**: Validate enhanced SRT is still valid and readable

## Common Pitfalls to Avoid

1. **Over-Correction**: Changing style instead of errors
2. **Adding Content**: Including markdown content not in SRT
3. **Timestamp Modification**: Never change timing
4. **Forced Matching**: Matching unrelated content
5. **Ignoring Context**: Correcting based on isolated words
6. **Inconsistent Application**: Applying rules selectively

Focus on improving accuracy while preserving the natural flow and structure of the original subtitles.

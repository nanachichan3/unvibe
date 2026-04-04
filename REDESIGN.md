# Unvibe Games — Full Redesign Spec

## Philosophy

Every game is a **code reading exercise**. Players look at real code, reason about it, and answer. No filename trivia, no metadata lotto. The codebase is the question bank.

**Two modes per game:**
- **Simple** — Parser/heuristic-only, no AI calls, instant, free
- **AI** — LLM generates the content (better distractors, harder questions, real code analysis). Token cost shown prominently. Toggle clearly visible.

---

## Game Roster

### G1: What Does This Do?
**Simple:** Parser extracts functions (5-50 lines). Heuristic description generated from function name + structure. Distractors: verb/object swaps (filter↔map, items↔users), mutation flags, side-effect flags.
**AI:** Snippet sent to Gemini → "Generate 1 correct + 3 wrong but plausible descriptions." Token cost shown before generating.
**Answer:** 4 plain-English descriptions. One correct.
**Difficulty:**
- Easy: Single function, no side effects, clear return
- Medium: Nested conditionals, callbacks, early returns
- Hard: Closures, async chains, complex FP

---

### G2: Find the Bug
**Simple:** AST pattern-matching on known bad patterns:
- `for...in` on array, `==` instead of `===`, `JSON.parse` without try/catch, `await` in non-async, reassigned `const`, mutated default args, leaked internal state
**AI:** Gemini analyzes snippet → identifies the most interesting bug + 3 plausible alternatives. Token cost shown.
**Answer:** 4 bug descriptions. One correct with exact line highlighted.
**Difficulty:**
- Easy: null dereference, div-by-zero, ==/===, undefined var
- Medium: closure trap in loop, race condition, missing error handling
- Hard: prototype pollution, SQL injection, subtle off-by-one

---

### G3: Trace the Call
**Simple:** Parser builds call graph from `require()`/`import` + function name references. Given entry function, show its body + 1-3 levels of called functions (expandable).
**AI:** Gemini traces the full call chain, identifies the ultimate return type/value. Token cost shown.
**Answer:** 4 possible return types/values.
**Difficulty:**
- Easy: 1 hop, no conditionals
- Medium: 2-3 hops, conditionals
- Hard: 3+ hops, cross-files, async

**UI:** Collapsible function tree. Click [+ expand] to see called function bodies.

---

### G4: Spot the Vulnerability
**Simple:** AST pattern-match on security anti-patterns:
- `eval(`, `new Function(`, `innerHTML =`, hardcoded passwords, SQL template literals, `fs.readFile(req.body.path`, weak crypto
**AI:** Gemini does deeper analysis → SSRF, path traversal, auth bypasses, etc. Token cost shown.
**Answer:** 4 files labeled A/B/C/D. One has a vulnerability.
**UI:** 2×2 grid of snippets. Tap to select.

---

### G5: Type Inference
**Simple:** TypeScript/JavaScript shown with `?` markers. Player infers types from usage. Limited without types.
**AI:** Gemini infers full TypeScript types, generates type questions. Token cost shown.
**Answer:** 4 type descriptions.
**Difficulty:**
- Easy: primitives
- Medium: arrays, unions, generics
- Hard: conditional types, mapped types, `infer`

---

### G6: Refactor This
**Simple:** Pattern-match obvious code smells → offer known-good refactors as options.
**AI:** Gemini sees messy code → generates 1 clean refactor + 3 plausible but worse alternatives (over-engineered, buggy, style-only). Token cost shown.
**Answer:** 4 versions (A/B/C/D). One is cleaner + correct.
**Difficulty:**
- Easy: DRY violations, if/else → switch
- Medium: callback → async/await, mutation → functional
- Hard: perf issues, architectural improvements

---

### G7: Read the Architecture
**Simple:** Directory tree from `buildDirectoryTree()`. Language detection + file naming → architectural pattern inference.
**AI:** Gemini analyzes full tree + key files → architectural decision-making questions.
**Answer:** 4 options (pattern name or strategic question).
**Difficulty:**
- Easy: frontend/backend/monorepo?
- Medium: pattern (MVC/MVVM/Clean/Layered/Feature)
- Hard: "Where would you add X?" / "What's the data flow?"

---

### G8: Commit Timeline ⭐ NEW
**GitHub data required.**
**Shows:** A commit (message + diff summary of changed files)
**Question:** "When was this commit made?"
**Answer:** 4 date ranges (Q1 2024 / Q2 2024 / etc. OR specific month ranges)
**Mechanics:** From GitHub API: commit date is the ground truth. Distractors are other commits from the same repo.
**No AI needed:** Commit timestamp from GitHub API. Distractors from other commit times.

---

### G9: Code Timeline ⭐ NEW
**Shows:** A code snippet
**Question:** "When was this code likely written?"
**Answer:** 4 year/quarter ranges
**Simple:** Style heuristics — older patterns (var vs const, callbacks vs async/await, CommonJS vs ESM, React class vs hooks)
**AI:** Gemini analyzes code style + idioms → estimates era. Token cost shown.
**Difficulty:**
- Easy: obviously old (var, function expressions, `$.ajax`)
- Medium: mix of old/new patterns
- Hard: subtle style cues (subtle naming conventions, patterns characteristic of certain eras)

---

### G10: Commit Author ⭐ NEW
**GitHub data required.**
**Shows:** A commit (message + diff summary)
**Question:** "Who made this commit?"
**Answer:** 4 author names (1 correct, 3 other contributors from the repo)
**Mechanics:** From GitHub API. Ground truth from commit author. Distractors from other repo contributors.

---

### G11: Line Author ⭐ NEW
**GitHub data required.**
**Shows:** A specific line or short block of code
**Question:** "Who wrote this line?"
**Answer:** 4 author names
**Simple:** Not really possible without GitHub blame data.
**AI:** Gemini analyzes line style + compares to known contributor styles → guesses author. Token cost shown. Actually needs GitHub blame API (`/blame`) to be accurate, so GitHub mode only.
**Difficulty:**
- Easy: Distinctive naming, unusual patterns
- Hard: Common patterns, multiple contributors with similar style

---

## UI Architecture

### Mode Toggle
```
[Simple] ●━━━━━○ AI
         ~0 tokens    ~500-2000 tokens
```
Always visible. Clear cost indicator. One click to switch.

### Token Counter
Persistent banner when AI mode is on:
```
🤖 AI mode active · this round: ~1,240 tokens · session: ~12,400 tokens
```
Resets per round, accumulates per session.

### Game Card Layout
Each game has a distinct visual identity (not the same 4-button grid):

| Game | Primary UI |
|------|-----------|
| What Does This Do | Code snippet + 4 radio options |
| Find the Bug | Code with highlighted line + 4 options |
| Trace the Call | Collapsible function tree + 4 options |
| Spot the Vuln | 2×2 snippet grid + A/B/C/D selector |
| Type Inference | TypeScript with `?` markers + 4 options |
| Refactor This | Before code + 4 version cards (A/B/C/D) |
| Read the Architecture | Directory tree + 4 option chips |
| Commit Timeline | Commit card (message + files) + timeline selector |
| Code Timeline | Code snippet + year range selector |
| Commit Author | Commit card + 4 avatar+name cards |
| Line Author | Code line(s) + 4 avatar+name cards |

### Scoring
- Base: 100 pts
- Multipliers: Easy ×1, Medium ×1.5, Hard ×2
- Streak bonus: ×1.1 per consecutive correct (caps at ×2)
- AI mode: same scoring (token cost is separate, shown not deducted)

---

## Implementation Plan

### Phase 1: Core Parser + Games 1, 2, 4
- Bug pattern database (20+ patterns)
- Vulnerability pattern database (15+ patterns)
- Snippet extraction + heuristic description generator
- AI integration with token counting + cost display
- Mode toggle UI + token counter

### Phase 2: Games 3, 5, 6, 7
- Call graph builder
- TypeScript type inference (AI)
- Refactor generator (AI)
- Architecture analyzer (AI + heuristics)

### Phase 3: GitHub Games 8, 9, 10, 11
- GitHub API integration (commits, blame, contributors)
- Timeline UI component
- Commit/author display cards
- Code style age estimator (heuristic + AI)

### Phase 4: Polish
- VIM theme refinement per game
- Hint system (-50% pts after 10s)
- Streak animations
- Session summary screen

---

## Component Map (New Files)

```
components/
  GameCard.tsx           # Base card wrapper
  CodeSnippet.tsx       # Syntax-highlighted code block
  ModeToggle.tsx         # Simple/AI toggle + token counter
  TokenMeter.tsx         # Session token accumulator display
  games/
    WhatDoesThisDo.tsx
    FindTheBug.tsx
    TraceTheCall.tsx
    SpotTheVuln.tsx
    TypeInference.tsx
    RefactorThis.tsx
    ReadTheArchitecture.tsx
    CommitTimeline.tsx
    CodeTimeline.tsx
    CommitAuthor.tsx
    LineAuthor.tsx
lib/
  patterns/
    bugs.ts              # Bug pattern definitions
    vulnerabilities.ts   # Security anti-patterns
    codeStyles.ts        # Era detection heuristics
  ai/
    client.ts            # Gemini API wrapper with token counting
    generators.ts        # AI question generators per game
  callgraph.ts           # Call chain builder
  github/
    commits.ts           # GitHub commit/blame API
    contributors.ts      # GitHub contributors API
```

---

## Backward Compatibility

- Keep `soloGame` and `mixedMode` from current implementation
- Games 1-7 replace existing games 1-6 (new IDs)
- GitHub games (8-11) only appear when GitHub data is loaded
- Score persistence continues to work
- All existing games' scores are preserved in localStorage

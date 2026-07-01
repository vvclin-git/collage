# Collage App Multi-Agent Workflow

This document adapts the multi-agent workflow template to the photo collage editor repository.

## Purpose

Use multi-agent workflows when a task is large enough that one sequential Codex thread becomes hard to manage, such as:

- Layout engine changes that affect existing collage trees.
- Photo pan/zoom/pinch/drag-drop behavior changes.
- Zustand state lifecycle changes.
- Export behavior changes.
- UI polish plus test updates.
- Release/deployment preparation.
- Large bug investigations.

Prefer one implementation owner for small tasks. Use parallel subagents mainly for read-heavy exploration, tests, and separated file zones.

## Repository-specific boundaries

| Zone | Primary files | Main responsibility |
| --- | --- | --- |
| App shell/import | `src/App.tsx`, `src/lib/photoAssets.ts` | Mode routing, file import/drop flow, decoding, and object URL creation |
| Layout engine | `src/lib/layout.ts`, `src/lib/layout.test.ts` | Split tree, rect calculation, ratio clamping, deletion, equalization |
| Layout editor | `src/components/LayoutEditor.tsx` | Layout-building user interactions |
| Photo interaction | `src/components/CollageEditor.tsx`, `src/components/PhotoTray.tsx`, `src/lib/photos.ts`, `src/lib/photos.test.ts` | Photo tray, placement, pan, zoom, pinch, clamp behavior |
| State | `src/store/useCollageStore.ts`, `src/store/useCollageStore.test.ts`, `src/types.ts` | Mode, layout, photos, placements, object URL lifecycle |
| Export | `src/lib/export.ts` | Canvas render and local PNG download |
| Build/deploy | `package.json`, `vite.config.ts`, `.github/workflows/deploy.yml`, `README.md` | Scripts, Vite base path, GitHub Pages deployment, user-facing docs |

Agents must avoid cross-zone edits unless the Coordinator defines an interface and merge order.

## Agent roster

1. `collage_coordinator` — decomposition and integration strategy.
2. `collage_code_scout` — read-only mapping.
3. `collage_spec_planner` — implementation-ready specs.
4. `layout_engine_agent` — layout math and tests.
5. `layout_editor_ui_agent` — layout editor UI.
6. `photo_canvas_agent` — photo placement, React-Konva, tray, photo math.
7. `zustand_state_agent` — state transitions and object URL lifecycle.
8. `export_pipeline_agent` — local PNG export.
9. `ui_accessibility_agent` — bounded polish, labels, accessibility.
10. `qa_test_agent` — Vitest/build/manual verification.
11. `build_deployment_agent` — build tooling, Vite configuration, and GitHub Pages deployment.
12. `docs_release_agent` — README/docs/release notes.
13. `openai_docs_researcher` — OpenAI/Codex docs verification.
14. `integration_reviewer` — final readiness review.

The main thread owns orchestration. `collage_coordinator` is a direct, read-only planning subagent: it returns decomposition, file ownership, sequencing, and validation criteria to the main thread. The main thread then spawns implementation, QA, and review agents. With `max_depth = 1`, direct subagents cannot spawn another layer of agents.

## Task classification matrix

| Task type | Lead agent | Support agents | Typical files |
| --- | --- | --- | --- |
| Small label/CSS fix | `ui_accessibility_agent` | `qa_test_agent` if behavior changes | Components, CSS |
| File import/object URL behavior | `photo_canvas_agent` | `zustand_state_agent`, `qa_test_agent` | `App.tsx`, `photoAssets.ts`, store if needed |
| Photo tray filtering | `photo_canvas_agent` | `zustand_state_agent`, `qa_test_agent` | `PhotoTray.tsx`, `photos.ts`, tests |
| Pan/zoom/pinch bug | `photo_canvas_agent` | `qa_test_agent`, optionally `collage_code_scout` | `CollageEditor.tsx`, `photos.ts`, tests |
| Split math change | `layout_engine_agent` | `qa_test_agent` | `layout.ts`, `layout.test.ts` |
| Layout editor interaction | `layout_editor_ui_agent` | `layout_engine_agent`, `qa_test_agent` | `LayoutEditor.tsx`, maybe `layout.ts` |
| Mode/placement lifecycle | `zustand_state_agent` | `photo_canvas_agent`, `qa_test_agent` | Store, types, affected components |
| Export dimensions/background/clipping | `export_pipeline_agent` | `layout_engine_agent`, `photo_canvas_agent`, `qa_test_agent` | `export.ts`, helper libs, tests |
| GitHub Pages / Vite deployment | `build_deployment_agent` | `qa_test_agent`, `docs_release_agent` | `package.json`, Vite/TypeScript config, workflow, README when needed |
| Large bug investigation | `collage_coordinator` | `collage_code_scout`, relevant specialists, `qa_test_agent` | Start read-only |
| Final merge readiness | `integration_reviewer` | `qa_test_agent` | All changed files read-only |

## Standard execution patterns

### Pattern A — Single owner, reviewer agents

Use for most tasks.

```text
main thread -> collage_coordinator (planning) -> one implementation agent -> qa_test_agent -> integration_reviewer
```

The arrows describe sequencing controlled by the main thread; they do not mean the coordinator spawns the next agent.

### Pattern B — Parallel independent slices

Use only when file ownership is cleanly separated.

```text
collage_coordinator
  -> layout_engine_agent
  -> photo_canvas_agent
  -> docs_release_agent
qa_test_agent
integration_reviewer
```

Here too, the main thread asks the coordinator for the split and then launches the independent agents itself.

Rules:

- No two agents edit the same large file in parallel.
- If two zones need the same state/API shape, Coordinator defines the interface first.
- Integration reviewer checks dependency order and test evidence.

### Pattern C — Design first, implementation later

Use for ambiguous UX or state lifecycle changes.

```text
collage_code_scout -> collage_spec_planner -> implementation agent(s) -> qa_test_agent -> integration_reviewer
```

## Feature workflow examples

### 1. Fix photo tray rough edge

Recommended split:

1. `collage_code_scout` verifies current `PhotoTray.tsx` and `getTrayPhotos()` behavior.
2. `photo_canvas_agent` implements the intended filtering or UI fix.
3. `qa_test_agent` adds/updates `photos.test.ts` and runs `pnpm test`.
4. `integration_reviewer` checks no state/export/layout behavior was accidentally changed.

Guardrail: verify current code first; stale summaries may mention rough edges that are already fixed.

### 2. Preserve placements across layout adjustment

Recommended split:

1. `collage_spec_planner` defines exact lifecycle behavior and non-goals.
2. `zustand_state_agent` owns state transition changes.
3. `photo_canvas_agent` owns component wiring if needed.
4. `qa_test_agent` adds store and photo math tests.
5. `integration_reviewer` checks layout IDs, placement references, and UX risks.

Guardrail: do not silently keep placements when leaf IDs are replaced unless there is a deliberate migration rule.

### 3. Add export size option

Recommended split:

1. `collage_spec_planner` defines available sizes and UI placement.
2. `export_pipeline_agent` changes export options and rendering behavior.
3. `ui_accessibility_agent` or `photo_canvas_agent` adds UI controls if needed.
4. `qa_test_agent` verifies `pnpm test` and `pnpm build`.
5. `docs_release_agent` updates README only if the user-facing workflow changes.

Guardrail: keep export local and do not duplicate layout/photo math.

### 4. Layout engine behavior change

Recommended split:

1. `collage_code_scout` maps existing tests and helpers.
2. `layout_engine_agent` changes pure math and tests.
3. `layout_editor_ui_agent` changes UI only if the behavior is user-facing.
4. `qa_test_agent` runs focused layout tests and `pnpm test`.
5. `integration_reviewer` checks visual/state implications.

Guardrail: keep `layout.ts` pure and deterministic.

## Standard agent prompt template

```text
Read AGENTS.md first.
Then read docs/AGENT_ROLES.md and docs/MULTI_AGENT_WORKFLOW.md if present.

Role:
[agent name]

Goal:
[one specific task]

Scope:
Modify only:
- [file or folder]

Avoid modifying:
- unrelated layout/photo/state/export/UI files
- README.md unless user-facing workflow changes
- generated build output such as dist/
- package dependencies unless explicitly requested

Before coding:
- Identify current behavior in the smallest relevant files.
- Briefly state the planned change.

After coding:
- Summarize changed files.
- List tests run and results.
- List tests not run.
- Note risks or follow-up work.
- Report whether any local HTTP server was started and stopped.
```

## Final user report format

```text
Changed
- ...

Files
- ...

Tests
- Command: ...
- Result: ...

Build
- Command: ...
- Result: ...

Not run
- ...

Risks / follow-up
- ...

Server status
- Not started / Started and stopped / Still running with details
```

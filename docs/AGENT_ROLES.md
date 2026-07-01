# Collage App Agent Roles and Model Routing

This document adapts the prior multi-agent role template to `vvclin-git/collage`.

## Model routing

| Work type | Recommended agent | Model |
| --- | --- | --- |
| Task decomposition and integration strategy | `collage_coordinator` | `gpt-5.5` |
| Cheap codebase scan | `collage_code_scout` | `gpt-5.4-mini` |
| Ambiguous feature specification | `collage_spec_planner` | `gpt-5.5` |
| Layout tree math | `layout_engine_agent` | `gpt-5.4` |
| Layout editor interaction | `layout_editor_ui_agent` | `gpt-5.4` |
| Photo placement / React-Konva / tray | `photo_canvas_agent` | `gpt-5.4` |
| Zustand state lifecycle | `zustand_state_agent` | `gpt-5.4` |
| PNG export rendering | `export_pipeline_agent` | `gpt-5.4` |
| UI polish / labels / accessibility | `ui_accessibility_agent` | `gpt-5.4-mini` |
| Test authoring and verification | `qa_test_agent` | `gpt-5.4` |
| Build tooling and deployment | `build_deployment_agent` | `gpt-5.4` |
| Documentation and release notes | `docs_release_agent` | `gpt-5.4-mini` |
| Codex/OpenAI doc verification | `openai_docs_researcher` | `gpt-5.4-mini` |
| Final review | `integration_reviewer` | `gpt-5.5` |

## Escalation rules

Escalate to `gpt-5.5` or the Coordinator when:

- A change touches more than one major ownership zone.
- A behavior change affects both state and UI.
- A layout change could invalidate existing placements.
- An export change changes output dimensions, aspect ratio, clipping, or file behavior.
- A change alters the local-only privacy invariant.
- A proposed implementation needs more than three major files.

## Role cards

### `collage_coordinator`

Owns decomposition, sequencing, file ownership, validation plan, and final acceptance criteria. Usually read-only.

### `collage_code_scout`

Read-only codebase mapper. Returns relevant files, symbols, current behavior, tests, edit points, and risks.

### `collage_spec_planner`

Read-only spec writer. Converts user intent into implementation-ready acceptance criteria and test plans.

### `layout_engine_agent`

Owns `src/lib/layout.ts` and `src/lib/layout.test.ts`. Keeps split-tree math pure and tested.

### `layout_editor_ui_agent`

Owns `src/components/LayoutEditor.tsx` and layout-editor UI behavior. Does not own photo placement.

### `photo_canvas_agent`

Owns `src/App.tsx`, `src/lib/photoAssets.ts`, `src/components/CollageEditor.tsx`, `src/components/PhotoTray.tsx`, `src/lib/photos.ts`, and `src/lib/photos.test.ts` for photo import and editing behavior.

### `zustand_state_agent`

Owns `src/store/useCollageStore.ts`, store tests, object URL lifecycle, placement clearing, and state invariants.

### `export_pipeline_agent`

Owns `src/lib/export.ts`. Keeps PNG export local, clipped, aspect-ratio aware, and consistent with layout/photo helpers.

### `ui_accessibility_agent`

Owns small UI polish, labels, disabled states, focus/touch improvements, and bounded CSS/component updates.

### `qa_test_agent`

Owns focused regression tests, `pnpm test`, `pnpm build`, and manual browser verification reporting.

### `build_deployment_agent`

Owns `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, TypeScript configuration, and `.github/workflows/deploy.yml` for build tooling and GitHub Pages deployment.

### `docs_release_agent`

Owns README, docs, release notes, and deployment documentation only when justified by user-facing behavior or explicit handoff needs. Does not modify build or CI configuration.

### `openai_docs_researcher`

Read-only verifier for current OpenAI/Codex docs, especially `.codex/config.toml`, `.codex/agents/*.toml`, `AGENTS.md`, model routing, and subagent workflow behavior.

### `integration_reviewer`

Final read-only reviewer for merge readiness. Does not start new feature work.

## Handoff contracts

### Scout -> Planner

```text
Relevant files:
Current behavior:
Existing tests:
Likely edit points:
Unknowns:
```

### Planner -> Implementer

```text
Goal:
Non-goals:
Files allowed to edit:
Behavior to preserve:
Required tests:
Acceptance criteria:
Risks:
```

### Implementer -> QA

```text
Files changed:
Behavior changed:
Tests added:
Manual cases to verify:
Known weak spots:
```

### QA -> Integration

```text
Commands run:
Results:
Failures:
Coverage gaps:
Risk assessment:
```

### Integration -> User / Next Thread

```text
Summary:
Files changed:
Tests run:
Known risks:
Follow-up:
Handoff note:
```

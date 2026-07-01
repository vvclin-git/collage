Project Overview
================

This project is a pure client-side photo collage editor built with React, TypeScript, Vite, React-Konva, and Zustand.

Includes:

- Swipe-based binary layout creation and divider editing
- Local JPG, PNG, and WebP import using browser object URLs
- Per-cell photo placement, panning, and zooming
- Canvas-based PNG export
- Vitest regression tests
- GitHub Pages deployment

Prioritize correct geometry, predictable interactions, local-only photo handling, focused changes, and behavior verified by tests and browser checks.

Repository Map
==============

Use the smallest relevant file set for each task.

- `src/App.tsx`: top-level mode switching, file drop/import flow, and application composition.
- `src/components/LayoutEditor.tsx`: layout creation gestures, divider selection, resizing, deletion, and equalization UI.
- `src/components/CollageEditor.tsx`: photo placement, pan/zoom interactions, adjust-layout mode, tray coordination, and export flow.
- `src/components/PhotoTray.tsx`: imported-photo tray and photo removal controls.
- `src/components/Toolbar.tsx`: shared editor controls.
- `src/store/useCollageStore.ts`: authoritative application state and state transitions.
- `src/lib/layout.ts`: layout geometry, split-tree operations, hit testing, render rectangles, and divider handles.
- `src/lib/photos.ts`: photo-selection and tray helpers.
- `src/lib/photoAssets.ts`: browser file decoding and object-URL-backed photo assets.
- `src/lib/export.ts`: final canvas rendering and PNG download.
- `src/types.ts`: shared domain and geometry types.
- `src/styles.css`: application styling and responsive behavior.
- `src/**/*.test.ts`: focused Vitest regression tests. Treat tests as executable behavior documentation.
- `vite.config.ts`: Vite, Vitest, and GitHub Pages base-path configuration.
- `.github/workflows/deploy.yml`: CI test, build, and GitHub Pages deployment flow.
- `README.md`: human-facing setup, behavior, and usage guide.
- `CHANGELOG.md`: release or milestone-level history.
- `docs/AI_HANDOFF.md`: optional current development status and next-thread handoff context.
- `docs/AGENT_ROLES.md`: optional human-readable custom-agent role reference.
- `docs/MULTI_AGENT_WORKFLOW.md`: optional detailed multi-agent workflow reference.
- `.codex/agents/*.toml`: optional executable Codex custom-agent definitions.

Startup Workflow
================

At the beginning of a new Codex thread:

1. Read `AGENTS.md`.
2. Read `docs/AI_HANDOFF.md` if it exists.
3. Use the user's latest prompt as the highest-priority instruction.
4. If the handoff conflicts with the user's prompt or live code, follow the user and live code.
5. If the handoff appears stale or incomplete, mention the uncertainty before broad changes.
6. Inspect the relevant implementation and tests before planning or editing.

Do not use `README.md` or `CHANGELOG.md` as progress-tracking documents.

Source-of-Truth Routing
=======================

Use the right source of truth for the task.

- Layout representation and geometry: `src/types.ts`, `src/lib/layout.ts`, and layout tests.
- Application state and transitions: `src/store/useCollageStore.ts` and store tests.
- Layout editing interactions: `src/components/LayoutEditor.tsx`.
- Photo editing interactions: `src/components/CollageEditor.tsx`.
- Photo import and lifetime: `src/lib/photoAssets.ts` and `src/App.tsx`.
- Export behavior: `src/lib/export.ts` and its callers.
- Styling and responsive behavior: `src/styles.css` and rendered browser behavior.
- Build, test, and base-path behavior: `package.json`, `vite.config.ts`, and the deployment workflow.
- Current development state: `docs/AI_HANDOFF.md`, if present and current.
- User-facing usage: `README.md`.
- Release-level history: `CHANGELOG.md`.

Do not infer mutable product behavior from `AGENTS.md`. Product behavior belongs in code, tests, and explicit user instructions.

Documentation and Handoff Policy
================================

Do not update `README.md` or `CHANGELOG.md` for every small task.

- Update `README.md` when user-facing setup, supported formats, interactions, export behavior, deployment, or major limitations change.
- Update `CHANGELOG.md` for milestones, release preparation, user-visible features, breaking changes, or important bug fixes.
- Use `docs/AI_HANDOFF.md` for internal progress handoff when that file exists or the user requests a handoff.

When the user asks to summarize the thread, prepare a handoff, wrap up, or continue in a new Codex thread, overwrite `docs/AI_HANDOFF.md` with the current state rather than appending a chronology.

Keep the handoff concise and include only: current focus, current state, files recently changed, important decisions, tests run, known issues, next recommended step, and suggested scope for the next thread.

Architecture Boundaries
=======================

Keep responsibilities separated.

- Keep the application client-side unless the user explicitly requests a backend or upload service.
- Keep layout geometry and structural mutations in `src/lib/layout.ts`, not duplicated across components.
- Derive preview and export rectangles from canonical layout state. Do not persist duplicate rectangle geometry without an explicit design decision.
- Keep state transitions in the Zustand store; components should coordinate interactions and rendering rather than invent parallel state models.
- Keep imported photo metadata separate from per-cell placement transforms.
- Keep export calculations consistent with preview geometry while accounting for export resolution and spacing scale.
- Preserve the distinction between Photo Editing mode and Adjust Layout mode.
- Avoid combining layout-engine, store, interaction, export, and visual redesign work unless the task requires a coordinated change.
- When behavior changes, add or update focused regression tests.

Layout and Cell Safety
======================

Layout edits can affect IDs, placements, and divider behavior.

- Treat leaf IDs as the link between layout cells and `placements`.
- Treat split IDs as the link between divider UI state and layout mutations.
- Preserve unaffected IDs during local layout updates.
- Define and test what happens to placements when cells or subtrees are removed or replaced.
- Keep split ratios clamped and ensure generated rectangles have finite, non-negative dimensions.
- Avoid floating-point equality assumptions for geometry and hit testing.
- If replacing the split-tree model, first specify divider ownership, shared-edge resizing, deletion semantics, placement migration, and serialization behavior.

Photo and Browser Resource Safety
=================================

Imported photos remain local to the browser.

- Do not add network upload, analytics, or remote image processing without explicit user approval.
- Revoke object URLs when their assets are permanently removed or the owning lifecycle ends.
- Do not revoke an object URL while any active photo asset still uses it.
- Keep file-type validation and image decoding errors explicit.
- Preserve photo placement transforms when layout-only adjustment is intended to leave them unchanged.
- Do not silently overwrite or discard user-selected photos or placements.

Canvas and Interaction Guidelines
=================================

React-Konva interactions must work across mouse and touch input.

- Keep coordinate conversions explicit when moving between DOM, stage, preview, and export spaces.
- Test gesture changes for click/tap selection, drag, split gestures, pinch zoom, and divider movement as applicable.
- Avoid allowing photo pan or zoom handlers to run while Adjust Layout mode is active.
- Prevent interaction handlers from competing for the same gesture without a clear precedence rule.
- Keep controls usable on both desktop and mobile layouts.
- Preserve keyboard focus, button labels, and accessible names when changing controls.
- Verify visual changes in a browser at representative desktop and mobile viewport sizes.

Multi-Agent Dispatch Policy
===========================

Use custom Codex agents only when their definitions are available and the task is large enough to benefit from separated inspection, planning, implementation, testing, or final review.

If the user says "use the repo agent workflow" or asks to use agents, choose the smallest matching chain. If the user asks only to discuss or plan, use read-only agents only.

Default rules:

- Keep one implementation owner for each file or tightly coupled file group.
- Do not let every agent edit files.
- Use a code-scout role before changing unfamiliar code.
- Use a planner role before broad, ambiguous, state-model, geometry, or cross-layer work.
- Use a QA/reviewer role after implementation.
- Use an integration reviewer before finishing changes spanning layout, store, UI, and export behavior.
- Do not run parallel implementation agents on the same file.
- If the required agent definitions are missing, continue with the same staged workflow in the main thread unless the user asks to stop.

Suggested responsibility groups for future custom-agent definitions:

- Read-only/planning: code scout and planner.
- Code-writing: layout engine, state/store, canvas UI, asset/export, build/deployment, and documentation owners.
- Test/review: QA reviewer and integration reviewer.

Detailed role cards may live in `docs/AGENT_ROLES.md`; detailed workflow examples may live in `docs/MULTI_AGENT_WORKFLOW.md`; executable definitions may live in `.codex/agents/*.toml`.

Generated Files and Dependencies
================================

Do not treat generated files as source of truth.

- Use `pnpm` as declared by `packageManager` in `package.json`.
- Keep `pnpm-lock.yaml` synchronized when dependencies change.
- Do not add or update dependencies unless clearly justified by the task.
- Do not edit or commit `node_modules/`, `dist/`, coverage output, screenshots, downloaded photos, or temporary browser-test output unless explicitly requested.
- Avoid formatting-only changes to unrelated files.

Local Server and UI Testing Policy
==================================

Start a local Vite server only when needed for UI testing.

If a server is started:

- Record the command, host, and port.
- Reuse an appropriate existing server instead of starting redundant servers.
- Stop the server after testing.
- Before finishing, confirm that the server was stopped.
- If it cannot be stopped, report the remaining process, port, and command.

Do not leave background HTTP servers running unless the user explicitly asks.

Development Guidelines
======================

Prefer small, focused, high-confidence changes.

- Modify only files relevant to the task.
- Avoid unrelated refactors and broad rewrites.
- Preserve existing behavior unless the task changes it.
- Prefer pure functions for geometry and data transformations.
- Keep React components focused; extract logic when it becomes independently testable or is shared.
- Avoid hidden global state and direct store mutation.
- Use explicit error handling instead of silent fallback behavior.
- Keep code comments concise and in English.
- Follow the existing strict TypeScript configuration.
- Do not weaken compiler or lint-style checks to make a change pass.

Testing Guidelines
==================

Use Vitest for automated tests.

Recommended full verification:

```powershell
pnpm test
pnpm build
```

For focused changes, run the smallest relevant test first, for example:

```powershell
pnpm exec vitest run src/lib/layout.test.ts
pnpm exec vitest run src/store/useCollageStore.test.ts
```

Testing expectations:

- Layout changes: test geometry, ratios, IDs, split operations, and relevant edge cases.
- Store changes: test state transitions and placement cleanup or preservation semantics.
- Photo-helper changes: update `src/lib/photos.test.ts` or add focused coverage.
- Component interaction changes: add component tests when practical and perform a browser check.
- Export changes: verify dimensions, spacing, cropping, transforms, and PNG generation as applicable.
- Deployment or Vite changes: run the full build and confirm the `/collage/` base-path assumption remains correct.

Do not claim tests passed unless they were actually run. If tests were not run, state why.

Deployment Guidelines
=====================

GitHub Pages deploys from `main` through `.github/workflows/deploy.yml`.

- Preserve the `/collage/` Vite base path unless the deployment target changes.
- Keep local development behavior compatible with the configured base path.
- Do not edit the deployment workflow casually; verify action versions, package-manager version, Node version, test command, build command, and artifact path together.
- Do not push, deploy, or modify remote repository state unless the user explicitly requests it.

Completion Checklist
====================

Before finishing a coding task, report:

- What changed
- Files modified
- Tests and browser checks run
- Test and browser-check results
- Checks not run, if any
- Known risks or limitations
- Follow-up tasks, if any
- Whether docs or handoff files were updated
- Whether any local HTTP server was started and stopped

If the task only produced a plan or documentation and did not modify runtime code, say so explicitly.

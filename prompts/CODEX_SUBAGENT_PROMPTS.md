# Codex Subagent Prompt Cheat Sheet — Collage App

## 1. Small UI polish

```text
Use subagents for this collage repo.
Have collage_code_scout verify the current UI code first.
Then have ui_accessibility_agent make the smallest fix.
Have qa_test_agent run the relevant checks.
Wait for all agents and summarize results by agent.

Goal:
[describe label, CSS, accessibility, or small UI issue]
```

## 2. Photo interaction bug

```text
Use a design-first subagent workflow.
Have collage_code_scout map the current photo placement path.
Have photo_canvas_agent inspect and fix the issue in the smallest relevant files.
Have qa_test_agent add or update focused tests and run pnpm test.
Have integration_reviewer verify no layout/store/export behavior was accidentally changed.

Goal:
[describe photo tray, pan, zoom, pinch, drag/drop, or placement issue]
```

## 3. Layout engine change

```text
Use subagents for this layout-engine task.
Have collage_code_scout identify current layout helpers and tests.
Have layout_engine_agent implement the pure layout math change and focused tests.
Have qa_test_agent run layout tests, pnpm test, and pnpm build if TypeScript surfaces changed.
Have integration_reviewer summarize merge readiness.

Goal:
[describe split, ratio, deletion, equalization, padding, gap, or aspect-ratio change]
```

## 4. Export feature

```text
Use subagents for this export task.
Have collage_spec_planner define the expected export behavior and non-goals.
Have export_pipeline_agent implement only the export pipeline change.
Have photo_canvas_agent or ui_accessibility_agent touch UI only if the planner says UI wiring is required.
Have qa_test_agent run pnpm test and pnpm build.
Wait for all results and return a final report.

Goal:
[describe export size, background, filename, clipping, or output behavior]
```

## 5. Final review of current branch

```text
Review this branch against main using subagents.
Spawn:
- collage_code_scout to map changed code paths.
- qa_test_agent to inspect test coverage and run checks if possible.
- openai_docs_researcher only if .codex, AGENTS.md, or Codex workflow config changed.
- integration_reviewer to produce final merge readiness.

Wait for all agents, then summarize concrete findings with file references.
```

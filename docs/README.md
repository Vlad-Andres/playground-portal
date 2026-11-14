# Documentation

Product, engineering and planning documents for the Learning Playground (`playground-portal` + `playground-template`). Code-level docs stay next to the code: `playground-portal/README.md`, and the course-authoring guides in `playground-template/docs/agent/`.

| Where | What | When to read it |
| --- | --- | --- |
| [`NEXT.md`](NEXT.md) | Live hand-off: what is merged, what awaits the owner, what comes next | Start of every session |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Repo sync flow, storage model, CSP/styling boundaries, local dev command | Before changing cross-repo or hosting behaviour |
| [`product/prd.md`](product/prd.md) | Product requirements for the public "Study with AI" launch | Before product or launch work |
| [`product/launch-plan-review.md`](product/launch-plan-review.md) | Review of the proposed launch plan and its corrected priorities | With the PRD |
| [`plans/launch/pr-plan.md`](plans/launch/pr-plan.md) | Launch workstream, split into PR cards 01–11 | When the owner starts the launch work |
| [`plans/iter-5/`](plans/iter-5/00-guidelines.md) | Iteration 5 (merged): guidelines G1–G8 and packages P, A–E | Decisions and rules that still apply |
| [`plans/iter-4/`](plans/iter-4/) | Iteration 4 (merged): packages C–E | History only |
| [`notes/`](notes/) | Research notes: code runtimes, content-fit rubric for real-model runs | When a plan links to them |

## Conventions

- A new iteration gets `plans/iter-<N>/` with a `00-guidelines.md` and one file per package.
- Notes are dated: `notes/YYYY-MM-<topic>.md`.
- Docs change through a branch and PR like code; `NEXT.md` is updated once per package release.

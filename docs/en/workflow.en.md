# Workflow

> Source: `plan-inicial-proyecto-inventario.md` (sections 1, 6, 8.1, 9). The real CI/CD pipeline (TT-07, TT-08) isn't configured yet — this describes the *designed* flow. Versión en español: `flujo-de-trabajo.md`.

## Steps to make a change

1. Pick a user story (or technical task) from the backlog that meets the **Definition of Ready**: clear acceptance criteria, UI design if applicable, technical dependencies identified.
2. Create a `feature/hu-XX-slug` or `feature/tt-XX-slug` branch from `staging` (see `conventions.en.md` — simplified Gitflow).
3. Move it to "In progress" on the Trello board (WIP limit: 1-2 stories at a time).
4. If the logic is critical (money, inventory, access) → write the test first (TDD) or the Gherkin scenario first (BDD). If it's a simple screen → straight to code + a basic E2E test.
5. Implement it following the corresponding module's hexagonal architecture (domain → application → infrastructure) — see `architecture.en.md` and `conventions.en.md`. Remember: code in English, UI in Spanish.
6. Commit following Conventional Commits, in English (see `conventions.en.md`).
7. Open a PR against `staging`. Requires green CI to merge (branch protection). With a single developer, review means self-review with a checklist.

## "Done" checklist (Definition of Done, per user story)

- [ ] Code written and self-reviewed (personal checklist)
- [ ] Unit and/or BDD tests passing
- [ ] Deployed to the `staging` environment
- [ ] Self-validated against the story's acceptance criteria

**Note**: the functional stakeholder's validation (sign-off) **doesn't happen per individual story** — it happens when each MVP closes (see the MVP section below).

## Iteration close checklist

- [ ] Personal review: does the story meet its acceptance criteria?
- [ ] Fix any errors found **before moving to the next iteration** — they don't pile up
- [ ] Leave a working, deployed commit on `staging`, even if it's small

## MVP close checklist (UAT)

- [ ] Test guide handed to the functional stakeholder, based on that MVP block's stories and acceptance criteria
- [ ] Staging environment with realistic sample data (cumulative across MVPs)
- [ ] Traceable channel for the stakeholder to report findings (shared spreadsheet or GitHub issues)
- [ ] Sign-off is granted once **all of that MVP's stories** pass the checklist
- [ ] Any issues found get fixed before starting the next MVP

## Deploy

Designed (not configured yet — TT-07/TT-08):
- Approved PR with green CI → merge into `staging` → automatic deploy to **staging** (native Vercel/Render auto-deploy, plan section 9.2)
- PR from `staging` into `main` (when an MVP closes with sign-off) → automatic deploy to **production**

[PENDING: exact deploy commands, real service names on Render/Fly.io/Vercel once technical tasks TT-03 through TT-06 are executed]

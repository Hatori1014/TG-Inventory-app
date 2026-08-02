# Contributing

This is a solo/part-time project (see `docs/plan-inicial-proyecto-inventario.md`, section 1), but the branching and commit rules below apply regardless — consistency matters even with one developer.

## Branching strategy

Simplified Gitflow (full rationale in the plan, section 9.1):

| Branch | Purpose | Protected |
|---|---|---|
| `main` | Production. Always deployable. | Yes — requires green CI, no direct pushes |
| `staging` | Integration/UAT environment. | Yes — requires green CI |
| `feature/tt-XX-slug` or `feature/hu-XX-slug` | One branch per technical task or user story | No |
| `fix/slug` | Bug fix | No |
| `hotfix/slug` | Urgent fix on top of production | No, but requires green CI to merge into `main` |

Flow: `feature/hu-08-inventory-movements` → PR into `staging` → CI runs → merge → auto-deploy to staging → manual/UAT validation → when the MVP closes with sign-off, PR from `staging` into `main` → auto-deploy to production.

No separate `develop` branch — `staging` covers that role since there's no parallel team to justify splitting it.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), in English, imperative mood:

```
<type>(<scope>): <imperative description>

feat(auth): add login endpoint (HU-01)
fix(inventory): correct stock calculation on transfer (HU-08)
chore(infra): configure CI pipeline (TT-07)
docs: update MER with new field
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.

## Language

English for everything code-related (branches, commits, variables, functions, files, code comments, database schema). Spanish is reserved for business documentation in `docs/` and communication with the functional stakeholder. See `docs/convenciones.md` for the full rationale.

## Before opening a PR

- [ ] Code self-reviewed
- [ ] Unit/BDD tests passing (`npm run test`)
- [ ] Lint passing (`npm run lint`)
- [ ] Builds successfully (`npm run build`)

Full Definition of Done: `docs/flujo-de-trabajo.md`.

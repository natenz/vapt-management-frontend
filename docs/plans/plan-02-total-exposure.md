# Plan 02: Total vulnerability exposure for the tech lead

Status: **planning only, no code yet.** Derived from item 3 of the revision planning notes. Revised on 26 Nov 2026 after re-checking against the code and the 24 Nov meeting notes ("the tech lead can see total vulnerability exposure").

Prototype reference: https://glittery-treacle-fc87dc.netlify.app/ (the "Eksposur vulnerability" card on the Ringkasan page).

## Goal

The tech lead can see, straight from the dashboard, how many findings are still unresolved across all projects, broken down by severity.

## Definition (from the prototype, mapped to our model)

Prototype: "findings that are not yet Closed-Verified or Risk Accepted", counted per severity, across all projects.

Finding statuses in this app (`internal/model/constants.go`):
- `open`: not fixed yet.
- `closed`: fixed and passed the retest.
- `closed_with_note`: closed without a fix (for example, the client accepts the risk). A note is required.

Mapping used here: `closed` = Closed-Verified, `closed_with_note` = Risk Accepted. So **exposure = the number of findings with status `open`**. This mapping is based on the comments on the constants, not on confirmation from the team. The existing super admin dashboard uses the same definition (see below).

Severities in the app: Critical, High, Medium, Low, Informational (the prototype writes "Info"). This is a plain count, not a CVSS-weighted score.

## Current state (checked in code)

- **The feature already exists for super_admin, just not for the tech lead.** The super admin dashboard renders:
  - `SeverityCard` ("Severity Findings Terbuka"): `open` findings per severity across projects.
  - `RiskiestProjectsCard`: projects with the most open findings, with Critical and High chips.
  - Both live in `src/pages/dashboard/ui/superadmin/finding-cards.tsx` and are computed by `findingTotals` and `riskiestProjects` in `src/pages/dashboard/model/superadmin-metrics.ts`. Only `open` counts as open (`closed_with_note` is folded into closed), from projects at Assessment or later, Done included (`hasFindingsStage`).
  - The data comes from `useSuperAdminData` (`src/pages/dashboard/model/use-superadmin-data.ts`): one `getReport` call per project, with query key `["report", id]`, shared with the report page. A `ponytail` note there suggests an aggregate BE endpoint once the number of projects grows.
- The BE only has `GET /projects/:id/vulnas` and `GET /projects/:id/report`, both per project. There is **no** cross-project or aggregate endpoint. `GET /projects/:id/report` has no role restriction in the router, and the tech lead can see every project (`access.canView`), so the tech lead can use the same data source as the super admin.
- The one-request-per-project pattern that actually runs lives in `use-superadmin-data.ts` (super admin), `use-report-data.ts` (PM and writer), and `use-pentester-data.ts` (pentester). `withFindings` in `dashboard-page.tsx` is always empty for all five roles, so the `listFindings` query there never runs (dead code).
- `TechLeadDashboard` (`src/pages/dashboard/ui/techlead-dashboard.tsx`) has two `SummaryTile`s (Proyek Berjalan, Usulan Catalog) and a `BentoGrid` with `RunningProjectsCard` and `CompletedProjectsCard`. It has no finding data at all. Its tests live in `techlead-dashboard.test.tsx`.
- `trx_vulna` has indexes on `project_id`, `pentester_id`, `asset_id`, and `catalog_vulna_id`. `status` and `severity` are not indexed. That is fine at the current volume, so no new index is needed yet.

## Decisions to confirm

1. **Approach.** Proposed: **stage 1 is FE only**, putting `SeverityCard` and `RiskiestProjectsCard` on the tech lead dashboard with the same data source as the super admin. With no BE change, the tech lead and super admin numbers are guaranteed to match. **Stage 2 is BE**: an aggregate endpoint that replaces the one-request-per-project pattern on both dashboards at once. Alternative: build the BE endpoint first, as originally planned, but then the super admin cards keep the old approach until they are moved too.
2. **Which projects count.** Proposed: all projects at Assessment or later, Done included, because open findings are still exposure. This matches the super admin dashboard today, so both dashboards agree.
3. **Super admin.** Proposed: the BE endpoint (stage 2) allows super_admin and tech_lead and is used by both dashboards.
4. **Per-project breakdown.** The prototype only shows counts per severity and an "all findings" link. This app has no cross-project findings page, so that link would lead nowhere. The list of projects with the most open findings already exists as `RiskiestProjectsCard`, so that serves as the breakdown.

## Plan

### Stage 1: cards on the tech lead dashboard (FE only)
- Extract the `reports` part of `useSuperAdminData` into a small hook of its own (for example `useFindingReports(projects, enabled)` in `src/pages/dashboard/model/`), and use it in both `useSuperAdminData` and the tech lead dashboard. Do not reuse the whole `useSuperAdminData` for the tech lead, because it also fetches users, three catalog lists, and status logs that are not needed here.
- Move `SeverityCard` and `RiskiestProjectsCard` out of the `superadmin/` folder into a shared folder inside `pages/dashboard/ui/` (still the same slice, so `check:layers` is fine), or import them straight from `superadmin/finding-cards.tsx`.
- Add them to `TechLeadDashboard` and pass the data from `DashboardPage` (the query only runs for the tech lead, like the other queries there). Remove the dead `withFindings` code in `dashboard-page.tsx` at the same time, after confirming it is unused.
- Both cards use `SeverityChip`. The pill style of `SeverityChip` is already on develop (commit `0c973f1`, 26 Nov), so branch this stage off develop after that commit.
- Update `techlead-dashboard.test.tsx`: the cards render, the numbers are right, and the loading, error, and all-zero states work.
- FE rules: no hex literals, follow FSD, all UI text in Indonesian, `npm run verify` green.

### Stage 2: aggregate endpoint (BE, then FE)
- Repository: `VulnaRepository.CountOpenBySeverity(ctx)` with a join to projects, so only projects at Assessment or later count (decision 2):
  `SELECT v.severity, COUNT(*) FROM trx_vulna v JOIN trx_project p ON ... WHERE v.status = 'open' AND <project status Assessment or later> GROUP BY v.severity`
- Service: a `VulnaService` method that fills all five severities (zero when missing) and returns `total` and `by_severity`, ordered by `model.Severities`. If `RiskiestProjectsCard` should move too, add the top projects list (ID, name, open count, Critical and High counts).
- Handler and route: `GET /dashboard/exposure` (or `GET /vulnas/exposure`), `roles(sa, tl)` in `internal/router/router.go`.
- Proposed response, wrapped by `response.OK` like the other handlers (`{ success, message, data }`):
  ```json
  { "data": { "total": 1, "by_severity": { "Critical": 0, "High": 0, "Medium": 1, "Low": 0, "Informational": 0 } } }
  ```
- Tests: service and repository tests for zero filling and severity order. Integration tests (pattern in `evidence_integration_test.go`) to make sure only `open` counts and that roles other than sa and tl get 403.
- Add the endpoint to `docs/API_FLOW.md` and the Postman collection in `docs/postman` (both exist in the BE repo).
- FE: a new zod schema in `src/shared/api/schemas.ts`, a `getExposure` function in `entities/finding`, and query key `["exposure"]`. Switch the card data on the tech lead and super admin dashboards to this endpoint, then remove the per-project report fetching that is no longer needed.

## Out of scope

- CVSS weighting or a combined risk score.
- Trends over time. Finding status history is not stored, only the current `trx_vulna.status`.
- Export.

## Size and order

Stage 1 is small and FE only, so it can be done any time, including before the calendar feature. Stage 2 is medium, with one BE branch and one FE branch. Do not push unless asked.

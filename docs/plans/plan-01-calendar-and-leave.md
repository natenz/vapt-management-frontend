# Plan 01: Calendar and leave

Status: **on hold since 27 Nov 2026.** The PM asked to pull this feature for now, including the new "Kalender" menu, and wants the calendar to look like the Gantt chart instead of a month calendar. Stages 1 to 4 were built, then reverted in both repos by the commit "revert: pull the calendar and leave feature for now". The text below is the original plan, kept for reference.

Original status: planning only. Derived from item 2 of the revision planning notes. Rewritten on 26 Nov 2026. Sources: the 24 Nov meeting notes ("calendar planner and leave"), the decisions made on 26 Nov (leave is approved by the tech lead, schedule conflicts are warnings only), the prototype (checked directly on 26 Nov), and the code in both repos.

Prototype: https://glittery-treacle-fc87dc.netlify.app/ (pages Calendar Planner, Capacity & MD, Tim & Cuti, Pengaturan & Data). It keeps its data in localStorage and has no login, so it is only a reference for flows and layout.

## Goals

1. Pentesters can request leave, and the tech lead approves or rejects it.
2. People who plan schedules can see in one calendar who works on which project, who is on leave, and which days are holidays.
3. The PM gets a warning when assigning a pentester on a leave day, on two projects on the same day, or beyond their working days. The assignment can still be saved, as it can today.

## Decisions

Decided on 26 Nov:
- Leave is approved by the tech lead. The super admin may also approve, the same as catalog review.
- The calendar and leave live in a **new "Kalender" menu** under Operasi, not inside Resource. Pentesters must be able to request leave and the PM needs to see leave when assigning, while Resource is only open to super_admin and tech_lead.
- Schedule conflicts are **warnings only**. The prototype's hard-booking rule is not used to reject saves, and saving an assignment works as it does today.

Proposed (open to change, and already assumed by the plan below):
- Leave is for the pentester role only for now, because mandays assignments only exist for pentesters.
- The tech lead and super admin can record leave for anyone, and that leave is approved right away. This is the same pattern as the catalog, where entries created by the TL are approved on creation.
- Pending leave is shown differently from approved leave (hatched), and its warning is softer.
- The tech lead may still approve leave that overlaps existing assignments. The overlaps are listed before approval, and afterwards those assignments are flagged so the PM reschedules them. Leave is an employee right, and blocking approval until the PM moves the schedule would make the TL wait on the PM.
- The leave reason is visible only to its owner, the tech lead, and the super admin. The PM sees dates and status only.
- The PM sees every pentester in the calendar, but project names only for their own projects. Assignments on other projects show as "Proyek lain" (other project). This follows `access.canView`, which limits a PM to their own projects.
- Pentesters see only their own schedule and leave.
- A holiday inside an assignment's date range does not trigger a warning. It simply does not count as a working day, and a warning appears only when the MD exceeds the effective working days. Adding a holiday that overlaps existing assignments is not rejected either, only warned about, because a holiday is a fact.

## What we take from the prototype, and what we leave out

Taken:
- Monthly and weekly calendar with previous, next, and "Hari ini" (today) buttons, plus pentester and project filters.
- Day cells listing pentester and project code (up to three, then "+n lainnya"), the number of available pentesters, and a "Nonkerja" (non-working) label on Saturday and Sunday.
- Clicking a date opens a detail view: each pentester with their project, or "Tersedia" (available).
- Legend: booked, leave, non-working, available.
- Leave form: pentester, start date, end date, reason.
- National or internal holiday calendar. Saturday and Sunday are never working days.
- The conflict rules (one pentester, one project per day; leave and holidays are unavailable), but **as warnings**. The prototype rejects conflicting bookings, while here the assignment can still be saved.
- A conflict warning in the form before saving. The prototype shows "TIME BLOCK BENTROK: 23 Nov 2026, sudah dikunci oleh VAPT-026 ...".

Left out for now:
- Leave approval, which the prototype does not have. We add it.
- Availability percentage per person and the 85% capacity warning.
- Timesheet and actual MD.
- Smart Availability Finder ("Cari slot kosong").
- Schedule CSV export.
- Booking directly from the calendar. In this app an assignment always belongs to a project asset, so it is still created from the asset planner on the project page.
- Work phase per booking (Scoping, Testing, Reporting). In this app, stages live at the project level, not per assignment.

## Leave flow

```
Pentester requests leave ──► Pending ──► TL approves ──────────► Approved (dates marked unavailable)
                                 │
                                 └─────► TL rejects + reason ──► Rejected

Pentester cancels while Pending ──► deleted
TL / SA records leave for anyone ──► Approved right away
```

Rules:
- The start date cannot be after the end date, and the range is at most 60 calendar days.
- The range must contain at least one working day. Leave that covers only Saturday and Sunday is rejected.
- Pentesters can only request leave from today onwards. The TL and SA may record past dates.
- Leave cannot overlap another Pending or Approved leave of the same person.
- Pentesters may edit or cancel their leave while it is Pending. Once it is Approved or Rejected, only the TL and SA may edit or delete it.
- Requesting leave that overlaps assignments is allowed. The overlapping assignments are shown to the pentester when requesting and to the TL when reviewing.

These rules validate the leave record itself, so breaking them is still rejected. Only the overlap between leave and assignments is a warning.

## Schedule conflict warnings

Checked for every pentester assignment (mandays):

| Code | When it appears | Display |
|---|---|---|
| `other_project` | Overlaps an assignment of the same pentester on a **different project**. The same project does not count, because a pentester may hold two assets in the same project. | red |
| `approved_leave` | Overlaps approved leave. | red |
| `pending_leave` | Overlaps pending leave. | yellow |
| `exceeds_workdays` | `allocated_mandays` is more than the effective working days in its range (Monday to Friday, minus holidays and approved leave). | yellow |

- Every mandays row is checked by its dates. Mandays status is not used, because it never changes from `planned`.
- Warnings appear in the asset planner dialog before saving, in calendar cells and the date detail dialog, in the TL's leave list (as `conflicts`), and in the asset list on the project page (a badge on conflicting assignments).
- The BE rejects nothing. `validateMandays`, `CreateMandays`, and `UpdateMandays` stay unchanged, so the asset planner, the demo seeder, and the contract tests keep working as they do today.

## The `/calendar` page

A "Kalender" menu under Operasi, after Resource.

| Role | Menu | What they see and can do |
|---|---|---|
| super_admin, tech_lead | yes | All pentesters and projects. Approve or reject leave, record leave, manage holidays. |
| project_manager | yes | All pentesters. Project names only for their own projects. Leave without the reason. |
| pentester | yes | Their own schedule and leave. Request, edit, and cancel pending leave. |
| technical_writer | no | Has no mandays assignments. |

Three tabs, kept in the URL (`?tab=kalender|cuti|libur`) like the view switch on the Resource page:

1. **Kalender (calendar).** Monthly or weekly, with a pentester filter (hidden for pentesters) and a project filter. Clicking a date opens a detail dialog: each pentester with their status that day (project and asset, leave, pending leave, holiday, or available), conflict markers, and a link to the project.
2. **Cuti (leave).** Table with pentester, from, to, working days, reason, status, and actions. Status filter, defaulting to "Menunggu" (pending) for the TL. An "Ajukan cuti" (request leave) button for pentesters and "Catat cuti" (record leave) for the TL and SA. TL actions: approve, or reject with a reason. Leave with overlaps gets a badge such as "Bentrok 2 penugasan" (2 conflicting assignments) with the details.
3. **Hari libur (holidays).** List per year, add (date and name), delete. Only the TL and SA can change it, other roles can only view.

UI copy stays in Indonesian, following the FE rules in `CLAUDE.md`. Quoted labels in this plan are the actual Indonesian strings.

Sketch of the Kalender tab (monthly view):

```
Kalender                                   [Bulanan | Mingguan]
[Kalender] [Cuti (3)] [Hari libur]
‹ Desember 2026 ›  Hari ini        Pentester ▾   Proyek ▾
 Sen           Sel           Rab           Kam           Jum           Sab      Min
 1             2             3             4             5             6        7
 Dimas·NET-01  Dimas·NET-01  Dimas·NET-01  Dimas·NET-01  Citra·CUTI    Nonkerja Nonkerja
 Citra·CUTI    Citra·CUTI    Citra·CUTI    ⚠Citra·CUTI
 1 tersedia    1 tersedia    1 tersedia    1 tersedia    2 tersedia
■ Terbooking  ■ Cuti  ▨ Cuti menunggu  ■ Libur  □ Nonkerja  ⚠ Bentrok
```

Additions outside the page:
- **Tech lead dashboard:** a `SummaryTile` "Cuti menunggu" (pending leave) next to "Usulan Catalog", with a "Tinjau" (review) button to `/calendar?tab=cuti&status=pending`.
- **Asset planner on the project page:** when the PM picks a pentester and dates, the dialog calls `GET /calendar/check` and shows its warnings. The save button stays enabled.
- **Asset list on the project page:** a "Bentrok" (conflict) badge on assignments that have warnings, with the details on hover or click.

## Data (BE)

`trx_leave` (model `Leave`):
- `leave_id`, `sys_user_id` (FK to `sys_users`, the pentester on leave), `start_date` and `end_date` (`date`), `reason` (text, up to 255 characters).
- `status`: `pending`, `approved`, `rejected`.
- `review_note` (rejection reason), `reviewed_by` (FK to `sys_users`), `reviewed_at`, `created_by` (FK to `sys_users`), timestamps.
- Indexes on `(sys_user_id, start_date)` and `status`.

`ms_holiday` (model `Holiday`):
- `holiday_id`, `date` (`date`, unique), `name`, `created_by`, timestamps.

Register `Leave` after `MsUser`, and `Holiday` in the master data group of `allModels` (`internal/database/postgres.go`). Migrations run through `AutoMigrate` like the other models.

`Project.ScheduleHolidays` (per-project holidays used for the stage schedule) does not change. It could later be pre-filled from `ms_holiday`, but that is out of scope.

## Endpoints (BE)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/leaves?from&to&user_id&status` | sa, tl, pm, pt | Pentesters are forced to their own records. `reason` is blank for the PM. For the TL and SA, each leave carries `conflicts` (overlapping assignments). |
| POST | `/leaves` | sa, tl, pt | Pentesters for themselves, with status `pending`. TL and SA for any pentester, `approved` right away. The response carries `conflicts`. |
| PUT | `/leaves/:id` | sa, tl, pt | Pentesters only their own, and only while `pending`. |
| DELETE | `/leaves/:id` | sa, tl, pt | Pentesters only their own, and only while `pending`. |
| PATCH | `/leaves/:id/review` | sa, tl | Body `{ status: approved|rejected, note }`. `note` is required when rejecting. |
| GET | `/holidays?year` | all | |
| POST | `/holidays` | sa, tl | The response lists overlapping assignments as warnings. |
| DELETE | `/holidays/:id` | sa, tl | |
| GET | `/calendar?from&to&user_id&project_id` | sa, tl, pm, pt | Range of at most 62 days. Response shape below. |
| GET | `/calendar/check?pentester_id&from&to&allocated_mandays&project_id&exclude_mandays_id` | sa, tl, pm | For the asset planner, before saving. A PM may only check their own projects. |

Proposed `GET /calendar` response, wrapped by `response.OK` like the other handlers:

```json
{
  "data": {
    "from": "2026-12-01",
    "to": "2026-12-31",
    "holidays": [{ "date": "2026-12-xx", "name": "Example holiday" }],
    "people": [
      {
        "sys_user_id": 4,
        "name": "Budi Santoso",
        "workdays": 18,
        "bookings": [
          { "mandays_id": 10, "project_id": 5, "project_name": "VAPT HRIS", "project_code": "HRS",
            "asset_name": "HRIS Web Portal", "start_date": "2026-12-07", "end_date": "2026-12-11",
            "allocated_mandays": 4, "masked": false, "warnings": ["approved_leave"] }
        ],
        "leaves": [{ "leave_id": 3, "start_date": "2026-12-21", "end_date": "2026-12-23", "status": "approved" }]
      }
    ]
  }
}
```

- `masked: true` marks assignments on projects the PM may not see. Project and asset names are blank.
- `workdays` is that person's effective working days in the range.
- `warnings` holds codes from the warning table above.

Proposed `GET /calendar/check` response:

```json
{
  "data": {
    "workdays": 4,
    "warnings": [
      { "code": "other_project", "dates": ["2026-12-03", "2026-12-04"], "project_name": "Proyek lain" },
      { "code": "approved_leave", "dates": ["2026-12-04"] },
      { "code": "exceeds_workdays", "message": "5 MD melebihi 4 hari kerja efektif" }
    ]
  }
}
```

The effective-working-day helper and the conflict check are written once in Go and shared by `/calendar`, `/calendar/check`, and the leave `conflicts`. Their table tests follow the pattern in `internal/service/schedule_holidays_test.go`.

## FE parts

- `src/shared/config/roles.ts`: a `NAV` item "Kalender" (`CalendarDays` icon) for sa, tl, pm, and pentester, in the operasi section after Resource.
- `src/app/router/router.tsx`: a `/calendar` route with `RequireAuth` for the same roles.
- New entities: `entities/leave` (api, types, leave status badge), `entities/holiday`, and `entities/calendar` (`getCalendar`, `checkSchedule`). Zod schemas in `src/shared/api/schemas.ts` follow the existing pattern.
- Features: `features/request-leave` (form to request or record leave), `features/review-leave` (approve or reject), and `features/manage-holidays`.
- Widget `widgets/team-calendar` for the monthly and weekly grid and the date detail dialog. The grid uses `date-fns`, which `shared/ui/date-range-picker.tsx` already uses for its month grid in Monday-to-Sunday order. Dates are `YYYY-MM-DD` strings computed with UTC day numbers, as in `techlead-metrics.ts`. Do not use local `Date`.
- Page `pages/calendar` with three tabs (`Tabs` and `SegmentedTabsList` from `shared/ui/tabs.tsx`).
- Tech lead dashboard: the "Cuti menunggu" tile, following the "Usulan Catalog" tile in `techlead-dashboard.tsx`.
- Asset planner (`features/asset-planner`): call `checkSchedule` when the pentester, dates, or MD change (debounced), and show the warnings under that pentester's row. The save path (`buildOps` and `runOps`) does not change.
- FE rules: no hex literals, follow FSD (`check:layers`), all UI text in Indonesian, `npm run verify` green.

## Stages

One branch per stage. Do not push unless asked. This order lets leave, which the meeting asked for and whose flow is decided, ship first.

**Stage 1: leave and holidays (BE)**
- Models `Leave` and `Holiday`, with repository, service, handler, and routes.
- Approval flow, leave overlap check, and the `conflicts` list against mandays.
- Effective-working-day helper.
- Unit tests for the leave and working-day rules. Integration tests (pattern in `internal/router/evidence_integration_test.go`) for roles: a pentester cannot approve, a pentester cannot see other people's leave, and the PM does not receive `reason`.
- Add the endpoints to `docs/API_FLOW.md` and the Postman collection in `docs/postman`.

**Stage 2: leave and holiday pages (FE)**
- `/calendar` menu and route with the Cuti and Hari libur tabs. The Kalender tab follows in stage 4.
- "Cuti menunggu" tile on the tech lead dashboard.
- After this stage, the "leave" point from the meeting is usable.

**Stage 3: calendar and conflict-check endpoints (BE)**
- `GET /calendar` with masking for the PM, the restriction for pentesters, and `warnings` per assignment.
- `GET /calendar/check` for the asset planner.
- `GET /calendar` also replaces the one-request-per-project pattern in `getResourceLoad` and `listActiveProjectDetails` (`src/entities/project/api/index.ts`), which is currently capped at 100 projects.

**Stage 4: calendar tab and warnings (FE)**
- Monthly and weekly grid, filters, legend, and date detail dialog.
- Warnings in the asset planner and the "Bentrok" badge in the asset list on the project page.

**Stage 5: clean-up**
- Change `mandaysInMonth` in `src/entities/project/model/load.ts` to split MD over effective working days from the BE instead of calendar days. It feeds `/resources`, the team picker on the new-project page, and the pentester dashboard.
- Move `getResourceLoad` and `listActiveProjectDetails` to `GET /calendar`, then update `resources.contract.test.ts`.
- Decide what to do with `WorkloadHeatmapCard`, which is not rendered anywhere: use it on the tech lead dashboard (with `bookedInRange` switched to effective working days) or delete it.

## Relevant code (checked 26 Nov)

BE:
- Assignments live in `trx_mandays` (`internal/model/project.go`) and are created through the asset planner by the project's PM. `validateMandays` (`internal/service/project_service.go`) does not check conflicts, weekends, holidays, or leave, and this plan does not change it.
- `trx_mandays.status` never changes. The FE always sends `planned`, and the BE has no flow that moves it.
- The approval pattern to copy is the catalog's: `catalogStatusForActor` and `ReviewCatalog` (`internal/service/vulna_service.go`), and the route `PATCH /catalog-vulnas/:id/review` with `roles(sa, tl)`. Unlike catalog review, leave needs a `review_note` for rejections.
- `access.canView` limits the PM to their own projects, and pentesters to projects where they are a resource.
- The only holidays today are `Project.ScheduleHolidays` (jsonb per project, used for the stage schedule).

FE:
- Menus live in `NAV` (`src/shared/config/roles.ts`). Resource is only for super_admin and tech_lead.
- `/resources` has table and timeline views (`?tampilan=timeline`) built on `widgets/resource-timeline`.
- `mandaysInMonth` splits MD over calendar days, weekends included. `workingDays` in `techlead-metrics.ts` already counts working days without weekends, but not holidays or leave.
- The asset planner saves through many sequential requests (`buildOps`, then `runOps`).
- `TechLeadDashboard` has two `SummaryTile`s (Proyek Berjalan, Usulan Catalog) in a two-column grid.
- `resources.contract.test.ts` writes to the real BE.
- The app has no notification system.

## Risks

- No notifications: the TL learns about new leave from the dashboard tile, and the pentester sees the result in the Cuti tab. Email or in-app notifications are out of scope.
- Old conflicting data shows up as warnings as soon as the calendar ships. Let PMs know that old schedules will have markers.
- Moving MD from calendar days to working days (stage 5) changes numbers already shown on `/resources`. Tell the team beforehand.
- Time zones: all dates are `date` columns and are handled as date strings.
- `resources.contract.test.ts` writes to the real BE. Run it with `--no-file-parallelism`, as its header says.

## Open questions

1. Where does the national holiday list come from, and who enters it each year? Do not fill in dates from memory.
2. Do PMs and technical writers need leave too? Default: no.
3. Should pentesters see their teammates' schedules? Default: only their own.

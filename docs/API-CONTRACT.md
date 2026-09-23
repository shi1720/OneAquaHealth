# Rill API and data contract

The React client and Hono API share one origin. Routes below use the `/api` prefix. Request/response types are in [`shared/types.ts`](../shared/types.ts); authoritative validation and permissions are in [`server/app.ts`](../server/app.ts). The same implementation runs against SQLite, libSQL, or D1.

## Session and error contract

Authentication uses an HttpOnly, SameSite=Lax session cookie, with Secure enabled in production. All mutations require `Content-Type: application/json` and an exact matching `Origin` header. Even an otherwise bodyless DELETE accepts `{}` as JSON. Requests are byte bounded and rate limited. Responses containing workspace data use `Cache-Control: no-store`.

Errors return `{ "error": "A user-readable explanation" }`. Expected codes include 400 (malformed request), 401 (session required), 403 (permission/origin), 404 (not in this workspace), 409 (conflict/quota), 413 (body too large), 422 (validation), 429 (rate limit), and 503 (optional upstream unavailable). The client must not turn an upstream failure into fictional data.

## Accounts and workspace

| Method and route      | Body / result                                                                                        | Access             |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------ |
| `POST /auth/demo`     | `{}` → `{user}`; creates a private six-site/eight-report synthetic workspace                         | Public, throttled  |
| `POST /auth/register` | `{name,email,password,workspaceName}` → `{user}`; creates an **empty** real workspace                | Public, throttled  |
| `POST /auth/login`    | `{email,password}` → `{user}`                                                                        | Public, throttled  |
| `POST /auth/logout`   | `{}` → `{ok:true}`; revokes the requesting session                                                   | Session if present |
| `GET /auth/me`        | `{user}`                                                                                             | Member             |
| `POST /auth/password` | `{currentPassword,newPassword}` → `{ok:true}`; revokes prior sessions and rotates this one           | Real account       |
| `GET /workspace`      | `WorkspaceData`: sites, observations, assessments, tasks, latest 100 audit events, rule version      | Member             |
| `DELETE /account`     | `{password}` → `{ok:true}`; deletes the entire workspace and its database records; demo may use `{}` | Coordinator        |
| `GET /health`         | `{status:'ok',version,storage}`                                                                      | Public             |

Passwords must contain 12–128 characters. No email verification or password recovery is simulated. A real session lasts seven days; a demo session lasts one day. Demo workspaces are removed after 48 hours. Records are scoped by the authenticated workspace, never by a user-supplied workspace identifier.

## Team and sites

| Method and route             | Body / result                       | Notes                                                                              |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `GET /members`               | `{members: User[]}`                 | Coordinator only                                                                   |
| `POST /members`              | `{name,email,password}` → `{user}`  | Creates a volunteer account; does not send an invitation                           |
| `DELETE /members/:id`        | `{}` → `{ok:true}`                  | Revokes volunteer access; requires no open assigned tasks; keeps authored evidence |
| `POST /sites`                | `SiteInput` → `{site}`              | Coordinator-supplied site and access context                                       |
| `PATCH /sites/:id`           | Full `SiteInput` → `{site}`         | Preserves ID/check time; audits before and after                                   |
| `GET /catalog/oneaquahealth` | `{source,retrievedAt,sites,notice}` | Read-only live directory; coordinator only                                         |

`SiteInput` contains `name`, `catchment`, latitude `lat`, longitude `lng`, `description`, `habitat`, safe-access text `access`, exposure context `exposure` (integer 0–5), access estimate `walkMinutes` (5–240), and `sensitive` (boolean). All site/team mutations require a coordinator. New directory imports start restricted until access is explicitly reviewed.

The directory adapter fetches a fixed, allowlisted public endpoint, with a five-second timeout, 1 MB response cap, validation, no redirects, and a ten-minute successful-result cache. It retains only name/code/city/coordinates. It does not import water assessments or imply access permission. No observation or user payload is sent upstream.

## Observations and review

`POST /observations` accepts `ObservationInput` and returns `{observation,assessment}`. Required fields: `siteId`, ISO `observedAt`, a unique array of visible `concerns`, `clarity`, `flow`, `confidence`, `notes` (8–2,000 characters), and `clientId` (8–100 safe identifier characters). A retry with the same workspace/author/client ID returns the original report. Times must be within the last year and no more than five minutes ahead.

The optional `photo` is a JPEG/PNG/WebP data URL, at most 1 MB decoded. Browser uploads are resized and re-encoded. Photos are separately stored and read through tenant-authenticated `GET /observations/:id/photo`; dashboard responses contain the photo URL, not its blob. Exports omit blobs.

`POST /observations/:id/review` accepts `{status,note,revision}` and returns `{observation}`. Only a coordinator can advance `new → reviewed → actioned → resolved`. A note and current revision are required. Conflicting reviews return 409. Each transition stores the human note, actor, time, and a snapshot of the evaluated priority, evidence tier, rule version, and reasons. The action timestamp is retained on the report for consistent interface gating.

Resolution requires a completed `recheck` with a substantive result, completed after action began. This is a recorded human follow-up, not a water-safety determination. Current assessments may change with time; historical decision snapshots do not.

## Tasks and capacity planning

| Method and route    | Body / result                                                                       |
| ------------------- | ----------------------------------------------------------------------------------- |
| `POST /tasks`       | `{observationId,title,kind,assignedTo,dueAt,estimatedMinutes}` → `{task}`           |
| `POST /tasks/:id`   | `{status:'in_progress'\|'completed',result?}` → `{task}`                            |
| `DELETE /tasks/:id` | `{}` → `{ok:true}`; cancels an open task, retaining its attributed history          |
| `POST /plan`        | `{budgetMinutes}` → `FieldPlan`                                                     |
| `POST /plan/commit` | `{budgetMinutes}` → `{tasks}`; recalculates and atomically assigns the current plan |

Use a stable member ID for `assignedTo`; a unique member name is accepted for compatibility. Only the assignee or a coordinator can start/complete a task. Task creation, cancellation, and plan commit require a coordinator. `canUpdate` in the workspace response reflects the viewer's permission. Completed tasks cannot be cancelled. A cancelled task can be replaced with a new assignment; its observation-linked audit remains.

Task kinds are `verify`, `sample`, `cleanup`, and `recheck`. Due times must be within the coming year; estimates are 5–480 minutes; completion results require 12–2,000 characters. At most one task per site may be open. Sampling/cleanup coordination is coordinator-only. Hazardous or restricted sites cannot be dispatched as ordinary volunteer work. A coordinator may record an administrative recheck of qualified authority advice.

Planning accepts 20–480 minutes and uses an exact 0/1 allocation over eligible sites. It is deterministic for the same inputs and time. It maximizes the documented policy objective within summed time estimates, **not** ecological outcomes or geographic route efficiency. Both selected and deferred sites carry explanations. See [methodology](methodology.md).

## Import and export

`POST /import` accepts `{observations: ObservationInput[],sourceDemo?:boolean}` with 1–100 records; rows may also carry `demo`. It validates the whole batch before an atomic write and returns `{imported,skipped,observations}`. Existing retry keys are skipped. Source site IDs must be explicitly matched to real destination site IDs by the client preview. Photos, original author identity, and source review status are not transferred: the importing coordinator is accountable, and every record starts `new`. Known synthetic records cannot enter a real workspace. Demo imports remain synthetic.

`GET /export?format=json|csv|geojson|fhir` returns a downloadable file. Import and export are coordinator-only.

- JSON: complete retained workspace evidence, including all retained audit events and decision snapshots, with names in the operational audit; excludes authentication data and photo blobs.
- CSV: a formula-safe observation projection, with data labels and provenance fields.
- GeoJSON: sites and observation properties; coordinate accuracy is not independently verified.
- FHIR: experimental R4 collection with Organization, Location, Observation, Task, and Provenance. Environmental observations reference locations, never patients. No implementation-guide certification is claimed.

The interface's activity window is limited to 100 latest events; JSON export is not. Pilot bounds are 100 sites, 2,000 observations, 2,000 tasks, 50 members, 10,000 audit events, and 50 MB of encoded photos per workspace. Database constraints enforce these during concurrent requests. See [backend operations](../server/README.md) and [security](../SECURITY.md) for deployment and identity limitations.

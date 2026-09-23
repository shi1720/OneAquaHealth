# Hosted verification: release 1.1.0

Executed on 23 September 2026 against [the public Rill deployment](https://rill-streams.web.app). Firebase Hosting served the frontend and same-origin API; `/api/health` returned `{"status":"ok","version":"1.1.0","storage":"postgres"}`. These are software checks using synthetic records, not ecological validation, a security audit, or evidence of customer adoption.

## Results and deployment boundaries

Browser engines were Playwright Chromium 153.0.8010.12 and WebKit 26.6 on this macOS runner. WebKit automation is useful Safari-engine coverage, not a physical iPhone or a test of every released Safari version.

| Check                                       | Result                                   | Scope                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing browser suite, Chromium            | 17 of 17 passed, 1.8 minutes             | Public deployment with real sessions, registration, persistence, recovery, team administration, import, report review, planning and task lifecycle. Some deliberate failures and catalog/chronology fixtures are intercepted, as described below.                                   |
| Fast sequential typing regression, Chromium | 1 of 1 passed, 4.0 seconds               | Deployed `index-BXn9KcpA.js`; exact note text survived 200+ characters typed with no delay, closing and reopening the draft; no browser JavaScript errors.                                                                                                                          |
| Core workflow, WebKit                       | Passed, 19.0 seconds                     | Public demo, field planner, observation, coordinator review, action, assigned recheck and resolution; no browser JavaScript errors.                                                                                                                                                 |
| Fast sequential typing, WebKit              | Passed, 6.6 seconds                      | Same live frontend; exact typed note and restored draft matched.                                                                                                                                                                                                                    |
| Mobile navigation, WebKit                   | Fixed; hosted retest passed, 5.9 seconds | Deployed index-CuxmwzOX.js; the full existing focus, guide dismissal, short-height navigation, viewport transition and logout regression passed after the explicit return-target fix. It also passed locally in Chromium and WebKit.                                                |
| Separate hosted privacy and role exercise   | 39 of 39 assertions passed               | Two isolated disposable workspaces and one volunteer; actual HTTP calls, no mocked authorization or persistence. Both workspaces were deleted after the exercise.                                                                                                                   |
| Public landing, Chromium and WebKit         | Four viewport checks passed              | 1440 × 1050 and 390 × 844; zero detected axe WCAG 2 A/AA and WCAG 2.1 AA violations, no horizontal overflow and no browser JavaScript errors.                                                                                                                                       |
| Firefox                                     | Not verified                             | Playwright's official Firefox build failed before opening any page with “Could not find profile folder.” Reinstallation, canonical temporary directories and an explicit persistent profile did not resolve this runner failure. It is not a Rill test failure or a passing result. |

The 17 existing scenarios ran before the rapid-typing fix. The new typing regression and WebKit scenarios ran after that frontend deployment; these results must not be represented as a single final-build 18-test suite. The later mobile focus fix is a separate, narrowly scoped frontend change; its hosted regression passed against final frontend `index-CuxmwzOX.js`. No subsequent runtime change is included in this record. Existing browser tests and the added regression are retained in `tests/e2e/`.

## Issues found and corrected

The recording rehearsal exposed React error 185 during rapid field-note entry. The existing tests used `fill()`, which did not exercise individual keystrokes. A new regression with `pressSequentially(..., { delay: 0 })` reproduced lost characters on the previous hosted frontend. The autosave effect was redundantly updating its “draft saved” state on every character. It now changes that state only when the storage-success status changes. The new regression passed locally and on the public deployment in Chromium and WebKit. The mobile landing heading also now retains the space between “better” and “next step” when its line break is hidden.

The extra WebKit mobile test then exposed a separate focus issue after opening the field guide from the navigation drawer. Safari does not consistently focus a button clicked with a pointer. The application now assigns the visible mobile navigation trigger as the guide's return target before opening it. The existing test covers ordinary drawer Escape, first/last focus trapping, guide Escape, short-height access to sign out, desktop/mobile transitions and body scrolling after logout. All those assertions passed on the final hosted frontend in WebKit, after passing locally in Chromium and WebKit.

## What the actual hosted API exercise established

The independent exercise used reserved `example.test` addresses and visibly labelled software-test notes. It checked:

- Session cookies use `Secure`, `HttpOnly` and `SameSite=Lax`, including the Firebase-compatible `__session` cookie; authenticated responses use `Cache-Control: no-store`.
- An observation and its synthetic 1 × 1 PNG attachment persist in their owning workspace. Another workspace receives 404 for the private photo and review target; an anonymous photo request receives 401. A foreign site's identifier cannot be used to submit an observation.
- Another workspace's snapshot contains none of those records. An authenticated request with a forged `Origin` receives 403; an anonymous export request receives 401.
- A volunteer cannot create sites, export coordinator data or review observations. The assigned volunteer can start and complete their task but cannot update another person's assigned task.
- A fresh password login sees the stored observation and completed task. Logging out invalidates the previous session token; replay receives 401.
- Exported JSON omits raw passwords, session tokens and recovery keys. Deleting the two software-test workspaces succeeds and cascades their volunteer membership.

The exercise did not establish encryption at rest, resistance to all attacks, sustained availability, or recovery from infrastructure failure. Those require separate operational evidence. Recovery keys and passwords were never written to screenshots, result logs or this report.

## Browser test coverage and mocks

The existing hosted suite exercises signup and recovery-key acknowledgement, login persistence, password changes, recovery-key replacement and reuse rejection, session revocation, site editing, member creation/removal, observation import and provenance, the action/recheck gate, and exports. It also checks keyboard interaction, draft persistence, invalid dates, selected-site context, and the five main pages at narrow-phone, tablet and desktop viewports.

Deliberate network failures for planner fetch/commit, workspace refresh and export are browser interceptions that test error messages, stale-result removal and retry behavior. The directory test uses a labelled catalog fixture and a failed-response fixture, rather than depending on the external OneAquaHealth service. Two workspace fixtures test empty-site/date handling and recheck chronology display. The mobile drawer test intercepts the logout response to isolate client cleanup; actual hosted logout and token revocation are independently verified by the API exercise. These fixtures do not establish corresponding upstream-service reliability or server enforcement. Ordinary hosted workflow, authentication, import, privacy and role assertions use the deployed application and its actual database.

Disposable real test workspaces were deleted. Some demonstration workspaces remain subject to the product's 48-hour demo expiration. The application still needs human testing with target coordinators and citizen volunteers, physical mobile devices and assistive technologies. Automated axe checks do not establish complete accessibility conformance.

## Reproducing the browser checks

The browser suite is opt-in for a live target and creates synthetic accounts and demo workspaces. Use a test deployment when possible; repeated hosted runs consume the intended signup/demo rate limits. Do not retain unmasked recovery-key screenshots or authentication traces.

```sh
RILL_E2E_URL=https://rill-streams.web.app \
  PLAYWRIGHT_HTML_OUTPUT_DIR=tmp/qa/hosted/report \
  npx playwright test --output=tmp/qa/hosted/test-results

RILL_E2E_URL=https://rill-streams.web.app \
  PLAYWRIGHT_HTML_OUTPUT_DIR=tmp/qa/hosted/webkit-report \
  npx playwright test --browser=webkit \
  tests/e2e/workflow.spec.ts tests/e2e/responsive.spec.ts \
  --grep 'demonstration workspace, plan, report, review, action and recheck|rapid sequential typing|mobile navigation is inaccessible' \
  --output=tmp/qa/hosted/webkit-results
```

Local diagnostic files for this execution are under `tmp/qa/hosted/`: `playwright-console.txt`, the Playwright HTML reports, `privacy-role-results.json`, `readonly-browsers.json`, and the before/after typing results. These transient diagnostics are not release assets. The public source test suite and this record describe the reproducible checks and their limits.

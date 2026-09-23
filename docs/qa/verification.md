# Verification record

Verified 23 September 2026. This records software checks, not ecological validation, an external security audit, or a guarantee of hackathon results. Demonstration records and test accounts are synthetic.

## Executed locally

| Check                           | Result and scope                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                      | `npm run typecheck` passed.                                                                                                                                                                                            |
| SQLite logic/API/parser suite   | 75 tests passed: 41 backend/decision-engine, 20 recovery, 11 import-parser, 2 backup and 1 health-probe checks.                                                                                                        |
| libSQL compatibility suite      | The same 75 tests passed with `RILL_TEST_STORAGE=libsql`, using the actual local SDK file runtime. Remote credentials/durability are not implied.                                                                      |
| Built-application browser tests | All ten scenarios passed against a production Vite build and an isolated local Node server, including recovery and the chronological resolution gate.                                                                  |
| UI accessibility and layout     | 52 desktop/mobile surface checks, zero reported axe violations and zero horizontal overflows in those states. [Machine-readable record](accessibility-results.json). This is not complete accessibility certification. |
| Local Node HTTP smoke           | The API lifecycle was exercised on the running SQLite server: demo, registration/login, review, blocked early resolution, action/recheck/closure, planning, export, and deletion.                                      |
| Local Cloudflare runtime        | Actual workerd/D1 smoke passed, including registration/password verification, lifecycle, and a 100-row import. No remote Worker deployment is claimed.                                                                 |
| Live directory adapter          | A real lookup returned 106 sites across five cities. Only coordinate-directory integration was checked. CI uses an explicit fixture and failure response for reproducibility.                                          |
| Dependency audit                | `npm audit --audit-level=moderate` reported zero vulnerabilities at the check time. This does not establish absence of vulnerabilities.                                                                                |
| Visual review                   | Desktop/mobile app captures were inspected. All final slide and brief pages are separately rendered and reviewed as part of artifact preparation.                                                                      |

The suite checks role/tenant isolation, origin validation, request and record limits, retries, concurrent writes, safe dispatch, exact budget allocation against exhaustive enumeration, assessment uncertainty, review chronology, retained cancellation history, photos, export attribution, import provenance, password rotation, and deletion. Browser flows exercise actual controls and the running backend; the optional live-directory response is the only mocked external integration.

The first repeated browser runs shared the long-lived development database and eventually hit the intended authentication/demo rate limits. The test runner now owns a fresh local database and server for each run, preserving all application rate limits. It compiles a production frontend before running. `RILL_E2E_URL` explicitly targets an existing instance if an operator needs that mode.

## Final integration result

The integrated core passed [GitHub Actions run 35817824898](https://github.com/shi1720/OneAquaHealth/actions/runs/35817824898) at commit `4ca8312`: clean install, formatting, typecheck, SQLite/libSQL suites, build, dependency audit, all eight browser scenarios, and Docker image build plus HTTP lifecycle smoke on Linux. The local Docker daemon was unavailable, so the container was verified in CI. Subsequent recovery-key, backup and engine-indexing additions are covered by the final release integration result below.

**Final release code passed [GitHub Actions run 35819234381](https://github.com/shi1720/OneAquaHealth/actions/runs/35819234381) at commit `a27e70d`.** This includes all 75 tests on SQLite, all 75 with the libSQL adapter, all ten browser scenarios, clean installation, formatting, typecheck, the production build, zero reported dependency vulnerabilities, and the actual Linux Docker build and HTTP lifecycle smoke. The following packaging commit only records this result and the release checksums; it does not change the application.

The local online-backup command additionally passed two focused checks: a standalone snapshot preserved committed WAL records from an open database and passed `integrity_check`; attempts to overwrite a snapshot/source or read a missing source were rejected. This validates the backup mechanism, not offsite retention or a production-host disaster-recovery exercise.

## What remains outside this evidence

- A permanent HTTPS deployment, remote database backup/restore, and persistence across redeployment.
- Email-based recovery, verified email/invitations, multiple coordinators, SSO/MFA, and an operational incident-response service. Offline-key recovery is implemented; losing both credentials remains unrecoverable through email.
- Load/soak testing at programme scale, expert security review, complete screen-reader review, and field usability testing.
- Calibrated environmental predictions, laboratory analysis, water-safety determinations, FHIR implementation-guide conformance, or clinical use.
- Customer interviews, willingness to pay, paying customers, measured coordinator time savings, and ecological or human-health outcomes.

See [the internal adversarial review](../review-independent.md), [methodology](../methodology.md), and [deployment status](../deployment.md). The review score is an internal opinion, not independent assurance or a prediction of judging results.

## Recovery and artifact completion

The recovery implementation passed a separate read-only security review. Two concrete findings were fixed before release: accidental dismissal of a replacement key before acknowledgement, and business-audit exhaustion preventing a valid reset. Tests now cover the saved-key gate, single-use and concurrent reset, all-session revocation, password-verification races, key rotation, explicit rolling security-event retention, and recovery at the full 10,000 ordinary-audit quota. The reviewer found no further blocking issue in that scope; this is still an internal code review, not an external security audit.

The final ten-scenario browser run passed locally, including signup and recovery-key administration. Additional recovery states passed desktop/mobile axe and overflow checks. QA screenshots masked key values; flows rendering recovery keys disable automatic screenshots and traces, and all credential-issuing test files disable network traces. Playwright's automatic failure DOM capture is disabled to avoid copying a displayed key into diagnostics; API smoke failures do not echo response bodies. Native workerd/D1 was upgraded from recovery migration 0002 through security-event migration 0003 and passed a concurrent reset/session/export smoke test.

All eight pitch slides and four product-brief pages were visually inspected after rendering. The PowerPoint contains native editable text and speaker notes and passed package/layout checks. The real-UI film is 238 seconds, 1080p H.264, with zero browser exceptions and a verified resolved observation, two completed tasks, and an actual synthetic FHIR export. The fresh-draft banner fix was included in the final capture. See [artifact verification](../../scripts/artifacts/VERIFICATION.md) and [video verification](../../output/video/VERIFICATION.md).

The narration helper was exercised with disposable test audio: it preserved the 238-second video, produced AAC audio, refused to overwrite an existing output, and rejected narration over five minutes. No human narration was recorded or synthesized. [Helper check results](media-helper-results.json).

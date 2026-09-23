# Verification record

Verified 23 September 2026. This records software checks, not ecological validation, an external security audit, or a guarantee of hackathon results. Demonstration records and test accounts are synthetic.

## Executed locally

| Check                           | Result and scope                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                      | `npm run typecheck` passed.                                                                                                                                                                                            |
| SQLite logic/API/parser suite   | 50 tests passed: 39 backend/decision-engine tests and 11 import-parser tests.                                                                                                                                          |
| libSQL compatibility suite      | The same 50 tests passed with `RILL_TEST_STORAGE=libsql`, using the actual local SDK file runtime. Remote credentials/durability are not implied.                                                                      |
| Built-application browser tests | Seven complete scenarios passed against a production Vite build and an isolated local Node server; an eighth chronology regression subsequently passed against the same isolated runner.                               |
| UI accessibility and layout     | 52 desktop/mobile surface checks, zero reported axe violations and zero horizontal overflows in those states. [Machine-readable record](accessibility-results.json). This is not complete accessibility certification. |
| Local Node HTTP smoke           | The API lifecycle was exercised on the running SQLite server: demo, registration/login, review, blocked early resolution, action/recheck/closure, planning, export, and deletion.                                      |
| Local Cloudflare runtime        | Actual workerd/D1 smoke passed, including registration/password verification, lifecycle, and a 100-row import. No remote Worker deployment is claimed.                                                                 |
| Live directory adapter          | A real lookup returned 106 sites across five cities. Only coordinate-directory integration was checked. CI uses an explicit fixture and failure response for reproducibility.                                          |
| Dependency audit                | `npm audit --audit-level=moderate` reported zero vulnerabilities at the check time. This does not establish absence of vulnerabilities.                                                                                |
| Visual review                   | Desktop/mobile app captures were inspected. All final slide and brief pages are separately rendered and reviewed as part of artifact preparation.                                                                      |

The suite checks role/tenant isolation, origin validation, request and record limits, retries, concurrent writes, safe dispatch, exact budget allocation against exhaustive enumeration, assessment uncertainty, review chronology, retained cancellation history, photos, export attribution, import provenance, password rotation, and deletion. Browser flows exercise actual controls and the running backend; the optional live-directory response is the only mocked external integration.

The first repeated browser runs shared the long-lived development database and eventually hit the intended authentication/demo rate limits. The test runner now owns a fresh local database and server for each run, preserving all application rate limits. It compiles a production frontend before running. `RILL_E2E_URL` explicitly targets an existing instance if an operator needs that mode.

## Final integration result

The core source and browser checks passed locally. GitHub Actions additionally builds and smoke-tests the Docker image on Linux, because the local Docker daemon is unavailable. Its verified final result and a combined eight-scenario run are recorded here after execution; neither is assumed from the workflow configuration.

## What remains outside this evidence

- A permanent HTTPS deployment, remote database backup/restore, and persistence across redeployment.
- Lost-password recovery, verified email/invitations, multiple coordinators, SSO/MFA, and an operational incident-response service.
- Load/soak testing at programme scale, expert security review, complete screen-reader review, and field usability testing.
- Calibrated environmental predictions, laboratory analysis, water-safety determinations, FHIR implementation-guide conformance, or clinical use.
- Customer interviews, willingness to pay, paying customers, measured coordinator time savings, and ecological or human-health outcomes.

See [the internal adversarial review](../review-independent.md), [methodology](../methodology.md), and [deployment status](../deployment.md). The review score is an internal opinion, not independent assurance or a prediction of judging results.

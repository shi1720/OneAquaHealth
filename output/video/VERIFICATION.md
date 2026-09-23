# Video verification

- Duration: 238 seconds (3:58).
- Final resolution: 1920 × 1080, 25 fps, H.264.
- Audio: none; Shivam records the supplied verbatim narration.
- Real UI workflow: fresh synthetic demo → report → budget comparison → committed plan → reviewed → action underway → completed recheck → resolved.
- Recording runtime: separate non-watching API and Vite instance at `http://127.0.0.1:5182`, backed by an isolated temporary SQLite database. The complete recording/render workflow exited successfully and removed its temporary database.
- Fresh-draft issue fixed: rehearsal and final recording both assert a new observation does not display the restored-draft banner; the final encoded observation frame confirms it is absent.
- Completed demonstrated tasks: 2 (verification and recheck).
- Browser exceptions: 0.
- Actual FHIR export types: Location, Observation, Organization, Provenance, Task. No Patient resource.
- Narration: 546 spoken words, approximately 138 words per minute overall.
- Maximum scene-start deviation from the timed shot list: 0.004 seconds.
- Visual inspection: final encoded frames checked at observation, planner, resolution, export, and end card; captions stay outside the interface.
- Data handling: all observations and findings synthetic; no passwords entered; temporary demo workspace deleted after verification.

The clean file is intended for adding narration. The captioned version is immediately reviewable without sound. Both retain clear limits on diagnosis, route optimization, commercial validation, and FHIR certification.

The final workflow proof was captured at `2026-09-23T04:26:48.003Z`. `recording-proof.json` and `demo-fhir-bundle.json` refer to the same recorded demonstration; `rehearsal-proof.json` records the separate preliminary rehearsal. Source scripts passed Prettier's formatting check. The voiceover helper is supplied, but no human narration has been recorded or claimed.

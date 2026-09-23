# Sources and attribution

Accessed 23 September 2026. Distinguish cited background from Rill's own unvalidated design choices.

- [Official hackathon rules](https://oneaquahealth-ieee-hackathon.devpost.com/rules): judging weights and event requirements. Homepage and rule eligibility wording conflict; see research notes.
- [OneAquaHealth solutions](https://www.oneaquahealth.eu/project-solutions/): existing citizen app, dashboards, resilience map, and decision-support tools. Rill does not replace or claim endorsement by them.
- [Project events and learning sessions](https://www.oneaquahealth.eu/project-events/): programme context. This task reviewed published session material and descriptions, not a claimed full transcription of every recording.
- [Citizen science project](https://www.oneaquahealth.eu/citizen-science-project/): observation and participation context.
- [OneAquaHealth site viewer](https://apps.oneaquahealth.eu/sites), [public site directory](https://api.enora-oah.eu/api/sites/all): optional live read-only place metadata. Rill links/attributes the source and does not redistribute a snapshot, site polygons, assessment results, or private records. Public availability does not establish data redistribution rights or field-access permission.
- [Cartographer](https://cartographer.io/), [Riverfly Partnership](https://www.riverflies.org/): relevant existing monitoring and coordination work. No “first platform” claim.
- [FHIR R4 Observation](https://hl7.org/fhir/R4/observation.html), [Task](https://hl7.org/fhir/R4/task.html), [Provenance](https://hl7.org/fhir/R4/provenance.html), [Bundle](https://hl7.org/fhir/R4/bundle.html): base resource structure. [OAH draft implementation guide](https://build.fhir.org/ig/hl7-eu/oah/) remains a draft reference; no profile-conformance claim.
- [Cloudflare Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/): deployment limits and tradeoffs, subject to change.
- [Render free services](https://render.com/docs/free): free-host sleep/ephemeral-storage limitations. Use remote durable storage for real accounts.
- [Turso libSQL TypeScript SDK](https://docs.turso.tech/sdk/ts/reference): optional SQLite-compatible remote database adapter. The newer Turso database engine is a different target and is not implicitly validated by a libSQL test.

## Assets

Rill wordmark, schematic map, layout and interface illustrations are original SVG/CSS. The map is explicitly fictional in the demo. Screenshots and videos show the actual application operating on synthetic data.

- DM Sans and Manrope: bundled via Fontsource variable-font packages; SIL Open Font License. No request to Google Fonts is required at runtime.
- Lucide icons: ISC licence, distributed through `lucide-react`.
- The pitch deck uses Caladea and Noto Sans; retain their font licences if redistributing font binaries. Fonts are not included as standalone commercial assets.
- Source code: MIT, copyright Shivam Gupta. Dependency licences remain their respective authors'.

See the [research file](research/product-research.md) for evidence, competitor details, and commercial assumptions.

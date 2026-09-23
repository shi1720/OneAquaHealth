# Data practices

Rill is a hackathon application for environmental observations. These practices describe the implementation, not a legal certification. A production operator must provide their identity, contact, retention policy, lawful basis and relevant regional notices before enrolling real participants.

## What the application stores

- Account name, email, role, password hash, workspace and session hashes.
- Site coordinates, access instructions, habitat and coordinator estimates.
- Observation time, visible concerns, uncertainty, field note and optional photo.
- Review notes, task assignments/results and attributable audit events, including decision-rule snapshots.
- Hashed IP/email rate-limit keys with expiry. No raw IP is stored by the application, though hosting providers may log network metadata.

Do not add personal health information, identifiable faces, confidential addresses, private land details, or precise locations of vulnerable wildlife. Members in a workspace can read that workspace's field records. Only coordinators can manage members and export the full workspace. Operator database administrators remain technically able to access stored records.

## Photos and device drafts

Browser photo upload resizes and re-encodes a supported image, discarding the original metadata. The server validates size and basic file signatures. Photos use authenticated, tenant-scoped URLs. They are not scanned for all forms of harmful content and should be reviewed before field deployment.

One observation draft is stored in localStorage under the current user ID, retained for up to 24 hours and removed on successful submission or sign-out. It may include a compressed photograph. Do not use a shared device for sensitive notes. A draft may survive a browser crash. Offline draft editing during an open session is supported; full offline sign-in and synchronisation are not claimed.

## External services

Core features do not call an external AI provider. Fonts and icons are served with the application. Optional OneAquaHealth site lookup contacts only `https://api.enora-oah.eu/api/sites/all` from the server and sends no observation notes or account details. That service receives the hosting server's request metadata. A successful catalogue response is cached for ten minutes; failure is reported instead of substituted with invented data.

Hosts and database providers process the data needed to run the service. Their own policies apply to their infrastructure. Exact hosting details must be disclosed by the operator before collecting live reports.

## Retention, portability, deletion

Demonstration workspaces contain synthetic data, expire after 48 hours, and use sessions lasting one day. Real sessions expire after seven days. Scheduled cleanup removes expired sessions, rate-limit records and demo workspaces. Real reports remain until the coordinator deletes the workspace; archive/retention automation for real workspaces is not yet implemented.

Coordinators can export JSON/CSV/GeoJSON/experimental FHIR. Exports omit authentication material and photograph blobs but contain field notes and task/review names. Review a file before sharing it. The JSON export includes all retained audit events; the on-screen history shows the latest 100.

Deleting a workspace requires the coordinator's current password (except a demo), deletes its members/records, and invalidates associated sessions. Removing a volunteer revokes their account and sessions while retaining the original field/audit record. Hosting backups may retain prior snapshots according to the operator's published policy.

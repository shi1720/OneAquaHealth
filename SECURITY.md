# Security and operational scope

Rill stores account information and environmental field observations. Do not submit personal medical information, identifiable faces, confidential material, or precise sensitive-species locations. No model provider receives field reports.

Authentication uses uniquely salted PBKDF2-SHA256 (600,000 iterations on Node, 100,000 on Cloudflare due to its native runtime cap). Random session tokens are stored only as SHA-256 digests. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Mutations require the exact application Origin. Password rotation revokes other sessions. Verified email identity and MFA remain rollout requirements.

Real accounts receive a 256-bit random offline recovery key at registration. Only its domain-separated SHA-256 digest is stored. Recovery requires the account email and key; one atomic transaction consumes and replaces the key, changes the password, revokes every previous session, and opens the requesting browser's new session. Concurrent use permits only one success. Issuance and recovery responses are `no-store`; attempts have persisted IP/email or authenticated-user limits and invalid keys return a uniform error. Existing users can generate or replace a key after current-password confirmation. Demo accounts cannot use this flow.

The key is displayed once in browser memory, with explicit copy/download controls and a save acknowledgement. It is not automatically stored in browser storage, logs, exports, or profile responses. Anyone holding the key and account email can reset the passphrase. This mechanism does not send email or establish email ownership. If a user loses both their passphrase and saved key, there is no self-service recovery path. Successful security actions retain the latest 100 attributable events per current account in a separate table; older security events expire on the next security action, and account deletion removes them. JSON exports state this policy and include retained security events. This keeps recovery available at the ordinary audit quota without deleting decision history. These controls have automated regression coverage; they are not an independent security audit.

The API uses tenant predicates, role checks, stable user IDs for task assignment, schema validation, bounded streaming body reads, persisted rate limits, idempotent retry keys, database quota triggers, and optimistic concurrency. CSV formula prefixes are escaped on export. Photos are size/signature checked and retrieved through tenant-authorised routes. No endpoint accepts an arbitrary upstream URL. The catalog proxy uses a fixed HTTPS allowlist, timeout, byte limit and cache.

The application audit log preserves human authorship and decision snapshots. It is not a cryptographically tamper-proof ledger. Database administrators can alter stored records. FHIR mappings are experimental and do not attest to real scientific or medical validity.

Production requires HTTPS, a trusted proxy configuration, durable storage, tested backups, restore exercises, operational monitoring, a local safeguarding protocol, and review of the chosen identity arrangement. The Node target uses actual socket IPs; multiple users behind a proxy share its rate limit unless the operator configures a reviewed trusted-proxy strategy. The Worker target uses Cloudflare's edge-provided IP header.

Report vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting when enabled. Do not publish live credentials or user data in issues. There is no security bounty or response-time guarantee.

See [server operations](server/README.md) for hard limits and deployment differences.

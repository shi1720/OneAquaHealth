# Security and operational scope

Rill stores account information and environmental field observations. Do not submit personal medical information, identifiable faces, confidential material, or precise sensitive-species locations. No model provider receives field reports.

Authentication uses uniquely salted PBKDF2-SHA256 (600,000 iterations on Node, 100,000 on Cloudflare due to its native runtime cap). Random session tokens are stored only as SHA-256 digests. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Mutations require the exact application Origin. Password rotation revokes other sessions. Account recovery, verified email identity and MFA remain rollout requirements.

The API uses tenant predicates, role checks, stable user IDs for task assignment, schema validation, bounded streaming body reads, persisted rate limits, idempotent retry keys, database quota triggers, and optimistic concurrency. CSV formula prefixes are escaped on export. Photos are size/signature checked and retrieved through tenant-authorised routes. No endpoint accepts an arbitrary upstream URL. The catalog proxy uses a fixed HTTPS allowlist, timeout, byte limit and cache.

The application audit log preserves human authorship and decision snapshots. It is not a cryptographically tamper-proof ledger. Database administrators can alter stored records. FHIR mappings are experimental and do not attest to real scientific or medical validity.

Production requires HTTPS, a trusted proxy configuration, durable storage, tested backups, restore exercises, operational monitoring, a local safeguarding protocol, and review of the chosen identity arrangement. The Node target uses actual socket IPs; multiple users behind a proxy share its rate limit unless the operator configures a reviewed trusted-proxy strategy. The Worker target uses Cloudflare's edge-provided IP header.

Report vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting when enabled. Do not publish live credentials or user data in issues. There is no security bounty or response-time guarantee.

See [server operations](server/README.md) for hard limits and deployment differences.

# NexusPortal license integration

NexusServer talks to NexusPortal for license activation, validation, updates, and ZIP downloads.

## Environment

| Variable | Description |
|----------|-------------|
| `NEXUS_LICENSE_SERVER_URL` | Portal base URL (e.g. `https://portal.example.com`) |
| `LICENSE_API_SIGNING_SECRET` | **Must match** `LICENSE_API_SIGNING_SECRET` on NexusPortal |
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | Used as the license **domain** hostname |

Generate a shared secret:

```bash
openssl rand -hex 32
```

Set the same value on both NexusPortal and NexusServer.

## Implementation

- `src/lib/license/portal-request.ts` — HMAC signing (`X-Nexus-Timestamp`, `X-Nexus-Signature`)
- `src/lib/license/client.ts` — activate, validate, deactivate, check update
- `src/lib/license/updater.ts` — signed download to `/api/update/download`

See NexusPortal `docs/LICENSE_API.md` for the wire format.

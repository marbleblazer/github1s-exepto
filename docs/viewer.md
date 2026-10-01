# Viewer session and gateway contract

The viewer opens one GitLab project chosen by the **platform**, not by the URL path.

Private repositories are **not** opened with a Project Access Token in the browser. Access comes from the platform session and the **gateway**, which attaches GitLab credentials server-side. That is stricter than a PAT prompt and matches the fork hardening list. The older “paste PAT in Settings” flow is intentionally not implemented on this branch.

## Open the viewer

Pass a one-time **launch code** (opaque string from the platform). Do not put the repository path or a GitLab token in the URL.

```text
https://<viewer-host>/?launch=<opaque-code>
```

The viewer:

1. Reads `launch` and **removes it from the address bar**.
2. Calls `GET {GATEWAY_ORIGIN}{GATEWAY_SESSION_PATH}` with `credentials: include` and header `X-Viewer-Launch: <code>`.
3. Expects JSON `{ "repo": "group/project", "ref": "optional-branch" }`.
4. Uses `repo` for all GitLab API calls through the gateway. Path segments in the URL cannot switch project.

If the viewer is in an iframe, the parent may instead `postMessage` `{ type: "viewer-launch", launch: "<code>" }` from `PLATFORM_ORIGIN` only.

## HTTP headers (required)

`frame-ancestors` in CSP **only works as an HTTP response header**, not in `<meta http-equiv>`. The meta tag in `index.html` is a backup for other directives.

Production (Cloudflare `_headers`, nginx, Envoy) **must** send the generated `Content-Security-Policy` header. Without it, any site can iframe the viewer.

Do not send `X-Frame-Options: ALLOWALL`. Framing is limited by `frame-ancestors` (`PLATFORM_ORIGIN`, or `'self'` if unset).

## Gateway CORS

If the viewer origin and gateway origin differ, the gateway must allow credentialed browser calls:

- `Access-Control-Allow-Origin: <viewer-origin>` (exact origin, not `*`)
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers` includes `X-Viewer-Launch`
- `Access-Control-Allow-Methods` includes `GET` (and others you proxy)

Same-origin deploy (viewer and `/api/*` behind one host) avoids CORS.

The browser never talks to GitLab. Attach GitLab credentials **on the gateway**. Do not log cookies, `X-Viewer-Launch`, or `Authorization`.

Forward GitLab REST under `GATEWAY_API_PREFIX` (default `/api/gitlab` → GitLab `/api/v4`).

Commit avatars from GitLab CDN may not load: `img-src` is `'self' data: blob:` on purpose.

## Local

Set `VIEWER_DEV_REPO` in `.env.local` and leave `GATEWAY_ORIGIN` empty so `npm run watch` serves `GET /api/session` without checking a launch code. That stub is **dev-only**, not a production session. File APIs still need a real gateway.

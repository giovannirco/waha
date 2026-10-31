# Connect Cursor and Grok to WAHA MCP

WAHA serves a stateless
[Model Context Protocol](https://modelcontextprotocol.io) endpoint at
`POST /mcp`. Cursor and Grok talk to it over Streamable HTTP. Send the WAHA API
key in the `X-Api-Key` header. When the host is behind Cloudflare Access, also
send a service-token pair so Access lets the client through before WAHA sees the
request.

The server does not keep an MCP session. Clients must `POST` JSON-RPC to `/mcp`.
A `GET` (SSE listen) or `DELETE` (end session) is not part of this endpoint.

## 1. Create a key the client can use

MCP is an app. It is on by default when apps are enabled (`WAHA_APPS_ENABLED`,
and `mcp` is not listed in `WAHA_APPS_OFF`). The session you attach it to must
already exist.

Create the app with the server admin key (`WAHA_API_KEY`):

```bash
curl -X POST "$WAHA_BASE_URL/api/apps" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -d '{
    "id": "app_mcp_default",
    "session": "default",
    "app": "mcp",
    "config": {
      "actions": { "read": true, "send": true }
    }
  }'
```

Then read the app and copy `config.key`:

```bash
curl "$WAHA_BASE_URL/api/apps/app_mcp_default" \
  -H "X-Api-Key: $WAHA_API_KEY"
```

`config.actions` is what that key is allowed to do (`read`, `send`, `control`,
`setting`, `app`, `delete`). The dashboard shows the same key after you add an
MCP app to the session.

You can point a client at the server admin key instead. That key is not limited
by the app's `actions`. Prefer the app key for a bot that should only read or
only send.

Keep the key in an environment variable. Do not commit it.

## 2. Cursor

Project config is `.cursor/mcp.json` (do not commit the secret; commit the
`${env:...}` form if you share the file). User config is `~/.cursor/mcp.json`.
Cursor merges them and the project entry wins on a name clash.

```json
{
  "mcpServers": {
    "waha": {
      "url": "https://waha.example.com/mcp",
      "headers": {
        "X-Api-Key": "${env:WAHA_API_KEY}"
      }
    }
  }
}
```

Restart Cursor, or reload MCP servers, after saving. Cursor interpolates
`${env:NAME}` in `url` and `headers` from the environment. Remote HTTP entries
do not load an `envFile`.

## 3. Grok

The `grok` CLI (Grok / Grok Bot on your machine) adds a remote HTTP server with
repeatable `--header` flags. `${VAR}` expands from the environment:

```bash
grok mcp add --transport http waha https://waha.example.com/mcp \
  --header "X-Api-Key: ${WAHA_API_KEY}"
```

The same entry in `~/.grok/config.toml` (or `.grok/config.toml` in a repo, via
`grok mcp add --scope project`):

```toml
[mcp_servers.waha]
url = "https://waha.example.com/mcp"
headers = { "X-Api-Key" = "${WAHA_API_KEY}" }
```

Grok also loads `.cursor/mcp.json`, so a Cursor entry is picked up unless you
turn that off with `[compat.cursor] mcps = false`. Check with
`grok mcp doctor waha`.

A hosted Grok Bot connector screen that only offers OAuth cannot send
`X-Api-Key` or Cloudflare Access headers. Use the CLI or `config.toml` for this
endpoint.

## 4. Cloudflare Access

If `https://waha.example.com` is behind Cloudflare Access, a client that only
sends `X-Api-Key` gets Access's login HTML (or 403) and the MCP handshake never
starts. Create a
[service token](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/)
and add a Service Auth policy for that token on the Access application that
covers `/mcp`. The token gets the request to WAHA. WAHA still requires
`X-Api-Key`.

Send both Access headers with the API key.

Cursor:

```json
{
  "mcpServers": {
    "waha": {
      "url": "https://waha.example.com/mcp",
      "headers": {
        "X-Api-Key": "${env:WAHA_API_KEY}",
        "CF-Access-Client-Id": "${env:CF_ACCESS_CLIENT_ID}",
        "CF-Access-Client-Secret": "${env:CF_ACCESS_CLIENT_SECRET}"
      }
    }
  }
}
```

Grok:

```bash
grok mcp add --transport http waha https://waha.example.com/mcp \
  --header "X-Api-Key: ${WAHA_API_KEY}" \
  --header "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}" \
  --header "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}"
```

```toml
[mcp_servers.waha]
url = "https://waha.example.com/mcp"

[mcp_servers.waha.headers]
"X-Api-Key" = "${WAHA_API_KEY}"
"CF-Access-Client-Id" = "${CF_ACCESS_CLIENT_ID}"
"CF-Access-Client-Secret" = "${CF_ACCESS_CLIENT_SECRET}"
```

## 5. Check the handshake

```bash
curl -sS -D - "$WAHA_BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

Omit the two `CF-Access-*` headers when Access is not in front of WAHA. A
working server returns JSON-RPC with a `serverInfo` name of
`whatsapp-server-mcp`.

| What you see                        | What it means                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| HTML login page, or 403 from Access | The service token is missing, or the Access policy does not include it.                           |
| `401` from WAHA                     | `X-Api-Key` is missing or wrong. Access, if any, already let the request through.                 |
| `GET /mcp` is not MCP JSON          | The client used the wrong method. MCP here is `POST /mcp` only.                                   |
| Tools fail with `403`               | The key's `actions` do not include that call. Widen the MCP app, or use a key that has the scope. |

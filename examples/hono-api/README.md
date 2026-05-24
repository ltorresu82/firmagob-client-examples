# Hono API

API minima para firmar hashes PDF con FirmaGob.

```bash
pnpm dev:hono
```

Endpoint:

```bash
curl -X POST http://localhost:8787/sign/hash \
  -H "content-type: application/json" \
  -d '{"hash":"HASH_SHA256_BASE64"}'
```

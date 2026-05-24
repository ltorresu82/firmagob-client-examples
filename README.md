# firmagob-client-examples

Ejemplos publicos para integrar [`@ltorresu82/firmagob-client`](https://www.npmjs.com/package/@ltorresu82/firmagob-client) en proyectos Node.js, Hono y Astro.

Este repositorio es un monorepo Turborepo con npm workspaces. No es oficial de Gobierno Digital y no incluye credenciales. Los ejemplos se basan en fuentes oficiales publicas de FirmaGob y en el paquete npm publicado.

## Ejemplos

| Ejemplo | Descripcion |
| --- | --- |
| [`examples/node-cli`](examples/node-cli) | CLI minima para firmar un hash PDF con FirmaGob. |
| [`examples/hono-api`](examples/hono-api) | API Hono con endpoint `POST /sign/hash`. |
| [`examples/astro-upload`](examples/astro-upload) | App Astro con formulario simple para firmar hash via API route. |

## Variables requeridas

Para llamadas reales a FirmaGob se deben configurar:

```text
FIRMAGOB_ENTITY=
FIRMAGOB_API_TOKEN_KEY=
FIRMAGOB_RUN=
FIRMAGOB_PURPOSE=Desatendido
FIRMAGOB_SECRET=
FIRMAGOB_ENDPOINT_API=https://api.firma.cert.digital.gob.cl/firma/v2/files/tickets
```

No usar documentos productivos ni credenciales productivas para pruebas publicas.

## Instalacion

Requiere Node.js `>=22.12.0`, porque el ejemplo Astro usa Astro 6.

```bash
npm ci
```

## Verificacion

```bash
npm run check
```

## Uso rapido

CLI:

```bash
npm run node-cli -- HASH_SHA256_BASE64
```

API Hono:

```bash
npm run hono-api
```

Astro:

```bash
npm run astro-upload
```

## Fuente principal

- Package: [`@ltorresu82/firmagob-client`](https://www.npmjs.com/package/@ltorresu82/firmagob-client)
- Repo: [`ltorresu82/firmagob-client`](https://github.com/ltorresu82/firmagob-client)
- FirmaGob: [Manual API FirmaGob](https://firma.digital.gob.cl/biblioteca/manuales-firmagob/manual-api-firma/)

# firmagob-client-examples

Ejemplos publicos para integrar [`@ltorresu82/firmagob-client`](https://www.npmjs.com/package/@ltorresu82/firmagob-client) en proyectos Node.js, Hono y Angular.

Este repositorio es un monorepo Turborepo con pnpm workspaces. No es oficial de Gobierno Digital y no incluye credenciales. Los ejemplos se basan en fuentes oficiales publicas de FirmaGob y en el paquete npm publicado.

## Ejemplos

| Ejemplo | Descripcion |
| --- | --- |
| [`examples/node-cli`](examples/node-cli) | CLI minima para firmar un hash PDF con FirmaGob. |
| [`examples/hono-api`](examples/hono-api) | API Hono con endpoint `POST /sign/hash`. |
| [`examples/angular-upload`](examples/angular-upload) | App Angular con formulario simple que consume la API Hono local. |

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

Requiere Node.js `>=22.12.0`, porque el ejemplo Angular usa Angular 21.

```bash
pnpm install
```

## Verificacion

```bash
pnpm run check
```

## Uso rapido

Levantar la demo web/API integrada:

```bash
pnpm dev
```

Esto levanta Hono y Angular en paralelo. El CLI queda separado porque requiere recibir un hash como argumento.

CLI:

```bash
pnpm dev:node HASH_SHA256_BASE64
```

API Hono:

```bash
pnpm dev:hono
```

Angular:

```bash
pnpm dev:angular
```

## Fuente principal

- Package: [`@ltorresu82/firmagob-client`](https://www.npmjs.com/package/@ltorresu82/firmagob-client)
- Repo: [`ltorresu82/firmagob-client`](https://github.com/ltorresu82/firmagob-client)
- FirmaGob: [Manual API FirmaGob](https://firma.digital.gob.cl/biblioteca/manuales-firmagob/manual-api-firma/)

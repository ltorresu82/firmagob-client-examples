# AGENTS.md - firmagob-client-examples

Este repositorio es publico y debe mantenerse generico.

## Alcance

- Contiene ejemplos de integracion para `@ltorresu82/firmagob-client`.
- Debe servir como referencia para cualquier institucion publica habilitada para usar FirmaGob.
- No incluir nombres de clientes, proyectos internos, instituciones especificas, conversaciones privadas ni documentos no publicos.
- Los ejemplos deben usar valores genericos y variables de entorno.

## Seguridad

- No commitear credenciales, tokens, RUN reales, documentos firmados reales ni respuestas productivas.
- Las variables `FIRMAGOB_*` deben cargarse desde un gestor de secretos, entorno local o archivo `.env` no versionado.
- No imprimir secretos en consola, logs o evidencia.

## Verificacion

Antes de publicar cambios ejecutar:

```bash
npm ci
npm run check
```

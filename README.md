# Khipu Escolar

Plataforma escolar multitenant para colegios del Perú. «Cada día de tu hijo, bien anudado.»

- Guía para colaboradores y agentes, comandos y arquitectura: [`AGENTS.md`](AGENTS.md)
- Despliegue (Supabase, Vercel, correo, crons): [`docs/despliegue.md`](docs/despliegue.md)
- Specs por módulo: [`specs/`](specs/00-indice.md)
- Bitácora de conversaciones (obligatoria): [`conversaciones/`](conversaciones/README.md)

## Arranque rápido

```bash
pnpm install
pnpm db:start
cp .env.example .env    # completa las claves con: pnpm exec supabase status
pnpm db:deploy && pnpm db:seed
pnpm dev                # http://lvh.me:3000  (contraseña demo123)
```

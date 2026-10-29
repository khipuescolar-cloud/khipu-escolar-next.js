import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `process.env` y no `env()`: `prisma generate` (postinstall en Vercel) no necesita la base y no debe fallar
  // si DATABASE_URL todavía no está cargada. migrate/db sí la exigen y avisan si falta.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

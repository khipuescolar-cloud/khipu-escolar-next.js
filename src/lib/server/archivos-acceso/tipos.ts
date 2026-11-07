import type { Archivo } from "@/generated/prisma/client";
import type { TenantContext } from "../tenant";

export type ResultadoAcceso = "permitir" | "denegar" | null;
export type ResolverAcceso = (ctx: TenantContext, archivo: Archivo) => Promise<ResultadoAcceso>;

import "server-only";
import type { ProveedorTutorIA } from "@/lib/nudito/contratos";
import { crearProveedorChat, postJson } from "./chat";

// Adaptador Anthropic (Messages API) con `fetch`, sin SDK. Solo se registra si existe ANTHROPIC_API_KEY y la
// configuración de plataforma («nudito_plus:proveedor».nombre = "claude") lo elige. HOY NO HAY CLAVE: no se usa.

type RespuestaClaude = { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };

export function proveedorClaude(modelo: string | null): ProveedorTutorIA | null {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return null;
  const m = modelo ?? "claude-haiku-4-5";
  return crearProveedorChat("claude", m, async ({ sistema, mensajes, maxTokens }) => {
    const r = (await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": clave, "anthropic-version": "2023-06-01" },
      { model: m, max_tokens: maxTokens, system: sistema, messages: mensajes.map((x) => ({ role: x.rol === "usuario" ? "user" : "assistant", content: x.texto })) },
    )) as RespuestaClaude;
    const texto = (r.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return { texto, tokensEntrada: r.usage?.input_tokens ?? 0, tokensSalida: r.usage?.output_tokens ?? 0 };
  });
}

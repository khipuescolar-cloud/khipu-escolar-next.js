import "server-only";
import type { ProveedorTutorIA } from "@/lib/nudito/contratos";
import { crearProveedorChat, postJson } from "./chat";

// Adaptador OpenAI (Chat Completions) con `fetch`, sin SDK. Solo se registra si existe OPENAI_API_KEY y la configuración
// de plataforma lo elige ("openai"). HOY NO HAY CLAVE: no se usa.

type RespuestaOpenAI = { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };

export function proveedorOpenAI(modelo: string | null): ProveedorTutorIA | null {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return null;
  const m = modelo ?? "gpt-4o-mini";
  return crearProveedorChat("openai", m, async ({ sistema, mensajes, json, maxTokens }) => {
    const r = (await postJson(
      "https://api.openai.com/v1/chat/completions",
      { authorization: `Bearer ${clave}` },
      {
        model: m,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: sistema }, ...mensajes.map((x) => ({ role: x.rol === "usuario" ? "user" : "assistant", content: x.texto }))],
      },
    )) as RespuestaOpenAI;
    return { texto: r.choices?.[0]?.message?.content ?? "", tokensEntrada: r.usage?.prompt_tokens ?? 0, tokensSalida: r.usage?.completion_tokens ?? 0 };
  });
}

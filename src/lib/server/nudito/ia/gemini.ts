import "server-only";
import type { ProveedorTutorIA } from "@/lib/nudito/contratos";
import { crearProveedorChat, postJson } from "./chat";

// Adaptador Google Gemini (generateContent) con `fetch`, sin SDK. Solo se registra si existe GEMINI_API_KEY y la
// configuración de plataforma lo elige ("gemini"). HOY NO HAY CLAVE: no se usa.

type RespuestaGemini = { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };

export function proveedorGemini(modelo: string | null): ProveedorTutorIA | null {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return null;
  const m = modelo ?? "gemini-2.0-flash";
  return crearProveedorChat("gemini", m, async ({ sistema, mensajes, json, maxTokens }) => {
    const r = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,
      { "x-goog-api-key": clave },
      {
        systemInstruction: { parts: [{ text: sistema }] },
        contents: mensajes.map((x) => ({ role: x.rol === "usuario" ? "user" : "model", parts: [{ text: x.texto }] })),
        generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
      },
    )) as RespuestaGemini;
    const texto = (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return { texto, tokensEntrada: r.usageMetadata?.promptTokenCount ?? 0, tokensSalida: r.usageMetadata?.candidatesTokenCount ?? 0 };
  });
}

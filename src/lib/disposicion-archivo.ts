/** Solo los formatos que el navegador puede mostrar con seguridad se entregan inline. */
export function disposicionArchivo(nombreOriginal: string | null, mimeType: string, vista: boolean): string {
  const seguro = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mimeType);
  const nombre = (nombreOriginal ?? "archivo").replace(/[^\w.\- ()]/g, "_");
  return `${vista && seguro ? "inline" : "attachment"}; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombreOriginal ?? "archivo")}`;
}

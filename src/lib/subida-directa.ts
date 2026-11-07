export type SubidaPreparada = { url: string; metodo: "PUT"; headers: Record<string, string>; subidaId: string };
export async function subirDirecto<T>(file: File, opciones: { iniciar: () => Promise<SubidaPreparada>; confirmar: (id: string) => Promise<T>; onProgreso?: (porcentaje: number) => void; signal?: AbortSignal }): Promise<T> {
  const subida = await opciones.iniciar();
  for (let intento = 0; intento < 3; intento++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", subida.url);
        for (const [clave, valor] of Object.entries(subida.headers)) if (clave.toLowerCase() !== "content-length") xhr.setRequestHeader(clave, valor);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) opciones.onProgreso?.(Math.round(e.loaded * 100 / e.total)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Error de subida: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("No se pudo subir el archivo."));
        xhr.onabort = () => reject(new DOMException("Subida cancelada", "AbortError"));
        opciones.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
        xhr.send(file);
      });
      return opciones.confirmar(subida.subidaId);
    } catch (error) {
      if (opciones.signal?.aborted || intento === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** intento));
    }
  }
  throw new Error("No se pudo subir el archivo.");
}

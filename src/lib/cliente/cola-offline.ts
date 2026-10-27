"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vaciarCola, type ResultadoEnvio } from "@/lib/registro-offline";

// Cola local en IndexedDB (API nativa, sin paquetes) para registros hechos sin conexión (specs/04, specs/05).
// Una sola base «khipu-offline» con un almacén por tipo de cola. Solo guarda lo mínimo para reenviar; se vacía al sincronizar.

const BD = "khipu-offline";
const VERSION = 1;
export type NombreCola = "listas" | "escaneos";
const EVENTO = "khipu-cola-cambio";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BD, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const nombre of ["listas", "escaneos"] as const) {
        if (!db.objectStoreNames.contains(nombre)) db.createObjectStore(nombre, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operar<R>(almacen: NombreCola, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  const db = await abrir();
  try {
    return await new Promise<R>((resolve, reject) => {
      const tx = db.transaction(almacen, modo);
      const req = fn(tx.objectStore(almacen));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export type ItemCola = { id: string; creadoAt: string };

export const indexedDbDisponible = () => typeof indexedDB !== "undefined";

export function crearCola<T extends ItemCola>(almacen: NombreCola) {
  const avisarCambio = () => window.dispatchEvent(new Event(EVENTO));
  return {
    nombre: almacen,
    /** Guarda o reemplaza por id. */
    async guardar(item: T): Promise<void> {
      await operar(almacen, "readwrite", (s) => s.put(item));
      avisarCambio();
    },
    /** Guarda solo si no existía; devuelve false si ya estaba. */
    async agregarSiNoExiste(item: T): Promise<boolean> {
      const previo = await operar(almacen, "readonly", (s) => s.get(item.id));
      if (previo) return false;
      await operar(almacen, "readwrite", (s) => s.put(item));
      avisarCambio();
      return true;
    },
    async listar(): Promise<T[]> {
      const todos = await operar<T[]>(almacen, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
      return todos.sort((a, b) => a.creadoAt.localeCompare(b.creadoAt));
    },
    async contar(): Promise<number> {
      return operar(almacen, "readonly", (s) => s.count());
    },
    async quitar(id: string): Promise<void> {
      await operar(almacen, "readwrite", (s) => s.delete(id));
      avisarCambio();
    },
  };
}

export type Cola<T extends ItemCola> = ReturnType<typeof crearCola<T>>;

/**
 * Estado de la cola para la interfaz: pendientes, conexión y sincronización automática
 * (al abrir la página y al volver la conexión). Un candado evita que dos pestañas envíen a la vez.
 */
export function useColaOffline<T extends ItemCola>(
  cola: Cola<T>,
  enviar: (item: T) => Promise<ResultadoEnvio>,
  alTerminar: (r: { enviados: number; descartados: number; pendientes: number }) => void,
) {
  const [pendientes, setPendientes] = useState(0);
  const [enLinea, setEnLinea] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);
  const refs = useRef({ enviar, alTerminar });
  useEffect(() => {
    refs.current = { enviar, alTerminar };
  });

  const refrescar = useCallback(async () => {
    try {
      setPendientes(await cola.contar());
    } catch {
      setPendientes(0);
    }
  }, [cola]);

  const sincronizar = useCallback(async () => {
    if (enCurso.current || !navigator.onLine || !indexedDbDisponible()) return;
    enCurso.current = true;
    const correr = async () => {
      const items = await cola.listar();
      if (items.length === 0) return;
      setEnviando(true);
      const r = await vaciarCola(items, refs.current.enviar, (i) => cola.quitar(i.id));
      refs.current.alTerminar(r);
    };
    try {
      if (navigator.locks) await navigator.locks.request(`khipu-sync-${cola.nombre}`, { ifAvailable: true }, async (l) => (l ? correr() : undefined));
      else await correr();
    } catch (error) {
      console.error("[offline] no se pudo sincronizar", error);
    } finally {
      enCurso.current = false;
      setEnviando(false);
      await refrescar();
    }
  }, [cola, refrescar]);

  useEffect(() => {
    // Estado inicial desde el navegador (no se puede leer en el render del servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnLinea(navigator.onLine);
    void refrescar().then(sincronizar);
    const alConectar = () => {
      setEnLinea(true);
      void sincronizar();
    };
    const alDesconectar = () => setEnLinea(false);
    const alCambiar = () => void refrescar();
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    window.addEventListener(EVENTO, alCambiar);
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
      window.removeEventListener(EVENTO, alCambiar);
    };
  }, [refrescar, sincronizar]);

  return { pendientes, enLinea, enviando, sincronizar };
}

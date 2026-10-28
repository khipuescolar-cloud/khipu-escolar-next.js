// Publicación en tiendas (docs/app-tiendas.md, specs/24-app-instalable.md).

export type DeclaracionAssetLinks = {
  relation: string[];
  target: { namespace: "android_app"; package_name: string; sha256_cert_fingerprints: string[] };
};

const HUELLA = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Contenido de /.well-known/assetlinks.json: vincula el dominio con la app Android (TWA) para que se abra sin
 * barra del navegador. Las huellas SHA-256 van separadas por comas (la de subida y la de firma de Google Play).
 */
export function declaracionesAssetLinks(paquete: string | undefined, huellas: string | undefined): DeclaracionAssetLinks[] {
  const nombre = paquete?.trim();
  const lista = (huellas ?? "")
    .split(",")
    .map((h) => h.trim().toUpperCase())
    .filter((h) => HUELLA.test(h));
  if (!nombre || !/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(nombre) || lista.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: nombre, sha256_cert_fingerprints: lista },
    },
  ];
}

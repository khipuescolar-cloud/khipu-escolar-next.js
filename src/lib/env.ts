// Lectura centralizada de variables de entorno. Las *_KEY/SECRET solo se usan en el servidor.

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const env = {
  get databaseUrl() {
    return requerida("DATABASE_URL");
  },
  get supabaseUrl() {
    return requerida("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requerida("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return requerida("SUPABASE_SERVICE_ROLE_KEY");
  },
  get appBaseDomain() {
    return process.env.APP_BASE_DOMAIN ?? "lvh.me:3000";
  },
  get appProtocol() {
    return process.env.APP_PROTOCOL ?? "http";
  },
  get cookieDomain() {
    return process.env.COOKIE_DOMAIN || undefined;
  },
  get appSecret() {
    return requerida("APP_SECRET");
  },
};

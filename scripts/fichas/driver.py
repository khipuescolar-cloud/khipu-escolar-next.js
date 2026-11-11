#!/usr/bin/env python3
"""Supervisor automático de fichas (sin LLM propio): cola de lotes -> codex exec (GPT-6-Sol) -> validar -> fusionar -> cerrar combinación -> ff a dev.
Reanudable: el estado vive en _briefs/estado.json. Uso: python3 driver.py"""
import json, os, re, subprocess, threading, time, glob, unicodedata, sys
from concurrent.futures import ThreadPoolExecutor

W = "/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt"
B = f"{W}/_briefs"
WT = f"{W}/fichas-mat-p5"          # worktree único (rama feat/fichas-banco)
MAIN = "/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar"
BANCO = "src/lib/nudito/conocimiento/banco"
AREAS = {"mat": "matematica", "com": "comunicacion", "cyt": "ciencia-tecnologia"}
PARALELO = 4
TAM = 12
ESTADO = f"{B}/estado.json"
LOG = "/tmp/claude-1000/driver.log"
lock = threading.Lock()
TRAILER = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"


def log(*a):
    linea = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(linea, flush=True)
    with open(LOG, "a") as f:
        f.write(linea + "\n")


def cargar_estado():
    return json.load(open(ESTADO)) if os.path.exists(ESTADO) else {"lotes": {}, "combos": {}}


def guardar(estado):
    json.dump(estado, open(ESTADO, "w"), indent=1, ensure_ascii=False)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()).strip("-")


def carpeta(area, nivel, g):
    return f"{BANCO}/{AREAS[area]}/{nivel}-{g}"


def construir_cola(estado):
    """Lista ordenada de lotes pendientes: (lote, area, nivel, grado, claves)."""
    cola = []
    # REGLA (Carlos, 2026-11-11): primero TODA la primaria (primera reunión: lunes 2026-11-16);
    # luego secundaria GRADO POR GRADO (1.° completo en los 3 cursos antes de pasar a 2.°, etc.).
    orden = [("mat", "primaria", g) for g in range(1, 7)]
    for g in range(1, 7):
        orden += [("com", "primaria", g), ("cyt", "primaria", g)]
    for g in range(1, 6):
        orden += [("mat", "secundaria", g), ("com", "secundaria", g), ("cyt", "secundaria", g)]
    for area, nivel, g in orden:
        d = f"{WT}/{carpeta(area, nivel, g)}"
        t = json.load(open(d + "/temario-propuesto.json"))
        temas = sorted((x["ordenSugerido"], b["nombre"], x["clave"]) for c in t["competencias"] for cap in c["capacidades"] for b in cap["bloques"] for x in b["temas"])
        temas.sort(key=lambda x: (x[1], x[0]))
        claves = [k for _, _, k in temas]
        combo = f"{area}-{nivel[0]}{g}"
        existentes = {f["clave"] for fn in glob.glob(d + "/fichas/*.json") for f in json.load(open(fn))}
        if claves and all(k in existentes for k in claves):
            estado["combos"].setdefault(combo, {"total": len(claves), "estado": "integrado", "fichas": len(claves)})
            continue
        estado["combos"].setdefault(combo, {"total": len(claves), "estado": "pendiente"})
        if area == "mat" and nivel == "primaria" and g == 5:
            nombres = [f"p5-l{i}" for i in range(1, 11)]
            trozos = [open(f"{B}/lotes/{n}.txt").read().split() for n in nombres]
        else:
            trozos = [claves[i:i + TAM] for i in range(0, len(claves), TAM)]
            nombres = [f"{combo}-l{i + 1}" for i in range(len(trozos))]
            for n, c in zip(nombres, trozos):
                open(f"{B}/lotes/{n}.txt", "w").write("\n".join(c) + "\n")
        for n, c in zip(nombres, trozos):
            estado["lotes"].setdefault(n, {"combo": combo, "estado": "pendiente", "intentos": 0})
            if estado["lotes"][n]["estado"] != "fusionado":
                cola.append((n, area, nivel, g, c))
    return cola


NOMBRE_AREA = {"mat": "Matemática", "com": "Comunicación", "cyt": "Ciencia y Tecnología"}
EDAD = {("primaria", g): 5 + g for g in range(1, 7)} | {("secundaria", g): 11 + g for g in range(1, 6)}
FUENTE = {"primaria": "https://repositorio.minedu.gob.pe/handle/20.500.12799/4549", "secundaria": "https://repositorio.minedu.gob.pe/handle/20.500.12799/4550"}
ADD = {
    "mat": "Matemática: todo en texto (tablas/dibujos con ●, ★, ||||, listas). numerico: la respuesta es un número y la unidad va en el enunciado («Escribe solo el número»). Verifica cada cuenta dos veces. Si el tema es «crear/inventar» (respuesta libre), pide elegir, comprobar o completar según una regla dada.",
    "com": "Comunicación: los ejercicios de lectura llevan el texto en el campo `lectura` (texto ORIGINAL escrito por ti, 40–150 palabras, contexto peruano; nunca copies textos con derechos de autor; en literatura usa resúmenes propios o fragmentos muy breves de dominio público citando autor y obra). Varios ejercicios pueden compartir un mismo texto escribiéndolo en cada uno. Tipos: opcion_multiple, verdadero_falso, texto_corto (1–3 palabras; en alternativasAceptadas incluye la variante con y sin tilde), numerico solo para conteos (sílabas, palabras, oraciones). Nada de respuestas abiertas largas ni de producción de texto: pide completar, elegir, corregir, ordenar o identificar. Ortografía y tildes: la comparación ignora mayúsculas y tildes, así que no evalúes la tilde con texto_corto; usa opcion_multiple.",
    "cyt": "Ciencia y Tecnología: datos y definiciones científicamente correctos (verifícalos), unidades y fórmulas correctas, contexto peruano (regiones, flora, fauna, ciudades). Indagación y diseño tecnológico: situaciones con datos o pasos descritos en texto (variables, hipótesis, tablas de datos, criterios de diseño). Cálculos solo con números sencillos y verificados. Tipos: opcion_multiple, verdadero_falso, numerico, texto_corto (1–3 palabras).",
}


VAL_SHELL = """Salida: escribe el arreglo JSON completo de TODAS las fichas del lote en {B}/salida/{lote}.json. Valida con: cd {WT} && ./node_modules/.bin/tsx {B}/validar-lote.ts {B}/salida/{lote}.json {B}/lotes/{lote}.txt (debe imprimir «OK n fichas»; corrige a mano las fichas con error y repite). Puedes usar un script SOLO para armar el JSON a partir de texto que escribiste tú uno por uno; prohibido generar ejercicios, pistas o retroalimentación con plantillas. No toques otros archivos ni uses git. Responde en 1 línea.
"""
VAL_NOSHELL = """Salida: escribe el arreglo JSON completo de TODAS las fichas del lote con la herramienta de archivos en {B}/salida/{lote}.json. NO ejecutes comandos de terminal (no tienes permiso). No valides: lo hace el supervisor. No toques otros archivos. Responde en 1 línea.
"""


def escribir_prompt(lote, area, nivel, g, errores=None, shell=True):
    edad = EDAD[(nivel, g)]
    txt = f"""# Escritor de fichas de Nudito — {NOMBRE_AREA[area]} {g}.° de {nivel} (niños/jóvenes de ~{edad} años)
Salida ultra breve. Trabajo: escribir fichas a mano, una por una, adecuadas a la edad y al grado.
Worktree: {WT}. Lote {lote}: claves en {B}/lotes/{lote}.txt (una por línea).
Para cada clave lee su entrada en {WT}/{carpeta(area, nivel, g)}/temario-propuesto.json (nombre, descripción, bloque, capacidad, competencia, desempeños, prerrequisitos, orden, disciplina) y escribe la ficha. Lee solo: (a) el esquema {WT}/src/lib/nudito/conocimiento/esquema.ts, (b) UNA ficha modelo aprobada: {WT}/{BANCO}/matematica/primaria-3/fichas/c23-masa-tiempo.json (primera ficha) para el formato y la calidad.
Campos: copia tal cual clave, area "{AREAS[area]}", nivel "{nivel}", grado {g}, competenciaCneb, capacidad, desempenosOrigen, bloque, nombre, disciplina, descripcionCorta (la descripción del temario), palabrasClave 3–6, prerrequisitos, ordenSugerido; version 1, revisado null, fuentes [{{documento:"Programa curricular de Educación {nivel.capitalize()}, MINEDU", url:"{FUENTE[nivel]}"}}].
Contenido («tú», alentador, contexto peruano):
- ideaCentral 1–2 oraciones; pasos 3–5; ejemplos 2–3 con situacion, desarrollo, respuesta; erroresFrecuentes 2–3 {{error, correccion}}; vocabulario 2–4 {{termino, significado}}.
- ejercicios 12–13 (ids e01…): dificultad 1, 2 y 3 (≥3 de cada, de fácil a difícil; la 3 pide más pasos o razonar). Cada ejercicio practica EXACTAMENTE ese tema. Mezcla tipos. opcion_multiple: 3–4 opciones ids a–d, exactamente una correcta, posición de la correcta VARIADA, retroalimentación nombra la opción por su TEXTO, nunca por letra. verdadero_falso: el enunciado es una afirmación; respuesta true/false. texto_corto: respuesta corta + alternativasAceptadas (se compara literal: mayúsculas, tildes y espacios no importan; orden y signos sí).
- 3 pistas por ejercicio, graduales y ESPECÍFICAS de ese ejercicio (usa sus datos), nunca repetidas en la ficha. retroalimentacion: el error típico de ESE ejercicio + la respuesta correcta.
- PROHIBIDO plantilla: enunciados distintos entre sí (no el mismo cuerpo con otro lugar/nombre/número); no empieces enunciados ni pistas con un contexto repetido («En el aula: …»); no uses «Mira los X en el Y»; concordancia correcta en español; la dificultad 3 no es solo números más grandes.
- {ADD[area]}
{{CIERRE}}"""
    txt = txt.replace("{CIERRE}", (VAL_SHELL if shell else VAL_NOSHELL).format(B=B, WT=WT, lote=lote))
    if errores:
        txt += f"\nCORRIGE: tu versión anterior en {B}/salida/{lote}.json tuvo estos errores del validador. Reescribe SOLO esas fichas a mano (mismas claves) y deja el archivo completo con todas las fichas del lote:\n{errores[:2500]}\n"
    ruta = f"{B}/prompts/{lote}.md"
    os.makedirs(f"{B}/prompts", exist_ok=True)
    open(ruta, "w").write(txt)
    return ruta


def validar(lote):
    r = subprocess.run(["./node_modules/.bin/tsx", f"{B}/validar-lote.ts", f"{B}/salida/{lote}.json", f"{B}/lotes/{lote}.txt"], cwd=WT, capture_output=True, text=True)
    return r.returncode == 0, (r.stdout + r.stderr).strip()


BACKENDS = ["agy-sonnet", "codex"]
frio = {}
lock_b = threading.Lock()


def espera_de(txt):
    m = re.search(r"Resets in (\d+)h(\d+)m", txt)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + 120
    return espera_cuota(txt)


def elegir_backend():
    while True:
        with lock_b:
            libres = [x for x in BACKENDS if frio.get(x, 0) <= time.time()]
            if libres:
                return libres[0]
            dormir = min(frio.values()) - time.time()
        log("todos los modelos sin cuota; espero", int(dormir // 60), "min")
        time.sleep(max(60, min(dormir, 1800)))


def ejecutar(bk, lote, ruta):
    if bk == "codex":
        prompt = f"Lee {ruta} y sigue todas sus instrucciones. Respuesta final ultra breve (estilo caveman)."
        cmd = ["codex", "exec", "-m", "gpt-6-sol", "-s", "workspace-write", "-c", "sandbox_workspace_write.network_access=true", "--add-dir", B, "-C", WT, "--skip-git-repo-check", prompt]
    else:
        cmd = ["agy", "--model", "claude-sonnet-4-6", "--mode", "accept-edits", "--add-dir", B, "--output-format", "text", f"--print=Lee {ruta} y sigue todas sus instrucciones."]
    r = subprocess.run(cmd, cwd=WT, capture_output=True, text=True, timeout=3300)
    txt = r.stdout[-3000:] + r.stderr[-3000:]
    open(f"/tmp/claude-1000/{bk}-{lote}.log", "w").write(txt)
    return txt


def correr_agy(lote, area, nivel, g, errores):
    while True:
        bk = elegir_backend()
        ruta = escribir_prompt(lote, area, nivel, g, errores, shell=(bk == "codex"))
        log(bk, lote)
        try:
            txt = ejecutar(bk, lote, ruta)
        except Exception as e:
            txt = str(e)
        if QUOTA.search(txt):
            w = espera_de(txt)
            with lock_b:
                frio[bk] = time.time() + w
            log("sin cuota", bk, "por", w // 60, "min")
            continue
        return txt


def fusionar(lote, area, nivel, g):
    d = f"{WT}/{carpeta(area, nivel, g)}/fichas"
    os.makedirs(d, exist_ok=True)
    nuevas = json.load(open(f"{B}/salida/{lote}.json"))
    archivos = {fn: json.load(open(fn)) for fn in glob.glob(d + "/*.json")}
    donde = {f["clave"]: fn for fn, fs in archivos.items() for f in fs}
    for f in nuevas:
        fn = donde.get(f["clave"], f"{d}/{slug(f['bloque'])}.json")
        fs = archivos.setdefault(fn, [])
        fs[:] = [x for x in fs if x["clave"] != f["clave"]] + [f]
    for fn, fs in archivos.items():
        fs.sort(key=lambda x: x["ordenSugerido"])
        with open(fn, "w") as fh:
            json.dump(fs, fh, ensure_ascii=False, indent=2)
            fh.write("\n")


def sh(cmd, cwd, **kw):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, **kw)


def cerrar_combo(estado, combo):
    area, nv = combo.split("-")
    nivel = "primaria" if nv[0] == "p" else "secundaria"
    g = int(nv[1:])
    d = carpeta(area, nivel, g)
    n = sum(len(json.load(open(fn))) for fn in glob.glob(f"{WT}/{d}/fichas/*.json"))
    v = sh(["./node_modules/.bin/tsx", "scripts/nudito-validar-banco.ts"], WT)
    salida = (v.stdout + v.stderr).strip()
    if v.returncode != 0 or "Banco válido" not in salida:
        estado["combos"][combo].update(estado="atencion", nota=salida[:1500])
        log("COMBO ATENCION", combo, salida[:300])
        return
    sh(["git", "add", f"{d}/fichas"], WT)
    sh(["git", "commit", "-q", "-m", f"Write {AREAS[area]} {nivel} {g} knowledge sheets ({n} sheets)\n\n{TRAILER}"], WT)
    for intento in range(3):
        sh(["git", "merge", "-q", "--no-edit", "dev"], WT)
        t = sh(["./node_modules/.bin/vitest", "run", "tests/unit/nudito-banco-conocimiento.test.ts", "tests/unit/nudito-plantillas.test.ts"], WT)
        if t.returncode != 0:
            estado["combos"][combo].update(estado="atencion", nota="pruebas unit: " + (t.stdout + t.stderr)[-800:])
            log("COMBO ATENCION pruebas", combo)
            return
        ff = sh(["git", "merge", "--ff-only", "feat/fichas-banco"], MAIN)
        if ff.returncode == 0:
            estado["combos"][combo].update(estado="integrado", fichas=n)
            log("COMBO INTEGRADO a dev", combo, n)
            return
        time.sleep(20)
    estado["combos"][combo].update(estado="atencion", nota="ff a dev falló: " + ff.stderr[-500:])
    log("COMBO ATENCION ff", combo)


QUOTA = re.compile(r"usage limit|quota reached|RESOURCE_EXHAUSTED|rate.?limit", re.I)
HORA = re.compile(r"try again at (\d{1,2}):(\d{2}) ?(AM|PM)", re.I)


def espera_cuota(txt):
    m = HORA.search(txt)
    if not m:
        return 1800
    h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3).upper()
    h = h % 12 + (12 if ap == "PM" else 0)
    ahora = time.localtime()
    objetivo = time.mktime((ahora.tm_year, ahora.tm_mon, ahora.tm_mday, h, mi, 0, 0, 0, -1))
    if objetivo <= time.time():
        objetivo += 86400
    return int(objetivo - time.time()) + 180


def trabajar(item):
    lote, area, nivel, g, claves = item
    estado = ESTADO_GLOBAL
    info = estado["lotes"][lote]
    errores = None
    # precargados: el archivo ya existe (agentes visibles/antiguos)
    pre = os.path.exists(f"{B}/salida/{lote}.json") and info["estado"] in ("pendiente", "validado")
    for intento in range(1, 12):
        if not pre:
            log("lote", lote, "intento", intento)
            correr_agy(lote, area, nivel, g, errores)
        pre = False
        info["intentos"] += 1
        if not os.path.exists(f"{B}/salida/{lote}.json"):
            errores = "No se escribió el archivo de salida."
            time.sleep(60)
            continue
        ok, out = validar(lote)
        if ok:
            with lock:
                info["estado"] = "validado"
                combo = info["combo"]
                miembros = [n for n in estado["lotes"] if estado["lotes"][n]["combo"] == combo]
                if all(estado["lotes"][n]["estado"] in ("validado", "fusionado") for n in miembros):
                    for n in miembros:
                        if estado["lotes"][n]["estado"] == "validado":
                            m = estado["lotes"][n]
                            fusionar(n, area, nivel, g)
                            m["estado"] = "fusionado"
                    estado["combos"][combo]["estado"] = "completo"
                    cerrar_combo(estado, combo)
                guardar(estado)
            log("lote OK", lote)
            return
        errores = out
        log("lote con errores", lote, out[:200])
    info["estado"] = "fallido"
    info["nota"] = errores[:800] if errores else ""
    with lock:
        guardar(estado)
    log("LOTE FALLIDO", lote)


if __name__ == "__main__":
    ESTADO_GLOBAL = cargar_estado()
    cola = construir_cola(ESTADO_GLOBAL)
    guardar(ESTADO_GLOBAL)
    log("cola:", len(cola), "lotes")
    with ThreadPoolExecutor(max_workers=PARALELO) as ex:
        list(ex.map(trabajar, cola))
    log("COLA FIN")

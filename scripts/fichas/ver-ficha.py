#!/usr/bin/env python3
"""Muestra una ficha legible. Uso: ver-ficha.py <clave|parte-del-nombre> [--todo]   Ej.: ver-ficha.py mat.p5.numeros-decimales"""
import json, glob, sys, os
R = "/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar/src/lib/nudito/conocimiento/banco"
q = sys.argv[1].lower() if len(sys.argv) > 1 else ""
for fn in sorted(glob.glob(R + "/*/*/fichas/*.json")):
    for f in json.load(open(fn)):
        if q in f["clave"].lower() or q in f["nombre"].lower():
            print(f"\n# {f['nombre']}  ({f['clave']})\n{f['area']} · {f['nivel']} {f['grado']}.° · {f['bloque']} · disciplina: {f['disciplina']}\n")
            print("IDEA:", f["ideaCentral"], "\nPASOS:"); [print(" ", i + 1, p) for i, p in enumerate(f["pasos"])]
            print("EJEMPLOS:"); [print("  -", e["situacion"], "→", e["respuesta"]) for e in f["ejemplos"]]
            print("ERRORES FRECUENTES:"); [print("  -", e["error"], "→", e["correccion"]) for e in f["erroresFrecuentes"]]
            print(f"EJERCICIOS ({len(f['ejercicios'])}):")
            for e in f["ejercicios"]:
                print(f"  [{e['id']} · dif {e['dificultad']} · {e['tipo']}] {e.get('lectura','') and '«'+e['lectura'][:80]+'…» '}{e['enunciado']}")
                if e.get("opciones"): print("      opciones:", " | ".join(f"{o['id']}) {o['texto']}" for o in e["opciones"]))
                print("      respuesta:", e["respuesta"], "| pistas:", " / ".join(e["pistas"])); print("      si falla:", e["retroalimentacion"])
            if "--todo" not in sys.argv: sys.exit()

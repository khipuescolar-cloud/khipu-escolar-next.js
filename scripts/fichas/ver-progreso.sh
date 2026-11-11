#!/bin/bash
B="/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt/_briefs"
while true; do
  clear; echo "== Fichas (Codex automático) — $(date +%H:%M:%S) =="
  python3 - <<'PY'
import json,os
B="/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt/_briefs"
try: e=json.load(open(B+"/estado.json"))
except Exception: e={"lotes":{},"combos":{}}
from collections import Counter
c=Counter(v["estado"] for v in e["lotes"].values()); print("Lotes:",dict(c))
k=Counter(v["estado"] for v in e["combos"].values()); print("Combinaciones:",dict(k))
for n,v in e["combos"].items():
    if v["estado"] in ("integrado","atencion"): print(" ",n,v["estado"],v.get("fichas",""))
PY
  echo; echo "Últimas líneas del supervisor:"; tail -8 /tmp/claude-1000/driver.log 2>/dev/null | cut -c1-110
  sleep 10
done

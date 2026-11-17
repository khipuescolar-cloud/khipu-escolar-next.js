import json,glob,re,sys
def norm(s):
    import unicodedata
    s=unicodedata.normalize("NFD",s.lower()); s="".join(c for c in s if unicodedata.category(c)!="Mn")
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9ñ ]+"," ",s)).strip()
datos=json.load(open("/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt/qa-preview/src/app/refuerzo-preview-temporal/datos.json"))
rows=[];det={}
for i,f in enumerate(datos):
    try: r=json.load(open(f"res/{i}.json"))
    except: rows.append((f["clave"],"SIN RESULTADO","","")); continue
    d=[]; cl=f["clase"]
    if r.get("error"): d.append("ERROR script: "+r["error"][:120])
    for vp in("esc","mov"):
        v=r.get(vp)
        if not v: continue
        lg=v["log"]
        if lg["consola"]: d.append(f"{vp}: consola {lg['consola'][:2]}")
        if lg["http"]: d.append(f"{vp}: HTTP>=400 {lg['http'][:2]}")
        if lg["fallos"]: d.append(f"{vp}: requestfailed {lg['fallos'][:2]}")
        mom=v.get("mom",[])
        if len(mom)!=r["momentos"]: d.append(f"{vp}: {len(mom)} momentos vs {r['momentos']}")
        for m in mom:
            if any(not x["ok"] for x in m["imgs"]): d.append(f"{vp} m{m['i']+1}: img sin cargar {[x['cur'][-50:] for x in m['imgs'] if not x['ok']]}")
            if m["ovf"]["doc"]>0 or m["ovf"]["body"]>0: d.append(f"{vp} m{m['i']+1}: desborde {m['ovf']}")
        if mom:
            if mom[0]["imgs"]: d.append(f"{vp}: momento 1 con imagen")
            if mom[-1]["imgs"]: d.append(f"{vp}: comprobación con imagen")
        v["nimg"]=sum(1 for m in mom if m["imgs"]); v["distintas"]=len({x["cur"] for m in mom for x in m["imgs"]})
        # imagen esperada vs mostrada
        exp=[bool(m.get("recursoRef")) for m in cl["momentos"]]+[False]
        got=[bool(m["imgs"]) for m in mom]
        if exp!=got and mom: d.append(f"{vp}: imágenes por momento no coinciden con recursoRef")
    # comprobación
    c=r.get("compr",{}); it=c.get("intentos",[])
    if not it or not it[-1]["esBien"] or "Correcto" not in it[-1]["fb"] or not it[-1]["practicarHab"]: d.append("comprobación: fallo en acierto/habilitar práctica")
    if any((not x["esBien"]) and not x["fb"].startswith("Pista") for x in it): d.append("comprobación: error sin pista")
    if c.get("practicarAntes") is True: d.append("«A practicar» habilitado antes de acertar")
    rt=r.get("retomar",{})
    if not(rt.get("fieldset")==1 and rt.get("pressed")==1 and rt.get("practicarHab")): d.append(f"retroceso: no conserva estado {rt}")
    ct=r.get("controles",{})
    if (ct.get("trasIniciar"),ct.get("trasPausar"),ct.get("trasReanudar"))!=("Pausar","Reanudar","Pausar"): d.append(f"controles {ct}")
    if f["clase"]["comprobacion"]["mensajeCorrecto"].lower().startswith("correcto") : d.append("duplicado «¡Correcto! Correcto.» (prefijo)") if it and it[-1]["fb"].lower().count("correcto")>1 else None
    # audio
    sp=r.get("hablado") or []
    por={}
    for u in sp: por.setdefault(u["m"],[]).append(u["t"])
    nm=r["momentos"]
    if not sp: d.append("audio: nada hablado")
    if "11 de 11" not in r.get("posFinal","") and f"{nm} de {nm}" not in r.get("posFinal",""): d.append(f"audio: pase no llegó al final ({r.get('posFinal')})")
    for etq,us in por.items():
        j=" ".join(us)
        dig=[x for x in re.findall(r"\S*\d\S*",j) if not re.fullmatch(r"\d+\.?",x) or True]
        j2=re.sub(r"(Opción|Ejemplo|Paso) \d+[.:]","ETQ",j)
        if re.search(r"\d",j2): d.append(f"audio {etq[-12:]}: dígitos {re.findall(r'.{12}\d+.{6}',j2)[:2]}")
        if re.search(r"parte \d+ de \d+",j,re.I): d.append(f"audio {etq[-12:]}: «parte N de M»")
        for a,b in zip(us,us[1:]):
            if norm(a)==norm(b) and len(norm(a))>8: d.append(f"audio {etq[-12:]}: fragmento duplicado consecutivo «{a[:40]}»")
        frs=[norm(x) for x in us if len(norm(x))>25]
        if len(frs)!=len(set(frs)): d.append(f"audio {etq[-12:]}: frases repetidas en el momento")
        for x in us:
            if re.fullmatch(r"[\W\d]*",x.strip()): d.append(f"audio {etq[-12:]}: fragmento huérfano «{x}»")
    # texto visible vs narrado
    mom=(r.get("esc") or {}).get("mom",[])
    for k,m in enumerate(cl["momentos"]):
        etq=f"Lección guiada · momento {k+1} de {nm}"
        j=norm(" ".join(por.get(etq,[])))
        if not j: d.append(f"audio m{k+1}: sin narración"); continue
        if norm(m["narracion"]) not in j: d.append(f"audio m{k+1}: la narración no contiene el texto visible")
        if mom and norm(m["narracion"]) not in norm(mom[k]["texto"]): d.append(f"visible m{k+1}: no muestra el texto del momento")
    jl=norm(" ".join(por.get(f"Lección guiada · momento {nm} de {nm}",[])))
    if jl:
        for q,o in enumerate(cl["comprobacion"]["opciones"]):
            if norm(o["texto"]) not in jl or f"opcion {q+1}" not in jl: d.append(f"audio comprobación: falta opción {q+1} «{o['texto'][:30]}»")
        if norm(cl["comprobacion"]["pregunta"]) not in jl: d.append("audio comprobación: falta la pregunta")
    rm=r.get("rm",{})
    if rm.get("inf"): d.append(f"mov. reducido: animaciones infinitas {set(rm['inf'])}")
    if any(not x["completo"] for x in rm.get("parcial",[])): d.append("mov. reducido: texto incompleto al reproducir")
    ne=(r.get("esc") or {}).get("nimg"); dd=(r.get("esc") or {}).get("distintas")
    rows.append((f["clave"],r["momentos"],ne,dd,d)); det[f["clave"]]=d
json.dump(det,open("det.json","w"),ensure_ascii=False,indent=1)
for x in rows: print(x[0],x[1:4] if len(x)>3 else x[1:],"\n   ","\n    ".join(x[4]) if len(x)>4 else "")

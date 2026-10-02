"""Kurucu taslağını üretecin okuyacağı dosyaya aktarır (Ege dokusu, 2 Ekim).

Kemal: "Senin yollarınla üret." Kurucu'da çizdiği yollar haritada yine
Kurucu katmanından çizilir; üreteç onları yalnız *sokak ağı* olarak
kullanır: evler bu yollara dizilir, yolun üstüne ev konmaz. Elle taşınan
evler eski kimlikleriyle yerinde kalır; kaldırılan yollar ağa girmez.

Kullanım:  python gen/kurucu_aktar.py kems-yedek.json
Çıktı:     gen/kurucu-yollari.json
"""
import json
import math
import os
import re
import sys

KOK = os.path.dirname(os.path.abspath(__file__))
L0, A0 = 25.85, 39.6
M_ENLEM = 111320.0
M_BOYLAM = 111320.0 * math.cos(math.radians(A0))


def metreye(p):          # Kurucu'nun izdüşümü (y aşağı)
    return ((p[0] - L0) * M_BOYLAM, -(p[1] - A0) * M_ENLEM)


def derceye(m):
    return (m[0] / M_BOYLAM + L0, -m[1] / M_ENLEM + A0)


def kaydir_dondur(k, dx, dy, aci):
    cx = sum(p[0] for p in k) / len(k)
    cy = sum(p[1] for p in k) / len(k)
    co, si = math.cos(aci), math.sin(aci)
    return [(cx + (x - cx) * co - (y - cy) * si + dx,
             cy + (x - cx) * si + (y - cy) * co + dy) for x, y in k]


def ciftler(n):
    return [[round(n[i], 7), round(n[i + 1], 7)] for i in range(0, len(n) - 1, 2)]


def main(yol):
    with open(yol, encoding="utf-8") as f:
        yedek = json.load(f)
    duzen = yedek["haritaDuzeni"]
    # Kurucu'da açık olan taslak en yenisi; yoksa haritaya işlenmiş hâli
    k = duzen.get("kurucu") or duzen["kurucuIslenen"]
    gizli = set(k.get("gizlenen", []))

    with open(os.path.join(KOK, "..", "src", "data", "duzadaGeo.ts"), encoding="utf-8") as f:
        metin = f.read()
    ham = re.search(r'DUZADA_GEO: FeatureCollection = JSON\.parse\((".*?")\);', metin, re.S).group(1)
    geo = json.loads(json.loads(ham))
    binalar = {f["properties"]["id"]: f for f in geo["features"]
               if f["properties"].get("katman") == "bina"}

    yollar = [{"id": i, "tur": y["tur"], "n": ciftler(y["n"])}
              for i, y in sorted(k.get("yeniYollar", {}).items())
              if i not in gizli and len(y.get("n", [])) >= 4]
    yol_duzeni = {i: [ciftler(p) for _, p in sorted(v.items(), key=lambda a: int(a[0]))]
                  for i, v in sorted(k.get("yolDuzeni", {}).items()) if i not in gizli}

    tasinan = []
    for i, d in sorted(k.get("binaDuzeni", {}).items()):
        f = binalar.get(i)
        if not i.startswith("ev_") or i in gizli or not f:
            continue
        halka = f["geometry"]["coordinates"][0][:-1]
        yeni = kaydir_dondur([metreye(p) for p in halka], d.get("dx", 0), d.get("dy", 0), d.get("aci", 0))
        p = f["properties"]
        tasinan.append({"id": i, "mahalle": p.get("mahalle"), "kat": p.get("kat"),
                        "yukseklik": p.get("yukseklik"), "taban": p.get("taban"),
                        "halka": [[round(a, 7), round(b, 7)] for a, b in halka],
                        "yeniHalka": [[round(a, 7), round(b, 7)] for a, b in map(derceye, yeni)]})

    # Ev dışındaki taşınan yapılar (okul, pazar, stat…): üreteç evleri
    # bunların yeni yerine koymaz; stat yeni yerinde yeniden kurulur
    yapi_duzeni = {i: {a: d[a] for a in ("dx", "dy", "aci") if a in d}
                   for i, d in sorted(k.get("binaDuzeni", {}).items())
                   if not i.startswith("ev_") and i not in gizli}

    yapilar = [{"id": i, "tur": b["tur"], "merkez": [round(c, 7) for c in (b["merkez"] if "merkez" in b else (b["x"], b["y"]))],
                "en": b["en"], "boy": b["boy"], "aci": b.get("aci", 0)}
               for i, b in sorted(k.get("yeniBinalar", {}).items()) if i not in gizli]

    cikti = {
        "kaynak": os.path.basename(yol),
        "yollar": yollar,
        "yolDuzeni": yol_duzeni,
        "gizlenen": sorted(gizli),
        "tasinanEvler": tasinan,
        "yapiDuzeni": yapi_duzeni,
        "yapilar": yapilar,
    }
    with open(os.path.join(KOK, "kurucu-yollari.json"), "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=1)
    print(f"{len(yollar)} yol, {len(yol_duzeni)} yol düzeni, {len(gizli)} kaldırılan, "
          f"{len(tasinan)} taşınan ev, {len(yapi_duzeni)} taşınan yapı, {len(yapilar)} yapı")


if __name__ == "__main__":
    main(sys.argv[1])

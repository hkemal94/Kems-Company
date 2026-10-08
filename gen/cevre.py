"""Düzada'nın çevresi: komşu kıyılar, adalar ve sığlıklar (8 Ekim, H-b).

Kemal: "Kameranın biraz daha uzaklaşmasına izin ver ve ada haricindeki
coğrafi bölgeleri de daha detaylandır. Denizi daha detaylandır."

Kaynak: Natural Earth 1:10m Land (kamu malı, naturalearthdata.com). Dosya
depoya girmez (10 MB); indirilip yolu verilir:

    python gen/cevre.py ne_10m_land.geojson

Çıktı: src/data/cevreCografyasi.ts (elle düzenlenmez)
  - kara: Biga yarımadası ve Edremit Körfezi kıyısı, Bozcaada, Gökçeada,
    Midilli, Limni, Gelibolu, Ayistrati — gerçek kıyı çizgisi, sadeleşmiş
  - kiyi: karaların kıyı şeridi (içeri 350 m): haritada açık renkli kumsal
  - sig: komşu kıyılarda denizde kıyıdan açığa üç bant (0–0,5 / 0,5–1,8 /
    1,8–4,5 km). Gerçek derinlik verisi değil, kıyıya uzaklık: Ege kıyısında
    deniz böyle koyulaşır. Düzada'nın sığ suyu fiziki görselde (gen/ada_fiziki.py).
  - deniz: çerçevenin bütün denizi (Düzada dahil bütün karalar delik):
    haritada ince dalga dokusu bunun üstüne biner
  - etiketler: gerçek yer adları (ad koyma değil, coğrafya)
"""
import json
import math
import os
import re
import sys

from shapely.geometry import shape, box, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union, transform

KOK = os.path.dirname(os.path.abspath(__file__))
LNG0, LAT0 = 25.85, 39.6
M_LAT = 111_132.0
M_LNG = 111_320.0 * math.cos(math.radians(LAT0))
# Kamera en uzaktayken eğik bakışta ufuk da görünür; çerçeve geniş tutulur
KUTU = box(23.9, 38.3, 28.4, 41.0)


def metre(g):
    return transform(lambda x, y, z=None: ((x - LNG0) * M_LNG, (y - LAT0) * M_LAT), g)


def derece(g):
    return transform(lambda x, y, z=None: (x / M_LNG + LNG0, y / M_LAT + LAT0), g)


def parcalar(g):
    if g.is_empty:
        return []
    if g.geom_type == "Polygon":
        return [g]
    return [p for h in getattr(g, "geoms", []) for p in parcalar(h)]


# Karaların adları: parçanın içine düşen nokta
ADLAR = [
    ("Anadolu", (26.6, 39.9)), ("Midilli", (26.25, 39.2)), ("Gelibolu", (26.4, 40.3)),
    ("Limni", (25.25, 39.9)), ("Gökçeada", (25.85, 40.17)), ("Bozcaada", (26.04, 39.82)),
    ("Ayistrati", (25.0, 39.53)),
]

ETIKETLER = [
    # (ad, boylam, enlem, tür) — tür: ada / kiyi / su
    ("Bozcaada", 26.04, 39.84, "ada"),
    ("Gökçeada", 25.85, 40.19, "ada"),
    ("Midilli", 26.27, 39.22, "ada"),
    ("Limni", 25.25, 39.93, "ada"),
    ("Babakale", 26.075, 39.49, "kiyi"),
    ("Biga Yarımadası", 26.55, 39.95, "kiyi"),
    ("Edremit Körfezi", 26.55, 39.44, "su"),
]


def main(ne_yolu):
    with open(ne_yolu, encoding="utf-8") as f:
        ne = json.load(f)
    kara_ham = []
    for ft in ne["features"]:
        g = shape(ft["geometry"])
        if g.intersects(KUTU):
            kara_ham += [p for p in parcalar(g.intersection(KUTU)) if p.area > 1e-6]

    # Düzada (üretilmiş ada çokgeni) yalnız sığlık için; kendisi zaten çiziliyor
    with open(os.path.join(KOK, "..", "src", "data", "duzadaGeo.ts"), encoding="utf-8") as f:
        metin = f.read()
    ham = re.search(r'DUZADA_GEO: FeatureCollection = JSON\.parse\((".*?")\);', metin, re.S).group(1)
    geo = json.loads(json.loads(ham))
    duzada = next(shape(ft["geometry"]) for ft in geo["features"] if ft["properties"].get("katman") == "ada")

    kara_m = [metre(p) for p in kara_ham]
    komsu = unary_union(kara_m)
    tum_kara = unary_union(kara_m + [metre(duzada)])
    kutu_m = metre(KUTU)

    def yaz(g, sade):
        """Metre geometrisini sadeleştirip dereceye, 5 basamak"""
        g = derece(g.simplify(sade, preserve_topology=True))
        return [p for p in parcalar(g) if p.area > 2e-7]

    def yuvarla(p):
        return [[[round(x, 5), round(y, 5)] for x, y in h.coords]
                for h in [p.exterior] + list(p.interiors)]

    ozellik = []
    for p_m in kara_m:
        ad = next((a for a, (x, y) in ADLAR if derece(p_m).buffer(0.02).contains(
            shape({"type": "Point", "coordinates": (x, y)}))), "")
        for p in yaz(p_m, 60):
            ozellik.append({"type": "Feature", "properties": {"katman": "kara", "ad": ad},
                            "geometry": {"type": "Polygon", "coordinates": yuvarla(p)}})
        serit = p_m.difference(p_m.buffer(-350))
        for p in yaz(serit, 60):
            ozellik.append({"type": "Feature", "properties": {"katman": "kiyi", "ad": ad},
                            "geometry": {"type": "Polygon", "coordinates": yuvarla(p)}})

    bantlar = [(0, 500, 1), (500, 1800, 2), (1800, 4500, 3)]
    # sığlık yalnız kameranın gördüğü yakın çevrede (dosya küçük kalsın)
    yakin_m = metre(box(24.2, 38.5, 27.8, 40.8))
    for ic, dis, n in bantlar:
        g = komsu.buffer(dis, 16).difference(komsu.buffer(ic, 16) if ic else komsu)
        # Düzada'nın görseli (ve çevresindeki 1 km) bantların üstüne binmesin
        g = g.intersection(yakin_m).difference(metre(duzada).buffer(1000))
        for p in yaz(g, 80):
            ozellik.append({"type": "Feature", "properties": {"katman": "sig", "bant": n},
                            "geometry": {"type": "Polygon", "coordinates": yuvarla(p)}})

    # Düzada deliği kıyıyı tam izlesin (doku kumsala taşmasın): az sadeleşir
    for p in yaz(kutu_m.difference(tum_kara), 20):
        ozellik.append({"type": "Feature", "properties": {"katman": "deniz"},
                        "geometry": {"type": "Polygon", "coordinates": yuvarla(p)}})

    for ad, x, y, tur in ETIKETLER:
        ozellik.append({"type": "Feature", "properties": {"katman": "etiket", "ad": ad, "tur": tur},
                        "geometry": {"type": "Point", "coordinates": [x, y]}})

    veri = {"type": "FeatureCollection", "features": ozellik}
    ts = f'''import type {{ FeatureCollection }} from 'geojson';

/**
 * Düzada'nın çevresi: komşu kıyılar, adalar, kıyı şeritleri, sığlıklar ve
 * gerçek yer adları. `gen/cevre.py` ile Natural Earth 1:10m Land'den
 * (kamu malı) üretilir; elle düzenlenmez.
 *
 * Katmanlar `properties.katman`: kara, kiyi (içeri 350 m), sig (bant 1–3,
 * kıyıya uzaklık), etiket (tur: ada / kiyi / su).
 */
export const CEVRE_COGRAFYASI: FeatureCollection = JSON.parse({json.dumps(json.dumps(veri, ensure_ascii=False, separators=(",", ":")), ensure_ascii=False)});
'''
    cikti = os.path.join(KOK, "..", "src", "data", "cevreCografyasi.ts")
    with open(cikti, "w", encoding="utf-8") as f:
        f.write(ts)
    sayi = {}
    for o in ozellik:
        sayi[o["properties"]["katman"]] = sayi.get(o["properties"]["katman"], 0) + 1
    print(f"Çevre          : {sayi}, {len(ts) / 1024:.0f} KB → {cikti}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Kullanım: python gen/cevre.py ne_10m_land.geojson")
    main(sys.argv[1])

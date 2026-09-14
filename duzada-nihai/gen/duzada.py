"""Düzada harita geometrisi — kıyı, mahalleler, zirveler, binalar, yollar.

Çıktı: src/data/duzadaGeo.ts (tiplenmiş GeoJSON modülü)

Koordinatlar gerçek enlem/boylam. Ada kurgusal ama Ege'de açık suya
yerleştirildi ki mesafeler ve alanlar metre cinsinden doğru çıksın.
Kanon: 100-180 km², zirve 600-800 m.
"""
import math, json, os
from shapely.geometry import Polygon, Point, LineString, MultiPolygon
from shapely.ops import unary_union, polygonize
from shapely.algorithms.polylabel import polylabel

LAT0, LNG0 = 39.005, 25.805
M_PER_LAT = 111_132.0
M_PER_LNG = 111_320.0 * math.cos(math.radians(LAT0))
R = 6                      # koordinat ondalık basamağı


def ll(x, y):
    return [round(LNG0 + x / M_PER_LNG, R), round(LAT0 + y / M_PER_LAT, R)]


def ring_ll(coords):
    r = [ll(x, y) for x, y in coords]
    if r[0] != r[-1]:
        r.append(r[0])
    return r


def poly_ll(geom):
    """Shapely çokgeni → GeoJSON koordinat dizisi (delikler dahil)"""
    rings = [ring_ll(list(geom.exterior.coords))]
    for hole in geom.interiors:
        rings.append(ring_ll(list(hole.coords)))
    return rings


# ---------------------------------------------------------------- kıyı çizgisi
def radius(theta):
    rx, ry = 9200.0, 6100.0
    base = 1.0 / math.hypot(math.cos(theta) / rx, math.sin(theta) / ry)
    girinti = (0.055 * math.sin(3 * theta + 0.7)
               + 0.040 * math.sin(5 * theta + 2.1)
               + 0.028 * math.sin(8 * theta + 0.3)
               + 0.018 * math.sin(13 * theta + 1.9))
    return base * (1.0 + girinti)


KOYLAR = [
    (math.radians(152), math.radians(13), 0.30),   # Liman körfezi
    (math.radians(208), math.radians(11), 0.26),   # İskele koyu
    (math.radians(20), math.radians(11), 0.13),    # doğu koyu
]

# Burunlar: kıyıyı dışa doğru çıkaran çıkıntılar. Güney Burnu, İskele
# koyunun güney kolu — koyun hemen bitişiğinde denize çıkan bir çıkıntı.
# Otel bu burnun koya bakan kuzey yamacında durur, koyun içinde değil.
BURUNLAR = [
    (math.radians(219), math.radians(6), 0.16),    # Güney Burnu (güneybatı)
]


def kiyi_r(th):
    """Verilen açıda kıyı yarıçapı — koylar ve burunlar uygulanmış hâli."""
    r = radius(th)
    for merkez, gen, der in KOYLAR:
        d = (th - merkez + math.pi) % (2 * math.pi) - math.pi
        r *= (1.0 - der * math.exp(-(d / gen) ** 2))
    for merkez, gen, cik in BURUNLAR:
        d = (th - merkez + math.pi) % (2 * math.pi) - math.pi
        r *= (1.0 + cik * math.exp(-(d / gen) ** 2))
    return r


kiyi = [(kiyi_r(2 * math.pi * i / 360) * math.cos(2 * math.pi * i / 360),
         kiyi_r(2 * math.pi * i / 360) * math.sin(2 * math.pi * i / 360))
        for i in range(360)]

ada = Polygon(kiyi)
print(f"Ada alanı      : {ada.area / 1e6:.1f} km²")
xs = [p[0] for p in kiyi]
ys = [p[1] for p in kiyi]
print(f"Doğu-batı      : {(max(xs) - min(xs)) / 1000:.1f} km")
print(f"Kuzey-güney    : {(max(ys) - min(ys)) / 1000:.1f} km")
print(f"Kıyı uzunluğu  : {ada.exterior.length / 1000:.1f} km")

# ---------------------------------------------------------------- yükseltiler
#
# Rakım alanı üç katmandan oluşuyor:
#
#   1. Kıyı kayalığı — kıyıdan içeri doğru hızla yükselen dik profil.
#      Ege adalarının çoğunda kıyı düz kum değil, birkaç on metrelik
#      kayalık bir sekidir; otelin uçurumu da buradan çıkıyor.
#   2. İç plato — kayalığın üstünde yavaşça yükselen taban.
#   3. Sırtlar — zirveler dairesel tümsek değil, yönü olan sırtlar
#      (anizotropik Gauss). Gerçek adalar böyledir.
#
# Kanon: en yüksek nokta 600-800 m arası.

KAYALIK_YUKSEK = 30.0     # kıyı sekisinin yüksekliği (m)
KAYALIK_OLCEK = 60.0      # bu mesafede sekinin çoğu tamamlanır (m)
PLATO_YUKSEK = 70.0       # sekinin üstündeki iç platonun katkısı (m)
PLATO_BASLANGIC = 200.0   # plato bu mesafeden sonra yükselmeye başlar (m)
PLATO_OLCEK = 3000.0      # ve bu mesafede tamamlanır (m)

# (id, ad, konum, rakım, sırt uzunluğu, sırt genişliği, sırt yönü°)
#
# Güney Burnu, İskele koyunun güneyindeki çıkıntının sırtı. Otel bu sırtın
# üstünde durur ve koya yukarıdan hâkimdir; konumu aşağıda burnun ekseninden
# hesaplanıyor.
_GUNE_YON = 219.0
# Sırtın omurgası burnun boynunda; koya bakan kuzey yamacı otelin sahanlığı.
_GUNE_TEPE = (-5250.0, -4350.0)

ZIRVELER = [
    ("tepe_ana",     "Düzada Tepesi", (1400, -2500), 742, 2700, 1450,  28),
    ("tepe_kuzey",   "Kuzey Sırtı",   (2300,  3000), 386, 2000,  900, -18),
    ("tepe_ciftlik", "Çetmi Sırtı",   (5600, -2600), 254, 1600,  820,  62),
    ("tepe_bati",    "Fener Burnu",   (-5100, 4200), 118,  760,  460,  35),
    ("tepe_gune",    "Güney Burnu",    _GUNE_TEPE,     96, 1300,  560, _GUNE_YON),
]


def _taban_profili(d):
    """Kıyıdan `d` metre içerideki zemin kotu (zirveler hariç).
    numpy dizisiyle de tek sayıyla da çalışır."""
    import numpy as _np
    d = _np.asarray(d, dtype=float)
    kayalik = KAYALIK_YUKSEK * (1.0 - _np.exp(-d / KAYALIK_OLCEK))
    plato = PLATO_YUKSEK * _np.clip((d - PLATO_BASLANGIC) / PLATO_OLCEK, 0.0, 1.0) ** 1.15
    return kayalik + plato


# Uçurumlar. Taban profili kıyıda sıfırdan başlıyor: her yerde kumsal gibi
# yumuşak bir yükseliş. Oysa otelin durduğu yer bir uçurum başı — kara
# kıyıya yüksek kotla varıp denize dikey iniyor. Aşağıdaki terim belirli
# kıyı yaylarında bunu kuruyor.
#
# (kıyı açısı merkezi rad, yarım genişlik rad, uçurum yüksekliği m)
UCURUMLAR = [
    (math.radians(213.0), math.radians(8.0), 18.0),   # Güney Burnu, koya bakan yüz
]
# Uçurum alnı bu mesafede tam yüksekliğine ulaşıyor (m)
UCURUM_ALIN = 26.0


def _ucurum_katkisi(x, y):
    """Uçurum yaylarında kıyıya yüksek kotla varan ek kütle."""
    import numpy as _np
    x = _np.asarray(x, dtype=float)
    y = _np.asarray(y, dtype=float)
    th = _np.arctan2(y, x)
    d = kiyiya_uzaklik(x, y)
    # Alında hızla yüksel, içeride sabit kal
    alin = 1.0 - _np.exp(-d / UCURUM_ALIN)
    toplam = _np.zeros(_np.shape(x), dtype=float)
    for merkez, gen, yuk in UCURUMLAR:
        sapma = (th - merkez + _np.pi) % (2 * _np.pi) - _np.pi
        toplam = toplam + yuk * _np.exp(-(sapma / gen) ** 2) * alin
    return toplam


def kiyi_gecis_mesafesi(x, y):
    """Arazi modelinde kıyı kotunun sıfıra indirileceği mesafe (m).

    Normalde 140 m — kıyı suya değdiği yerde deniz seviyesinde olsun ve
    silüet testere dişi gibi çıkmasın. Uçurum yaylarında ise 50 m: orada
    kara neredeyse dikey iniyor, uzun bir geçiş uçurumu yok ederdi. Daha
    kısası (22 m denendi) 20 m'lik ızgarada tek hücreye sıkışıp kıyıyı
    yeniden testere dişine çeviriyor. `gen/dem.py` bu değeri kullanıyor."""
    import numpy as _np
    th = _np.arctan2(_np.asarray(y, dtype=float), _np.asarray(x, dtype=float))
    mesafe = _np.full(_np.shape(th), 140.0)
    for merkez, gen, _ in UCURUMLAR:
        sapma = (th - merkez + _np.pi) % (2 * _np.pi) - _np.pi
        agirlik = _np.exp(-(sapma / gen) ** 2)
        mesafe = mesafe * (1.0 - agirlik) + 50.0 * agirlik
    return mesafe


def _sirt_katkisi(x, y, zirve, genlik):
    """Yönü olan (anizotropik) Gauss tümsek."""
    import numpy as _np
    _, _, (px, py), _, uzun, genis, aci = zirve
    a = math.radians(aci)
    dx, dy = _np.asarray(x) - px, _np.asarray(y) - py
    u = dx * math.cos(a) + dy * math.sin(a)      # sırt boyunca
    v = -dx * math.sin(a) + dy * math.cos(a)     # sırta dik
    return genlik * _np.exp(-0.5 * ((u / uzun) ** 2 + (v / genis) ** 2))


import numpy as np
from scipy.spatial import cKDTree

# Kıyıya uzaklık, çokgen mesafesi yerine sıklaştırılmış kıyı noktalarına
# en yakın komşu ile hesaplanıyor — on binlerce örnek için tek yol bu.
_kiyi_hat = ada.exterior
_kiyi_sik = np.array([
    _kiyi_hat.interpolate(t, normalized=True).coords[0]
    for t in np.linspace(0, 1, 4000, endpoint=False)
])
_kiyi_agac = cKDTree(_kiyi_sik)


def kiyiya_uzaklik(x, y):
    """Kıyı çizgisine en kısa mesafe (işaretsiz)."""
    noktalar = np.column_stack([np.ravel(x), np.ravel(y)])
    d, _ = _kiyi_agac.query(noktalar, workers=-1)
    return d.reshape(np.shape(x))


# Zirve genlikleri küçük bir doğrusal sistemle çözülüyor. Sırtlar birbirine
# karışıyor: komşu sırtın katkısı da hesaba katılmazsa bir zirve kayıtlı
# rakımından yüksek okunuyor. A·a = h - taban çözülünce her zirve tam
# kendi değerini veriyor.
_n = len(ZIRVELER)
_A = np.zeros((_n, _n))
_hedef = np.zeros(_n)
for _i, _zi in enumerate(ZIRVELER):
    _px, _py = _zi[2]
    _hedef[_i] = (_zi[3] - float(_taban_profili(kiyiya_uzaklik(_px, _py)))
                  - float(_ucurum_katkisi(_px, _py)))
    for _j, _zj in enumerate(ZIRVELER):
        _A[_i, _j] = float(_sirt_katkisi(_px, _py, _zj, 1.0))
_cozum = np.linalg.solve(_A, _hedef)
_ZIRVE_GENLIK = {_z[0]: float(_g) for _z, _g in zip(ZIRVELER, _cozum)}


def yukselti(x, y):
    """Bir noktanın (veya dizinin) deniz seviyesinden rakımı, metre."""
    d = kiyiya_uzaklik(x, y)
    e = _taban_profili(d) + _ucurum_katkisi(x, y)
    for _z in ZIRVELER:
        e = e + _sirt_katkisi(x, y, _z, _ZIRVE_GENLIK[_z[0]])
    return e


print("\nRakım denetimi:")
for _z in ZIRVELER:
    _hesap = float(yukselti(_z[2][0], _z[2][1]))
    print(f"  {_z[1]:16s} kayıt {_z[3]:4d} m   alan {_hesap:6.1f} m")

# ------------------------------------------- su bölümü, sınırlar ve yol ağı
#
# İdari sınırlar iki şeyi birden izliyor:
#
#   coğrafya : Beş sırt hattı, adanın su bölümü düğümünden kıyıya iniyor.
#              Yağmurun hangi yöne aktığını belirleyen çizgiler bunlar ve
#              Ege adalarında belediye sınırları da tam olarak buradan
#              geçer — bir vadinin suyu hangi limana iniyorsa orası o
#              beldenindir.
#   yol      : Bu sırtların üçünün üstünde gerçekten yol var (Sırt
#              Yolları). O üç sınır hem sırt hem yol; kalan ikisi yalnızca
#              sırt.
#
# Önceki denemede sınır tek bir "Çember Yolu" idi: 200 m eşyükseltisini
# izleyen 32 km'lik kapalı halka. Eğimi doğruydu ama adanın ortasına
# çizilmiş bir çember gibi duruyordu, kimse öyle yol yapmaz. Sırt hatları
# hem gerçek hem de haritada kabartmanın üstünden okunuyor.
#
# Yol ağının kuralı: hiçbir yol havada bitmez. Sahil Yolu kapalı bir
# halka, Sırt Yolları onu içeriden düğüme bağlıyor, yerleşim bağlantıları
# da Sahil Yolu'na oturuyor. Aşağıda bu bağlantı bir çizge denetimiyle
# doğrulanıyor.

BUYUK = 40000.0

# Su bölümü düğümü: beş sırtın buluştuğu nokta. Düzada Tepesi'nin kuzey
# omzunda — kütlenin ağırlık merkezi orada ve beş vadi oradan ayrılıyor.
SUBOLUMU = (1500.0, -1800.0)

# Sahil Yolu kıyıdan bu kadar içeride. Kıyı sekisinin üstünde kalıyor:
# ortalama eğim %1.5, en dik nokta %11.
SAHIL_ICERI = 460.0


def _yumusat_halka(nokta_dizisi, gecis=3, pencere=7, adet=260):
    """Kapalı halkayı yumuşatıp yay uzunluğuna göre eşit aralıklı örnekler."""
    p = np.asarray(nokta_dizisi, dtype=float)
    if np.hypot(*(p[0] - p[-1])) < 1e-6:
        p = p[:-1]
    for _ in range(gecis):
        cek = np.ones(pencere) / pencere
        p = np.column_stack([
            np.convolve(np.r_[p[-pencere:, k], p[:, k], p[:pencere, k]],
                        cek, mode="same")[pencere:-pencere]
            for k in (0, 1)
        ])
    kenar = np.hypot(*np.diff(np.r_[p, p[:1]], axis=0).T)
    yay = np.r_[0.0, np.cumsum(kenar)]
    hedef = np.linspace(0, yay[-1], adet, endpoint=False)
    return [(float(np.interp(t, yay, np.r_[p[:, 0], p[0, 0]])),
             float(np.interp(t, yay, np.r_[p[:, 1], p[0, 1]]))) for t in hedef]


_sahil_halka = ada.buffer(-SAHIL_ICERI)
if _sahil_halka.geom_type == "MultiPolygon":
    _sahil_halka = max(_sahil_halka.geoms, key=lambda g: g.area)
SAHIL_YOLU = _yumusat_halka(list(_sahil_halka.exterior.coords))
sahil_hat = LineString(SAHIL_YOLU + [SAHIL_YOLU[0]])

print(f"\nSahil Yolu     : {sahil_hat.length / 1000:.1f} km, "
      f"kıyıdan {SAHIL_ICERI:.0f} m içeride")


# --- sırt hatları ---------------------------------------------------------

def _kiyi_noktasi(aci):
    """Düğümden verilen açıda atılan ışının kıyıyla kesiştiği nokta."""
    th = math.radians(aci)
    isin = LineString([SUBOLUMU, (SUBOLUMU[0] + BUYUK * math.cos(th),
                                  SUBOLUMU[1] + BUYUK * math.sin(th))])
    kes = isin.intersection(ada.exterior)
    noktalar = [k for k in (list(kes.geoms) if hasattr(kes, "geoms") else [kes])
                if k.geom_type == "Point"]
    if not noktalar:
        raise SystemExit(f"HATA: {aci:.0f}° ışını kıyıyı kesmiyor")
    return max(noktalar, key=lambda k: math.hypot(k.x - SUBOLUMU[0],
                                                  k.y - SUBOLUMU[1]))


# Sırt hatları bir yol arama problemi olarak çözülüyor: düğümden hedef
# kıyı noktasına giden, ORTALAMA YÜKSEKLİĞİ EN BÜYÜK yol. Maliyet
# "tepe kotu eksi buradaki kot" olduğu için Dijkstra doğal olarak sırtı
# takip ediyor, vadiye inmiyor.
#
# Önce açgözlü bir yürüyüş denendi ("her adımda hedefe yaklaş, koni
# içindeki en yüksek noktayı seç"): hedefe yaklaşma koşulu yolu cetvel
# gibi düzleştiriyordu, koşul gevşetilince de beş hattın dördü aynı ana
# sırta yapışıp doğuya akıyordu. Küresel arama ikisini de çözüyor.

_SIRT_IZGARA = 110.0          # arama ızgarası hücresi (m)
_SIRT_UZUNLUK_CEZASI = 45.0   # yol uzunluğunun maliyete katkısı


def _sirt_izgarasi():
    x0, y0, x1, y1 = ada.bounds
    nx = int((x1 - x0) / _SIRT_IZGARA) + 1
    ny = int((y1 - y0) / _SIRT_IZGARA) + 1
    gx = x0 + np.arange(nx) * _SIRT_IZGARA
    gy = y0 + np.arange(ny) * _SIRT_IZGARA
    GX, GY = np.meshgrid(gx, gy)
    Z = np.asarray(yukselti(GX, GY), dtype=float)
    from shapely.prepared import prep
    hazir = prep(ada)
    icinde = np.fromiter(
        (hazir.contains(Point(a, b)) for a, b in zip(GX.ravel(), GY.ravel())),
        dtype=bool, count=GX.size).reshape(GX.shape)
    return gx, gy, np.where(icinde, Z, -1e6)


_SGX, _SGY, _SZ = _sirt_izgarasi()
_SZMAX = float(_SZ.max())


def _izgara_hucresi(nokta):
    """Noktanın en yakın KARA ızgara hücresi."""
    i = int(round((nokta[0] - _SGX[0]) / _SIRT_IZGARA))
    j = int(round((nokta[1] - _SGY[0]) / _SIRT_IZGARA))
    i = max(0, min(len(_SGX) - 1, i))
    j = max(0, min(len(_SGY) - 1, j))
    if _SZ[j, i] > -1e5:
        return (j, i)
    # Kıyı noktaları ızgarada denize düşebiliyor; en yakın kara hücresine kay
    for halka in range(1, 8):
        en = None
        for dj in range(-halka, halka + 1):
            for di in range(-halka, halka + 1):
                nj, ni = j + dj, i + di
                if not (0 <= nj < _SZ.shape[0] and 0 <= ni < _SZ.shape[1]):
                    continue
                if _SZ[nj, ni] <= -1e5:
                    continue
                d = math.hypot(_SGX[ni] - nokta[0], _SGY[nj] - nokta[1])
                if en is None or d < en[0]:
                    en = (d, nj, ni)
        if en:
            return (en[1], en[2])
    raise SystemExit(f"HATA: {nokta} için kara ızgara hücresi yok")


_SIRT_ZREF = 450.0          # bu kotun altı "vadi" sayılıyor
_SIRT_TIRMANMA = 1.6        # alçak yolun metre başına ek maliyeti
_SIRT_AYRIM = 30.0          # başka bir sırtın kullandığı hücrenin cezası


def _en_yuksek_yol(baslangic, hedef, dolu):
    """Sırtı izleyen en iyi yol: maliyet, kot düştükçe artan bir metre
    ücreti. `dolu` başka sırtların geçtiği hücreler — oralardan geçmek
    çok pahalı, böylece hatlar birbirine yapışmıyor.

    Ceza olmadan beş hattın hepsi ana omurgayı paylaşıyor ve ada üç
    parçaya bölünüyordu: su bölümleri gerçekte de ana sırttan dallanır ama
    haritada beş ayrı sınır çizgisi gerekiyor."""
    import heapq
    d = np.full(_SZ.shape, np.inf)
    onceki = {}
    bj, bi = baslangic
    d[bj, bi] = 0.0
    kuyruk = [(0.0, bj, bi)]
    while kuyruk:
        c, j, i = heapq.heappop(kuyruk)
        if c > d[j, i]:
            continue
        if (j, i) == hedef:
            break
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                if dj == 0 and di == 0:
                    continue
                nj, ni = j + dj, i + di
                if not (0 <= nj < _SZ.shape[0] and 0 <= ni < _SZ.shape[1]):
                    continue
                if _SZ[nj, ni] <= -1e5:
                    continue
                boy = _SIRT_IZGARA * math.hypot(dj, di)
                kot = (_SZ[j, i] + _SZ[nj, ni]) / 2.0
                birim = 1.0 + _SIRT_TIRMANMA * max(0.0, _SIRT_ZREF - kot) / _SIRT_ZREF
                if (nj, ni) in dolu:
                    birim += _SIRT_AYRIM
                agirlik = birim * boy
                if c + agirlik < d[nj, ni]:
                    d[nj, ni] = c + agirlik
                    onceki[(nj, ni)] = (j, i)
                    heapq.heappush(kuyruk, (c + agirlik, nj, ni))
    if d[hedef] == np.inf:
        raise SystemExit(f"HATA: {hedef} hücresine sırt yolu bulunamadı")
    adim = [hedef]
    while adim[-1] != baslangic:
        adim.append(onceki[adim[-1]])
    hucreler = list(reversed(adim))
    return hucreler, [(float(_SGX[i]), float(_SGY[j])) for j, i in hucreler]


# --- eğim bilen yol güzergâhı ---------------------------------------------
#
# Sırt hatları coğrafya; yol başka bir şey. Düz çizgiyle bağlanan yollar
# %20-23 eğim veriyordu (kimse öyle yol yapmaz) çünkü hepsi 687 metredeki
# su bölümü düğümüne tırmanıyordu. Gerçek yol eğimi gözetir ve gerekirse
# uzar: aşağıdaki arama metre başına maliyeti eğimle cezalandırıyor, o da
# kendiliğinden viraj ve serpantin üretiyor.

_YOL_IZGARA = 60.0            # yol araması daha ince ızgarada
_YOL_HEDEF_EGIM = 0.07        # bu eğime kadar ceza yok
_YOL_EGIM_CEZASI = 260.0      # aşınca metre başına ceza katsayısı


def _yol_izgarasi():
    x0, y0, x1, y1 = ada.bounds
    nx = int((x1 - x0) / _YOL_IZGARA) + 1
    ny = int((y1 - y0) / _YOL_IZGARA) + 1
    gx = x0 + np.arange(nx) * _YOL_IZGARA
    gy = y0 + np.arange(ny) * _YOL_IZGARA
    GX, GY = np.meshgrid(gx, gy)
    Z = np.asarray(yukselti(GX, GY), dtype=float)
    from shapely.prepared import prep
    hazir = prep(ada.buffer(-40))
    icinde = np.fromiter(
        (hazir.contains(Point(a, b)) for a, b in zip(GX.ravel(), GY.ravel())),
        dtype=bool, count=GX.size).reshape(GX.shape)
    return gx, gy, np.where(icinde, Z, np.nan)


_YGX, _YGY, _YZ = _yol_izgarasi()


def _yol_hucresi(nokta):
    i = int(round((nokta[0] - _YGX[0]) / _YOL_IZGARA))
    j = int(round((nokta[1] - _YGY[0]) / _YOL_IZGARA))
    i = max(0, min(len(_YGX) - 1, i))
    j = max(0, min(len(_YGY) - 1, j))
    if not np.isnan(_YZ[j, i]):
        return (j, i)
    for halka in range(1, 10):
        en = None
        for dj in range(-halka, halka + 1):
            for di in range(-halka, halka + 1):
                nj, ni = j + dj, i + di
                if not (0 <= nj < _YZ.shape[0] and 0 <= ni < _YZ.shape[1]):
                    continue
                if np.isnan(_YZ[nj, ni]):
                    continue
                d = math.hypot(_YGX[ni] - nokta[0], _YGY[nj] - nokta[1])
                if en is None or d < en[0]:
                    en = (d, nj, ni)
        if en:
            return (en[1], en[2])
    raise SystemExit(f"HATA: {nokta} için yol ızgara hücresi yok")


def yol_guzergahi(bas_nokta, son_noktalar):
    """Eğimi gözeten güzergâh(lar). `son_noktalar` birden çok olabilir;
    hepsi tek Dijkstra ile çözülüyor."""
    import heapq
    bas = _yol_hucresi(bas_nokta)
    hedefler = {_yol_hucresi(p): p for p in son_noktalar}
    d = np.full(_YZ.shape, np.inf)
    onceki = {}
    d[bas] = 0.0
    kuyruk = [(0.0, bas[0], bas[1])]
    kalan = set(hedefler)
    while kuyruk and kalan:
        c, j, i = heapq.heappop(kuyruk)
        if c > d[j, i]:
            continue
        kalan.discard((j, i))
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                if dj == 0 and di == 0:
                    continue
                nj, ni = j + dj, i + di
                if not (0 <= nj < _YZ.shape[0] and 0 <= ni < _YZ.shape[1]):
                    continue
                if np.isnan(_YZ[nj, ni]):
                    continue
                boy = _YOL_IZGARA * math.hypot(dj, di)
                egim = abs(_YZ[nj, ni] - _YZ[j, i]) / boy
                asim = max(0.0, egim - _YOL_HEDEF_EGIM)
                agirlik = boy * (1.0 + _YOL_EGIM_CEZASI * asim * asim)
                if c + agirlik < d[nj, ni]:
                    d[nj, ni] = c + agirlik
                    onceki[(nj, ni)] = (j, i)
                    heapq.heappush(kuyruk, (c + agirlik, nj, ni))
    cikti = {}
    for h, p in hedefler.items():
        if d[h] == np.inf:
            raise SystemExit(f"HATA: {p} için yol güzergâhı bulunamadı")
        adim = [h]
        while adim[-1] != bas:
            adim.append(onceki[adim[-1]])
        yol = [(float(_YGX[i]), float(_YGY[j])) for j, i in reversed(adim)]
        cikti[p] = _hat_yumusat(yol, gecis=2, pencere=5)
    return cikti


_SIRT_ZREF = 450.0          # bu kotun altı "vadi" sayılıyor
_SIRT_TIRMANMA = 1.6        # alçak yolun metre başına ek maliyeti
_SIRT_AYRIM = 30.0          # başka bir sırtın kullandığı hücrenin cezası


def _en_yuksek_yol(baslangic, hedef, dolu):
    """Sırtı izleyen en iyi yol: maliyet, kot düştükçe artan bir metre
    ücreti. `dolu` başka sırtların geçtiği hücreler — oralardan geçmek
    çok pahalı, böylece hatlar birbirine yapışmıyor.

    Ceza olmadan beş hattın hepsi ana omurgayı paylaşıyor ve ada üç
    parçaya bölünüyordu: su bölümleri gerçekte de ana sırttan dallanır ama
    haritada beş ayrı sınır çizgisi gerekiyor."""
    import heapq
    d = np.full(_SZ.shape, np.inf)
    onceki = {}
    bj, bi = baslangic
    d[bj, bi] = 0.0
    kuyruk = [(0.0, bj, bi)]
    while kuyruk:
        c, j, i = heapq.heappop(kuyruk)
        if c > d[j, i]:
            continue
        if (j, i) == hedef:
            break
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                if dj == 0 and di == 0:
                    continue
                nj, ni = j + dj, i + di
                if not (0 <= nj < _SZ.shape[0] and 0 <= ni < _SZ.shape[1]):
                    continue
                if _SZ[nj, ni] <= -1e5:
                    continue
                boy = _SIRT_IZGARA * math.hypot(dj, di)
                kot = (_SZ[j, i] + _SZ[nj, ni]) / 2.0
                birim = 1.0 + _SIRT_TIRMANMA * max(0.0, _SIRT_ZREF - kot) / _SIRT_ZREF
                if (nj, ni) in dolu:
                    birim += _SIRT_AYRIM
                agirlik = birim * boy
                if c + agirlik < d[nj, ni]:
                    d[nj, ni] = c + agirlik
                    onceki[(nj, ni)] = (j, i)
                    heapq.heappush(kuyruk, (c + agirlik, nj, ni))
    if d[hedef] == np.inf:
        raise SystemExit(f"HATA: {hedef} hücresine sırt yolu bulunamadı")
    adim = [hedef]
    while adim[-1] != baslangic:
        adim.append(onceki[adim[-1]])
    hucreler = list(reversed(adim))
    return hucreler, [(float(_SGX[i]), float(_SGY[j])) for j, i in hucreler]


# --- eğim bilen yol güzergâhı ---------------------------------------------
#
# Sırt hatları coğrafya; yol başka bir şey. Düz çizgiyle bağlanan yollar
# %20-23 eğim veriyordu (kimse öyle yol yapmaz) çünkü hepsi 687 metredeki
# su bölümü düğümüne tırmanıyordu. Gerçek yol eğimi gözetir ve gerekirse
# uzar: aşağıdaki arama metre başına maliyeti eğimle cezalandırıyor, o da
# kendiliğinden viraj ve serpantin üretiyor.

_YOL_IZGARA = 60.0            # yol araması daha ince ızgarada
_YOL_HEDEF_EGIM = 0.07        # bu eğime kadar ceza yok
_YOL_EGIM_CEZASI = 260.0      # aşınca metre başına ceza katsayısı


def _yol_izgarasi():
    x0, y0, x1, y1 = ada.bounds
    nx = int((x1 - x0) / _YOL_IZGARA) + 1
    ny = int((y1 - y0) / _YOL_IZGARA) + 1
    gx = x0 + np.arange(nx) * _YOL_IZGARA
    gy = y0 + np.arange(ny) * _YOL_IZGARA
    GX, GY = np.meshgrid(gx, gy)
    Z = np.asarray(yukselti(GX, GY), dtype=float)
    from shapely.prepared import prep
    hazir = prep(ada.buffer(-40))
    icinde = np.fromiter(
        (hazir.contains(Point(a, b)) for a, b in zip(GX.ravel(), GY.ravel())),
        dtype=bool, count=GX.size).reshape(GX.shape)
    return gx, gy, np.where(icinde, Z, np.nan)


_YGX, _YGY, _YZ = _yol_izgarasi()


def _yol_hucresi(nokta):
    i = int(round((nokta[0] - _YGX[0]) / _YOL_IZGARA))
    j = int(round((nokta[1] - _YGY[0]) / _YOL_IZGARA))
    i = max(0, min(len(_YGX) - 1, i))
    j = max(0, min(len(_YGY) - 1, j))
    if not np.isnan(_YZ[j, i]):
        return (j, i)
    for halka in range(1, 10):
        en = None
        for dj in range(-halka, halka + 1):
            for di in range(-halka, halka + 1):
                nj, ni = j + dj, i + di
                if not (0 <= nj < _YZ.shape[0] and 0 <= ni < _YZ.shape[1]):
                    continue
                if np.isnan(_YZ[nj, ni]):
                    continue
                d = math.hypot(_YGX[ni] - nokta[0], _YGY[nj] - nokta[1])
                if en is None or d < en[0]:
                    en = (d, nj, ni)
        if en:
            return (en[1], en[2])
    raise SystemExit(f"HATA: {nokta} için yol ızgara hücresi yok")


def yol_guzergahi(bas_nokta, son_noktalar):
    """Eğimi gözeten güzergâh(lar). `son_noktalar` birden çok olabilir;
    hepsi tek Dijkstra ile çözülüyor."""
    import heapq
    bas = _yol_hucresi(bas_nokta)
    hedefler = {_yol_hucresi(p): p for p in son_noktalar}
    d = np.full(_YZ.shape, np.inf)
    onceki = {}
    d[bas] = 0.0
    kuyruk = [(0.0, bas[0], bas[1])]
    kalan = set(hedefler)
    while kuyruk and kalan:
        c, j, i = heapq.heappop(kuyruk)
        if c > d[j, i]:
            continue
        kalan.discard((j, i))
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                if dj == 0 and di == 0:
                    continue
                nj, ni = j + dj, i + di
                if not (0 <= nj < _YZ.shape[0] and 0 <= ni < _YZ.shape[1]):
                    continue
                if np.isnan(_YZ[nj, ni]):
                    continue
                boy = _YOL_IZGARA * math.hypot(dj, di)
                egim = abs(_YZ[nj, ni] - _YZ[j, i]) / boy
                asim = max(0.0, egim - _YOL_HEDEF_EGIM)
                agirlik = boy * (1.0 + _YOL_EGIM_CEZASI * asim * asim)
                if c + agirlik < d[nj, ni]:
                    d[nj, ni] = c + agirlik
                    onceki[(nj, ni)] = (j, i)
                    heapq.heappush(kuyruk, (c + agirlik, nj, ni))
    cikti = {}
    for h, p in hedefler.items():
        if d[h] == np.inf:
            raise SystemExit(f"HATA: {p} için yol güzergâhı bulunamadı")
        adim = [h]
        while adim[-1] != bas:
            adim.append(onceki[adim[-1]])
        yol = [(float(_YGX[i]), float(_YGY[j])) for j, i in reversed(adim)]
        cikti[p] = _hat_yumusat(yol, gecis=2, pencere=5)
    return cikti


def _hat_yumusat(noktalar, gecis=1, pencere=3):
    """Izgara merdivenini yumuşat; uçları yerinde kalsın."""
    p = np.asarray(noktalar, dtype=float)
    if len(p) < pencere + 2:
        return [tuple(q) for q in p]
    for _ in range(gecis):
        yeni = p.copy()
        yarim = pencere // 2
        for k in range(yarim, len(p) - yarim):
            yeni[k] = p[k - yarim:k + yarim + 1].mean(axis=0)
        yeni[0], yeni[-1] = p[0], p[-1]
        p = yeni
    return [tuple(q) for q in p]


# Sırt hatları. Bunlar artık SINIR değil — yalnızca Sırt Yolları'nın
# hizasını veriyorlar. İdari sınırlar aşağıda ayrıca kuruluyor ve hiçbir
# yolla çakışmıyor: Kemal sınırların yoldan bağımsız olmasını istedi.
#
# (id, ad, hedef kıyı açısı°, üstünde yol var mı)
SIRTLAR = [
    ("sirt_dogu",  "Çetmi Sırtı hattı",  25.0,  True),
    ("sirt_kuzey", "Kuzey Sırtı hattı",  86.0,  True),
    ("sirt_bati",  "Merkez sırtı",      134.0,  False),
    ("sirt_gbati", "Güney sırtı",       168.0,  True),
    # Güney Burnu sırtı artık "Güney sırtı" olduğu için bu hat ayırt edilsin
    # diye yeniden adlandırıldı; üstünde yol yok, dışarı da verilmiyor.
    ("sirt_guney", "Güneydoğu sırtı",   268.0,  False),
]

_sirt_hedefleri = {}
for _sid, _, _a, _ in SIRTLAR:
    _k = _kiyi_noktasi(_a)
    _sirt_hedefleri[_sid] = ((_k.x, _k.y), _izgara_hucresi((_k.x, _k.y)))

_dugum_hucre = _izgara_hucresi(SUBOLUMU)
_dolu = set()
_ham_yollar = {}
for _sid, _, _, _ in SIRTLAR:
    _kiyi_nok, _hucre = _sirt_hedefleri[_sid]
    _hucreler, _yol = _en_yuksek_yol(_dugum_hucre, _hucre, _dolu)
    _ham_yollar[_sid] = _yol
    # Düğümün hemen çevresi ortak kalsın, gerisi başkasına kapansın.
    # Komşu hücreler de kapanıyor: hatlar en az iki hücre (220 m) aralı
    # kalsın, yoksa yumuşatma onları birbirine yapıştırıyor ve iki sınır
    # ortak bir parça paylaşınca ayrıştırma bozuluyor.
    for _h in _hucreler:
        if abs(_h[0] - _dugum_hucre[0]) + abs(_h[1] - _dugum_hucre[1]) <= 2:
            continue
        for _dj in (-1, 0, 1):
            for _di in (-1, 0, 1):
                _dolu.add((_h[0] + _dj, _h[1] + _di))

sirt_geom = {}
for _sid, (_kiyi_nok, _hucre) in _sirt_hedefleri.items():
    _hat = _hat_yumusat(_ham_yollar[_sid])
    _hat[0] = SUBOLUMU
    # Son nokta ada çokgeninin ÜSTÜNDE olmalı: polygonize ancak o zaman
    # dilimleri kapatabiliyor.
    _snap = ada.exterior.interpolate(ada.exterior.project(Point(*_kiyi_nok)))
    _hat.append((_snap.x, _snap.y))
    sirt_geom[_sid] = _hat

# ------------------------------------------------------- idari sınırlar
#
# Sınırlar yoldan BAĞIMSIZ. Bir ara sınır çizgilerini yolların üstüne
# oturtmuştuk ("Çember Yolu" + dört radyal); sınır olarak okunuşu iyiydi
# ama o halkayı yol saymak gerçekçi değildi — kimse adanın ortasına
# pergelle yol yapmaz. Şimdi aynı geometri duruyor, ama bunlar yalnızca
# idari çizgi: yerde karşılıkları bir yol değil, kot ve yön.
#
#   Çember Sınırı : 235 m eşyükseltisi. İçinde kalan yayla Merkez
#                   Mahallesi. Yükselti sınırı gerçek bir idari ölçüttür
#                   (orman ve yayla sınırları böyle çizilir).
#   Dört radyal   : çemberden kıyıya inen sınırlar. Aralarındaki dört
#                   dilim öbür dört mahalle.

CEMBER_KOTU = 235.0


def _esyukselti_halkasi(kot):
    """Verilen kottaki en uzun kapalı eşyükselti eğrisi."""
    import matplotlib as _mpl
    _mpl.use("Agg")
    import matplotlib.pyplot as _plt
    x0, y0, x1, y1 = ada.bounds
    GX, GY = np.meshgrid(np.linspace(x0, x1, 460), np.linspace(y0, y1, 330))
    Z = np.asarray(yukselti(GX, GY))
    cs = _plt.contour(GX, GY, Z, levels=[kot])
    segler = [sg for sg in cs.allsegs[0] if len(sg) > 40]
    _plt.clf()
    if not segler:
        raise SystemExit(f"HATA: {kot} m eşyükseltisi bulunamadı")
    return max(segler, key=lambda sg: Polygon(sg).area if len(sg) > 3 else 0)


# Elle düzenleme dosyası varsa hesaplanan sınırın yerine o geçiyor.
# `harita-duzenle.html` sayfasında sürüklenen çizgiler buraya iniyor;
# üretecin geri kalanı (mahalle çokgenleri, bina denetimi, etiketler)
# değişmeden onların üstünde çalışıyor.
SINIR_DUZENLEME = None
_duzenleme_yolu = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "sinir-duzenleme.json")
if os.path.exists(_duzenleme_yolu):
    with open(_duzenleme_yolu, encoding="utf-8") as _f:
        SINIR_DUZENLEME = json.load(_f)
    print(f"Sınır düzenleme: {_duzenleme_yolu} okundu "
          f"({len(SINIR_DUZENLEME.get('hatlar', {}))} hat)")


def catmull_rom(kontrol, kapali, bolme=8):
    """Kontrol noktalarından geçen yumuşak eğri.

    `src/components/harita/sinirBolgeleri.ts` içindeki `catmullRom` ile
    BİREBİR aynı olmalı: düzenleyicide görülen eğri ile üretecin kullandığı
    eğri aynı şey olsun."""
    n = len(kontrol)
    if n < 3:
        return list(kontrol)

    def al(i):
        if kapali:
            return kontrol[i % n]
        return kontrol[max(0, min(n - 1, i))]

    cikti = []
    for i in range(n if kapali else n - 1):
        p0, p1, p2, p3 = al(i - 1), al(i), al(i + 1), al(i + 2)
        for j in range(bolme):
            t = j / bolme
            t2, t3 = t * t, t * t * t
            cikti.append(tuple(
                0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t
                       + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
                for k in (0, 1)))
    if not kapali:
        cikti.append(tuple(kontrol[-1]))
    return cikti


def _duzenlenmis(hat_id):
    """Elle düzenlenmiş hattı metre koordinatlarında verir, yoksa None.

    Düzenleyici seyrek bir kontrol çokgeni kaydediyor (çember 30, radyal 10
    nokta); buradaki eğri onunla aynı Catmull-Rom'dan geçiyor."""
    if not SINIR_DUZENLEME:
        return None
    ham = SINIR_DUZENLEME.get("hatlar", {}).get(hat_id)
    if not ham:
        return None
    kontrol = [((lng - LNG0) * M_PER_LNG, (lat - LAT0) * M_PER_LAT)
               for lng, lat in ham]
    return catmull_rom(kontrol, kapali=(hat_id == "sinir_cember"))


_cember_duzenli = _duzenlenmis("sinir_cember")
MAHALLE_CEMBERI = _cember_duzenli or _yumusat_halka(
    _esyukselti_halkasi(CEMBER_KOTU), gecis=8, pencere=15, adet=180)
cember_poly = Polygon(MAHALLE_CEMBERI)
_cember_sinir = cember_poly.exterior
ODAK = (cember_poly.centroid.x, cember_poly.centroid.y)

print(f"Çember Sınırı  : "
      + ("elle düzenlenmiş" if _cember_duzenli
         else f"{CEMBER_KOTU:.0f} m eşyükseltisi")
      + f", iç alan {ada.intersection(cember_poly).area / 1e6:.1f} km²")


def _odaktan_isin(aci):
    th = math.radians(aci)
    return LineString([ODAK, (ODAK[0] + BUYUK * math.cos(th),
                              ODAK[1] + BUYUK * math.sin(th))])


def _isin_kesisimi(aci, hat):
    kes = _odaktan_isin(aci).intersection(hat)
    if kes.is_empty:
        raise SystemExit(f"HATA: {aci:.0f}° ışını hattı kesmiyor")
    noktalar = [k for k in (list(kes.geoms) if hasattr(kes, "geoms") else [kes])
                if k.geom_type == "Point"]
    return max(noktalar,
               key=lambda k: math.hypot(k.x - ODAK[0], k.y - ODAK[1]))


# (id, ad, açı°, yanal salınım m)
SINIR_RADYALLERI = [
    ("sinir_dogu",  "Doğu sınırı",    20.0,  170.0),
    ("sinir_kuzey", "Kuzey sınırı",  104.0, -210.0),
    ("sinir_bati",  "Batı sınırı",   169.0,  230.0),
    ("sinir_guney", "Güney sınırı",  265.0, -180.0),
]


def _sinir_radyali(aci, salinim, n=40):
    """Çember Sınırı'ndan kıyıya inen sınır çizgisi. Cetvel çizgisi değil:
    ortada yanal salınımı olan, iki ucu tam yerine oturan yumuşak bir eğri.

    Burada eğim derdi yok — bu bir yol değil, sınır."""
    bas = _isin_kesisimi(aci, _cember_sinir)
    son = _isin_kesisimi(aci, ada.exterior)
    th = math.radians(aci)
    ct, st = math.cos(th), math.sin(th)
    dx, dy = son.x - bas.x, son.y - bas.y
    return [(bas.x + dx * (i / n) - salinim * math.sin(math.pi * i / n) * st,
             bas.y + dy * (i / n) + salinim * math.sin(math.pi * i / n) * ct)
            for i in range(n + 1)]


sinir_geom = {sid: (_duzenlenmis(sid) or _sinir_radyali(a, sal))
              for sid, _, a, sal in SINIR_RADYALLERI}


def _radyal_tam(sid, aci):
    """Dilim çokgeni için: odaktan BUYUK'e uzanan tam hat."""
    th = math.radians(aci)
    return ([ODAK] + sinir_geom[sid]
            + [(ODAK[0] + BUYUK * math.cos(th), ODAK[1] + BUYUK * math.sin(th))])


# Merkez kasabası: çemberin içinde, sırtın üstünde
MERKEZ_KASABA = (820.0, -430.0)

YERLESIM_NOKTASI = {
    "yer_merkez":  MERKEZ_KASABA,
    "yer_liman":   (-4500.0, 2450.0),
    "yer_iskele":  (-5080.0, -2060.0),
    "yer_stadyum": (4550.0, 2950.0),
    "yer_ciftlik": (6280.0, -2330.0),
}
MAHALLE_ADI = {
    "yer_merkez": "Merkez Mahallesi", "yer_liman": "Liman Mahallesi",
    "yer_iskele": "İskele Mahallesi", "yer_stadyum": "Stadyum Mahallesi",
    "yer_ciftlik": "Çiftlik Mahallesi",
}

mahalle_geom = {
    "yer_merkez": ("Merkez Mahallesi", MERKEZ_KASABA,
                   ada.intersection(cember_poly)),
}

_dis = ada.difference(cember_poly)
_dilimler = []
DILIM_SIRASI = [None] * len(SINIR_RADYALLERI)   # i. dilim hangi mahalle
for _i, (_sid, _, _a0, _) in enumerate(SINIR_RADYALLERI):
    _sid2, _, _a1, _ = SINIR_RADYALLERI[(_i + 1) % len(SINIR_RADYALLERI)]
    if _a1 <= _a0:
        _a1 += 360.0
    _sektor = Polygon(_radyal_tam(_sid, _a0)
                      + list(reversed(_radyal_tam(_sid2, _a1))))
    if not _sektor.is_valid:
        _sektor = _sektor.buffer(0)
    _hucre = _dis.intersection(_sektor)
    if _hucre.geom_type == "MultiPolygon":
        _hucre = max(_hucre.geoms, key=lambda g: g.area)
    _dilimler.append((_i, _hucre))

for _mid, _nokta in YERLESIM_NOKTASI.items():
    if _mid == "yer_merkez":
        continue
    _es = next((d for d in _dilimler if d[1].buffer(30).contains(Point(*_nokta))),
               None)
    if _es is None:
        raise SystemExit(f"HATA: {MAHALLE_ADI[_mid]} hiçbir dilime düşmedi "
                         f"— sınır radyallerini gözden geçir")
    _dilimler.remove(_es)
    DILIM_SIRASI[_es[0]] = _mid
    mahalle_geom[_mid] = (MAHALLE_ADI[_mid], _nokta, _es[1])

# Kıyı girintilerinde artıklar kalabiliyor; boşluk bırakmamak için her
# artığı en çok komşu olduğu mahalleye katıyoruz.
_artik = ada.difference(unary_union([g for _, _, g in mahalle_geom.values()]))
for _p in (list(_artik.geoms) if hasattr(_artik, "geoms") else [_artik]):
    if _p.is_empty or _p.area < 1.0:
        continue
    _sahip = max(mahalle_geom,
                 key=lambda k: mahalle_geom[k][2].buffer(2)
                 .intersection(_p.buffer(2)).area)
    _ad, _n, _g = mahalle_geom[_sahip]
    _b = unary_union([_g, _p.buffer(0.5)])
    if _b.geom_type == "MultiPolygon":
        _b = max(_b.geoms, key=lambda g: g.area)
    mahalle_geom[_sahip] = (_ad, _n, _b)

# Etiket noktası: yerleşimin kendisi. Coğrafi ağırlık merkezi boş kırsala
# düşüyor, insanın olduğu yer daha okunur.
MAHALLELER = [(mid, ad, n) for mid, (ad, n, _) in mahalle_geom.items()]

_toplam = sum(g.area for _, _, g in mahalle_geom.values())
for _mid, (_ad, _, _g) in mahalle_geom.items():
    print(f"  {_ad:20s} {_g.area / 1e6:6.1f} km²")
assert abs(_toplam - ada.area) / ada.area < 0.004, \
    f"mahalleler adayı kaplamıyor: {_toplam / 1e6:.1f} / {ada.area / 1e6:.1f} km²"


# ---------------------------------------------------------------- binalar
def dikdortgen(cx, cy, w, h, aci_derece=0.0):
    a = math.radians(aci_derece)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        pts.append((cx + dx * ca - dy * sa, cy + dx * sa + dy * ca))
    return Polygon(pts)


def daire(cx, cy, r, n=24):
    return Polygon([(cx + r * math.cos(2 * math.pi * i / n),
                     cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)])


def elips(cx, cy, rx, ry, aci_derece=0.0, n=36):
    a = math.radians(aci_derece)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return Polygon(pts)


def kiyi_yaricapi(derece):
    return kiyi_r(math.radians(derece))


def kara(derece, oran):
    """Verilen yönde, kıyı yarıçapının `oran` katında bir kara noktası.
    oran 1'e yaklaştıkça kıyıya, 0'a yaklaştıkça iç kesime gider."""
    th = math.radians(derece)
    r = kiyi_yaricapi(derece) * oran
    return (r * math.cos(th), r * math.sin(th))


binalar = []


def bina(bid, ad, geom, yukseklik, tur, mahalle, wiki_id=None, kat=None,
         taban=None):
    """Yapıyı kaydeder. `taban`, yapının oturduğu arazi kotu — verilmezse
    ağırlık merkezindeki rakımdan örneklenir. Prizma bu kottan yükselir,
    böylece yamaçtaki yapı havada durmuyor."""
    if not ada.contains(geom):
        raise SystemExit(f"HATA: {ad} denizde veya kıyıyı aşıyor")
    if taban is None:
        c = geom.centroid
        taban = float(yukselti(c.x, c.y))
    binalar.append({
        "id": bid, "ad": ad, "geom": geom, "yukseklik": yukseklik,
        "tur": tur, "mahalle": mahalle, "wikiId": wiki_id or bid, "kat": kat,
        "taban": round(taban, 1),
    })


# --------------------------------------------------------------------------
# The Imperial Kemsköy yerleşkesi
#
# Kaynaklar: Kemal'in otel programı dokümanı (Drive → Haydarpaşa) ve
# Canva'daki izometrik diorama. İkisi de birebir alınmadı, biçim verdi.
#
# Ana bina Haydarpaşa Garı'nın yerleşimini izler: denize bakan yüz KAPALI
# ve görkemli cephedir, iki kule o cephenin köşelerinde durur. U'nun açık
# ağzı karaya bakar, avlu içeride kalır. Kanatlar denize değil, karaya
# doğru uzanır.
#
# Otel 20 odalıdır; spa/havuz gibi büyük ek yapı yoktur.
# --------------------------------------------------------------------------

# Otel koyun İÇİNDE değil, koyun güney kolunu oluşturan Güney Burnu'nun
# üstündedir — ve uçurumun ta kenarındadır.
#
# Önceki sürümde yerleşke kıyıdan 236 metre içerideydi: haritada denizle
# ilgisi olmayan bir yapı gibi duruyordu. Otelin bütün fikri koyu tepeden
# izlemek; o yüzden teras uçurum alnından 20 metre geride duruyor ve
# sahile tek bir merdivenle iniliyor.

_UCURUM_ACI = 211.0        # uçurum alnının kıyı üzerindeki açısı
_KIYIDAN_GERI = 74.0       # yerleşke merkezinin alından geri çekilmesi (m)

_th_ucurum = math.radians(_UCURUM_ACI)
_alin_r = kiyi_r(_th_ucurum)
UCURUM_ALNI = (_alin_r * math.cos(_th_ucurum), _alin_r * math.sin(_th_ucurum))

# Cephe koyun suyuna döner
_KOY_YON = 208.0                      # koyun ekseni
_koy_su_r = kiyi_r(math.radians(_KOY_YON)) + 300.0
_koy_x = _koy_su_r * math.cos(math.radians(_KOY_YON))
_koy_y = _koy_su_r * math.sin(math.radians(_KOY_YON))
OTEL_YON = math.degrees(math.atan2(_koy_y - UCURUM_ALNI[1],
                                   _koy_x - UCURUM_ALNI[0]))

# Merkez, alından cephe yönünün TERSİNE (karaya doğru) geri çekiliyor
ox = UCURUM_ALNI[0] - math.cos(math.radians(OTEL_YON)) * _KIYIDAN_GERI
oy = UCURUM_ALNI[1] - math.sin(math.radians(OTEL_YON)) * _KIYIDAN_GERI
OTEL_MERKEZ = (ox, oy)

# Cephe yönünde kıyıya kaç metre var? Teras, merdiven ve iskele buna göre
# yerleşiyor — otelin kendi uçurumu bu doğrultuda.
_ileri0 = (math.cos(math.radians(OTEL_YON)), math.sin(math.radians(OTEL_YON)))
ON_KIYI = 0.0
for _adim in range(10, 1200, 2):
    if not ada.contains(Point(ox + _ileri0[0] * _adim, oy + _ileri0[1] * _adim)):
        ON_KIYI = float(_adim)
        break

# Terasın ön kenarı bu kadar ileride duracak (aşağıda kullanılıyor)
TERAS_ON = ON_KIYI - 20.0
_otel_kot = float(yukselti(ox, oy))
_alin_kot = float(yukselti(*UCURUM_ALNI))

print(f"\nOtel yerleşimi (Güney Burnu uçurumu):")
print(f"  Otel merkezi     : ({ox:.0f}, {oy:.0f})")
print(f"  Cephe yönü       : {OTEL_YON:.0f}°  (koya bakıyor)")
print(f"  Uçurum alnı      : {ON_KIYI:.0f} m ileride, teras alından "
      f"{ON_KIYI - TERAS_ON:.0f} m geride")
print(f"  Sahanlık kotu    : {_otel_kot:.0f} m  (alın {_alin_kot:.0f} m)")
print(f"  Koy suyu         : {math.hypot(_koy_x - ox, _koy_y - oy):.0f} m ileride")
if not (40 <= _otel_kot <= 80):
    raise SystemExit(f"HATA: otel kotu beklenen aralıkta değil ({_otel_kot:.0f} m)")
if not (55 <= ON_KIYI <= 110):
    raise SystemExit(f"HATA: otel uçurumdan uzaklaştı ({ON_KIYI:.0f} m)")

# --- otelin sahanlığı ---
# Yerleşke eğimli bir yamaçta duruyor; bina, teras ve bahçe araziye
# giydirilince eğri duruyordu. Gerçekte de böyle bir otel kaz-doldur ile
# düzlenmiş bir sahanlığa oturur; arazi modelinde o sahanlığı biz
# açıyoruz (gen/dem.py okuyor). Sahanlık uçurum alnında bitiyor: eteği
# denize taşmasın diye ön sınır TERAS_ON.
OTEL_SAHANLIK = {
    "x": ox, "y": oy, "yon": OTEL_YON,
    "ileri_min": -88.0, "ileri_max": TERAS_ON + 4.0, "yan_yari": 52.0,
    "kot": round(_otel_kot, 1), "etek": 46.0,
}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "otel_sahanlik.json"), "w", encoding="utf-8") as _f:
    json.dump(OTEL_SAHANLIK, _f, ensure_ascii=False, indent=1)

_ort = math.radians(OTEL_YON)
_ileri = (math.cos(_ort), math.sin(_ort))          # denize doğru
_yan = (-math.sin(_ort), math.cos(_ort))           # kıyıya paralel


def yerleske(ileri_m, yan_m):
    """Otel merkezine göre yerel koordinat: ileri = denize doğru."""
    return (ox + _ileri[0] * ileri_m + _yan[0] * yan_m,
            oy + _ileri[1] * ileri_m + _yan[1] * yan_m)


def yerlesim_dikdortgen(ileri_m, yan_m, uzunluk, genislik, ek_aci=0.0):
    """Yerleşke eksenine hizalı dikdörtgen (uzunluk = denize doğru derinlik)."""
    cx, cy = yerleske(ileri_m, yan_m)
    return dikdortgen(cx, cy, uzunluk, genislik, OTEL_YON + ek_aci)


# --- ana bina: denize bakan kapalı cephe + karaya uzanan iki kanat ---
# Kanatlar ön bloğa birkaç metre bindiriliyor: tam bitişik dikdörtgenler
# döndürüldükten sonra kayan noktada aynı kenarı paylaşmıyor ve birleşme
# yerine iki ayrı parça çıkıyor.
_on = yerlesim_dikdortgen(16, 0, 22, 66)             # denize bakan ana cephe
_kanat_sol = yerlesim_dikdortgen(-10, -24, 34, 18)   # karaya uzanan sol kanat
_kanat_sag = yerlesim_dikdortgen(-10, 24, 34, 18)    # karaya uzanan sağ kanat
otel = unary_union([_on, _kanat_sol, _kanat_sag])
if isinstance(otel, MultiPolygon):
    raise SystemExit("HATA: ana bina tek parça olmadı")
bina("bina_imperial", "The Imperial Kemsköy", otel, 19, "otel", "yer_iskele",
     wiki_id="kemskoy_hotel", kat=4)

# --- kuleler: denize bakan cephenin iki köşesinde ---
for _yan_isaret, _kid, _kad in ((-1, "bati", "Batı Kulesi"), (1, "dogu", "Doğu Kulesi")):
    _kx, _ky = yerleske(24, _yan_isaret * 28)
    bina(f"bina_imperial_kule_{_kid}", _kad, daire(_kx, _ky, 7), 30,
         "kule", "yer_iskele", wiki_id="kemskoy_hotel")

# Restoran, bar, meyhane ve kafe haritada ayrı yapı olarak durmuyor:
# hepsi otelin kendi içindeki mekânlar. Wiki'de otelin altında yaşıyorlar,
# harita yalnızca ana binayı, terası ve suya inen merdiveni gösteriyor.

# --- teras ve bahçe: bina değil, zemin öğeleri ---
zemin = []

# taş korkuluklu teras — uçurum alnının 20 metre gerisinde biter
zemin.append({
    "id": "zemin_teras", "ad": "Otel Terası", "tur": "teras",
    "geom": yerlesim_dikdortgen((30 + TERAS_ON) / 2, 0, TERAS_ON - 30, 74),
})

# otel bahçesi — arkada, ağaçlıklı
zemin.append({
    "id": "zemin_bahce", "ad": "Otel Bahçesi", "tur": "bahçe",
    "geom": yerlesim_dikdortgen(-56, 6, 40, 92),
})

for z in zemin:
    if not ada.contains(z["geom"]):
        raise SystemExit(f"HATA: {z['ad']} karada değil")
    _c = z["geom"].centroid
    z["taban"] = round(float(yukselti(_c.x, _c.y)), 1)


# --- merdiven ve iskele ---------------------------------------------------
#
# Sahile tek bir merdivenle iniliyor. Uçurum ~59 metre; merdiven alnı
# dikine inemeyeceği için kaya yüzünde zikzak çiziyor ve kıyıya alnın
# yaklaşık 80 metre yanından varıyor.
#
# İskele kıyıdan denize DİK uzanıyor (yerleşkenin eksenine değil — kıyı
# çizgisinin kendi normaline) ve ucunda enine bir baş var: T biçimi.

_kiyi_hatti = ada.exterior
_alin_s = _kiyi_hatti.project(Point(*UCURUM_ALNI))
_AYAK_KAYMA = 80.0                      # merdiven ayağı alından bu kadar yanda


def _kiyi_noktasi_s(s_degeri):
    n = _kiyi_hatti.interpolate(s_degeri % _kiyi_hatti.length)
    return (n.x, n.y)


MERDIVEN_AYAGI = _kiyi_noktasi_s(_alin_s + _AYAK_KAYMA)

# Kıyı teğeti ve dışa (denize) bakan normali
_t1 = _kiyi_noktasi_s(_alin_s + _AYAK_KAYMA - 45.0)
_t2 = _kiyi_noktasi_s(_alin_s + _AYAK_KAYMA + 45.0)
_tx, _ty = _t2[0] - _t1[0], _t2[1] - _t1[1]
_tn = math.hypot(_tx, _ty)
_tx, _ty = _tx / _tn, _ty / _tn
_nx, _ny = -_ty, _tx                      # teğetin dikeyi
# Hangi taraf deniz?
if ada.contains(Point(MERDIVEN_AYAGI[0] + _nx * 25, MERDIVEN_AYAGI[1] + _ny * 25)):
    _nx, _ny = -_nx, -_ny
KIYI_NORMALI = (_nx, _ny)


def _iskele_noktasi(disari, yan):
    """İskele yerel koordinatı: disari = denize doğru, yan = kıyıya paralel."""
    return (MERDIVEN_AYAGI[0] + _nx * disari + _tx * yan,
            MERDIVEN_AYAGI[1] + _ny * disari + _ty * yan)


ISKELE_BOY = 58.0       # gövdenin denize uzanma mesafesi
ISKELE_BAS = 36.0       # T'nin başı, kıyıya paralel

_iskele_aci = math.degrees(math.atan2(_ny, _nx))
_govde_merkez = _iskele_noktasi(ISKELE_BOY / 2 - 6.0, 0.0)
_bas_merkez = _iskele_noktasi(ISKELE_BOY - 3.0, 0.0)
_iskele = unary_union([
    dikdortgen(_govde_merkez[0], _govde_merkez[1], ISKELE_BOY + 12.0, 7.0,
               _iskele_aci),
    dikdortgen(_bas_merkez[0], _bas_merkez[1], 9.0, ISKELE_BAS, _iskele_aci),
])
if isinstance(_iskele, MultiPolygon):
    raise SystemExit("HATA: iskele tek parça olmadı")

binalar.append({
    "id": "bina_otel_iskele", "ad": "Otel İskelesi",
    "geom": _iskele,
    "yukseklik": 3, "tur": "iskele", "mahalle": "yer_iskele",
    "wikiId": "kemskoy_hotel", "kat": None, "taban": 0.0,
})

# Merdiven: teras ucundan uçurum yüzünde zikzak inip iskelenin başına varır.
_mer_bas = yerleske(TERAS_ON - 2, 10)
_dx, _dy = MERDIVEN_AYAGI[0] - _mer_bas[0], MERDIVEN_AYAGI[1] - _mer_bas[1]
_yan_bir = (-_dy / math.hypot(_dx, _dy), _dx / math.hypot(_dx, _dy))
merdiven_noktalari = [
    (_mer_bas[0] + _dx * t + _yan_bir[0] * g,
     _mer_bas[1] + _dy * t + _yan_bir[1] * g)
    for t, g in ((0.0, 0.0), (0.18, -26.0), (0.40, 18.0),
                 (0.62, -14.0), (0.84, 8.0), (1.0, 0.0))
]

_merdiven_boy = sum(
    math.hypot(merdiven_noktalari[i + 1][0] - merdiven_noktalari[i][0],
               merdiven_noktalari[i + 1][1] - merdiven_noktalari[i][1])
    for i in range(len(merdiven_noktalari) - 1))
print(f"  Merdiven         : {_merdiven_boy:.0f} m yolla {_otel_kot:.0f} m iniş "
      f"(~%{_otel_kot / _merdiven_boy * 100:.0f})")
print(f"  İskele           : kıyıya dik, T başı {ISKELE_BAS:.0f} m")

# Deniz feneri — adanın kuzeybatı ucunda, Liman'ı yukarıdan görür
fx, fy = kara(141, 0.985)
bina("bina_fener", "Deniz Feneri", daire(fx, fy, 7), 24, "fener", "yer_liman",
     wiki_id="mekan_fener")

# Dirlik Stadı
bina("bina_stad", "Dirlik Stadı", elips(4750, 3150, 78, 54, 15), 14, "stadyum",
     "yer_stadyum", wiki_id="mekan_dirlik_stadi")

# Küçükçetmi Sürek Kulübü — çiftlik yerleşkesi
bina("bina_surek", "Küçükçetmi Sürek Kulübü", dikdortgen(6320, -2320, 54, 26, -8),
     9, "kulüp", "yer_ciftlik", wiki_id="mekan_kucukcetmi")

# Merkez Mahallesi — kamu binaları ve apartmanlar
# Kasaba ~310 m kotta bir sırtın üstünde. Ege kasabaları kıyıda değil,
# içerideki sırtın üstünde kurulur; konum MERKEZ_KASABA'da tanımlı.
merkez_yapilar = [
    ("bina_belediye", "Belediye Binası", (-100, 220), 44, 24, 12, 3),
    ("bina_okul", "Düzada İlkokulu", (220, -50), 52, 20, 9, 2),
    ("bina_pazar", "Merkez Pazarı", (-260, -140), 36, 30, 7, 1),
    ("bina_apt1", "Çarşı Apartmanı", (120, 270), 22, 18, 15, 5),
    ("bina_apt2", "Zeytinli Apartmanı", (-200, 50), 20, 20, 12, 4),
]
for bid, ad, (dx, dy), w, h, yuk, kat in merkez_yapilar:
    bina(bid, ad,
         dikdortgen(MERKEZ_KASABA[0] + dx, MERKEZ_KASABA[1] + dy, w, h, 12),
         yuk, "yapı", "yer_merkez", kat=kat)

# Kemsköy Caddesi boyunca sıra yapılar (İskele Mahallesi).
# Cadde koyun kuzey kıyısını izler; otel koyun karşı kolunda kalır.
cadde_baslangic = kara(199, 0.86)
cadde_bitis = kara(206, 0.80)
for i in range(7):
    t = (i + 0.5) / 7
    cx = cadde_baslangic[0] + (cadde_bitis[0] - cadde_baslangic[0]) * t
    cy = cadde_baslangic[1] + (cadde_bitis[1] - cadde_baslangic[1]) * t
    aci = math.degrees(math.atan2(cadde_bitis[1] - cadde_baslangic[1],
                                  cadde_bitis[0] - cadde_baslangic[0]))
    # caddenin iki yanı
    for yan, isim in ((90, "kuzey"), (-90, "güney")):
        # DİKKAT: ox/oy modül düzeyinde otelin merkezidir — burada gölgelenmemeli.
        kx = 26 * math.cos(math.radians(aci + yan))
        ky = 26 * math.sin(math.radians(aci + yan))
        bina(f"bina_kemskoy_{i}_{isim}", f"Kemsköy Caddesi No. {i * 2 + (1 if isim == 'kuzey' else 2)}",
             dikdortgen(cx + kx, cy + ky, 20, 14, aci), 8 + (i % 3) * 2, "yapı",
             "yer_iskele", kat=2 + (i % 3))

# Tarihi Meyhane — otelin yanında, otele ait değil.
# Kemal: "otel ile homojen bir bağı yok ama yıllardır birlikte anılıyorlar."
# Yerleşkenin karaya bakan ucunda, bahçenin gerisinde ayrı bir kütle.
bina("bina_meyhane", "Tarihi Meyhane",
     yerlesim_dikdortgen(-150, 96, 26, 14, 18.0), 7, "meyhane", "yer_iskele",
     wiki_id="mekan_meyhane", kat=1)

# Liman Mahallesi — körfezin kıyısındaki liman yapıları
lx, ly = kara(152, 0.88)
bina("bina_liman_depo", "Liman Deposu", dikdortgen(lx, ly, 46, 22, -28), 8,
     "yapı", "yer_liman", kat=1)
lx2, ly2 = kara(149, 0.82)
bina("bina_liman_ofis", "Liman İdare Binası", dikdortgen(lx2, ly2, 24, 20, -28), 11,
     "yapı", "yer_liman", kat=3)
# Liman Kafesi: önce otelin iskelesindeydi, Kemal Liman Mahallesine taşıdı.
# Adı şimdilik jenerik.
lx3, ly3 = kara(155, 0.86)
bina("bina_liman_kafe", "Liman Kafesi", dikdortgen(lx3, ly3, 18, 14, -24), 5,
     "kafe", "yer_liman", wiki_id="mekan_liman_kafe", kat=1)

assert (ox, oy) == OTEL_MERKEZ, "ox/oy gölgelendi — yerleske() bozulur"

# Her yapı iddia ettiği mahallenin içinde mi? Sınırlar artık yollara
# oturduğu için eskiden doğru olan bir atama yanlış düşmüş olabilir.
_yanlis = []
for _b in binalar:
    _m = _b["mahalle"]
    if not _m or _b["tur"] == "iskele":
        continue           # iskele bilerek suyun üstünde
    _c = _b["geom"].centroid
    if not mahalle_geom[_m][2].buffer(5).contains(_c):
        _dogru = next((k for k, (_, _, g) in mahalle_geom.items()
                       if g.buffer(5).contains(_c)), "?")
        _yanlis.append(f"{_b['ad']}: {_m} yazıyor, {_dogru} içinde")
if _yanlis:
    raise SystemExit("HATA: mahalle ataması tutmuyor\n  " + "\n  ".join(_yanlis))
print(f"\nBina sayısı    : {len(binalar)}")

# ---------------------------------------------------------------- yollar
#
# Beş kademe, haritada kalınlıkla ayrışıyor:
#
#   ana yol : Sahil Yolu — adayı dolanan kapalı halka, ağın omurgası
#   yol     : Sırt Yolları (düğümden sahile) ve yerleşim bağlantıları
#   cadde   : yerleşimlerin omurgası
#   sokak   : mahalle içi ara sokaklar, numaralı
#   merdiven: yayaya ait, basamaklı
#
# Sokak adları bilerek jenerik: "İskele 3. Sokak". Asıl adları Kemal
# koyacak; o zamana kadar numara duruyor.

YOLLAR = [
    ("yol_sahil", "Sahil Yolu", SAHIL_YOLU + [SAHIL_YOLU[0]], "ana yol", None),
]


def _sahile_kadar(noktalar):
    """Bir hattı Sahil Yolu'nu ilk kestiği yerde bitirir.

    Sırt Yolları kıyıya kadar inmiyor: sahil halkasına bağlanıp orada
    bitiyorlar. Yol ağında kopuk uç kalmasının önüne bu geçiyor."""
    hat = LineString(noktalar)
    kesisim = hat.intersection(sahil_hat)
    if kesisim.is_empty:
        return noktalar
    adaylar = (list(kesisim.geoms) if hasattr(kesisim, "geoms") else [kesisim])
    adaylar = [c for c in adaylar if c.geom_type == "Point"]
    if not adaylar:
        return noktalar
    # hat boyunca en erken kesişim
    kes = min(adaylar, key=lambda c: hat.project(c))
    mesafe = hat.project(kes)
    kirpik = [p for p in noktalar if hat.project(Point(*p)) < mesafe]
    kirpik.append((kes.x, kes.y))
    return kirpik if len(kirpik) > 1 else noktalar


# Dağ kavşağı: iç yolların buluştuğu yer. Su bölümü düğümü 687 metrede,
# oraya çıkan her yol %20'nin üstünde eğim istiyordu; kavşak bu yüzden
# kuzey yamacında, yolun taşıyabileceği bir kotta.
DAG_KAVSAGI = (1250.0, 350.0)
print(f"Dağ kavşağı    : {float(yukselti(*DAG_KAVSAGI)):.0f} m")

# Üç sırtın üstünde gerçekten yol var; sınırın hem sırt hem yol olduğu
# yerler bunlar. Kalan iki sınır yalnızca coğrafi.
#
# Yol sırtın kendisini değil, sırtın indiği kıyı ucunu hedef alıyor ve
# oraya eğimi gözeten bir güzergâhla iniyor: sırtın alt kesiminde zaten
# sırtla çakışıyor, üst kesimde yol dağa tırmanmak yerine kavşağa
# bağlanıyor. Böylece hem sınır yolla okunuyor hem de eğim insanca.
_sirt_yolu_hedefleri = {}
for _sid, _ad, _, _yol_var in SIRTLAR:
    if not _yol_var:
        continue
    _uc = sirt_geom[_sid][-1]
    _yakin = sahil_hat.interpolate(sahil_hat.project(Point(*_uc)))
    _sirt_yolu_hedefleri[_sid] = (_yakin.x, _yakin.y)

_sirt_yollari = yol_guzergahi(DAG_KAVSAGI, list(_sirt_yolu_hedefleri.values()))
for _sid, _ad, _, _yol_var in SIRTLAR:
    if not _yol_var:
        continue
    _hat = _sirt_yollari[_sirt_yolu_hedefleri[_sid]]
    YOLLAR.append((f"yol_{_sid}", _ad.replace(" hattı", " Yolu").replace(
        "sırtı", "Sırt Yolu"), _hat, "yol", None))

YOLLAR += [
    # --- yerleşim omurgaları ---
    ("yol_kemskoy", "Kemsköy Caddesi", [cadde_baslangic, cadde_bitis],
     "cadde", "yer_iskele"),
    ("yol_liman", "Liman Caddesi",
     [kara(155, 0.86), kara(148, 0.80), kara(142, 0.72)], "cadde", "yer_liman"),

    # --- bağlantılar ---
    # Otel Yolu ve yerleşim bağlantıları aşağıda, _kivrimli tanımlandıktan
    # sonra ekleniyor.
    ("yol_merdiven", "Sahil Merdiveni", merdiven_noktalari, "merdiven",
     "yer_iskele"),
]


# --- yerleşim sokakları ---------------------------------------------------
#
# Sokaklar adanın tamamına serpilmiyor: her yerleşimin çevresinde kendi
# dokusunu kuruyorlar, aradaki kırsal boş kalıyor. Gerçek bir ada haritası
# böyle okunur — yol ağı nerede sıklaşıyorsa orada insan yaşıyor.
#
# Adlar bilerek numaralı: "İskele 3. Sokak". Asıl adları Kemal koyacak.


def _hat_kirp(noktalar, alan):
    """Bir hattı verilen alanın içinde kalan EN UZUN parçasına indirger.

    Nokta nokta eleyip kalanları birleştirmek olmuyordu: aradan düşen
    noktalar yüzünden hat uzak iki ucu birleştiren keskin köşeler
    yapıyordu. Doğrusu geometrik kesişim almak."""
    if len(noktalar) < 2:
        return None
    kesisim = LineString(noktalar).intersection(alan)
    if kesisim.is_empty:
        return None
    parcalar = (list(kesisim.geoms)
                if kesisim.geom_type == "MultiLineString" else [kesisim])
    parcalar = [p for p in parcalar if p.geom_type == "LineString"]
    if not parcalar:
        return None
    en_uzun = max(parcalar, key=lambda p: p.length)
    if en_uzun.length < 140:
        return None
    return [(x, y) for x, y in en_uzun.coords]


def _kivrimli(p0, p1, salinim, n=10):
    """İki nokta arasında hafif kıvrımlı hat — cetvel çizgisi olmasın."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    boy = math.hypot(dx, dy)
    if boy < 1:
        return [p0, p1]
    nx, ny = -dy / boy, dx / boy
    return [(x0 + dx * (i / n) + nx * salinim * math.sin(math.pi * i / n),
             y0 + dy * (i / n) + ny * salinim * math.sin(math.pi * i / n))
            for i in range(n + 1)]


# (mahalle, ad kökü, merkez, doku açısı°, uzun sokak sayısı, enine sayı,
#  uzunluk m, genişlik m)
YERLESIMLER = [
    ("yer_merkez",  "Merkez",  MERKEZ_KASABA,   22.0, 5, 4, 1450, 1050),
    ("yer_liman",   "Liman",   (-4500,  2450), -28.0, 4, 3, 1400,  900),
    ("yer_iskele",  "İskele",  (-5080, -2060),  -1.0, 4, 3, 1450,  850),
    ("yer_stadyum", "Stadyum", ( 4550,  2950),  40.0, 4, 3, 1300,  850),
    ("yer_ciftlik", "Çiftlik", ( 6280, -2330),  62.0, 3, 3, 1050,  760),
]

for _mid, _kok, (_cx, _cy), _aci, _uzun_adet, _en_adet, _boy, _en in YERLESIMLER:
    _hucre = mahalle_geom[_mid][2]
    # Doku kendi mahallesinde kalsın (ana yola değecek kadar taşabilsin),
    # ama hiçbir koşulda kıyıyı aşmasın.
    _alan = _hucre.buffer(60).intersection(ada.buffer(-30))
    _th = math.radians(_aci)
    _u = (math.cos(_th), math.sin(_th))            # uzun eksen
    _v = (-math.sin(_th), math.cos(_th))           # enine eksen
    _n = 0

    def _nokta(a, b):
        return (_cx + _u[0] * a + _v[0] * b, _cy + _u[1] * a + _v[1] * b)

    # uzun sokaklar
    for _k in range(_uzun_adet):
        _b = (_k - (_uzun_adet - 1) / 2) * (_en / max(_uzun_adet - 1, 1))
        _ham = _kivrimli(_nokta(-_boy / 2, _b), _nokta(_boy / 2, _b),
                         28.0 * (1 if _k % 2 else -1))
        _hat = _hat_kirp(_ham, _alan)
        if _hat:
            _n += 1
            YOLLAR.append((f"sokak_{_mid}_{_n}", f"{_kok} {_n}. Sokak",
                           _hat, "sokak", _mid))

    # enine sokaklar
    for _k in range(_en_adet):
        _a = (_k - (_en_adet - 1) / 2) * (_boy / max(_en_adet - 1, 1)) * 0.78
        _ham = _kivrimli(_nokta(_a, -_en / 2 - 90), _nokta(_a, _en / 2 + 90),
                         22.0 * (-1 if _k % 2 else 1))
        _hat = _hat_kirp(_ham, _alan)
        if _hat:
            _n += 1
            YOLLAR.append((f"sokak_{_mid}_{_n}", f"{_kok} {_n}. Sokak",
                           _hat, "sokak", _mid))


# --- otele çıkan yol ---
# Köyün güney ucundan Güney Burnu'nun sırtına tırmanan tek şerit. Köşeli
# değil: yamaç yolları gibi tek bir yayla dönüyor.
_otel_giris = yerleske(-70, -22)
YOLLAR.append((
    "yol_otel", "Otel Yolu",
    _kivrimli(cadde_bitis, _otel_giris, 230.0, n=18) + [yerleske(-34, -6)],
    "yol", "yer_iskele"
))

# --- yerleşim bağlantıları ------------------------------------------------
# Her yerleşim Sahil Yolu'na bağlanıyor. Ağ böyle kapanıyor:
# Sahil Yolu (halka) → bağlantı → yerleşim sokakları, ve
# Sahil Yolu → Sırt Yolu → su bölümü düğümü.

BAGLANTILAR = [
    ("yol_bag_liman",   "Liman Bağlantısı",   (-4500.0,  2450.0), "yer_liman"),
    ("yol_bag_stadyum", "Stadyum Bağlantısı", ( 4550.0,  2950.0), "yer_stadyum"),
    ("yol_bag_ciftlik", "Çiftlik Bağlantısı", ( 6280.0, -2330.0), "yer_ciftlik"),
    ("yol_bag_iskele",  "İskele Bağlantısı",  (-5080.0, -2060.0), "yer_iskele"),
    # Merkez bağlantısı aşağıda, ayrıca ele alınıyor
]

# Bağlantılar da eğimi gözeten güzergâhla kuruluyor: düz çizgi Stadyum ve
# Çiftlik'te %12'ye çıkıyordu, yamacı dolanınca yarıya iniyor.
for _yid, _ad, _nok, _mid in BAGLANTILAR:
    _hedef = sahil_hat.interpolate(sahil_hat.project(Point(*_nok)))
    _hat = yol_guzergahi(_nok, [(_hedef.x, _hedef.y)])[(_hedef.x, _hedef.y)]
    _hat = _hat_kirp(_hat, ada.buffer(-25))
    if _hat:
        YOLLAR.append((_yid, _ad, _hat, "yol", _mid))

# Merkez kasabası içeride ve yüksekte; düz çizgiyle bağlanınca yol
# Düzada Tepesi'nin üstünden geçip %20 eğime çıkıyordu. Hem sahile hem
# dağ kavşağına eğimi gözeten güzergâhla bağlanıyor.
_merkez_sahil = sahil_hat.interpolate(sahil_hat.project(Point(820, -430)))
_merkez_yollari = yol_guzergahi(
    MERKEZ_KASABA, [(_merkez_sahil.x, _merkez_sahil.y), DAG_KAVSAGI])
YOLLAR.append(("yol_bag_merkez", "Merkez Bağlantısı",
               _merkez_yollari[(_merkez_sahil.x, _merkez_sahil.y)],
               "yol", "yer_merkez"))
YOLLAR.append(("yol_merkez_dag", "Merkez Dağ Yolu",
               _merkez_yollari[DAG_KAVSAGI], "yol", "yer_merkez"))


# --- ağ bağlantı denetimi -------------------------------------------------
# "Yollar adanın sonuna kadar gidip kesilen şeyler olamaz." Bütün yolların
# tek bir ağ oluşturduğunu burada doğruluyoruz: uçları ve gövdeleri 140 m
# içinde birbirine değen yollar aynı bileşende sayılıyor.

def _ag_denetimi(yollar, tolerans=140.0):
    hatlar = [(y[0], y[1], LineString(y[2])) for y in yollar if len(y[2]) > 1]
    n = len(hatlar)
    ebeveyn = list(range(n))

    def bul(a):
        while ebeveyn[a] != a:
            ebeveyn[a] = ebeveyn[ebeveyn[a]]
            a = ebeveyn[a]
        return a

    for i in range(n):
        for j in range(i + 1, n):
            if hatlar[i][2].distance(hatlar[j][2]) <= tolerans:
                ra, rb = bul(i), bul(j)
                if ra != rb:
                    ebeveyn[ra] = rb

    bilesenler = {}
    for i in range(n):
        bilesenler.setdefault(bul(i), []).append(hatlar[i][1])
    return bilesenler


# --- eğim denetimi --------------------------------------------------------
# Merdiven hariç hiçbir yolun ortalama eğimi %13'ü aşmamalı. Gerçek dağ
# yolları %10 civarında kalır; aşan bir yol ya güzergâhını değiştirmeli ya
# da uzamalı.
def _yol_egimi(noktalar):
    z = [float(yukselti(*p)) for p in noktalar]
    toplam_d = toplam_dz = 0.0
    for i in range(len(noktalar) - 1):
        d = math.hypot(noktalar[i + 1][0] - noktalar[i][0],
                       noktalar[i + 1][1] - noktalar[i][1])
        toplam_d += d
        toplam_dz += abs(z[i + 1] - z[i])
    return (toplam_dz / toplam_d * 100.0) if toplam_d else 0.0


# --- elle düzenlenmiş yollar ---
# Düzenleyicinin "Yollar" sekmesinde sürüklenen hatlar burada devreye
# giriyor. Denetimler (karada mı, eğim, ağ bütünlüğü) düzenlenmiş yolun
# üstünde de çalışıyor ama HATA değil UYARI veriyorlar: Kemal'in dosyası
# yüzünden üretecin durması yerine neyin bozulduğunu söylemesi daha
# kullanışlı.
_duzenli_yollar = (SINIR_DUZENLEME or {}).get("yollar", {})
if _duzenli_yollar:
    _degisen = 0
    for _i, (_yid, _ad, _nok, _tur, _mid) in enumerate(YOLLAR):
        _ham = _duzenli_yollar.get(_yid)
        if not _ham:
            continue
        _kontrol = [((lng - LNG0) * M_PER_LNG, (lat - LAT0) * M_PER_LAT)
                    for lng, lat in _ham]
        _kapali = (len(_nok) > 3
                   and math.dist(_nok[0], _nok[-1]) < 1e-6)
        _yeni = catmull_rom(_kontrol, kapali=_kapali)
        if _kapali:
            _yeni = _yeni + [_yeni[0]]
        YOLLAR[_i] = (_yid, _ad, _yeni, _tur, _mid)
        _degisen += 1
    print(f"Yol düzenleme  : {_degisen} yol elle düzenlenmiş hâliyle alındı")

    _sorun = []
    for _yid, _ad, _nok, _tur, _ in YOLLAR:
        if _yid not in _duzenli_yollar:
            continue
        _disari = sum(1 for q in _nok if not ada.contains(Point(*q)))
        if _disari and _tur != "merdiven":
            _sorun.append(f"{_ad}: {_disari} nokta karada değil")
        _e = _yol_egimi(_nok)
        if _tur != "merdiven" and _e > 13.0:
            _sorun.append(f"{_ad}: ortalama eğim %{_e:.0f}")
    if _sorun:
        print("  UYARI: düzenlenmiş yollarda —\n    "
              + "\n    ".join(_sorun))

_bilesen = _ag_denetimi(YOLLAR)
if len(_bilesen) > 1:
    _ayrik = sorted(_bilesen.values(), key=len)[:-1]
    raise SystemExit(
        "HATA: yol ağı kopuk — şu yollar ana ağa bağlı değil:\n  "
        + "\n  ".join("; ".join(g) for g in _ayrik))
print(f"Yol ağı        : tek parça ({len(YOLLAR)} yol)")


_dik = [(ad, _yol_egimi(nok)) for _, ad, nok, tur, _ in YOLLAR
        if tur not in ("merdiven", "sokak") and _yol_egimi(nok) > 13.0]
if _dik:
    print("  UYARI: dik yollar — " + ", ".join(
        f"{ad} %{e:.0f}" for ad, e in _dik))

print(f"Yol sayısı     : {len(YOLLAR)}"
      f"  ({sum(1 for y in YOLLAR if y[3] == 'sokak')} sokak)")

# Hiçbir yol denize taşmasın
for _yid, _ad, _nok, _tur, _ in YOLLAR:
    if _tur == "merdiven":
        continue           # merdiven bilerek iskeleye, suya kadar iniyor
    _disari = [p for p in _nok if not ada.contains(Point(*p))]
    if _disari:
        raise SystemExit(f"HATA: {_ad} karadan çıkıyor ({len(_disari)} nokta)")

# ---------------------------------------------------------------- rölyef
# Eşyükselti bantları yukarıda tanımlanan `yukselti()` alanından çıkarılıyor.
# Izgara, kıyı kayalığını çözebilecek kadar sık: hücre yaklaşık 40 m.
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.path import Path as MplPath

gx = np.linspace(min(xs) - 300, max(xs) + 300, 470)
gy = np.linspace(min(ys) - 300, max(ys) + 300, 330)
GX, GY = np.meshgrid(gx, gy)

# Deniz tarafını maskele: contour yalnızca karada çalışsın
_kiyi_yol = MplPath(np.array(ada.exterior.coords))
_icinde = _kiyi_yol.contains_points(
    np.column_stack([GX.ravel(), GY.ravel()])
).reshape(GX.shape)

E = yukselti(GX, GY)
E = np.where(_icinde, E, 0.0)

print(f"Alanın en yüksek noktası: {E.max():.0f} m  "
      f"(kayıtta {max(z[3] for z in ZIRVELER)} m)")

# Alçak kotlarda sık, yükseklerde seyrek: kıyı sekisi de okunsun.
BANTLAR = [10, 25, 50, 90, 150, 230, 330, 450, 580, 690]


def path_to_polys(path):
    """matplotlib Path → shapely çokgen listesi (MOVETO ile ayrılmış halkalar,
    yönelime göre kabuk/delik)."""
    verts = path.vertices
    codes = path.codes
    rings = []
    cur = []
    for v, c in zip(verts, codes):
        if c == MplPath.MOVETO:
            if len(cur) >= 3:
                rings.append(cur)
            cur = [tuple(v)]
        elif c == MplPath.CLOSEPOLY:
            if len(cur) >= 3:
                rings.append(cur)
            cur = []
        else:
            cur.append(tuple(v))
    if len(cur) >= 3:
        rings.append(cur)

    shells, holes = [], []
    for r in rings:
        pg = Polygon(r)
        if not pg.is_valid:
            pg = pg.buffer(0)
        if pg.is_empty:
            continue
        # contourf'ta dış halkalar saat yönünün tersi, delikler saat yönünde
        a = 0.0
        for k in range(len(r)):
            x1, y1 = r[k]
            x2, y2 = r[(k + 1) % len(r)]
            a += x1 * y2 - x2 * y1
        (shells if a > 0 else holes).append(pg)

    out = []
    for sh in shells:
        g = sh
        for h in holes:
            if sh.contains(h.representative_point()):
                g = g.difference(h)
        out.append(g)
    return out


bant_geom = []
fig = plt.figure()
for t in BANTLAR:
    cs = plt.contourf(GX, GY, E, levels=[t, 1e6])
    polys = []
    for coll_path in cs.get_paths():
        polys.extend(path_to_polys(coll_path))
    if not polys:
        continue
    g = unary_union(polys).buffer(90).buffer(-90).intersection(ada)
    if g.is_empty:
        continue
    bant_geom.append((t, g))
    plt.clf()
plt.close(fig)
print(f"Yükselti bandı : {len(bant_geom)}")

# ---------------------------------------------------------------- dalga çizgileri
# Eski haritaların "su çizgileri": kıyıdan dışa doğru seyrelen halkalar.
DALGALAR = [170, 400, 700, 1080, 1550]
dalga_geom = []
for i, d in enumerate(DALGALAR):
    ring = ada.buffer(d, join_style=1).exterior.simplify(25)
    dalga_geom.append((i, d, ring))

# ---------------------------------------------------------------- etiketler
# Harita üstünde metin katmanı yok (dışarıdan font çekmemek için); etiketler
# React tarafında bu noktalara yerleştiriliyor.
etiketler = []


def zirveden_kac(x, y, en_az=1500.0):
    """Mahalle adı bir zirve işaretinin üstüne oturmasın diye iter."""
    for _z in ZIRVELER:
        px, py = _z[2]
        dx, dy = x - px, y - py
        d = math.hypot(dx, dy)
        if d < en_az:
            if d < 1e-6:
                dx, dy, d = 1.0, 0.0, 1.0
            x = px + dx / d * en_az
            y = py + dy / d * en_az
    return x, y


for mid, (ad, merkez, geom) in mahalle_geom.items():
    c = geom.centroid
    nokta = c if geom.contains(c) else geom.representative_point()
    lx_, ly_ = zirveden_kac(nokta.x, nokta.y)
    # itilen nokta mahallenin dışına taşarsa geri al
    if not geom.contains(Point(lx_, ly_)):
        lx_, ly_ = nokta.x, nokta.y
    etiketler.append({"id": f"etk_{mid}", "ad": ad.replace(" Mahallesi", ""), "tur": "mahalle",
                      "xy": (lx_, ly_), "wikiId": mid, "oncelik": 1})
for tid, ad, (x, y), rakim in ((z[0], z[1], z[2], z[3]) for z in ZIRVELER):
    etiketler.append({"id": f"etk_{tid}", "ad": ad, "tur": "zirve", "xy": (x, y),
                      "rakim": rakim, "oncelik": 2 if rakim > 300 else 3})
for b in binalar:
    if b["tur"] in ("otel", "fener", "stadyum", "kulüp"):
        c = b["geom"].centroid
        etiketler.append({"id": f"etk_{b['id']}", "ad": b["ad"], "tur": "yapi",
                          "xy": (c.x, c.y), "wikiId": b["wikiId"], "oncelik": 2})

# Otel yerleşkesindeki ikincil yapılar — yalnızca iyice yaklaşınca görünür
YERLESKE_ETIKET = {
    "bina_imperial_kule_bati", "bina_imperial_kule_dogu", "bina_otel_iskele",
}
for b in binalar:
    if b["id"] in YERLESKE_ETIKET:
        c = b["geom"].centroid
        etiketler.append({"id": f"etk_{b['id']}", "ad": b["ad"], "tur": "yerleske",
                          "xy": (c.x, c.y), "wikiId": b["wikiId"], "oncelik": 4})
for z in zemin:
    c = z["geom"].centroid
    etiketler.append({"id": f"etk_{z['id']}", "ad": z["ad"], "tur": "yerleske",
                      "xy": (c.x, c.y), "oncelik": 4})
etiketler.append({"id": "etk_deniz", "ad": "Ege Denizi", "tur": "deniz",
                  "xy": (-2000, -9200), "oncelik": 1})
# Su adları kıyıya binmesin diye biraz açığa alındı
etiketler.append({"id": "etk_liman_koy", "ad": "Liman Körfezi", "tur": "su",
                  "xy": kara(154, 1.26), "oncelik": 3})
etiketler.append({"id": "etk_iskele_koy", "ad": "İskele Koyu", "tur": "su",
                  "xy": kara(206, 1.24), "oncelik": 3})
print(f"Etiket         : {len(etiketler)}")

# ---------------------------------------------------------------- GeoJSON
def feature(geom_json, props):
    return {"type": "Feature", "geometry": geom_json, "properties": props}


features = []

features.append(feature(
    {"type": "Polygon", "coordinates": [ring_ll(kiyi)]},
    {"katman": "ada", "ad": "Düzada", "alanKm2": round(ada.area / 1e6, 1)}
))

for mid, (ad, merkez, geom) in mahalle_geom.items():
    features.append(feature(
        {"type": "Polygon", "coordinates": poly_ll(geom)},
        {"katman": "mahalle", "id": mid, "ad": ad, "wikiId": mid,
         "alanKm2": round(geom.area / 1e6, 1)}
    ))

for z in zemin:
    features.append(feature(
        {"type": "Polygon", "coordinates": poly_ll(z["geom"])},
        {"katman": "zemin", "id": z["id"], "ad": z["ad"], "tur": z["tur"],
         "taban": z["taban"]}
    ))

for b in binalar:
    parcalar = b["geom"].geoms if isinstance(b["geom"], MultiPolygon) else [b["geom"]]
    for k, pg in enumerate(parcalar):
        features.append(feature(
            {"type": "Polygon", "coordinates": poly_ll(pg)},
            {"katman": "bina",
             "id": b["id"] if len(parcalar) == 1 else f"{b['id']}_{k}",
             "ad": b["ad"], "wikiId": b["wikiId"],
             "yukseklik": b["yukseklik"], "taban": b["taban"],
             "tur": b["tur"], "mahalle": b["mahalle"], "kat": b["kat"]}
        ))

for tid, ad, (x, y), rakim in ((z[0], z[1], z[2], z[3]) for z in ZIRVELER):
    if not ada.contains(Point(x, y)):
        raise SystemExit(f"HATA: {ad} adanın dışında")
    features.append(feature(
        {"type": "Point", "coordinates": ll(x, y)},
        {"katman": "zirve", "id": tid, "ad": ad, "rakim": rakim}
    ))

# --- idari sınır hatları ---
# Mahalle çokgenlerinin kenarı zaten sınırı çiziyor ama düzenleyicinin
# sürükleyeceği şey çokgen değil, hattın kendisi. Bu yüzden hatlar ayrıca
# yazılıyor: harita onları çizmiyor, `harita-duzenle.html` okuyor.
features.append(feature(
    {"type": "LineString",
     "coordinates": [ll(x, y) for x, y in MAHALLE_CEMBERI + [MAHALLE_CEMBERI[0]]]},
    {"katman": "sinir", "id": "sinir_cember", "ad": "Çember Sınırı",
     "tur": "cember", "kapali": True}
))
for _sid, _ad, _, _ in SINIR_RADYALLERI:
    features.append(feature(
        {"type": "LineString",
         "coordinates": [ll(x, y) for x, y in sinir_geom[_sid]]},
        {"katman": "sinir", "id": _sid, "ad": _ad, "tur": "radyal",
         "kapali": False}
    ))

for yid, ad, noktalar, tur, mahalle in YOLLAR:
    features.append(feature(
        {"type": "LineString", "coordinates": [ll(x, y) for x, y in noktalar]},
        {"katman": "yol", "id": yid, "ad": ad, "tur": tur, "mahalle": mahalle}
    ))

# --- yükselti bantları (alçaktan yükseğe; harita üst üste boyar) ---
for sira, (t, g) in enumerate(bant_geom):
    parcalar = g.geoms if isinstance(g, MultiPolygon) else [g]
    for k, pg in enumerate(parcalar):
        if pg.is_empty or pg.area < 40000:
            continue
        features.append(feature(
            {"type": "Polygon", "coordinates": poly_ll(pg.simplify(30))},
            {"katman": "rolyef", "id": f"rolyef_{t}_{k}", "esik": t, "sira": sira}
        ))

# --- kıyı dalga çizgileri ---
for i, d, ring in dalga_geom:
    features.append(feature(
        {"type": "LineString", "coordinates": ring_ll(list(ring.coords))},
        {"katman": "dalga", "id": f"dalga_{i}", "sira": i, "mesafe": d}
    ))

# --- etiket noktaları ---
for e in etiketler:
    props = {"katman": "etiket", "id": e["id"], "ad": e["ad"], "tur": e["tur"],
             "oncelik": e["oncelik"]}
    if "wikiId" in e:
        props["wikiId"] = e["wikiId"]
    if "rakim" in e:
        props["rakim"] = e["rakim"]
    features.append(feature({"type": "Point", "coordinates": ll(*e["xy"])}, props))

geojson = {"type": "FeatureCollection", "features": features}

ts = f'''import type {{ FeatureCollection }} from 'geojson';

/**
 * Düzada harita geometrisi.
 *
 * Ada kurgusaldır ama gerçek enlem/boylam kullanır: böylece mesafeler,
 * alanlar ve MapLibre'in kamera davranışı doğru çalışır. Ada Ege'de açık
 * suya, {LAT0}°K {LNG0}°D civarına yerleştirilmiştir.
 *
 * Kanon ölçüleri:
 *   alan          {ada.area / 1e6:.1f} km²
 *   doğu-batı     {(max(xs) - min(xs)) / 1000:.1f} km
 *   kuzey-güney   {(max(ys) - min(ys)) / 1000:.1f} km
 *   kıyı          {ada.exterior.length / 1000:.1f} km
 *   zirve         {max(z[3] for z in ZIRVELER)} m ({[z[1] for z in ZIRVELER if z[3] == max(x[3] for x in ZIRVELER)][0]})
 *
 * Katmanlar `properties.katman` ile ayrılır: ada, mahalle, sinir, bina,
 * zirve, yol.
 * Binalarda `wikiId` o yapının wiki maddesine işaret eder — haritada bir
 * binaya tıklandığında bu kimlik kullanılır.
 *
 * Bu dosya üretilmiştir; elle düzenlemek yerine yeni bina/yol eklemek için
 * aşağıdaki diziye kayıt eklemek yeterlidir.
 */

export const DUZADA_MERKEZ: [number, number] = [{LNG0}, {LAT0}];
/**
 * i. dilim hangi mahalle: `SINIR_RADYALLERI[i]` ile `[i+1]` arasında kalan
 * bölgenin kimliği. Sınır düzenleyicisi mahalleleri buna göre boyuyor.
 */
export const DUZADA_DILIM_SIRASI: string[] =
  {json.dumps(DILIM_SIRASI, ensure_ascii=False)};

export const DUZADA_ALAN_KM2 = {ada.area / 1e6:.1f};

export const DUZADA_GEO: FeatureCollection = {json.dumps(geojson, ensure_ascii=False, indent=1)} as FeatureCollection;
'''

yol = '/tmp/claude-0/-home-claude/5d5af719-ee70-5fbc-97ce-1c660f0adb57/scratchpad/Kems-Company/src/data/duzadaGeo.ts'
open(yol, 'w').write(ts)
print(f"Toplam öğe     : {len(features)}")
print(f"Yazıldı        : {yol}")

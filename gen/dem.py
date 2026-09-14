"""Düzada yükselti haritası (DEM) — src/data/duzadaDem.ts üretir.

Harita 3B araziyi MapLibre'nin `terrain` özelliğiyle çiziyor. MapLibre bunun
için "raster-dem" karoları bekler: rakımın renk kanallarına gömüldüğü PNG'ler.
Dışarıdan karo servisi kullanmıyoruz, o yüzden bütün adayı tek bir PNG'ye
kodluyoruz; tarayıcı tarafında özel bir protokol bu tek görüntüden istenen
karoyu kesip veriyor.

Kodlama: Terrarium.
    rakım = (R * 256 + G + B / 256) - 32768

`duzada.py` içindeki yükselti alanını doğrudan çağırır — tek kaynak orası.
"""
import base64, io, json, math, sys, os

import numpy as np
from PIL import Image

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(BURASI)
CIKTI = os.path.join(KOK, "Kems-Company", "src", "data", "duzadaDem.ts")

# --- duzada.py'nin yükselti alanını ödünç al -------------------------------
# Bina/yol üretimini çalıştırmaya gerek yok: dosyayı yükselti alanı kurulana
# kadar çalıştırıp orada kesiyoruz.
_kaynak = open(os.path.join(BURASI, "duzada.py"), encoding="utf-8").read()
_kes = _kaynak.index("# The Imperial Kemsköy yerleşkesi")
_kes = _kaynak.rindex("# ---", 0, _kes)
# duzada.py elle düzenleme dosyasını kendi konumundan okuyor; exec ortamında
# __file__ olmadığı için NameError veriyordu.
_ortam = {"__name__": "duzada_dem",
          "__file__": os.path.join(BURASI, "duzada.py")}
_yedek = sys.stdout
sys.stdout = io.StringIO()
exec(compile(_kaynak[:_kes], "duzada.py", "exec"), _ortam)
sys.stdout = _yedek

yukselti = _ortam["yukselti"]
ada = _ortam["ada"]
LAT0, LNG0 = _ortam["LAT0"], _ortam["LNG0"]
M_PER_LAT, M_PER_LNG = _ortam["M_PER_LAT"], _ortam["M_PER_LNG"]

# --- ızgara ---------------------------------------------------------------
# Adanın sınırlarına bir miktar açık deniz payı: arazi kenarı kıyıda
# sıfıra inerken kesilmesin.
PAY = 2200.0
_x0, _y0, _x1, _y1 = ada.bounds
X0, Y0, X1, Y1 = _x0 - PAY, _y0 - PAY, _x1 + PAY, _y1 + PAY

# Hücre ~20 m. 35 m denendi ama kıyıdaki uçurumlar testere dişi gibi
# görünüyordu: yamaç kaba ızgarada basamaklanıyor ve alçak açıdan bakınca
# silueti yırtık çıkıyor.
HEDEF_HUCRE = 20.0
EN = int(round((X1 - X0) / HEDEF_HUCRE))
BOY = int(round((Y1 - Y0) / HEDEF_HUCRE))
print(f"Izgara         : {EN} x {BOY}  (hücre "
      f"{(X1 - X0) / EN:.0f} x {(Y1 - Y0) / BOY:.0f} m)")

# Görüntü satırları kuzeyden güneye (PNG'nin yukarıdan aşağıya sırası)
gx = X0 + (np.arange(EN) + 0.5) * (X1 - X0) / EN
gy = Y1 - (np.arange(BOY) + 0.5) * (Y1 - Y0) / BOY
GX, GY = np.meshgrid(gx, gy)

Z = np.asarray(yukselti(GX, GY), dtype=float)

# Kıyının dışı deniz: yükselti alanı orada da değer üretiyor, kırpıyoruz.
from shapely.geometry import Point
from shapely.prepared import prep
_hazir = prep(ada)
kiyiya = _ortam["kiyiya_uzaklik"](GX, GY)
kara_mi = np.fromiter(
    (_hazir.contains(Point(x, y)) for x, y in zip(GX.ravel(), GY.ravel())),
    dtype=bool, count=GX.size,
).reshape(GX.shape)

# Deniz düpedüz sıfır. Negatif derinlik verilince deniz katmanı da araziye
# giydiği için su bir çukurun dibinde kalıyordu; ada düz bir suyun içinden
# çıkmalı.
#
# Kıyı geçişi: sırt katkıları yüzünden arazi bazı yerlerde kıyı çizgisine
# 40-60 metre kotla varıyordu. Deniz 0'da olduğu için tam kıyıda dik bir
# duvar çıkıyor, ızgara onu basamaklıyor ve silüet testere dişi gibi
# görünüyordu. Son 140 metrede kotu sıfıra indiriyoruz — kıyı suya
# değdiği yerde deniz seviyesinde olmalı zaten.
# Geçiş mesafesi sabit değil: uçurum yaylarında (otelin durduğu Güne Burnu
# yüzü gibi) 22 m, kalan her yerde 140 m. Sabit 140 m verilince uçurum
# düzleniyor, otel de deniz seviyesine iniyordu.
_gecis_mesafe = _ortam["kiyi_gecis_mesafesi"](GX, GY)
_gecis = np.clip(kiyiya / _gecis_mesafe, 0.0, 1.0) ** 0.75
Z = np.where(kara_mi, np.maximum(Z, 0.0) * _gecis, 0.0)

# --- otelin sahanlığı -----------------------------------------------------
# Yerleşke %13 eğimli yamaçta; düzlenmemiş araziye giydirilince bina, teras
# ve bahçe eğri duruyor. Gerçek bir otel de orada kaz-doldur ile düzlenmiş
# bir sekiye oturur — o sekiyi burada açıyoruz.
_sahanlik_yolu = os.path.join(BURASI, "otel_sahanlik.json")
if not os.path.exists(_sahanlik_yolu):
    raise SystemExit("HATA: otel_sahanlik.json yok — önce duzada.py çalıştır")
with open(_sahanlik_yolu, encoding="utf-8") as _f:
    SAHANLIK = json.load(_f)

_sy = math.radians(SAHANLIK["yon"])
_ileri_x, _ileri_y = math.cos(_sy), math.sin(_sy)
_u = (GX - SAHANLIK["x"]) * _ileri_x + (GY - SAHANLIK["y"]) * _ileri_y
_v = -(GX - SAHANLIK["x"]) * _ileri_y + (GY - SAHANLIK["y"]) * _ileri_x

# Dikdörtgenin dışına olan mesafe (içeride 0)
_du = np.maximum(SAHANLIK["ileri_min"] - _u, _u - SAHANLIK["ileri_max"])
_dv = np.abs(_v) - SAHANLIK["yan_yari"]
_dis = np.hypot(np.maximum(_du, 0.0), np.maximum(_dv, 0.0))

# Sekinin içinde tam düz, eteğinde araziye yumuşak geçiş.
# Seki yalnızca KARADA geçerli ve kıyıya da taşmıyor: yoksa etek denizin
# üstünü de 59 metreye kaldırıyor ve teras havada bir çıkma gibi duruyordu.
_agirlik = np.clip(1.0 - _dis / SAHANLIK["etek"], 0.0, 1.0) ** 2
_agirlik = _agirlik * kara_mi * np.clip((kiyiya - 6.0) / 18.0, 0.0, 1.0)
Z = Z * (1.0 - _agirlik) + SAHANLIK["kot"] * _agirlik
print(f"Otel sahanlığı : {SAHANLIK['kot']:.0f} m kotunda, "
      f"{SAHANLIK['ileri_max'] - SAHANLIK['ileri_min']:.0f}x"
      f"{2 * SAHANLIK['yan_yari']:.0f} m + {SAHANLIK['etek']:.0f} m etek")

print(f"Rakım aralığı  : {Z.min():.0f} … {Z.max():.0f} m")

# --- Terrarium kodlaması --------------------------------------------------
# Mavi kanal (metrenin kesri) kullanılmıyor: 1 m çözünürlük bu ölçekte
# fazlasıyla yeterli ve kesirli değerler PNG'yi sıkıştırılamaz gürültüyle
# dolduruyordu — dosya üçte birine iniyor.
tam = np.clip(np.rint(Z) + 32768, 0, 65535).astype(np.int32)
R = (tam >> 8) & 0xFF
G = tam & 0xFF
B = np.zeros_like(R)

rgb = np.dstack([R.astype(np.uint8), G.astype(np.uint8),
                 B.astype(np.uint8)]).astype(np.uint8)
gorsel = Image.fromarray(rgb, mode="RGB")

tampon = io.BytesIO()
gorsel.save(tampon, format="PNG", optimize=True, compress_level=9)
ham = tampon.getvalue()
print(f"PNG            : {len(ham) / 1024:.0f} KB "
      f"({len(base64.b64encode(ham)) / 1024:.0f} KB base64)")

# Denetim: birkaç noktada kod çözülüp özgün değerle karşılaştırılıyor.
_coz = (rgb[:, :, 0].astype(float) * 256 + rgb[:, :, 1]
        + rgb[:, :, 2] / 256.0) - 32768.0
_hata = np.abs(_coz - Z).max()
print(f"Kodlama hatası : {_hata:.3f} m (1 m çözünürlük)")
assert _hata < 0.6, "Terrarium kodlaması bozuk"

# --- sınır kutusu ---------------------------------------------------------
bati = LNG0 + X0 / M_PER_LNG
dogu = LNG0 + X1 / M_PER_LNG
guney = LAT0 + Y0 / M_PER_LAT
kuzey = LAT0 + Y1 / M_PER_LAT

b64 = base64.b64encode(ham).decode("ascii")
# JS dizgesi satır aşamaz: parçalara bölüp birleştiriyoruz.
satirlar = "\n".join(f"  '{b64[i:i + 110]}' +" for i in range(0, len(b64), 110))
satirlar = satirlar.rstrip(" +")

with open(CIKTI, "w", encoding="utf-8") as f:
    f.write(f'''/**
 * Düzada yükselti haritası (DEM).
 *
 * `gen/dem.py` tarafından üretilir — elle düzenleme.
 *
 * Adanın tamamı tek bir PNG'ye Terrarium biçiminde kodlandı:
 *     rakım = (R * 256 + G + B / 256) - 32768
 *
 * MapLibre 3B arazi için karo bekler; `duzadaArazi.ts` içindeki özel
 * protokol istenen karoyu bu tek görüntüden kesiyor. Böylece dışarıdan
 * hiçbir karo servisi, anahtar ya da hesap gerekmiyor.
 *
 * Izgara   {EN} x {BOY}  (~{(X1 - X0) / EN:.0f} m hücre)
 * Rakım    {Z.min():.0f} … {Z.max():.0f} m (negatif değerler deniz tabanı)
 */

/** [batı, güney, doğu, kuzey] */
export const DEM_SINIR: [number, number, number, number] = [
  {bati:.6f}, {guney:.6f}, {dogu:.6f}, {kuzey:.6f}
];

export const DEM_EN = {EN};
export const DEM_BOY = {BOY};

/** Deniz seviyesinin Terrarium karşılığı — ada dışındaki karolar için */
export const DEM_DENIZ_RENGI = '#800000';

export const DEM_PNG =
  'data:image/png;base64,' +
{satirlar};
''')

print(f"Yazıldı        : {CIKTI}")

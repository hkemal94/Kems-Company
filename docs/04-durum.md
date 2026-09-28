# Durum

**Son güncelleme: 28 Eylül 2026 (W1: viki baştan kuruluyor)**

Bu belge sık değişir. Brief "bu proje nedir"i anlatır ve aylarca durur;
burası "şu an neredeyiz"i söyler. Kısa tutulur.

## 28 Eylül kararları

On dört açık madde kapandı:

| Konu | Karar |
|---|---|
| Font | Poppins — belgelerde ve arayüzde |
| Menşe satırı | Düzada, TR |
| Ürün hayat çizgisi | Konsept → Tasarım → Üretim → Satışta |
| Marka yapısı | Kems Company tek marka; Dirlik ve Küçükçetmi kurgu içi kurum. Kurum altında drop serisi açılır, satan yine Kems Company |
| Küçükçetmi künyesi | Renkler Canva armasından çekilecek, slogan boş kalacak |
| Tasarım dosyaları | Canva asıl, Galeri kopya |
| Kaynakça | Şimdilik yapılmayacak |
| Oyun biçimi | Oynanabilir dijital oyun |
| Oyunda ilk adım | Tasarım belgesinin doldurulması |
| The Imperial | Senaryo baştan yazılacak; eski boş kayıt arşivde kalır |
| Otel simülasyonu | Prototip olarak saklanır, ekranda görünmez |
| Brainstorm | Ekran kalkar, her sayfada hızlı nota dönüşür |
| Sosyal medya | Takipçi/erişim şeridi kalkar; yerine sosyal medya stüdyosu |
| Stüdyo içeriği | Öneri taslakları getirilir, Kemal seçip düzeltir, Buffer ile paylaşır |

## Yapılacaklar

Kararların koda dönmesi gereken kısmı. Yedi madde bitti, sekizincisi site konuşmasına taşındı.

Bitenler (28 Eylül):

1. ~~**Simülasyon gizlendi**~~ — Oyun sekmesi doğrudan stüdyoyu açıyor.
   Prototip silinmedi: sayfanın en altındaki soluk satırdan ya da adres
   satırına `#simulasyon` yazarak açılıyor.
2. ~~**Canva etiketi**~~ — üç sayfada menşe satırı "Düzada, TR". Kaydedildi.
   4. sayfadaki "Kemskøy" yazımı da böylece gitti.
3. ~~**Küçükçetmi paleti**~~ — arma ölçüldü: krem `#F3EFE8` + mürekkep
   `#131313`, üçüncü renk yok. Değerler künye dosyasında zaten doğruydu.
   Kemal 28 Eylül'de "Canva künyelerini uygula"ya bastı — veri güncel.
4. ~~**Ürün durumları**~~ — Konsept → Tasarım → Üretim → Satışta. Veride
   göç gerekmedi; eski değerler kodda hâlâ tanınıyor.
5. ~~**Font geçişi**~~ — bütün roller Poppins. Ayrım artık kalınlık, boyut
   ve harf aralığıyla. Sayı hizalaması için tabular rakamlar açıldı.
6. ~~**Brainstorm → hızlı not**~~ — ekran kalktı, her sayfanın sağ alt
   köşesinde fikir kutusu var. Fikirler korundu, dönüştürme ve arşivleme
   oraya taşındı.

Bitenler (28 Eylül, gece):

7. ~~**Marka yapısı**~~ — dört adım bitti (28 Eylül gece). Markalar
   ekranı: üstte Kems Company, altta Kurumlar · kurgu içi. Kurum sayfasından
   "Seri Aç" → drop `brandId` = Kems Company, `kurumId` = kurum. Merch'te
   süzgeç kuruma göre. Neyin Eksik'te tek seferlik "Kuruma çevir" kartı
   (Küçükçetmi `kulüp` tipine geçer, iki kulüp dropu kurumuna bağlanır).
   Paket: `kems-28eylul-marka.zip`. Yüklendi; karta basıldı (Neyin
   Eksik'te kart artık görünmüyor).

Sıradan çıkanlar:

8. **Sosyal medya stüdyosu** — Kemal yeniden düşünecek. Site / ön yüz
   ile birlikte **KKM'nin içinde** yapılacak (ayrı depo değil); ikisi de
   Kemal'in istekleri gelince başlar.

## Viki baştan kuruluyor (28 Eylül, W1)

Kemal'in kararları (tıklamalı soru-cevapla):
- Mevcut viki kayıtları **arşive** kalkar (silinmez). Kişiler, 20 otel
  odası, mekânlar ve konmuş adlı kayıtlar dahil.
- Ada ölçüleri, beş mahalle ve konmuş adlar **kanonda** (docs/03) kalır.
- Kems Company ve iki kurum kaydı yerinde kalır (droplar bağlı).
- Sıra: Viki → Harita; site paralel ama yalnızca konuşarak, kod yok.
- Viki soru-cevapla yeniden kurulacak: panelde küçük bir ekran, soru
  çıkar, Kemal cevaplar, cevap kayda girer. Planı W1'den sonra.

Neyin Eksik'te "viki baştan kuruluyor" kartı → **Arşive kaldır**. Arşive
kalkan her kayıtta `viki-sifirlama-2026-09` etiketi var (toplu geri
getirmek gerekirse). Basılması Kemal'de.

Harita şikâyeti (W1'den sonra): yollar dümdüz, arazi yapay, binalar kutu,
genel his harita gibi değil. Ekran görüntüsü bekleniyor.

## Canva düzeni (28 Eylül)

Kemal 50 tasarımın 251 sayfasını ayıklama sayfasında işaretledi
(https://claude.ai/artifact/Pob5WWQLLZqVDwAvy8FHAx — seçimler orada kayıtlı).
Sonra tasarımlar Canva'da şu klasörlere taşındı; hiçbir şey silinmedi:

```
İlham (FAHWf9rScOM)      14 tasarım — Düzada Harita, İskele Mahallesi örnek,
│                          The Imperial, davetiyeler, fotoğraflar…
├── Marka (FAHWgMHm7u4)   5  — KEMS, kems, Kems Company, Company, Sandbox (Brand Kit)
├── Merch (FAHWgGalwn0)  18  — Basics 1, Basics I, No Name Drop.1, iskambil destesi,
│                              11 Shopier seti, İyot / Deniz Kulübü Prints, poster
├── Instagram (FAHWgD-8jho) 7 — Instagram gönderileri, Başlık, 3 adsız (emin olunamayanlar)
└── Harita (FAHWf784A3E)  2  — doğum günü gönderisi, Instagram Denemeleri
```

- Kural: **Marka öncelikli.** Hem Harita hem Marka/Merch olan tasarım Marka/Merch'e gitti.
- **Eski** işaretli 4 tasarım (Çarşı, Kuleli Shopier, Kare Logo, 24 sayfalık
  adsız afiş seti) taşınmadı, eski yerlerinde.
- Eski klasörler ("İyot - Done", "Deniz Kulübü - Done", "Kems Company",
  "Denemeler", "Ürünler", "Instagram"…) boşalmış olabilir; Kemal karar verecek.

## Viki soru-cevap (W2)

Sohbette tıklamalı sorularla yürüyor; cevaplar `docs/soru-cevap/` altında
birikiyor, sonra tek seferlik düğmeyle vikiye aktarılacak. İlk mahalle
İskele / Kemsköy: başlık, konum, sınırlar, arazi cevaplandı; Tarihçe
Kemal'in cümlelerini bekliyor.

**Aktarım düğmesi (28 Eylül):** Neyin Eksik'te "soru-cevaplar vikiye
aktarılmayı bekliyor" kartı (`src/lib/soruCevapAktarimi.ts`). Kemal'in
kararları:
- Liman, Stadyum, Çiftlik başlıkları kanondaki adlarla (… Mahallesi).
- Arşivdeki mekânlar arşivde kalır; yerlerine yeni boş kayıt açılır
  (Sade Meze, Dondurmacı Kızlar, Deniz Feneri, Liman İdare Binası, Dirlik
  Stadı, Belediye Binası). Haritadaki yapılar yeni kayıtlara (`viki_…`)
  bağlandı.
- Otel istisna: uygulama `kemskoy_hotel` dışındaki "The Imperial
  Kemsköy" kayıtlarını kopya sayıp siliyor (App.tsx). Otel aynı kayıtla
  arşivden çıkar; eski gövde, bölüm ve künye yazıları görünmez
  `eskiMetin` alanına taşınır. Künyede yalnız "Faaliyette: 1954–" ve
  "Oda sayısı: 20".
- Cevaplar künyede ve kısa satırlarda; cümle kurulmadı. Tarihçe vb. boş.
- Ada maddesinde cevaplarla çelişen yazılar (Ekim 2003, Sezon Sonu,
  haftada iki gemi, güneydeki Eski Liman) `eskiMetin`e taşınır.
- Dirlik'e "Branşlar: Futbol, Su sporları", Küçükçetmi'ye "Sürek: Av".

Yan düzeltmeler: haritadan açılan maddelerde "Bugün" bölümü kalktı
(vikinin şimdisi yok). W1 kartı 28 Eylül'den sonra açılan ya da arşivden
geri getirilen kayıtları yeniden arşive kaldırmayı önermez.

Açık: Deniz Feneri "faal" ama başlangıç yılı yok — yıl gelince
"Faaliyette: YYYY–" yazılır.

W2 düğmesine basıldı (28 Eylül); Kemal kontrol etti, "okey".

**K — kendiliğinden silen eski kodlar (28 Eylül, düzeltildi):** App.tsx
açılışta otel kopyalarını, "yeni varlık" adlı kayıtları ve oyun mekaniği
olaylarını siliyordu; artık arşive kaldırıyor (`otomatik-arsiv` etiketi).
Oda kopyası birleştirme kodu tamamen kalktı: kopyaları siliyor, odalara
"Deluxe" ve 203/304'e "bakımda" yazıyordu.
Kemal'in kararıyla ikisi daha: arayüzdeki bütün "Sil" düğmeleri artık
arşive kaldırıyor (bağlar korunur, drop kalkınca ürünleri de kalkar);
76 karakteri öneri olarak içe aktaran eski kod kapatıldı.

## Harita · H1 sokak dokusu (28 Eylül)

Kemal: mahalle sokakları "inanılmaz yapay". Sebep: üreteç (`gen/duzada.py`)
beş mahalleye aynı ızgara kalıbını basıyordu. Artık doku araziden doğuyor:
kıyıda rıhtıma paralel cadde ve arka sokaklar, yamaçta eşyükselti sokakları,
aralarda tırmanan geçitler / merdivenler. Kemal: "yön doğru, muhteşem değil
ama şu an için iyi". Uygulama içinde 3B görünüm henüz denenmedi.

İkinci geçiş — "Küçükkuyu tarzı" (gerçek veri olmadan, Kemal onayıyla):
İskele ve Liman kıyı kasabası olarak kaldı. Merkez, Stadyum ve Çiftlik
köy dokusuna geçti: ortada bir meydan, oradan dağılan kıvrımlı ara yollar,
dallanan sokaklar, yarım kalan halka yollar ve çıkmazlar; dik yerler
merdiven. Görsel: `docs/gorseller/h1-koyler.png`. Gerçek Küçükkuyu yol
verisi (OpenStreetMap) ağ izni açılırsa ya da Kemal dosya yüklerse
karşılaştırılabilir.

Üçüncü geçiş — kıyı kasabaları (Kemal Küçükkuyu'nun Google Haritalar
görüntüsünü gösterdi: "Bunu dene"): İskele ve Liman'da ana yol kasabanın
omurgası (İskele'de Kemsköy Caddesi, Liman'da Sahil Yolu). İki yanında
küçük, hafif çarpık adalar; ortada sık, kenarlara ve yokuş yukarı seyrek;
dışta tarlaya uzanan çıkmaz patikalar; yamaca tırmanan iki kıvrımlı sokak.
Sokaklar yapıların içinden geçmez. Merkez, Stadyum, Çiftlik köy olarak
kaldı (Küçükkuyu ve köyleri gibi). Görsel: `docs/gorseller/h1-kasaba.png`.
Kemal: "biraz daha sık olsun, liman binalarını kıyıya taşı." Kasaba
dokusu sıklaştı. Liman Deposu, Liman İdare Binası ve Dondurmacı Kızlar
denizden ~700 m içeriden rıhtıma, suyun kıyısına indi; arkalarından geçen
bir kordon eklendi (adı geçici: "Liman Kordonu").

Harita paketinde sırada: postane + sağlık ocağı (Merkez), mahalle
sınırlarının doğallaşması, arazi / bina görünümü.

**Liman ve cadde (28 Eylül, W3 1. tur):** Kemsköy Caddesi'ndeki 14 yapı
1–2 kata indi. Liman rıhtımına mendirek ve feribot iskelesi eklendi.
Görsel: `docs/gorseller/h2-liman.png`.

**W3 sonrası harita (28 Eylül):** Merkez'deki iki apartman dükkânlı /
müstakil eve döndü (Merkez'de apartman yok). Çiftlik'e adsız kooperatif
zeytinyağı fabrikası, fenerin yanına Fener Evi eklendi. Sade Meze eski
fabrika binası olarak büyüdü (2 kat). Köy sokakları da artık yapıların
içinden geçmiyor (Belediye, Dirlik Stadı, Sürek Kulübü çakışmaları gitti).

**W3 aktarım düğmesi:** Neyin Eksik'te "yeni soru-cevaplar (W3) vikiye
aktarılmayı bekliyor" kartı (`src/lib/w3Aktarimi.ts`): künyelere tarih
aralıkları, fenere "Faaliyette: 19. yüzyıl–", Merkez'e çarşı satırı, ada
maddesinde feribot Küçükkuyu ve eski paragraf eski metne.

**W4 aktarım düğmesi (29 Eylül):** W3 bitince Neyin Eksik'te "ada hayatı
bilgileri (W4) vikiye aktarılmayı bekliyor" kartı çıkar
(`src/lib/w4Aktarimi.ts`). Kanondaki "Ada hayatı" 1–4 bölümlerinden: 11
maddenin künyesine satırlar; ada maddesine "Ada hayatı", Liman / Merkez /
Çiftlik maddelerine "Gündelik hayat" bölümü; iki kulübün künyesi. Yalnız
ekleme, ikinci basış bir şey yapmaz. Kemal basacak.

**Konut kararı (Kemal, 28 Eylül):** Mahallelerdeki binalar çoğunlukla
müstakil ev olacak. Apartman / çok katlı blok az; yoksa nüfus istenmeyen
seviyeye çıkar. Sokak dokusu sıklaşsa da adalar bahçeli müstakil evlerle
dolacak, blokla değil. Henüz ev yerleştirilmedi; bina işi başlarken
buna uyulacak.

## Sıradaki büyük işler (28 Eylül, Kemal'in istekleri)

**Şehir kurucu (H):** Harita düzenleyiciyi şehir kurucu tarzına taşımak.
Kemal: "yollar git gide gözüme kötü görünüyor." Sıra: (1) yol aracı —
tıklayıp çiz, kavşağa yapışsın, yokuşta kıvrılsın; (2) bina aracı — hazır
kalıplar (müstakil ev, dükkânlı ev, kamu binası), yola dönük yerleşim, adayı
doldurma; (3) örnek mahalle kalıpları (kıyı kasabası / Küçükkuyu, dağ köyü /
Adatepe, tek caddeli liman). İlk adım yol aracı; Kemal yatınca başlanacak.

**Kanon KKM'nin başka alanlarında:** Merch'te drop açılınca bağlı kurumun
kanon bilgisi; Kitap'ta geçen yer/kişi adlarının vikiye bağlanması ve
tarihle çelişki uyarısı (ör. 1970'lerde feribot Liman'da olamaz); Blog'da
kanondan hızlı bilgi; tutarlılık denetçisinin (ConsistencyChecker) kanonla
beslenmesi. Plan Kemal'e sunuldu, sıraya girecek.

**Canva künye eskizi:** A4 dikey, tek tasarımda mahalle / kurum / kişi /
mekân künyeleri; alanlar boş (Kemal dolduracak).
İki tasarım var: boş kalıp ("Düzada Künye Kalıpları 1") ve kanondaki
bilgilerle doldurulmuş örnek ("Düzada Künye Örnekleri"). İkisinde de
yazılar Kolej Laciverti `#0E1C4F`, örnek notu kiremit `#F26B6F`. Yazı
tipi uzaktan değiştirilemiyor; Poppins'e geçiş Canva'da elle:
Düzenle → Stiller → Kems Company → Tüm sayfalara uygula.

## Otel maddesi temizliği (28 Eylül)

Oyun için açılan kod oturumu bu depoya da girdi ve "Ekim 2008'e taşı"
düğmesi ekledi (bütün evrende Ekim 2003 → 2008, otel maddesine beş "Oyun:"
bölümü). Kemal'in kararına aykırı: oyunun dönemi 2007 sonu / ölü sezon,
oyun verisi vikiye girmez. Değişiklik geri alındı. Düğmeye basıldıysa
Neyin Eksik'te "Temizle" kartı çıkar; oyun bölümleri silinmez, otel
kaydının `oyunArsivi` alanına taşınır. Vikideki "Aktif dönem" kutusu da
kaldırıldı (değer kayıtta duruyor, gösterilmiyor).

Hâlâ vikide duran, eski simülasyondan kalma ama Claude'un yazıya
dokunmadığı yerler (Kemal bakacak):
- Düzada maddesinin notunda "Ekim 2003 (Sezon Sonu) dönemi…" paragrafı.
- Otel maddesi "Mimari ve Tarihçe": Liman 54 ve Peron adları.
- Otel maddesi "Oda Yapısı": x03 suite, geri kalanı standart diyor;
  oyun belgesi her katta 1 suite + 1 twin diyor.
- 20 oda kaydında "Deluxe" tipi ve 203/304 "bakımda" durumu.

Kural: oyun kodu Komuta Merkezi deposuna yazmaz. Oyun deposundaki
CLAUDE.md bunu söylüyor; Komuta Merkezi tarafına da aynı not düşülmeli.

## Bekleyen kontrol

Yok. 28 Eylül ekran görüntüsünde Neyin Eksik'te hiçbir tek seferlik kart
görünmüyor: tema göçü, boş proje arşivleme, "Kuruma çevir" ve otel
temizliği yapılmış. `Brainstorm.tsx`, `donem2008.ts` ve `OKUBENI.txt`
depodan silindi.

## Çalışan

- **Komuta Merkezi** — dokuz ekran.
- **3B harita** — gerçek koordinat, arazi yüksekliği, tıklanabilir yapılar,
  uygulama içinden açılan düzenleyici. Düzenlemeler kalıcı.
- **Viki** — künye şeması, ilişki ağı, tutarlılık denetimi.
- **Yedekleme** — elle, tek düğme, tek dosya.

## Yok

- **Ön yüz.** Site, pazaryeri, hayran vitrini — hiçbiri başlamadı.
- **Logo dosyaları.** Canva'da duruyor, Galeri'ye yüklenmedi.
- **Görsel.** Evrende 11 görsel var, çoğu geçici.
- **Oyun içeriği.** 13 başlıklı tasarım belgesi açık, içleri boş.

## Hâlâ açık

| Konu | Soru |
|---|---|
| Mikro alan düzenleme | Oyun belgesi "oyunda yok" diyor, ama Kemal oyun tarafına tam anlatamadığını söylüyor — açık |

## Sıradaki

- Oyunun tasarım belgesinin doldurulması (13 başlık)
- Basics 1 sonrası ikinci drop
- Ön yüzün başlaması — dışarıdan destek aranıyor

## Uyarı — projedeki brief eski

Projeye bağlı Drive belgesi hâlâ ilk briefi taşıyor (kiremit `#d35057`,
tema katmanı yerinde). Claude içeriğini değiştiremiyor; 28 Eylül'de adını
"Kems Company — ESKİ brief v1 (geçersiz…)" yaptı. Güncel bilgi proje
belgeleri 01–05'te. Senkron kaynağı proje ayarlarından Kemal kaldıracak.
Brief v2 (17 Eylül) de 28 Eylül kararlarını içermiyor.

## Kaynaklar

| Ne | Nerede |
|---|---|
| Kod, harita üreticisi | GitHub deposu |
| Evrenin ana veri dosyası | Drive — Düzada Viki Veri |
| Güncel brief | Drive — Kems-Company-Brief-v2 |
| Logo indirme notu | Drive — "Kems — Logo dosyaları" |
| Marka kitleri, logolar, lookbook | Canva |

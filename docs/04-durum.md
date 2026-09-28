# Durum

**Son güncelleme: 28 Eylül 2026 (belgeler depoya girdi, bekleyen kontroller kapandı)**

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

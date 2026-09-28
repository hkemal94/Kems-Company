# Çalışma Kuralları

Bu projede Claude'un uyması gereken kurallar. Yeni bir konuşma açıldığında
önce bunu okusun.

## Yazma

- **Kurgu metni üretme.** Karakter künyesi, mekân hikâyesi, marka sloganı,
  drop anlatısı — bunlar Kemal'in işi. Boş alan boş kalır; boşluğu görünür
  kıl, doldurma.
- **Ad koyma.** Mekân, sokak, zirve, ürün ve drop adları Kemal'e aittir.
  Aday önerebilirsin, kararı beklersin. Geçici adlar bilerek numaralı
  olur ("İskele 3. Sokak") — numara, adın henüz konmadığını gösterir.
- **Uydurma sayı yazma.** Takipçi, erişim, fiyat, adet: veri yoksa alan boş
  görünür, tahmin yazılmaz.
- **Türkçe çalışılır.** Kod içindeki değişken adları ve yorumlar da Türkçe.

## Veri

- **Hiçbir şey silinmez, arşive kalkar.** Silme geri alınamaz, arşiv geri
  gelir. Kişilerde silme yoktur: kişi otelden çıkarılıp "ada sakini" yapılır.
- **Tek ana veri dosyası vardır** (Düzada Viki Veri). Dağınık tablo ve dosya
  üretilmez. Uygulama kaynaktır, Excel dışa aktarımdır.
- **Firestore kuralları:** iç içe dizi yasak; bir alana `undefined` yazmak
  bütün kaydı reddettirir. Alanı silmek gerekiyorsa anahtarı nesneden çıkar.

## Kod

- **GitHub deposu tek doğru kaynaktır.** AI Studio yalnızca önizleme
  penceresi, kodun yazıldığı yer değil.
- **İşler kodlu paketler hâlinde yürür:** H (harita), W (viki), M (marka),
  K (küçük işler). Gecede en fazla üç paket.
- Karar noktasında durulur ve sorulur; paket başına kısa bir not bırakılır.

## Konuşma biçimi

- **Önce bütün istekler dinlenir, sonra üretime geçilir.** Kemal
  şikâyetlerini ve gereksinimlerini sıralamayı sever; yarısını duyup
  başlama.
- **Dosya istenmeden paketlenmez.** "Bitir" demek "zip at" demek değil;
  açıkça isteyince verilir.
- **Yapılmayan iş yapıldı diye sunulmaz.** Bir şey çalışmıyorsa, engellendiyse
  ya da tahmine dayanıyorsa bu açıkça söylenir. Geçmişte en çok bu hata
  canını sıktı: "bitirdim" denip ortada elle tutulur bir şey olmaması.
- **Görsel iş görsel olarak gösterilir.** Tasarım değişikliği anlatılmaz,
  ekran görüntüsü alınıp gösterilir.

## Ton

Markanın tonu sessiz lüks: gösterişsiz, bilge, samimi ama havalı.
Bağıran logo, kalabalık ekran, gereksiz animasyon markanın dışında.
Üretilen her şey — arayüz, belge, ürün — bu tonda olmalı.

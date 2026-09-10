# Düzada Viki — kurulum

## Yükleme (token yok, komut satırı yok)

1. GitHub'da `hkemal94/Kems-Company` reposunu aç
2. **Add file → Upload files**
3. Zip'i bilgisayarında aç, içindeki **`src`** ve **`wiki-demo`** klasörlerini ve **`wiki-demo.html`** dosyasını pencereye sürükle
4. Alttaki kutuya bir mesaj yaz, **Commit changes**
5. AI Studio'da uygulamayı aç → **Settings → GitHub → pull**

Mevcut `DuzadaWiki.tsx` dosyasına dokunulmadı. Yeni wiki onun yanında ayrı bir katman olarak duruyor; beğenmezsen eskisi yerinde.

## Bağlama

Wiki sekmesinde eski bileşenin yerine:

```tsx
import { WikiShell } from './components/wiki/WikiShell';

<WikiShell
  items={items}
  onEdit={(id) => { /* mevcut düzenleme akışın */ }}
/>
```

Ziyaretçiye açık bir sayfada `readOnly` ver — yönetim yüzü hiç görünmez:

```tsx
<WikiShell items={items} readOnly />
```

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `wiki/WikiShell.tsx` | Ada sayfası, arama, dizinler, okuma/yönetim geçişi |
| `wiki/WikiArticle.tsx` | Madde sayfası: künye, gövde, geri bağlantılar |
| `wiki/WikiPeople.tsx` | Mekâna bağlı kişiler — gruplu, katlanabilir |
| `wiki/WikiRooms.tsx` | Odalar — kalıcı özellikleriyle, katlanabilir |
| `wiki/autoLink.tsx` | Metinde geçen madde adlarını bağlantıya çevirir |
| `wiki/kunyeParser.ts` | `notes` içindeki künye bloğunu alanlara ayırır |
| `wiki/wikiSchema.ts` | Künye alanları, taslak ölçüsü, mahalle adları |
| `data/kemskoyVenues.ts` | Otel birimleri + karakter–birim eşleşmesi |
| `index.css` | Marka paleti `@theme` tokenleri |

## Kararların koda yansıyan hâli

- **Geniş zaman.** Odalarda doluluk, misafir, temiz/kirli yok. Tarihli olgular aralık: `metadata.faaliyet = '1954–'` yazarsan künyede "Faaliyette: 1954–" olarak çıkar.
- **Oyun verisi wiki'de değil.** Senaryo tipleri zaten dışarıda; kanonik listede olmayan 18 resepsiyon vakası `OYUN_VAKA_IDLERI` ile eleniyor.
- **Sırlar yönetim yüzünde.** `secrets` ve `clues` alanları ziyaretçiye kapalı.
- **Mahalle, bölge değil.** Ham `eski_liman` anahtarı künyede "İskele Mahallesi" olarak görünür.
- **Jenerik birim adları.** Altı birim `adiGecici: true` taşıyor ve sayfada "adı henüz konmadı" rozetiyle duruyor. Asıl adı koyduğunda bu alanı sil.
- **Bağlantı disiplini.** Bir maddeye sayfada bir kez bağlanılır. "liman", "ada", "otel" gibi genel kelimeler kendiliğinden bağlanmaz; `[[Liman Mahallesi]]` yazarsan bağlanır.

## Sırada bekleyen veri işleri

Bunlar kodla değil, metinle çözülür:

1. **Otelin tipi `yer` görünüyor**, `mekân` olmalı. Sayfada "MAHALLE" rozeti bu yüzden çıkıyor.
2. **Oyun dilindeki metinler.** Otel maddesinde hâlâ *"Ekim 2003 (Sezon Sonu) döneminde geçen olayların merkezidir"* ve *"203 numaralı oda klima arızası sebebiyle bakım altındadır"* duruyor. Geniş zamana çevrilmeli.
3. **"Peron restoran"** kanonik listede yok — kalacak mı, silinecek mi?
4. **Fener Bölgesi** kaydı silinip fener Liman Mahallesi'ne bağlanmalı.
5. **Kuvayi Milliye Caddesi** ve **Çarşı Sokak** silinecek.
6. **Kaynak alanı.** Her kayda `metadata.kaynak` (`kanon` / `öneri` / `model`) eklenip briefte karşılığı olmayanlar tek listede toplanacak. `kemskoyVenues.ts` bu alanı zaten taşıyor.
7. **Künye taşıması.** `kunyeParser.buildKunyeMigration` bir kez çalıştırılırsa künye `notes`'tan `metadata.profile`'a geçer ve düzenleme formların da alanları görür. Wiki bu taşıma olmadan da doğru çalışıyor.

## Önizleme

`npx vite` çalıştırıp `http://localhost:5173/wiki-demo.html` adresini aç. Gerçek veriyle çalışır, uygulamaya dokunmaz.

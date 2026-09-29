import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initialize Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment degiskeni bulunamadi. Lutfen Secrets panelinden ayarlayin.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Model seçimi (29 Eylül). Sunucu ilk günden beri tek bir sabit modele
 * ("gemini-3.5-flash") bağlıydı; o ad Google'da yoksa her istek 500'e
 * düşüyordu. Artık sırayla denenir: GEMINI_MODEL (Secrets'ta verilirse),
 * sonra yedekler. Çalışan model hatırlanır.
 */
const MODEL_ADAYLARI = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
let calisanModel: string | null = null;

/** Google'ın hatasını Kemal'in okuyacağı Türkçe bir cümleye çevirir */
function hatayiAcikla(error: any): { durum: number; mesaj: string; modelYok: boolean; mesgul?: boolean } {
  const ham = String(error?.message || error || "");
  const kod = Number(error?.status || error?.code || 0);
  if (/GEMINI_API_KEY/.test(ham)) {
    return { durum: 500, modelYok: false, mesaj: "Yapay zekâ anahtarı (GEMINI_API_KEY) tanımlı değil. AI Studio'da Secrets panelinden eklenmeli." };
  }
  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(ham) || kod === 401 || kod === 403) {
    return { durum: 502, modelYok: false, mesaj: "Yapay zekâ anahtarı geçersiz ya da yetkisiz. Secrets'taki GEMINI_API_KEY yenilenmeli." };
  }
  if (/RESOURCE_EXHAUSTED|quota|rate limit/i.test(ham) || kod === 429) {
    return { durum: 429, modelYok: false, mesaj: "Yapay zekâ kotası doldu. Bir süre sonra yeniden dene." };
  }
  if (/NOT_FOUND|is not found|not supported for generateContent|unknown model/i.test(ham) || kod === 404) {
    return { durum: 502, modelYok: true, mesaj: "Yapay zekâ modeli bulunamadı." };
  }
  if (/UNAVAILABLE|overloaded|high demand|503/i.test(ham) || kod === 503) {
    return { durum: 503, modelYok: false, mesgul: true, mesaj: "Yapay zekâ modelleri şu an çok yoğun (Google tarafında). Birkaç dakika sonra yeniden dene." };
  }
  return { durum: 500, modelYok: false, mesaj: `Yapay zekâ hatası: ${ham.slice(0, 300) || "bilinmeyen"}` };
}

/** İsteği sırayla modellere dener; model yoksa bir sonrakine geçer */
async function uret(ai: GoogleGenAI, istek: { contents: string; config: any }) {
  const sira = calisanModel ? [calisanModel, ...MODEL_ADAYLARI.filter(m => m !== calisanModel)] : MODEL_ADAYLARI;
  let sonHata: any = null;
  for (const model of sira) {
    try {
      const yanit = await ai.models.generateContent({ model, ...istek });
      calisanModel = model;
      return yanit;
    } catch (e: any) {
      sonHata = e;
      const h = hatayiAcikla(e);
      // Kemal'in gördüğü: 503 "This model is currently experiencing high
      // demand". Model meşgulse kısa bir bekleyişle bir kez daha, olmazsa
      // sıradaki model.
      if (h.mesgul) {
        await new Promise(r => setTimeout(r, 1200));
        try {
          const yanit = await ai.models.generateContent({ model, ...istek });
          calisanModel = model;
          return yanit;
        } catch (e2: any) {
          sonHata = e2;
          if (!hatayiAcikla(e2).mesgul) throw e2;
        }
        console.warn(`Model meşgul: ${model}, sıradakine geçiliyor.`);
        continue;
      }
      if (!h.modelYok) throw e;
      console.warn(`Model bulunamadı: ${model}, sıradakine geçiliyor.`);
    }
  }
  throw sonHata;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Pinterest Public RSS Feed parser proxy
app.get("/api/pinterest", async (req, res) => {
  const username = req.query.username as string;
  if (!username) {
    return res.status(400).json({ error: "username parametresi gereklidir." });
  }

  try {
    const url = `https://www.pinterest.com/${encodeURIComponent(username.trim())}/feed.rss`;
    console.log("Fetching Pinterest RSS:", url);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Pinterest feedine ulasilamadi. (Durum: ${response.status})`);
    }

    const xmlText = await response.text();
    
    // Parse using simple robust regex matches
    const items: Array<{ title: string; link: string; image: string }> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
      
      let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "Pinterest Görseli";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const desc = descMatch ? descMatch[1] : "";
      
      // Extract image src from description
      const imgSrcMatch = desc.match(/src="([^"]+)"/) || desc.match(/src='([^']+)'/);
      let image = imgSrcMatch ? imgSrcMatch[1] : "";
      
      // Convert Pinterest thumbnail or medium image to high-res if possible
      if (image && (image.includes("/236x/") || image.includes("/564x/"))) {
        image = image.replace("/236x/", "/originals/").replace("/564x/", "/originals/");
      }

      if (image) {
        items.push({ title, link, image });
      }
    }

    res.json({ success: true, items });
  } catch (error: any) {
    console.error("Pinterest Fetch Hatası:", error);
    res.status(500).json({ error: error.message || "Pinterest ilhamları çekilirken bir hata oluştu." });
  }
});

// Gemini AI Proxy Endpoint
app.post("/api/ai", async (req, res) => {
  const { task, data } = req.body;
  if (!task) {
    return res.status(400).json({ error: "task parametresi gereklidir." });
  }

  try {
    const ai = getAI();
    let prompt = "";
    let systemInstruction = "Sen 'Kems Komuta Merkezi' için özel entegre edilmiş bir yaratıcı AI asistanısın. Kems Company bünyesindeki yaratıcı evren (Düzada, Ege estetiği, arşivsel sıcaklık) için lore, marka ve tasarım önerileri üretiyorsun. Tüm yanıtları mutlaka akıcı, bilgece ve zengin bir Türkçe ile ver. Teknik terimler yerine daha insani, sıcak ve edebi bir dil kullan.";

    switch (task) {
      case "devam-et":
        prompt = `Aşağıdaki metni (veya konuyu) devam ettir. Edebi, sıcak, arşivsel tonda bir paragraf ekle. Sadece devam eden ek metni döndür (mevcut kısmı tekrar etme).
Mevcut Metin/Konu:
"${data.text || ""}"
Önceki Bağlam/Notlar:
"${data.notes || ""}"`;
        break;

      case "baslik-oner":
        prompt = `Aşağıdaki metin veya konu için 5 adet yaratıcı, çarpıcı ve arşiv/retro estetiğine uygun Türkçe başlık önerisi sun. Yanıtını sade bir JSON dizi formatında ver, başka hiçbir açıklama ekleme. Örnek: ["Başlık 1", "Başlık 2", "Başlık 3"]
Mevcut Metin/Notlar:
"${data.text || data.notes || ""}"`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      case "ton-duzelt":
        prompt = `Aşağıdaki Türkçe metnin yazım tonunu düzelt ve daha edebi, sıcak, nostaljik ve arşivsel bir havaya sok. Sadece düzeltilmiş metnin kendisini döndür.
Mevcut Metin:
"${data.text || ""}"
İstenen Tarz: ${data.style || "Retro Arşivsel"}`;
        break;

      case "lore-bagi":
        prompt = `Mevcut metin ile adadaki diğer varlıklar arasında gizemli, lore-uygun bağlantılar (lore bağı) kur. Aşağıdaki varlıkları incele ve bu metinle nasıl ilişkilendirilebileceğine dair 2-3 adet öneri ver.
Mevcut Metin/Yazı:
"${data.text || ""}"
Kullanılabilir Varlıklar:
${JSON.stringify(data.existingEntities || [])}
Önerileri maddeler halinde yaz.`;
        break;

      case "logo-renk-cikar":
        prompt = `Şu logo açıklaması veya görsel temaya uygun, Düzada ve Kems Company marka dna'sına (lacivert, krem, mercan, ada renkleri) uyumlu 4 adet renk paleti öner. Her renk için HEX kodu ve şiirsel bir Türkçe isim ver (örneğin: #9DB0A4 - Ada Adaçayı). Yanıtı bir JSON dizisi olarak ver. Örnek: [{"hex": "#1B2A4A", "name": "Derin Deniz Laciverti"}]
Açıklama:
"${data.logoDescription || ""}"`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      case "wiki-section-oner":
      case "wiki-bolum-oner":
        prompt = `Aşağıdaki ${data.type} türündeki varlık için lore-rich wiki başlıkları ve kısa öneri içerikleri üret. En az 3 adet başlık öner. Yanıtı JSON dizisi olarak döndür. Örnek format: [{"title": "Kökeni", "content": "Adadaki gizemli başlangıcı..."}, {"title": "Sırrı", "content": "Kimsenin bilmediği..."}]
Varlık Adı: "${data.title}"
Varlık Notları: "${data.notes || ""}"`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      case "kunya-cikar":
        prompt = `Aşağıdaki ${data.type} türündeki varlık için lore-rich künye kartı (profile) bilgilerini çıkar veya akıllıca tahmin et.
Varlık Adı: "${data.title}"
Varlık Açıklaması/Notları: "${data.notes || ""}"

İlgili varlık türüne göre SADECE aşağıdaki alanları doldur:
- Eğer tür 'kisi' veya 'karakter' ise:
  - "profession" (Meslek / Rol, örn: Otel Müdürü, Dedektif)
  - "personality" (Mizaç / Kişilik, örn: Melankolik, Detaycı)
  - "origin" (Köken / Soy, örn: Isola, Kemskøy Hanedanı)
  - "motivation" (Hedef / Motivasyon, örn: İntikam almak, Gerçeği bulmak)
- Eğer tür 'mekân', 'dükkân' veya 'yer' ise:
  - "shopType" (İşletme/Mekan Türü, örn: Bar, Otel Lobisi, Mağara)
  - "manager" (Sorumlu / Sahibi, örn: Alper Kansu)
  - "style" (Mimari Tarz, örn: Gotik, Modern, Yarı Harabe)
  - "secrets" (Önemli Sırlar, örn: Gizli tünel girişi var)
- Eğer tür 'marka' veya 'kulüp' ise:
  - "purpose" (Kuruluş Amacı, örn: Gizli Cemiyet, Tekstil Holdingi)
  - "leader" (Liderlik, örn: Aile Konseyi, Kurucu Başkan)
  - "secrecy" (Gizlilik / Üye Sayısı, örn: Derece 3, Çok Gizli, 15 Aktif Üye)
- Eğer tür 'ürün' ise:
  - "rarity" (Nadirik Derecesi, örn: Efsanevi, Nadir, Standart)
  - "material" (Köken / Malzeme, örn: Çelik, Obsidyen, Antik Pirinç)
  - "function" (Ana İşlevi, örn: Resepsiyon Odası Anahtarı)

Yanıtı mutlaka ve sadece aşağıdaki saf JSON formatında döndür, başka hiçbir şey (markdown işaretlemesi vb.) ekleme:
{
  "profile": {
    "[alan_adi_1]": "önerilen değer 1",
    "[alan_adi_2]": "önerilen değer 2"
  }
}`;
        systemInstruction += " Sadece saf bir JSON nesnesi döndür.";
        break;

      case "tutarlilik-kontrolu":
        prompt = `Aşağıdaki kitap bölümü metni ile mevcut dünya lore'u (wiki) arasında herhangi bir çelişki olup olmadığını denetle. Eğer bir çelişki varsa kibarca uyar ve düzeltme öner, her şey tutarlıysa takdir et.
Bölüm Metni:
"${data.text || ""}"
Mevcut Lore / Wiki Bilgileri:
${JSON.stringify(data.wikiContext || [])}
Sonucu Türkçe olarak, yapıcı bir dille açıkla.`;
        break;

      // Günün sorusu (Paket 4): kanondaki bir boşluk için tıklamalı seçenek.
      // Seçenek yalnız aday; Kemal seçse bile önce Adaylar'a düşer.
      case "kanon-sorusu-secenek":
        prompt = `Kurgusal Düzada adasının vikisinde "${data.madde || ""}" maddesinin "${data.etiket || ""}" alanı boş.
Soru: "${data.soru || ""}"
Maddenin bilinen künyesi ve metni:
${JSON.stringify(data.baglam || {})}
Ada hakkında bilinenler:
${JSON.stringify(data.ada || "")}
Bu soruya kanonla çelişmeyen 3 kısa cevap seçeneği öner. Kurallar:
- Her seçenek en fazla 12 kelime, sade Türkçe, süs yok.
- Yeni özel ad (kişi, yer, kurum, ürün adı) uydurma; yalnız yukarıda geçen adları kullanabilirsin.
- Sayı uydurma (fiyat, nüfus, takipçi). Tarih gerekiyorsa aralık yaz ("1950'ler").
- "Hâlâ", "şu anda", "günümüzde" yazma.
Yanıtı saf JSON dizisi olarak döndür: ["seçenek 1", "seçenek 2", "seçenek 3"]`;
        systemInstruction = "Kurgusal bir evrenin vikisi için kısa, sade, kanona bağlı seçenekler öneriyorsun. Sadece saf bir JSON dizisi döndür.";
        break;

      case "fikir-uret":
        const count = data.mode === "hızlı" ? "6 adet kısa ve çarpıcı" : "3 adet detaylı, derinlikli";
        prompt = `Bağlam: "${data.context || "Genel Düzada Fikirleri"}" üzerinde ${data.mode === "hızlı" ? "Hızlı" : "Derin"} modda fikirler üret.
Bize ${count} adet yaratıcı öneri sun. Her fikrin bir başlığı, bir açıklaması, bir de önerilen türü olsun (örneğin: 'karakter', 'mekân', 'ürün', 'olay' veya 'drop'). Yanıtı saf JSON formatında döndür. Örnek format: [{"title": "Fikir Başlığı", "notes": "Fikir detayları...", "type": "olay"}]`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      case "merch-oner":
        prompt = `Aşağıdaki tema, açıklama veya marka kurgusu için 3 adet göz alıcı ve Düzada estetiğine (lacivert, krem, mercan, arşiv rüzgarları) uygun eşsiz merchandise (ürün/tasarım/drop) önerisi üret. Her ürün için bir başlık, derinlemesine tasarım açıklaması (desenler, kumaş dokusu, kesim detayları), şiirsel bir Türkçe slogan ve önerilen perakende fiyatı (TL veya USD simgesi ile) sun. Yanıtı mutlaka saf bir JSON dizisi formatında döndür, başka hiçbir şey ekleme. Örnek format: [{"title": "Ürün Adı", "description": "Detaylı tasarım ve kumaş açıklaması...", "slogan": "Şiirsel Türkçe slogan...", "price": "1450 ₺"}]
Tema/Marka Bilgisi:
"${data.brandInfo || ""}"
Kategori/Seçim: ${data.category || "hepsi"}
Ek Açıklama ve Notlar:
"${data.notes || ""}"`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      case "oyun-senaryo":
        prompt = `Sen bir oyun tasarımcısısın. Düzada ve Kems Company evreni için günlük senaryolar ve kurgular üretiyorsun.
Aşağıdaki bilgilere göre oyunumuz için detaylı bir GÜNLÜK SENARYO ve program planla:
Seçilen Gün/Tema: "${data.theme || ""}"
Bulunması İstenen Karakterler:
${JSON.stringify(data.selectedCharacters || [])}
Bulunması İstenen Mekânlar:
${JSON.stringify(data.selectedPlaces || [])}

Evrenin Genel Lore/Wiki Bilgileri (Bağlam):
${JSON.stringify(data.wikiContext || [])}

Senden ricamız, bu gün için şunları içeren zengin bir kurgu hazırlaman:
1. GÜNÜN ÖZETİ (Giriş, ana gizem veya olay): Sürükleyici, edebi bir anlatım.
2. GÜNLÜK AKIŞ PROGRAMI (Sabah, Öğle, Akşam, Gece): Her dilimde ne oluyor, hangi karakter nerede bulunuyor.
3. ADIMLAR & RESEPSİYON GÖREVLERİ: Oyuncunun (resepsiyonist veya ana karakter) bu gün içinde çözmesi gereken 2-3 adet gizli görev veya evrak işi.
4. KARAKTER ETKİLEŞİMLERİ: Belirtilen karakterlerin bu gün içindeki gizli motivasyonları ve mini diyalog örüntüleri.

Yanıtını profesyonelce başlıklandırılmış, estetik Markdown formatında döndür.`;
        break;

      case "oyun-senaryo-duzenle":
        prompt = `Aşağıdaki oyun senaryosu üzerinde yaratıcı bir düzenleme veya detaylandırma yap.
Kullanıcı Talebi: "${data.userRequest}"
Mevcut Senaryo:
"${data.currentScenario}"

Evrenin Genel Lore/Wiki Bilgileri (Bağlam):
${JSON.stringify(data.wikiContext || [])}

Lütfen yeni, güncellenmiş ve geliştirilmiş senaryonun tamamını estetik Markdown formatında döndür.`;
        break;

      case "oyun-islem-oner":
        prompt = `Aşağıdaki Günün detayları ve mevcut işlem akışına göre, sıradaki gerçekçi ve bitmiş görünümlü tek bir OYUN İŞLEMİ (operation) önerisi oluştur.
Gün Detayları:
- Bölüm: ${data.dayMetadata?.bolum || "Bölüm I"}
- Gün Başlığı: ${data.dayMetadata?.title || ""}
- Tarih: ${data.dayMetadata?.date || ""}
- Hava: ${data.dayMetadata?.weather || ""}
- Doluluk %: ${data.dayMetadata?.occupancy || ""}
- Müdür Notu: ${data.dayMetadata?.memoText || ""}

Mevcut İşlemler (Bu sıradan sonra gelecek):
${JSON.stringify(data.currentOperations || [])}

Mevcut Karakterler (Düzada Sakinleri):
${JSON.stringify(data.charactersContext || [])}

Mevcut Mekanikler (Oyun Kuralları):
${JSON.stringify(data.mechanicsContext || [])}

Süreç ve kurallar:
- Öneri, otel yönetimi ("işlem mühendisliği") mantığına uygun olmalıdır.
- Sonuç mutlaka bir JSON objesi olmalıdır. Başka hiçbir açıklayıcı metin ekleme.
- JSON objesi şu anahtarları içermelidir:
  - "type": "check-in" | "walk-in" | "escort" | "check-out" | "call" | "post-it" | "event" değerlerinden biri.
  - "whoWhat": Türkçe kısa kim/ne tanımı (örn. "Alper Kansu", "Teknik Servis Çağrısı")
  - "description": Türkçe zengin işlem açıklaması (ne istiyor, evrakı tam mı, lobide ne konuşuyor)
  - "correctAction": Türkçe doğru karar/aksiyon (örn. "Kimliğini kontrol et, oda 201'e yerleştir.")
  - "linkedMechanicId": Eşleşen mekanik ID'si (seçenekler arasından bul, yoksa boş)
  - "linkedCharacterId": Eşleşen karakter ID'si (seçenekler arasından bul, yoksa boş)
  - "linkedRoomId": Eşleşen oda/yer ID'si (seçenekler arasından bul, yoksa boş)
  - "effect": Puan ve lore etkisi (örn. "+10 Puan, Alper Kansu otelde konaklamaya başlar.")`;
        systemInstruction += " Sadece saf bir JSON objesi döndür.";
        break;

      case "oyun-akis-taslakla":
        prompt = `Aşağıdaki Günün detaylarına ve mevcut el yapımı işlemlere göre, otelde geçecek en az 4, en fazla 8 ila 10 adet ardışık, gerçekçi ve bitmiş görünümlü OYUN İŞLEMİ (operation) akışı taslakla. Üreteceğin yeni işlemler mevcut işlemleri tamamlamalı, onlarla çelişmemeli ve toplam işlem sayısının (mevcut olanlar + yeni üreteceklerin) kesinlikle minimum 4, maksimum 8-10 adet arasında kalmasını sağlamalıdır.
Gün Detayları:
- Bölüm: ${data.dayMetadata?.bolum || "Bölüm I"}
- Gün Başlığı: ${data.dayMetadata?.title || ""}
- Tarih: ${data.dayMetadata?.date || ""}
- Hava: ${data.dayMetadata?.weather || ""}
- Doluluk %: ${data.dayMetadata?.occupancy || ""}
- Müdür Notu: ${data.dayMetadata?.memoText || ""}

Mevcut El Yapımı İşlemler (Bu işlemleri tekrar üretme, bunları devam ettirecek veya aralara girecek ek işlemler üret):
${JSON.stringify(data.currentOperations || [])}

Mevcut Karakterler (Düzada Sakinleri):
${JSON.stringify(data.charactersContext || [])}

Mevcut Mekanikler (Oyun Kuralları):
${JSON.stringify(data.mechanicsContext || [])}

Süreç ve kurallar:
- İşlemler sırayla günün sabahından gecesine doğru bir akış oluşturmalı ve birbirini beslemelidir.
- Sonuç mutlaka geçerli bir JSON dizisi (array) olmalıdır. Başka hiçbir açıklayıcı metin ekleme.
- Her dizi elemanı şu anahtarları içeren bir obje olmalıdır:
  - "type": "check-in" | "walk-in" | "escort" | "check-out" | "call" | "post-it" | "event" değerlerinden biri.
  - "whoWhat": Türkçe kısa kim/ne tanımı
  - "description": Türkçe zengin açıklama
  - "correctAction": Türkçe doğru aksiyon / çözüm
  - "linkedMechanicId": Eşleşen mekanik ID'si veya boş
  - "linkedCharacterId": Eşleşen karakter ID'si veya boş
  - "linkedRoomId": Eşleşen oda/yer ID'si veya boş
  - "effect": Puan ve lore etkisi`;
        systemInstruction += " Sadece saf bir JSON dizisi döndür.";
        break;

      default:
        return res.status(400).json({ error: "Bilinmeyen AI görevi." });
    }

    const response = await uret(ai, {
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        ...(prompt.includes("JSON") ? { responseMimeType: "application/json" } : {})
      }
    });

    const reply = response.text || "";
    res.json({ result: reply });
  } catch (error: any) {
    console.error("Gemini API Hatası:", error);
    const h = hatayiAcikla(error);
    res.status(h.durum).json({
      error: h.modelYok ? `${h.mesaj} Denenenler: ${MODEL_ADAYLARI.join(", ")}.` : h.mesaj
    });
  }
});

/**
 * Yapay zekâ sağlık kontrolü: anahtar var mı, hangi model cevap veriyor.
 * Tarayıcıda /api/ai-durum açılınca okunur.
 */
app.get("/api/ai-durum", async (_req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ anahtar: false, mesaj: hatayiAcikla(new Error("GEMINI_API_KEY")).mesaj });
  }
  try {
    await uret(getAI(), { contents: "Yalnız 'tamam' yaz.", config: { temperature: 0 } });
    res.json({ anahtar: true, calisiyor: true, model: calisanModel });
  } catch (e: any) {
    res.json({ anahtar: true, calisiyor: false, mesaj: hatayiAcikla(e).mesaj, denenenler: MODEL_ADAYLARI });
  }
});

// Vite Middleware for Development / Static serving for Production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();

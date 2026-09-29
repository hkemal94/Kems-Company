/**
 * Kanonun tarih kuralları (W, 29 Eylül 2026).
 *
 * Kaynak: docs/03-duzada-kunyesi.md (soru-cevap W3). Her kural bir yerin ya
 * da olgunun hangi yıldan önce ya da sonra olamayacağını söyler. Kitap,
 * Blog ve tutarlılık denetçisi bir metinde aynı cümlede hem bu adı hem
 * de kuralla çelişen bir yılı görürse uyarır — örneğin "1972" geçen bir
 * cümlede Liman Mahallesi (1980–1990'larda kuruldu).
 *
 * Uyarı yalnız ipucudur: metni değiştirmez. Aralıklar kanondaki aralığın
 * en erken yılıyla yazıldı; "1980–1990'lar" → 1980.
 */

export interface TarihKurali {
  ad: string;
  desen: RegExp;
  /** Bu yıldan önce olamaz */
  baslangic?: number;
  /** Bu yıldan sonra olamaz */
  bitis?: number;
  /** Kanondaki cümle */
  not: string;
}

export const TARIH_KURALLARI: TarihKurali[] = [
  { ad: 'Liman Mahallesi', desen: /\bLiman Mahalles|yeni liman|Liman İdare Binas/i, baslangic: 1980, not: "Liman Mahallesi 1980–1990'larda kuruldu; öncesinde feribot İskele'ye yanaşırdı." },
  { ad: 'The Imperial Kemsköy', desen: /Imperial Kemsk[öo]y|\botel(in|e|de|den)?\b/i, baslangic: 1954, not: 'Otel 1954\'te açıldı.' },
  { ad: 'Dirlik Spor Kulübü', desen: /\bDirlik\b/i, baslangic: 1957, not: 'Dirlik Spor Kulübü 12 Mayıs 1957\'de kuruldu.' },
  { ad: 'Dirlik Stadı', desen: /Dirlik Stad|\bstat(ta|tan|ın)?\b/i, baslangic: 1980, not: "Dirlik Stadı 1980'lerde yapıldı; öncesinde toprak saha vardı." },
  { ad: 'Belediye', desen: /\bbelediye/i, baslangic: 1980, not: 'Belediye 1980 sonrası kuruldu; öncesinde Düzada Köyü muhtarlıktı.' },
  { ad: 'Sağlık ocağı', desen: /sağlık ocağ/i, baslangic: 1980, not: 'Sağlık ocağı 1980 sonrası açıldı.' },
  { ad: 'Sade Meze', desen: /Sade Meze/i, baslangic: 1980, not: "Eski fabrika binası 1980–1990'larda meyhane (Sade Meze) oldu." },
  { ad: 'Dondurmacı Kızlar', desen: /Dondurmacı Kızlar/i, baslangic: 2000, not: 'Dondurmacı Kızlar 2000 sonrası açıldı.' },
  { ad: 'Butik şaraphaneler', desen: /şaraphane/i, baslangic: 2000, not: 'Çiftlik\'teki butik şaraphaneler 2000 sonrası.' },
  { ad: 'Kems Company dükkânı', desen: /Kems Company('nin)? dükkân/i, baslangic: 2024, not: 'Kemsköy Caddesi\'ndeki dükkân 2024 ve sonrası.' },
  { ad: 'Fener bekçisi', desen: /fener bekçi|bekçi(si)? fener/i, bitis: 1979, not: "Fener 1970'lerde otomatiğe geçti; sonrasında bekçi yok." },
  { ad: 'Sürek avı', desen: /sürek avı/i, bitis: 2000, not: "Sürek avı 1990–2000'lerde bırakıldı; gelenek kulüpte sürer." }
];

export interface TarihUyarisi {
  kural: TarihKurali;
  yil: number;
  /** Uyarının bulunduğu paragrafın başı */
  alinti: string;
}

const YIL = /\b(1[89]\d\d|20[0-3]\d)\b/g;

/**
 * Metindeki tarih çelişkileri — satır satır, satırda cümle cümle.
 *
 * Eskiden paragraf paragraf bakılıyordu; künye tek paragraf olduğu için
 * "* Kuruluş: 1957" ile "* Stat: Dirlik Stadı" aynı yerde sayılıyor, yanlış
 * uyarı çıkıyordu (Kemal, 29 Eylül gece: "çakışan bir şeyimiz yok").
 * Artık ad ile yıl aynı cümlede geçmeli.
 */
export function tarihUyarilari(metin: string): TarihUyarisi[] {
  const cikti: TarihUyarisi[] = [];
  const gorulen = new Set<string>();
  const cumleler = (metin || '').split('\n').flatMap(satir => satir.split(/(?<=[.!?])\s+/));
  for (const paragraf of cumleler) {
    const yillar = Array.from(paragraf.matchAll(YIL)).map(m => Number(m[1]));
    if (!yillar.length) continue;
    for (const kural of TARIH_KURALLARI) {
      if (!kural.desen.test(paragraf)) continue;
      const uyan = (y: number) =>
        (kural.baslangic === undefined || y >= kural.baslangic)
        && (kural.bitis === undefined || y <= kural.bitis);
      // Cümlede kurala uyan bir yıl da varsa ("1950'lerden beri… stat
      // 1980'ler") o yıl yerin kendi tarihidir; öteki başka bir şeyin.
      if (yillar.some(uyan)) continue;
      const celisen = yillar.find(y => !uyan(y));
      if (celisen === undefined) continue;
      const anahtar = `${kural.ad}|${celisen}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      cikti.push({ kural, yil: celisen, alinti: paragraf.trim().slice(0, 120) });
    }
  }
  return cikti;
}

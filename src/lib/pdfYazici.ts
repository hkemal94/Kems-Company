import type { jsPDF as JsPdf } from 'jspdf';

/**
 * Ortak PDF yazıcı (7 Ekim): Evren Raporu ve oyun PDF'i aynı görünümle
 * çıkar. Poppins gömülür (`public/fontlar/*.ttf`, OFL lisanslı); böylece
 * ğ, ş, ı, İ, ö, ü, ç olduğu gibi yazılır — eski raporda Helvetica yüzünden
 * "Kemsköy" "Kemskoy" çıkıyordu. jsPDF ve yazı tipleri yalnız PDF
 * istendiğinde yüklenir.
 */

type Renk = [number, number, number];
export const PDF_RENK = {
  lacivert: [14, 28, 79] as Renk,     // #0E1C4F
  kiremit: [242, 107, 111] as Renk,   // #F26B6F
  gri: [106, 94, 76] as Renk,         // #6A5E4C
  cizgi: [207, 197, 180] as Renk,     // #CFC5B4
  zemin: [243, 239, 232] as Renk,     // #F3EFE8
  yazi: [30, 35, 45] as Renk
};

const SAYFA_G = 210;
const SAYFA_Y = 297;
const SOL = 16;
const SAG = 16;
const IC = SAYFA_G - SOL - SAG;
const UST = 16;
const ALT = 20;
/** Punto → satır yüksekliği (mm) */
const satirY = (pt: number) => pt * 0.3528 * 1.4;

type Kalinlik = 'normal' | 'yari' | 'kalin';

let fontOnbellek: Promise<Record<Kalinlik, string>> | null = null;

async function base64(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Yazı tipi yüklenemedi: ${url}`);
  const b = new Uint8Array(await r.arrayBuffer());
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

function fontlar(): Promise<Record<Kalinlik, string>> {
  if (!fontOnbellek) {
    const kok = `${import.meta.env.BASE_URL || '/'}fontlar/`;
    fontOnbellek = Promise.all([
      base64(`${kok}Poppins-Regular.ttf`),
      base64(`${kok}Poppins-SemiBold.ttf`),
      base64(`${kok}Poppins-Bold.ttf`)
    ]).then(([normal, yari, kalin]) => ({ normal, yari, kalin }))
      .catch(e => { fontOnbellek = null; throw e; });
  }
  return fontOnbellek;
}

export interface KapakBilgisi {
  /** Lacivert şeritteki küçük yazı ("EVREN RAPORU") */
  etiket: string;
  baslik: string;
  alt?: string;
  /** Sağ üstte küçük satırlar */
  bilgiler?: [string, string][];
}

export class PdfYazici {
  private y = UST;

  private constructor(private doc: JsPdf, private ustBilgi: string, private altBilgi: string) {}

  static async ac(ustBilgi: string, altBilgi: string): Promise<PdfYazici> {
    const [{ jsPDF }, f] = await Promise.all([import('jspdf'), fontlar()]);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.addFileToVFS('Poppins-Regular.ttf', f.normal);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
    doc.addFileToVFS('Poppins-SemiBold.ttf', f.yari);
    doc.addFont('Poppins-SemiBold.ttf', 'PoppinsYari', 'normal');
    doc.addFileToVFS('Poppins-Bold.ttf', f.kalin);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
    doc.setLineHeightFactor(1.4);   // satirY ile aynı
    const y = new PdfYazici(doc, ustBilgi, altBilgi);
    y.yaziTipi('normal', 9);
    return y;
  }

  private yaziTipi(k: Kalinlik, pt: number, renk: Renk = PDF_RENK.yazi) {
    if (k === 'yari') this.doc.setFont('PoppinsYari', 'normal');
    else this.doc.setFont('Poppins', k === 'kalin' ? 'bold' : 'normal');
    this.doc.setFontSize(pt);
    this.doc.setTextColor(...renk);
  }

  /** Bu kadar yer yoksa yeni sayfa */
  private yer(mm: number) {
    if (this.y + mm > SAYFA_Y - ALT) {
      this.doc.addPage();
      this.y = UST;
      this.sayfaBasi();
    }
  }

  private sayfaBasi() {
    this.yaziTipi('yari', 7, PDF_RENK.gri);
    this.doc.text(this.ustBilgi, SOL, this.y);
    this.y += 2.2;
    this.doc.setDrawColor(...PDF_RENK.cizgi);
    this.doc.setLineWidth(0.3);
    this.doc.line(SOL, this.y, SAYFA_G - SAG, this.y);
    this.y += 7;
  }

  kapak(k: KapakBilgisi) {
    const d = this.doc;
    this.sayfaBasi();
    this.yaziTipi('yari', 7.5, [255, 255, 255]);
    const etiket = k.etiket.toLocaleUpperCase('tr');
    const g = d.getTextWidth(etiket) + 6;
    d.setFillColor(...PDF_RENK.lacivert);
    d.rect(SOL, this.y, g, 5.4, 'F');
    d.text(etiket, SOL + 3, this.y + 3.8);
    if (k.bilgiler?.length) {
      let by = this.y + 2;
      for (const [a, v] of k.bilgiler) {
        this.yaziTipi('normal', 7, PDF_RENK.gri);
        d.text(`${a}: ${v}`, SAYFA_G - SAG, by, { align: 'right' });
        by += 3.4;
      }
    }
    this.y += 13;
    this.yaziTipi('kalin', 22, PDF_RENK.lacivert);
    const bas = d.splitTextToSize(k.baslik, IC * 0.7) as string[];
    d.text(bas, SOL, this.y);
    this.y += (bas.length - 1) * satirY(22) + 5.5;
    if (k.alt) {
      this.yaziTipi('normal', 9.5, PDF_RENK.gri);
      d.text(k.alt, SOL, this.y);
      this.y += 4;
    }
    this.y += 2;
    d.setDrawColor(...PDF_RENK.lacivert);
    d.setLineWidth(0.8);
    d.line(SOL, this.y, SAYFA_G - SAG, this.y);
    this.y += 8;
  }

  /** Dört kutuluk sayı şeridi */
  sayilar(kutular: [string, number | string][]) {
    const d = this.doc;
    this.yer(20);
    d.setFillColor(...PDF_RENK.zemin);
    d.setDrawColor(...PDF_RENK.cizgi);
    d.setLineWidth(0.3);
    d.roundedRect(SOL, this.y, IC, 16, 2, 2, 'FD');
    const g = IC / kutular.length;
    kutular.forEach(([ad, n], i) => {
      const x = SOL + i * g + 4;
      this.yaziTipi('yari', 6.5, PDF_RENK.gri);
      d.text(ad.toLocaleUpperCase('tr'), x, this.y + 5);
      this.yaziTipi('kalin', 14, PDF_RENK.lacivert);
      d.text(String(n), x, this.y + 12);
    });
    this.y += 23;
  }

  bolum(baslik: string) {
    this.yer(16);
    this.y += 2;
    this.doc.setFillColor(...PDF_RENK.kiremit);
    this.doc.rect(SOL, this.y - 4.2, 2.2, 5.6, 'F');
    this.yaziTipi('kalin', 12, PDF_RENK.lacivert);
    this.doc.text(baslik, SOL + 5, this.y);
    this.y += 7;
  }

  altBaslik(metin: string, sag?: string) {
    this.yer(10);
    this.yaziTipi('yari', 10, PDF_RENK.lacivert);
    this.doc.text(metin, SOL, this.y);
    if (sag) {
      this.yaziTipi('normal', 7.5, PDF_RENK.gri);
      this.doc.text(sag, SAYFA_G - SAG, this.y, { align: 'right' });
    }
    this.y += 5;
  }

  paragraf(metin: string, pt = 9, renk: Renk = PDF_RENK.yazi, girinti = 0) {
    for (const p of metin.split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      this.yaziTipi('normal', pt, renk);
      const sat = this.doc.splitTextToSize(p, IC - girinti) as string[];
      for (const s of sat) {
        this.yer(satirY(pt));
        this.doc.text(s, SOL + girinti, this.y);
        this.y += satirY(pt);
      }
      this.y += 1.6;
    }
  }

  /** Boş alan boş görünür */
  bos(metin = 'boş') {
    this.paragraf(metin, 8.5, PDF_RENK.gri);
  }

  /** Etiket | değer satırları (künye, ölçüler) */
  alanlar(satirlar: [string, string][], etiketG = 42) {
    for (const [a, v] of satirlar) {
      this.yaziTipi('yari', 8.5, PDF_RENK.lacivert);
      const et = this.doc.splitTextToSize(a, etiketG - 3) as string[];
      this.yaziTipi('normal', 8.5);
      const sat = this.doc.splitTextToSize(v, IC - etiketG - 2) as string[];
      const h = Math.max(et.length, sat.length) * satirY(8.5) + 1.2;
      this.yer(h);
      this.yaziTipi('yari', 8.5, PDF_RENK.lacivert);
      this.doc.text(et, SOL, this.y);
      this.yaziTipi('normal', 8.5);
      this.doc.text(sat, SOL + etiketG, this.y);
      this.y += h;
    }
    this.y += 2;
  }

  /** Listede bir madde: koyu ad, sağda gri bilgi, altında kısa metin */
  madde(ad: string, sag: string, metin?: string) {
    this.yer(satirY(9) + (metin ? satirY(8.5) * 2 : 0));
    this.yaziTipi('yari', 9, PDF_RENK.lacivert);
    const adSat = this.doc.splitTextToSize(ad, IC * 0.62) as string[];
    this.doc.text(adSat, SOL, this.y);
    if (sag) {
      this.yaziTipi('normal', 7.5, PDF_RENK.gri);
      this.doc.text(sag, SAYFA_G - SAG, this.y, { align: 'right' });
    }
    this.y += adSat.length * satirY(9);
    if (metin) this.paragraf(metin, 8.5, PDF_RENK.yazi, 3);
    else this.y += 1.2;
  }

  bosluk(mm = 3) {
    this.y += mm;
  }

  private altBilgileriCiz() {
    const d = this.doc;
    const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      d.setDrawColor(...PDF_RENK.cizgi);
      d.setLineWidth(0.3);
      d.line(SOL, SAYFA_Y - 12, SAYFA_G - SAG, SAYFA_Y - 12);
      this.yaziTipi('normal', 7, PDF_RENK.gri);
      d.text(this.altBilgi, SOL, SAYFA_Y - 8);
      d.text(`${i} / ${n}`, SAYFA_G - SAG, SAYFA_Y - 8, { align: 'right' });
    }
  }

  kaydet(dosyaAdi: string) {
    this.altBilgileriCiz();
    this.doc.save(dosyaAdi);
  }
}

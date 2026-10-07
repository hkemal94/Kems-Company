import type { Item } from '../types';
import { fontlar, PDF_RENK } from './pdfYazici';

/**
 * Kitabı PDF ve EPUB olarak indirme (7. gece, 8 Ekim; Kemal'in seçimleri):
 *   - bölümleri indirirken Kemal seçer
 *   - başta kapak (ad, yazar, Kems Company · Düzada, TR), içindekiler ve
 *     kitap notu
 *   - PDF A5 (kitap boyu); Poppins gömülü, Türkçe harfler olduğu gibi
 *   - EPUB 3; kendi küçük zip yazıcısıyla (ek kütüphane yok)
 * Metin Kemal'in; hiçbir şey eklenmez, boş bölüm "boş" diye görünür.
 */

export interface KitapCiktisi {
  baslik: string;
  yazar: string;
  not: string;
  bolumler: Array<{ baslik: string; metin: string }>;
}

/** Yazı editörünün işaretlerini düz metne çevirir: [[ad]], [ad](id), [ad], **kalın** */
export function duzMetin(s = ''): string {
  return s
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '');
}

/** Metin blokları: başlık (#) ya da paragraf */
function bloklar(metin: string): Array<{ tur: 'baslik' | 'paragraf'; metin: string }> {
  return duzMetin(metin).split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    const m = b.match(/^#{1,6}\s+(.+)$/);
    return m ? { tur: 'baslik' as const, metin: m[1].trim() } : { tur: 'paragraf' as const, metin: b.replace(/^>\s?/gm, '').replace(/\s*\n\s*/g, ' ') };
  });
}

export const dosyaAdi = (s: string) => (s.trim() || 'kitap').toLocaleLowerCase('tr')
  .replace(/[çğıöşü]/g, h => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' } as Record<string, string>)[h])
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kitap';

/** Kitap projesi ve seçilen bölümlerden çıktı bilgisi */
export function kitapBilgisi(kitap: Item, bolumler: Item[], yazar: string): KitapCiktisi {
  return {
    baslik: kitap.title.trim() || 'Adsız kitap',
    yazar: yazar.trim(),
    not: duzMetin(kitap.notes || '').trim(),
    bolumler: bolumler.map(b => ({ baslik: b.title.trim() || 'Adsız bölüm', metin: b.notes || '' }))
  };
}

// ---------------------------------------------------------------- PDF (A5)

const G = 148, Y = 210, KENAR = 18, UST = 20, ALT = 22;
const IC = G - 2 * KENAR;
const satir = (pt: number) => pt * 0.3528 * 1.5;

export async function kitapPdf(k: KitapCiktisi): Promise<void> {
  const [{ jsPDF }, f] = await Promise.all([import('jspdf'), fontlar()]);
  const d = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  d.addFileToVFS('Poppins-Regular.ttf', f.normal); d.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  d.addFileToVFS('Poppins-SemiBold.ttf', f.yari); d.addFont('Poppins-SemiBold.ttf', 'PoppinsYari', 'normal');
  d.addFileToVFS('Poppins-Bold.ttf', f.kalin); d.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
  d.setLineHeightFactor(1.5);
  const yazi = (k2: 'normal' | 'yari' | 'kalin', pt: number, renk = PDF_RENK.yazi) => {
    if (k2 === 'yari') d.setFont('PoppinsYari', 'normal'); else d.setFont('Poppins', k2 === 'kalin' ? 'bold' : 'normal');
    d.setFontSize(pt); d.setTextColor(...renk);
  };

  // Kapak
  yazi('kalin', 24, PDF_RENK.lacivert);
  const bas = d.splitTextToSize(k.baslik, IC) as string[];
  let y = 78;
  d.text(bas, G / 2, y, { align: 'center' });
  y += bas.length * satir(24) + 4;
  if (k.yazar) { yazi('normal', 12, PDF_RENK.gri); d.text(k.yazar, G / 2, y, { align: 'center' }); }
  d.setDrawColor(...PDF_RENK.kiremit); d.setLineWidth(0.8); d.line(G / 2 - 12, 66, G / 2 + 12, 66);
  yazi('yari', 8, PDF_RENK.gri);
  d.text('Kems Company · Düzada, TR', G / 2, Y - 18, { align: 'center' });

  // İçindekiler için yer: sonra doldurulur
  const tocSatir = 22;
  const tocSayfa = Math.max(1, Math.ceil(k.bolumler.length / tocSatir));
  const tocIlk = d.getNumberOfPages() + 1;
  for (let i = 0; i < tocSayfa; i++) d.addPage();

  let sayfaY = UST;
  const yer = (mm: number) => { if (sayfaY + mm > Y - ALT) { d.addPage(); sayfaY = UST; } };
  const paragraf = (p: string, pt = 10, renk = PDF_RENK.yazi) => {
    yazi('normal', pt, renk);
    for (const s of d.splitTextToSize(p, IC) as string[]) { yer(satir(pt)); d.text(s, KENAR, sayfaY); sayfaY += satir(pt); }
    sayfaY += 2.2;
  };
  const bolumBasi = (baslik: string, etiket: string) => {
    d.addPage(); sayfaY = UST + 22;
    yazi('yari', 8, PDF_RENK.kiremit); d.text(etiket.toLocaleUpperCase('tr'), KENAR, sayfaY); sayfaY += 7;
    yazi('kalin', 16, PDF_RENK.lacivert);
    const t = d.splitTextToSize(baslik, IC) as string[];
    d.text(t, KENAR, sayfaY); sayfaY += t.length * satir(16) + 6;
  };

  if (k.not) {
    bolumBasi('Kitap notu', 'Önsöz');
    for (const b of bloklar(k.not)) paragraf(b.metin);
  }

  const sayfalar: number[] = [];
  k.bolumler.forEach((b, n) => {
    bolumBasi(b.baslik, `Bölüm ${n + 1}`);
    sayfalar.push(d.getNumberOfPages());
    const bl = bloklar(b.metin);
    if (!bl.length) paragraf('boş', 9, PDF_RENK.gri);
    for (const x of bl) {
      if (x.tur === 'baslik') { yer(12); sayfaY += 2; yazi('yari', 11, PDF_RENK.lacivert); d.text(x.metin, KENAR, sayfaY); sayfaY += satir(11) + 1; }
      else paragraf(x.metin);
    }
  });

  // İçindekiler
  for (let i = 0; i < tocSayfa; i++) {
    d.setPage(tocIlk + i);
    let ty = UST + 22;
    if (i === 0) { yazi('kalin', 16, PDF_RENK.lacivert); d.text('İçindekiler', KENAR, ty); ty += 12; }
    k.bolumler.slice(i * tocSatir, (i + 1) * tocSatir).forEach((b, j) => {
      const n = i * tocSatir + j;
      yazi('normal', 9.5);
      const ad = (d.splitTextToSize(`${n + 1}. ${b.baslik}`, IC - 14) as string[])[0];
      d.text(ad, KENAR, ty);
      yazi('normal', 9.5, PDF_RENK.gri);
      d.text(String(sayfalar[n]), G - KENAR, ty, { align: 'right' });
      ty += 6.6;
    });
  }

  // Sayfa numaraları (kapak hariç)
  const toplam = d.getNumberOfPages();
  for (let i = 2; i <= toplam; i++) {
    d.setPage(i); yazi('normal', 8, PDF_RENK.gri);
    d.text(String(i), G / 2, Y - 10, { align: 'center' });
  }
  d.save(`${dosyaAdi(k.baslik)}.pdf`);
}

// ---------------------------------------------------------------- EPUB

const kacis = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const xhtml = (baslik: string, govde: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr" lang="tr">
<head><meta charset="utf-8"/><title>${kacis(baslik)}</title><link rel="stylesheet" type="text/css" href="stil.css"/></head>
<body>
${govde}
</body>
</html>`;

const govdeHtml = (metin: string) => {
  const bl = bloklar(metin);
  if (!bl.length) return '<p class="bos">boş</p>';
  return bl.map(b => (b.tur === 'baslik' ? `<h2>${kacis(b.metin)}</h2>` : `<p>${kacis(b.metin)}</p>`)).join('\n');
};

/** EPUB dosyaları (yol → içerik); sıra önemli: mimetype ilk */
export function epubDosyalari(k: KitapCiktisi, kimlik: string, tarih = new Date()): Array<[string, string]> {
  const bolumDosyasi = (n: number) => `bolum-${n + 1}.xhtml`;
  const sayfalar: Array<{ id: string; dosya: string; baslik: string; icerik: string }> = [
    { id: 'kapak', dosya: 'kapak.xhtml', baslik: k.baslik, icerik: xhtml(k.baslik, `<section class="kapak" epub:type="cover"><h1>${kacis(k.baslik)}</h1>${k.yazar ? `<p class="yazar">${kacis(k.yazar)}</p>` : ''}<p class="kunye">Kems Company · Düzada, TR</p></section>`) }
  ];
  if (k.not) sayfalar.push({ id: 'onsoz', dosya: 'onsoz.xhtml', baslik: 'Kitap notu', icerik: xhtml('Kitap notu', `<section epub:type="preface"><p class="etiket">Önsöz</p><h1>Kitap notu</h1>\n${govdeHtml(k.not)}</section>`) });
  k.bolumler.forEach((b, n) => sayfalar.push({
    id: `bolum${n + 1}`, dosya: bolumDosyasi(n), baslik: b.baslik,
    icerik: xhtml(b.baslik, `<section epub:type="chapter"><p class="etiket">Bölüm ${n + 1}</p><h1>${kacis(b.baslik)}</h1>\n${govdeHtml(b.metin)}</section>`)
  }));

  const nav = xhtml('İçindekiler', `<nav epub:type="toc" id="toc"><h1>İçindekiler</h1><ol>
${sayfalar.filter(s => s.id !== 'kapak').map(s => `<li><a href="${s.dosya}">${kacis(s.baslik)}</a></li>`).join('\n')}
</ol></nav>`);
  const degisti = tarih.toISOString().replace(/\.\d+Z$/, 'Z');
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="kimlik" xml:lang="tr">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="kimlik">${kacis(kimlik)}</dc:identifier>
<dc:title>${kacis(k.baslik)}</dc:title>
${k.yazar ? `<dc:creator>${kacis(k.yazar)}</dc:creator>\n` : ''}<dc:language>tr</dc:language>
<dc:publisher>Kems Company</dc:publisher>
<meta property="dcterms:modified">${degisti}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="stil" href="stil.css" media-type="text/css"/>
${sayfalar.map(s => `<item id="${s.id}" href="${s.dosya}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
<itemref idref="kapak"/>
<itemref idref="nav"/>
${sayfalar.filter(s => s.id !== 'kapak').map(s => `<itemref idref="${s.id}"/>`).join('\n')}
</spine>
</package>`;
  const stil = `body{font-family:serif;line-height:1.55;margin:0 5%;color:#1e232d}
h1{font-family:sans-serif;color:#0E1C4F;font-size:1.6em;margin:1.2em 0 .8em}
h2{font-family:sans-serif;color:#0E1C4F;font-size:1.15em;margin:1.2em 0 .4em}
p{margin:0 0 .8em;text-indent:0}
.etiket{font-family:sans-serif;color:#F26B6F;font-size:.75em;letter-spacing:.12em;text-transform:uppercase;margin-top:3em}
.kapak{text-align:center;margin-top:30%}
.kapak h1{font-size:2.2em}
.yazar{color:#6A5E4C;font-size:1.1em}
.kunye{color:#6A5E4C;font-size:.8em;margin-top:6em}
.bos{color:#6A5E4C;font-style:italic}`;
  return [
    ['mimetype', 'application/epub+zip'],
    ['META-INF/container.xml', `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`],
    ['OEBPS/content.opf', opf],
    ['OEBPS/nav.xhtml', nav],
    ['OEBPS/stil.css', stil],
    ...sayfalar.map(s => [`OEBPS/${s.dosya}`, s.icerik] as [string, string])
  ];
}

// Sıkıştırmasız zip (EPUB'un "mimetype"ı zaten sıkıştırılmamalı)
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function zipYap(dosyalar: Array<[string, string]>): Uint8Array {
  const enc = new TextEncoder();
  const parcalar: Uint8Array[] = [];
  const merkez: Uint8Array[] = [];
  let ofset = 0;
  for (const [ad, icerik] of dosyalar) {
    const a = enc.encode(ad), v = enc.encode(icerik), c = crc32(v);
    const yerel = new Uint8Array(30 + a.length); const ly = new DataView(yerel.buffer);
    ly.setUint32(0, 0x04034b50, true); ly.setUint16(4, 20, true); ly.setUint16(6, 0x0800, true); ly.setUint16(8, 0, true);
    ly.setUint32(14, c, true); ly.setUint32(18, v.length, true); ly.setUint32(22, v.length, true); ly.setUint16(26, a.length, true);
    yerel.set(a, 30);
    const m = new Uint8Array(46 + a.length); const my = new DataView(m.buffer);
    my.setUint32(0, 0x02014b50, true); my.setUint16(4, 20, true); my.setUint16(6, 20, true); my.setUint16(8, 0x0800, true);
    my.setUint32(16, c, true); my.setUint32(20, v.length, true); my.setUint32(24, v.length, true); my.setUint16(28, a.length, true);
    my.setUint32(42, ofset, true); m.set(a, 46);
    parcalar.push(yerel, v); merkez.push(m);
    ofset += yerel.length + v.length;
  }
  const mBoy = merkez.reduce((n, x) => n + x.length, 0);
  const son = new Uint8Array(22); const sy = new DataView(son.buffer);
  sy.setUint32(0, 0x06054b50, true); sy.setUint16(8, dosyalar.length, true); sy.setUint16(10, dosyalar.length, true);
  sy.setUint32(12, mBoy, true); sy.setUint32(16, ofset, true);
  const hepsi = [...parcalar, ...merkez, son];
  const cikti = new Uint8Array(hepsi.reduce((n, x) => n + x.length, 0));
  let i = 0; for (const x of hepsi) { cikti.set(x, i); i += x.length; }
  return cikti;
}

export function kitapEpub(k: KitapCiktisi, kimlik: string): void {
  const veri = zipYap(epubDosyalari(k, kimlik));
  const url = URL.createObjectURL(new Blob([veri], { type: 'application/epub+zip' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${dosyaAdi(k.baslik)}.epub`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

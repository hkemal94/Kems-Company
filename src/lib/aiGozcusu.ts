/**
 * Yapay zekâ ucunun gözcüsü.
 *
 * Uygulamada 20 ayrı yerde `/api/ai` çağrısı var ve hepsi aynı deseni
 * kullanıyor: hata olursa `catch` bloğu konsola yazıp susuyor. Kullanıcının
 * gördüğü şey "düğmeye bastım, hiçbir şey olmadı" oluyor — Kemal'in
 * "buradaki butonlar çalışmıyor" dediği şey bu.
 *
 * Yirmi çağrı yerini tek tek elden geçirmek yerine burada yalnızca GÖZLEM
 * yapıyoruz: `fetch`i sarıp `/api/ai` isteklerinin sonucunu not alıyoruz.
 * İsteğin kendisine, gövdesine, yanıtına dokunulmuyor — davranış aynı
 * kalıyor, sadece görünür oluyor.
 *
 * Yeni yazılan kod `aiCagir` kullanmalı; o, hatayı doğrudan çağırana
 * fırlatır ve yerinde gösterilebilir. Bu gözcü eski çağrılar için.
 */

export type AiDurum =
  | { hal: 'bilinmiyor' }
  | { hal: 'calisiyor' }
  | { hal: 'sunucu-yok'; mesaj: string }
  | { hal: 'hata'; mesaj: string };

type Dinleyici = (d: AiDurum) => void;

let durum: AiDurum = { hal: 'bilinmiyor' };
const dinleyiciler = new Set<Dinleyici>();
let kuruldu = false;

function yay(yeni: AiDurum) {
  durum = yeni;
  dinleyiciler.forEach(d => d(yeni));
}

export function aiDurumu(): AiDurum {
  return durum;
}

export function aiDurumunuDinle(d: Dinleyici): () => void {
  dinleyiciler.add(d);
  return () => { dinleyiciler.delete(d); };
}

/** Kullanıcı uyarıyı kapattı — tekrar hata olana kadar gösterme */
export function aiUyarisiniKapat() {
  yay({ hal: 'bilinmiyor' });
}

function aiIstegiMi(girdi: RequestInfo | URL): boolean {
  try {
    const url = typeof girdi === 'string' ? girdi
      : girdi instanceof URL ? girdi.pathname
        : (girdi as Request).url;
    return url.includes('/api/ai');
  } catch {
    return false;
  }
}

/**
 * Gözcüyü kurar. Bir kez çağrılır (App açılışında).
 * Kurulmamışsa hiçbir şey olmaz — uygulama yine çalışır.
 */
export function aiGozcusunuKur() {
  if (kuruldu || typeof window === 'undefined') return;
  kuruldu = true;

  try {
    const asil = window.fetch ? window.fetch.bind(window) : undefined;
    if (!asil) return;

    const sariliFetch = async (girdi: RequestInfo | URL, ayar?: RequestInit) => {
      if (!aiIstegiMi(girdi)) return asil(girdi, ayar);

      try {
        const yanit = await asil(girdi, ayar);
        if (yanit.status === 404) {
          yay({
            hal: 'sunucu-yok',
            mesaj: 'Yapay zekâ ucu (/api/ai) bu ortamda yayında değil — '
              + 'önizlemede yalnız arayüz çalışıyor, sunucu ayrıca başlatılmalı. '
              + 'AI düğmeleri bu yüzden bir şey yapmıyor.'
          });
        } else if (!yanit.ok) {
          yay({ hal: 'hata', mesaj: `Yapay zekâ sunucusu ${yanit.status} döndü.` });
        } else if (durum.hal !== 'calisiyor') {
          yay({ hal: 'calisiyor' });
        }
        return yanit;
      } catch (e) {
        yay({
          hal: 'sunucu-yok',
          mesaj: 'Yapay zekâ sunucusuna ulaşılamadı. AI düğmeleri çalışmayacak.'
        });
        throw e;
      }
    };

    // Bazı tarayıcılarda / iframe ortamlarında window.fetch getter-only'dir.
    // Doğrudan window.fetch = ... ataması TypeError fırlatır.
    // Object.defineProperty ile own property olarak tanımlanır.
    try {
      Object.defineProperty(window, 'fetch', {
        value: sariliFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch {
      try {
        (window as any).fetch = sariliFetch;
      } catch {
        // fetch değiştirilemiyorsa sessizce geç
      }
    }
  } catch (err) {
    console.warn('aiGozcusu kurulamadı:', err);
  }
}

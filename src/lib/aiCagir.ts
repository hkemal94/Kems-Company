/**
 * Yapay zekâ çağrılarının ortak kapısı.
 *
 * Uygulamadaki bütün AI düğmeleri `/api/ai` adresine istek atıyor; o adresi
 * `server.ts` içindeki Express sunucusu karşılıyor. Önizleme ortamında
 * yalnızca Vite çalıştığı için o adres yok — istek 404 dönüyor, `catch`
 * bloğu hatayı konsola yazıp susuyor ve düğme hiçbir şey yapmamış gibi
 * görünüyor. Kemal'in "buradaki butonlar çalışmıyor" dediği şey bu.
 *
 * Bu sarmalayıcı hatayı YUTMUYOR: ne olduğunu Türkçe söyleyen bir hata
 * fırlatıyor ki arayüz kullanıcıya gösterebilsin.
 */

export class AiHatasi extends Error {
  /** Sunucu hiç yoksa true — yapılandırma sorunu, geçici arıza değil */
  readonly sunucuYok: boolean;
  constructor(mesaj: string, sunucuYok = false) {
    super(mesaj);
    this.name = 'AiHatasi';
    this.sunucuYok = sunucuYok;
  }
}

export async function aiCagir<T = unknown>(
  task: string, data: unknown
): Promise<T> {
  let yanit: Response;
  try {
    yanit = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, data })
    });
  } catch {
    throw new AiHatasi(
      'Yapay zekâ sunucusuna ulaşılamadı. Bu önizlemede sunucu çalışmıyor.',
      true
    );
  }

  if (yanit.status === 404) {
    throw new AiHatasi(
      'Yapay zekâ ucu (/api/ai) bu ortamda yayında değil — önizlemede yalnız '
      + 'arayüz çalışıyor, sunucu tarafı ayrıca başlatılmalı.',
      true
    );
  }

  if (!yanit.ok) {
    let ayrinti = '';
    try {
      const g = await yanit.json();
      ayrinti = typeof g?.error === 'string' ? ` — ${g.error}` : '';
    } catch { /* gövde okunamadı */ }
    throw new AiHatasi(`Sunucu ${yanit.status} döndü${ayrinti}`);
  }

  const govde = await yanit.json();
  if (govde?.error) throw new AiHatasi(String(govde.error));
  if (govde?.result === undefined) {
    throw new AiHatasi('Sunucu boş yanıt döndü.');
  }
  return govde.result as T;
}

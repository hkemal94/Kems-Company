/**
 * Compresses an image represented as a base64 Data URL or loaded via file.
 * Resizes the image so that neither its width nor height exceeds the specified maximums.
 * Encodes it as a JPEG at the specified quality to dramatically reduce file size (under 1MB limit for Firestore).
 */
export function compressImageBase64(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // If it's not a data URL, return as-is
    if (!base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Fill background white for JPEG compression of transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      // Fallback to original if load fails
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}

/**
 * Saydamlığı koruyan sıkıştırma — logolar için.
 *
 * Yukarıdaki `compressImageBase64` her şeyi JPEG'e çeviriyor ve saydam
 * zemini beyaza boyuyor. Fotoğraf için doğru, logo için felaket: kiremit
 * zeminin üstüne beyaz kutu içinde bir arma düşüyor. Galeriye yüklenen
 * PNG'ler bu yoldan geçiyor — boyut küçülüyor, saydamlık duruyor.
 *
 * PNG kayıpsız olduğu için yalnız ölçek küçülterek kazanç sağlıyoruz;
 * `quality` PNG'de yok sayılır.
 */
export function compressPngKeepAlpha(
  base64Str: string,
  maxWidth = 900,
  maxHeight = 900
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str.startsWith('data:image/')) { resolve(base64Str); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width, height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const oran = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * oran);
        height = Math.round(height * oran);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      // zemin boyanmıyor: saydamlık korunsun
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

/** Dosyayı data URL'e çevirir. */
export function dosyayiOku(dosya: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error(`${dosya.name} okunamadı`));
    r.readAsDataURL(dosya);
  });
}

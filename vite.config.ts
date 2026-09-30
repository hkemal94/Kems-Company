import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {execSync} from 'child_process';

/**
 * Sürüm damgası (30 Eylül): uygulamanın altında hangi kodun çalıştığı
 * görünsün. GitHub'daki son birleştirmeyle karşılaştırılabilir.
 */
const surum = (() => {
  let kod = '';
  try { kod = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* git yoksa yalnız tarih */ }
  const tarih = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return kod ? `${kod} · ${tarih}` : tarih;
})();

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_SURUM': JSON.stringify(surum) },
    // MapLibre işini bir Web Worker'da yapar. Vite'ın bağımlılık
    // ön-derlemesinden geçtiğinde bu worker açılır açılmaz kapanıyor ve
    // harita hiç yüklenmiyor. Ön-derlemenin dışında bırakınca düzeliyor.
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Harita düzenleyici artık ayrı sayfa değil: Düzada Haritası sekmesindeki
    // "Düzenle" düğmesiyle açılıyor (H2).
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

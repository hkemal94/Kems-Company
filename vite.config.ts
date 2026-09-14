import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
    build: {
      rollupOptions: {
        input: {
          // Uygulamanın kendisi
          index: path.resolve(__dirname, 'index.html'),
          // Sınır/yol düzenleyici — ayrı bir sayfa, uygulamaya bağlı değil.
          // Derlemeye dahil ki yayına alınan sitede de /harita-duzenle.html
          // adresinden açılabilsin.
          'harita-duzenle': path.resolve(__dirname, 'harita-duzenle.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

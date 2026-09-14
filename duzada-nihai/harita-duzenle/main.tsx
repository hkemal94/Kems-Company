/**
 * Harita düzenleyici sayfası — sınırlar ve yollar.
 *
 * Uygulamaya dokunmaz; yalnız `npx vite` ile açılır:
 *   http://localhost:5173/harita-duzenle.html
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { HaritaDuzenleyici } from '../src/components/harita/HaritaDuzenleyici';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HaritaDuzenleyici />
  </React.StrictMode>
);

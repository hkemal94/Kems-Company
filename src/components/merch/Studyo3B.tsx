import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Download, ImagePlus, Images, Save, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Item } from '../../types';
import { compressImageBase64, compressPngKeepAlpha, dosyayiOku } from '../../lib/imageCompressor';
import {
  ALAN_CM, kabariklik, kalipCizgisi, uzaklikAlani, yolCiz,
  type Kalip, type Kesim, type Yuz
} from './kaliplar';

/**
 * Merch → 3B Stüdyo (yapisal-4, 6. tur; yapisal-2 kararı "Tasarım'da 3B stüdyo").
 *
 * Tişört ya da sweatshirt, regular ya da oversize. Renk marka paletinden,
 * kurumların künyesindeki renklerden ya da serbest seçiciden. PNG'ler katman
 * katman eklenir, Kemal giysinin üstünde sürükleyerek yerleştirir.
 *
 * Kayda yalnız düğmeyle yazılır:
 *   - "Galeri'ye kaydet": o anki görüntü Galeri'ye ürün görseli olarak düşer
 *   - "Tasarımı ürüne kaydet": renk, kalıp ve katmanlar ürünün
 *     `metadata.tasarim3b` alanına yazılır; ürün seçilince yeniden açılır.
 */

export interface Katman3B {
  id: string;
  ad: string;
  /** yüklenen PNG (küçültülmüş) — Galeri'den gelenlerde yok */
  src?: string;
  /** Galeri'deki görselin kaydı; görsel oradan okunur, burada kopyalanmaz */
  galeriId?: string;
  yuz: Yuz;
  /** merkez, çizim alanının oranı (0–1) */
  x: number;
  y: number;
  /** genişlik, çizim alanının oranı */
  olcek: number;
  /** derece */
  aci: number;
}

export interface Tasarim3B {
  kalip: Kalip;
  kesim: Kesim;
  renk: string;
  katmanlar: Katman3B[];
  guncelleme: number;
}

const MARKA_PALETI: { ad: string; renk: string }[] = [
  { ad: 'Lacivert', renk: '#0E1C4F' },
  { ad: 'Kiremit', renk: '#F26B6F' },
  { ad: 'Krem', renk: '#F3EFE8' },
  { ad: 'Kâğıt', renk: '#FAF8F5' }
];

/** Kurum künyesindeki renkler: "Renkler: Kolej Laciverti #0E1C4F, kiremit #F26B6F" */
export function kurumRenkleri(kurum: Item): { ad: string; renk: string }[] {
  const metin = [kurum.notes, JSON.stringify(kurum.metadata || {})].filter(Boolean).join('\n');
  const bulunan: { ad: string; renk: string }[] = [];
  const re = /([A-Za-zÇĞİÖŞÜçğıöşüâ ]{0,24})\s*(#[0-9A-Fa-f]{6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(metin))) {
    const renk = m[2].toUpperCase();
    if (bulunan.some(b => b.renk === renk)) continue;
    const ad = m[1].trim().replace(/^(Renkler|brandColor)\s*/i, '');
    bulunan.push({ ad: ad || renk, renk });
  }
  return bulunan;
}

const TUVAL = 1024; // doku çözünürlüğü (çizim alanı başına)
const IZGARA = 200; // giysi yüzeyinin ızgarası
const BIRIM = 0.01; // 1 cm sahnede

const yeniId = () => Math.random().toString(36).slice(2, 9);

function acikMi(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** rengi karart / aç (ribana ve dikiş gölgesi için) */
function tonla(hex: string, oran: number): string {
  const h = hex.replace('#', '');
  const k = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    const s = oran < 0 ? v * (1 + oran) : v + (255 - v) * oran;
    return Math.max(0, Math.min(255, Math.round(s)));
  };
  return `rgb(${k(0)},${k(2)},${k(4)})`;
}

interface Props {
  items: Item[];
  urunler: Item[];
  kurumlar: Item[];
  /** dışarıdan açılacak ürün (ürün sayfasındaki "3B stüdyoda aç") */
  baslangicUrunId?: string | null;
  onUpdateItem: (item: Item) => Promise<void>;
  onAddItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

export default function Studyo3B({ items, urunler, kurumlar, baslangicUrunId, onUpdateItem, onAddItem }: Props) {
  const [urunId, setUrunId] = useState<string>(baslangicUrunId || '');
  const [kalip, setKalip] = useState<Kalip>('tisort');
  const [kesim, setKesim] = useState<Kesim>('regular');
  const [renk, setRenk] = useState('#F3EFE8');
  const [katmanlar, setKatmanlar] = useState<Katman3B[]>([]);
  const [seciliKatman, setSeciliKatman] = useState<string | null>(null);
  const [galeriAcik, setGaleriAcik] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const kapRef = useRef<HTMLDivElement>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const sahneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    giysi: THREE.Group;
    dokular: Record<Yuz, { tuval: HTMLCanvasElement; doku: THREE.CanvasTexture }>;
    maskeler: Record<Yuz, THREE.CanvasTexture | null>;
    ciz: () => void;
  } | null>(null);
  const gorselOnbellek = useRef(new Map<string, HTMLImageElement>());
  const [gorselSayaci, setGorselSayaci] = useState(0);
  const katmanRef = useRef(katmanlar);
  katmanRef.current = katmanlar;

  const galeriGorselleri = useMemo(
    () => items.filter(i => i.type === 'ilham_gorsel' && (i.images || []).length > 0),
    [items]
  );
  const galeriKaynagi = (id?: string) => galeriGorselleri.find(g => g.id === id)?.images?.[0];
  const katmanKaynagi = (k: Katman3B) => k.src || galeriKaynagi(k.galeriId);

  const kurumPaletleri = useMemo(
    () => kurumlar.map(k => ({ kurum: k, renkler: kurumRenkleri(k) })).filter(p => p.renkler.length),
    [kurumlar]
  );

  const urun = urunler.find(u => u.id === urunId) || null;

  // Ürün seçilince kayıtlı tasarımı aç
  useEffect(() => {
    if (baslangicUrunId) setUrunId(baslangicUrunId);
  }, [baslangicUrunId]);
  useEffect(() => {
    const t = (urun?.metadata as any)?.tasarim3b as Tasarim3B | undefined;
    if (!t) return;
    setKalip(t.kalip || 'tisort');
    setKesim(t.kesim || 'regular');
    setRenk(t.renk || '#F3EFE8');
    setKatmanlar(Array.isArray(t.katmanlar) ? t.katmanlar : []);
    setSeciliKatman(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urunId]);

  // ---- sahne: bir kez kurulur ----
  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    kap.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    // sade stüdyo zemini: açık krem, ortası biraz daha aydınlık
    const zemin = document.createElement('canvas');
    zemin.width = 512; zemin.height = 512;
    const zc = zemin.getContext('2d')!;
    const grad = zc.createRadialGradient(256, 210, 40, 256, 256, 380);
    grad.addColorStop(0, '#FBF9F5');
    grad.addColorStop(1, '#E6DFD3');
    zc.fillStyle = grad; zc.fillRect(0, 0, 512, 512);
    const zeminDoku = new THREE.CanvasTexture(zemin);
    zeminDoku.colorSpace = THREE.SRGBColorSpace;
    scene.background = zeminDoku;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    camera.position.set(0, 0.05, 2.25);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d0c2, 1.35));
    const ana = new THREE.DirectionalLight(0xfff6ec, 1.5);
    ana.position.set(-1.2, 1.6, 2.2);
    scene.add(ana);
    const dolgu = new THREE.DirectionalLight(0xeef2ff, 0.55);
    dolgu.position.set(1.8, 0.4, 1.2);
    scene.add(dolgu);
    const arka = new THREE.DirectionalLight(0xffffff, 0.9);
    arka.position.set(0.6, 1.2, -2.4);
    scene.add(arka);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 1.2;
    controls.maxDistance = 4;
    controls.target.set(0, 0.02, 0);

    const giysi = new THREE.Group();
    scene.add(giysi);

    const dokuYap = () => {
      const tuval = document.createElement('canvas');
      tuval.width = TUVAL; tuval.height = TUVAL;
      const doku = new THREE.CanvasTexture(tuval);
      doku.colorSpace = THREE.SRGBColorSpace;
      doku.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return { tuval, doku };
    };

    let kare = 0;
    const ciz = () => renderer.render(scene, camera);
    const dongu = () => {
      kare = requestAnimationFrame(dongu);
      controls.update();
      ciz();
    };
    dongu();

    let kuruldu = false;
    const boyutla = () => {
      const w = kap.clientWidth, h = kap.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      // dar ekranda (telefon) giysi sığsın diye biraz geri çekil
      if (!kuruldu) {
        camera.position.setLength(2.25 / Math.min(1, camera.aspect * 1.15));
        kuruldu = true;
      }
    };
    boyutla();
    const gozcu = new ResizeObserver(boyutla);
    gozcu.observe(kap);

    sahneRef.current = {
      renderer, scene, camera, controls, giysi,
      dokular: { on: dokuYap(), arka: dokuYap() },
      maskeler: { on: null, arka: null },
      ciz
    };

    return () => {
      cancelAnimationFrame(kare);
      gozcu.disconnect();
      controls.dispose();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      sahneRef.current = null;
    };
  }, []);

  // ---- giysi geometrisi: kalıp / kesim değişince ----
  useEffect(() => {
    const s = sahneRef.current;
    if (!s) return;
    s.giysi.children.slice().forEach(c => {
      const m = c as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      s.giysi.remove(m);
    });
    (['on', 'arka'] as Yuz[]).forEach(yuz => {
      const cizgi = kalipCizgisi(kalip, kesim, yuz);
      // maske dokusu: kenarı keskin kesmek için
      const mt = document.createElement('canvas');
      mt.width = TUVAL; mt.height = TUVAL;
      const mc = mt.getContext('2d')!;
      mc.fillStyle = '#000'; mc.fillRect(0, 0, TUVAL, TUVAL);
      mc.fillStyle = '#fff';
      yolCiz(mc, cizgi.dis, TUVAL / ALAN_CM);
      mc.fill();
      s.maskeler[yuz]?.dispose();
      const maske = new THREE.CanvasTexture(mt);
      s.maskeler[yuz] = maske;

      const alan = uzaklikAlani(cizgi, IZGARA);
      const z = kabariklik(alan, IZGARA, kalip === 'sweatshirt' ? 5.5 : 4.2);
      const geo = new THREE.PlaneGeometry(ALAN_CM * BIRIM, ALAN_CM * BIRIM, IZGARA, IZGARA);
      const konum = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < konum.count; i++) konum.setZ(i, z[i] * BIRIM);
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        map: s.dokular[yuz].doku,
        alphaMap: maske,
        alphaTest: 0.5,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.yuz = yuz;
      // yaka çizgisi çizim alanında 10 cm aşağıda; giysiyi ortala
      mesh.position.y = (10 + 36 - ALAN_CM / 2) * BIRIM;
      if (yuz === 'arka') mesh.rotation.y = Math.PI;
      s.giysi.add(mesh);
    });
    dokulariCiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalip, kesim]);

  // ---- dokular: renk / katman değişince ----
  const dokulariCiz = (cerceveli = true) => {
    const s = sahneRef.current;
    if (!s) return;
    const olcek = TUVAL / ALAN_CM;
    (['on', 'arka'] as Yuz[]).forEach(yuz => {
      const { tuval, doku } = s.dokular[yuz];
      const c = tuval.getContext('2d')!;
      const cizgi = kalipCizgisi(kalip, kesim, yuz);
      c.clearRect(0, 0, TUVAL, TUVAL);
      c.fillStyle = renk;
      c.fillRect(0, 0, TUVAL, TUVAL);
      // örgü dokusu: çok ince, göze batmayan
      c.globalAlpha = acikMi(renk) ? 0.035 : 0.06;
      c.fillStyle = acikMi(renk) ? '#000' : '#fff';
      for (let y = 0; y < TUVAL; y += 3) c.fillRect(0, y, TUVAL, 1);
      c.globalAlpha = 1;
      // ribana: etek, kol ağzı, yaka
      const ribana = (p: [number, number][][], dikey: boolean) => {
        c.save();
        c.beginPath();
        p.forEach(q => q.forEach(([x, y], i) => (i ? c.lineTo(x * olcek, y * olcek) : c.moveTo(x * olcek, y * olcek))));
        c.clip();
        c.fillStyle = tonla(renk, -0.06);
        c.fillRect(0, 0, TUVAL, TUVAL);
        c.fillStyle = tonla(renk, -0.16);
        if (dikey) for (let x = 0; x < TUVAL; x += 5) c.fillRect(x, 0, 2, TUVAL);
        c.restore();
      };
      if (cizgi.bantlar.length) ribana(cizgi.bantlar, true);
      // yaka bandı: iki yay arasında
      c.save();
      c.beginPath();
      cizgi.yakaDis.forEach(([x, y], i) => (i ? c.lineTo(x * olcek, y * olcek) : c.moveTo(x * olcek, y * olcek)));
      cizgi.yakaIc.slice().reverse().forEach(([x, y]) => c.lineTo(x * olcek, y * olcek));
      c.closePath();
      c.fillStyle = tonla(renk, -0.1);
      c.fill();
      c.restore();
      // dikiş: kenar boyunca ince gölge
      c.save();
      yolCiz(c, cizgi.dis, olcek);
      c.lineWidth = 6;
      c.strokeStyle = tonla(renk, -0.18);
      c.globalAlpha = 0.5;
      c.stroke();
      c.restore();

      // katmanlar (listenin sonu en üstte)
      for (const k of katmanRef.current) {
        if (k.yuz !== yuz) continue;
        const src = katmanKaynagi(k);
        if (!src) continue;
        let img = gorselOnbellek.current.get(src);
        if (!img) {
          img = new Image();
          img.onload = () => setGorselSayaci(n => n + 1);
          img.src = src;
          gorselOnbellek.current.set(src, img);
        }
        if (!img.complete || !img.naturalWidth) continue;
        const gen = k.olcek * TUVAL;
        const yuk = gen * (img.naturalHeight / img.naturalWidth);
        c.save();
        c.translate(k.x * TUVAL, k.y * TUVAL);
        c.rotate((k.aci * Math.PI) / 180);
        c.drawImage(img, -gen / 2, -yuk / 2, gen, yuk);
        if (cerceveli && k.id === seciliKatman) {
          c.setLineDash([10, 8]);
          c.lineWidth = 3;
          c.strokeStyle = acikMi(renk) ? '#0E1C4F' : '#FAF8F5';
          c.globalAlpha = 0.7;
          c.strokeRect(-gen / 2 - 6, -yuk / 2 - 6, gen + 12, yuk + 12);
        }
        c.restore();
      }
      doku.needsUpdate = true;
    });
  };

  useEffect(() => {
    dokulariCiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renk, katmanlar, seciliKatman, gorselSayaci, galeriGorselleri]);

  // ---- sürükleyerek yerleştirme ----
  useEffect(() => {
    const s = sahneRef.current;
    if (!s) return;
    const el = s.renderer.domElement;
    const isin = new THREE.Raycaster();
    let surukle: { id: string; dx: number; dy: number } | null = null;

    const vur = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      isin.setFromCamera(p, s.camera);
      const sonuc = isin.intersectObjects(s.giysi.children, false)[0];
      if (!sonuc || !sonuc.uv) return null;
      return { yuz: sonuc.object.userData.yuz as Yuz, x: sonuc.uv.x, y: 1 - sonuc.uv.y };
    };
    // noktanın katmanın içinde olup olmadığı (döndürülmüş dikdörtgen)
    const icinde = (k: Katman3B, x: number, y: number) => {
      const src = katmanKaynagi(k);
      const img = src ? gorselOnbellek.current.get(src) : undefined;
      const oran = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
      const a = (-k.aci * Math.PI) / 180;
      const dx = x - k.x, dy = y - k.y;
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      return Math.abs(lx) <= k.olcek / 2 + 0.01 && Math.abs(ly) <= (k.olcek * oran) / 2 + 0.01;
    };

    const bas = (e: PointerEvent) => {
      const v = vur(e);
      if (!v) return;
      const aday = [...katmanRef.current].reverse().find(k => k.yuz === v.yuz && icinde(k, v.x, v.y));
      if (!aday) return;
      surukle = { id: aday.id, dx: aday.x - v.x, dy: aday.y - v.y };
      setSeciliKatman(aday.id);
      s.controls.enabled = false;
      el.setPointerCapture(e.pointerId);
      e.stopPropagation();
    };
    const oynat = (e: PointerEvent) => {
      if (!surukle) {
        const v = vur(e);
        const ustunde = v && katmanRef.current.some(k => k.yuz === v.yuz && icinde(k, v.x, v.y));
        el.style.cursor = ustunde ? 'grab' : '';
        return;
      }
      const v = vur(e);
      if (!v) return;
      const { id, dx, dy } = surukle;
      el.style.cursor = 'grabbing';
      setKatmanlar(ks => ks.map(k => (k.id === id && k.yuz === v.yuz
        ? { ...k, x: Math.min(1, Math.max(0, v.x + dx)), y: Math.min(1, Math.max(0, v.y + dy)) }
        : k)));
    };
    const birak = (e: PointerEvent) => {
      if (!surukle) return;
      surukle = null;
      s.controls.enabled = true;
      el.style.cursor = '';
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    // OrbitControls'tan önce yakalamak için capture aşamasında dinle
    el.addEventListener('pointerdown', bas, { capture: true });
    el.addEventListener('pointermove', oynat);
    el.addEventListener('pointerup', birak);
    el.addEventListener('pointercancel', birak);
    return () => {
      el.removeEventListener('pointerdown', bas, { capture: true });
      el.removeEventListener('pointermove', oynat);
      el.removeEventListener('pointerup', birak);
      el.removeEventListener('pointercancel', birak);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galeriGorselleri]);

  // ---- görünüm düğmeleri ----
  const bak = (yon: 'on' | 'arka' | 'yan') => {
    const s = sahneRef.current;
    if (!s) return;
    const uzak = s.camera.position.distanceTo(s.controls.target);
    const hedef = yon === 'on' ? new THREE.Vector3(0, 0.05, uzak)
      : yon === 'arka' ? new THREE.Vector3(0, 0.05, -uzak)
        : new THREE.Vector3(uzak * 0.72, 0.12, uzak * 0.7);
    const bas = s.camera.position.clone();
    const t0 = performance.now();
    const adim = () => {
      const t = Math.min(1, (performance.now() - t0) / 450);
      const e = t * t * (3 - 2 * t);
      s.camera.position.lerpVectors(bas, hedef, e).setLength(uzak);
      if (t < 1) requestAnimationFrame(adim);
    };
    adim();
  };

  // ---- katman işleri ----
  const katmanEkle = (k: Omit<Katman3B, 'id' | 'x' | 'y' | 'olcek' | 'aci' | 'yuz'>) => {
    const yuz: Yuz = sahneRef.current && sahneRef.current.camera.position.z < 0 ? 'arka' : 'on';
    const yeni: Katman3B = { id: yeniId(), x: 0.5, y: 0.36, olcek: 0.2, aci: 0, yuz, ...k };
    setKatmanlar(ks => [...ks, yeni]);
    setSeciliKatman(yeni.id);
  };

  const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosyalar: File[] = Array.from(e.target.files ?? []);
    for (const d of dosyalar) {
      const ham = await dosyayiOku(d);
      const kucuk = await compressPngKeepAlpha(ham, 700, 700);
      katmanEkle({ ad: d.name.replace(/\.[a-z0-9]+$/i, ''), src: kucuk });
    }
    if (dosyaRef.current) dosyaRef.current.value = '';
  };

  const katmanGuncelle = (id: string, deg: Partial<Katman3B>) =>
    setKatmanlar(ks => ks.map(k => (k.id === id ? { ...k, ...deg } : k)));
  const katmanSil = (id: string) => {
    setKatmanlar(ks => ks.filter(k => k.id !== id));
    if (seciliKatman === id) setSeciliKatman(null);
  };
  const katmanSira = (id: string, yon: -1 | 1) => setKatmanlar(ks => {
    const i = ks.findIndex(k => k.id === id);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= ks.length) return ks;
    const yeni = ks.slice();
    [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    return yeni;
  });

  // ---- çıktılar ----
  const goruntu = (): string | null => {
    const s = sahneRef.current;
    if (!s) return null;
    // seçim çerçevesi görüntüye girmesin
    dokulariCiz(false);
    s.ciz();
    const url = s.renderer.domElement.toDataURL('image/png');
    dokulariCiz();
    return url;
  };

  const dosyaAdi = () => {
    const ad = (urun?.title || 'kems-3b').toLowerCase()
      .replace(/[çc]/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o')
      .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${ad}-${kalip}-${kesim}.png`;
  };

  const secimsizCek = async (): Promise<string | null> => goruntu();

  const indir = async () => {
    const url = await secimsizCek();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = dosyaAdi();
    a.click();
  };

  const galeriyeKaydet = async () => {
    setMesgul(true);
    try {
      const url = await secimsizCek();
      if (!url) return;
      const kucuk = await compressImageBase64(url, 1000, 1000, 0.82);
      await onAddItem({
        title: `${urun?.title || '3B deneme'} · ${kalip === 'tisort' ? 'tişört' : 'sweatshirt'} ${kesim}`,
        area: 'ilham',
        type: 'ilham_gorsel',
        status: 'Arşivde',
        priority: 'düşük',
        tags: ['galeri', 'urun', '3b-studyo'],
        links: urun ? [urun.id] : [],
        notes: '',
        images: [kucuk],
        isProposal: false,
        archived: false,
        metadata: urun ? { gorselTuru: 'urun', kaynak: '3b-studyo', urunId: urun.id } : { gorselTuru: 'urun', kaynak: '3b-studyo' }
      });
      setMesaj("Görüntü Galeri'ye ürün görseli olarak kaydedildi.");
    } catch (e) {
      setMesaj(`Kaydedilemedi: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setMesgul(false);
    }
  };

  const tasarimiKaydet = async () => {
    if (!urun) return;
    setMesgul(true);
    try {
      // Firestore: undefined yazılmaz, anahtar hiç konmaz
      const temiz: Katman3B[] = katmanlar.map(k => {
        const o: Katman3B = { id: k.id, ad: k.ad, yuz: k.yuz, x: k.x, y: k.y, olcek: k.olcek, aci: k.aci };
        if (k.galeriId) o.galeriId = k.galeriId;
        else if (k.src) o.src = k.src;
        return o;
      });
      const tasarim: Tasarim3B = { kalip, kesim, renk, katmanlar: temiz, guncelleme: Date.now() };
      const boyut = JSON.stringify(tasarim).length;
      if (boyut > 850_000) {
        setMesaj("Tasarım çok büyük (yüklenen PNG'ler). PNG'leri önce Galeri'ye yükleyip oradan eklersen sığar.");
        return;
      }
      await onUpdateItem({ ...urun, metadata: { ...(urun.metadata || {}), tasarim3b: tasarim }, updatedAt: Date.now() });
      setMesaj(`Tasarım "${urun.title}" ürününe kaydedildi.`);
    } catch (e) {
      setMesaj(`Kaydedilemedi: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
    } finally {
      setMesgul(false);
    }
  };

  const secili = katmanlar.find(k => k.id === seciliKatman) || null;
  const kayitliTasarim = (urun?.metadata as any)?.tasarim3b as Tasarim3B | undefined;

  const dugme = (aktif: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${aktif
      ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#FAF8F5] border-[#0E1C4F] dark:border-[#2C3C72]'
      : 'bg-[#FAF8F5] dark:bg-[#13204A] text-[#0E1C4F] dark:text-[#F3EFE8] border-[#CFC5B4] hover:bg-[#F3EFE8] dark:hover:bg-[#1B2A5C]'}`;
  const baslik = 'text-[10px] font-mono font-bold uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2';
  const kutu = 'rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] p-4';

  const renkKaresi = (r: { ad: string; renk: string }) => (
    <button
      key={r.renk + r.ad}
      type="button"
      onClick={() => setRenk(r.renk)}
      title={`${r.ad} ${r.renk}`}
      aria-label={`${r.ad} ${r.renk}`}
      className={`w-8 h-8 rounded-full border-2 transition-transform ${renk.toUpperCase() === r.renk.toUpperCase()
        ? 'border-[#F26B6F] scale-110' : 'border-[#CFC5B4] dark:border-[#2C3C72] hover:scale-105'}`}
      style={{ background: r.renk }}
    />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
      {/* sahne */}
      <div className="relative lg:self-start lg:sticky lg:top-4 rounded-2xl overflow-hidden border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#F3EFE8]">
        <div ref={kapRef} className="w-full h-[60vh] min-h-[380px] lg:h-[72vh]" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <button type="button" className={dugme(false)} onClick={() => bak('on')}>Ön</button>
          <button type="button" className={dugme(false)} onClick={() => bak('arka')}>Arka</button>
          <button type="button" className={dugme(false)} onClick={() => bak('yan')}>Yan</button>
        </div>
        <p className="absolute bottom-3 left-3 right-3 text-[11px] text-[#6A5E4C] bg-[#FAF8F5]/85 rounded-lg px-3 py-1.5 w-fit">
          Döndürmek için boş yeri sürükle · PNG'yi giysinin üstünde sürükleyerek yerleştir
        </p>
      </div>

      {/* denetimler */}
      <div className="space-y-3">
        <div className={kutu}>
          <div className={baslik}>Ürün</div>
          <select
            value={urunId}
            onChange={e => setUrunId(e.target.value)}
            className="w-full bg-transparent border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2 py-1.5 text-sm text-[#0E1C4F] dark:text-[#F3EFE8]"
          >
            <option value="">— Ürünsüz deneme —</option>
            {urunler.map(u => (
              <option key={u.id} value={u.id}>
                {u.title}{(u.metadata as any)?.tasarim3b ? ' · 3B tasarımı var' : ''}
              </option>
            ))}
          </select>
          {urun && kayitliTasarim && (
            <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
              Kayıtlı tasarım açıldı ({new Date(kayitliTasarim.guncelleme).toLocaleDateString('tr-TR')}).
            </p>
          )}
        </div>

        <div className={kutu}>
          <div className={baslik}>Kalıp</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={dugme(kalip === 'tisort')} onClick={() => setKalip('tisort')}>Tişört</button>
            <button type="button" className={dugme(kalip === 'sweatshirt')} onClick={() => setKalip('sweatshirt')}>Sweatshirt</button>
            {['Şapka', 'Bez çanta', 'Kupa', 'Poster / sticker'].map(a => (
              <span key={a} className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-[#CFC5B4] text-[#A99C87]" title="Sonra eklenecek">
                {a}
              </span>
            ))}
          </div>
          <div className={`${baslik} mt-3`}>Kesim</div>
          <div className="flex gap-1.5">
            <button type="button" className={dugme(kesim === 'regular')} onClick={() => setKesim('regular')}>Regular</button>
            <button type="button" className={dugme(kesim === 'oversize')} onClick={() => setKesim('oversize')}>Oversize</button>
          </div>
        </div>

        <div className={kutu}>
          <div className={baslik}>Renk</div>
          <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">Kems Company</div>
          <div className="flex flex-wrap gap-2">{MARKA_PALETI.map(renkKaresi)}</div>
          {kurumPaletleri.map(p => (
            <div key={p.kurum.id} className="mt-3">
              <div className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9] mb-1">{p.kurum.title}</div>
              <div className="flex flex-wrap gap-2">{p.renkler.map(renkKaresi)}</div>
            </div>
          ))}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(renk) ? renk : '#F3EFE8'}
              onChange={e => setRenk(e.target.value.toUpperCase())}
              className="w-9 h-9 rounded border border-[#CFC5B4] bg-transparent cursor-pointer"
              aria-label="Serbest renk"
            />
            <input
              value={renk}
              onChange={e => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setRenk(e.target.value.toUpperCase())}
              className="w-28 font-mono text-sm bg-transparent border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2 py-1.5 text-[#0E1C4F] dark:text-[#F3EFE8]"
              aria-label="Renk kodu"
            />
            <span className="text-[11px] text-[#A99C87]">serbest</span>
          </div>
        </div>

        <div className={kutu}>
          <div className={baslik}>Katmanlar</div>
          <div className="flex gap-1.5 mb-3">
            <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={() => dosyaRef.current?.click()}>
              <ImagePlus className="w-3.5 h-3.5" /> PNG ekle
            </button>
            <button type="button" className={`${dugme(galeriAcik)} flex items-center gap-1`} onClick={() => setGaleriAcik(a => !a)}>
              <Images className="w-3.5 h-3.5" /> Galeri'den
            </button>
            <input ref={dosyaRef} type="file" accept="image/png,image/webp,image/jpeg" multiple className="hidden" onChange={dosyaSecildi} />
          </div>
          {galeriAcik && (
            <div className="mb-3 grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
              {galeriGorselleri.length === 0 && (
                <p className="col-span-4 text-[11px] text-[#A99C87]">Galeri'de görsel yok.</p>
              )}
              {galeriGorselleri.map(g => (
                <button
                  key={g.id}
                  type="button"
                  title={g.title}
                  onClick={() => { katmanEkle({ ad: g.title, galeriId: g.id }); setGaleriAcik(false); }}
                  className="aspect-square rounded-md border border-[#CFC5B4] bg-[#F3EFE8] overflow-hidden hover:border-[#F26B6F]"
                >
                  <img src={g.images![0]} alt={g.title} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
          {katmanlar.length === 0 && (
            <p className="text-[11px] text-[#A99C87]">Henüz katman yok. PNG ekle ya da Galeri'den seç.</p>
          )}
          <ul className="space-y-1">
            {katmanlar.slice().reverse().map(k => (
              <li
                key={k.id}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer border ${k.id === seciliKatman
                  ? 'border-[#F26B6F] bg-[#F26B6F]/10' : 'border-transparent hover:bg-[#F3EFE8] dark:hover:bg-[#1B2A5C]'}`}
                onClick={() => setSeciliKatman(k.id)}
              >
                <img src={katmanKaynagi(k)} alt="" className="w-7 h-7 object-contain rounded bg-[#F3EFE8]" />
                <span className="flex-1 truncate text-xs text-[#0E1C4F] dark:text-[#F3EFE8]">{k.ad}</span>
                <span className="text-[10px] font-mono text-[#6A5E4C]">{k.yuz === 'on' ? 'ÖN' : 'ARKA'}</span>
                <button type="button" aria-label="Üste al" onClick={e => { e.stopPropagation(); katmanSira(k.id, 1); }} className="p-0.5 text-[#6A5E4C] hover:text-[#0E1C4F]"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" aria-label="Alta al" onClick={e => { e.stopPropagation(); katmanSira(k.id, -1); }} className="p-0.5 text-[#6A5E4C] hover:text-[#0E1C4F]"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" aria-label="Katmanı sil" onClick={e => { e.stopPropagation(); katmanSil(k.id); }} className="p-0.5 text-[#6A5E4C] hover:text-[#F26B6F]"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
          {secili && (
            <div className="mt-3 pt-3 border-t border-[#CFC5B4] dark:border-[#2C3C72] space-y-2 text-xs text-[#0E1C4F] dark:text-[#F3EFE8]">
              <div className="flex gap-1.5">
                <button type="button" className={dugme(secili.yuz === 'on')} onClick={() => { katmanGuncelle(secili.id, { yuz: 'on' }); bak('on'); }}>Önde</button>
                <button type="button" className={dugme(secili.yuz === 'arka')} onClick={() => { katmanGuncelle(secili.id, { yuz: 'arka' }); bak('arka'); }}>Arkada</button>
                <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={() => katmanGuncelle(secili.id, { x: 0.5, aci: 0 })}>
                  <RotateCcw className="w-3 h-3" /> Ortala
                </button>
              </div>
              <label className="flex items-center gap-2">
                <span className="w-12">Boyut</span>
                <input type="range" min={0.04} max={0.6} step={0.005} value={secili.olcek}
                  onChange={e => katmanGuncelle(secili.id, { olcek: Number(e.target.value) })} className="flex-1 accent-[#F26B6F]" />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-12">Açı</span>
                <input type="range" min={-180} max={180} step={1} value={secili.aci}
                  onChange={e => katmanGuncelle(secili.id, { aci: Number(e.target.value) })} className="flex-1 accent-[#F26B6F]" />
                <span className="w-9 text-right font-mono">{secili.aci}°</span>
              </label>
            </div>
          )}
        </div>

        <div className={kutu}>
          <div className={baslik}>Çıktı</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={indir}>
              <Download className="w-3.5 h-3.5" /> PNG indir
            </button>
            <button type="button" disabled={mesgul} className={`${dugme(false)} flex items-center gap-1 disabled:opacity-50`} onClick={galeriyeKaydet}>
              <Box className="w-3.5 h-3.5" /> Galeri'ye kaydet
            </button>
            <button
              type="button"
              disabled={!urun || mesgul}
              title={urun ? '' : 'Önce yukarıdan bir ürün seç'}
              className={`${dugme(true)} flex items-center gap-1 disabled:opacity-40`}
              onClick={tasarimiKaydet}
            >
              <Save className="w-3.5 h-3.5" /> Tasarımı ürüne kaydet
            </button>
          </div>
          {mesaj && <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{mesaj}</p>}
        </div>
      </div>
    </div>
  );
}

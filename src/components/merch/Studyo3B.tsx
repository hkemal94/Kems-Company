import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Download, ImagePlus, Images, Save, Trash2, ArrowUp, ArrowDown, RotateCcw, Ruler } from 'lucide-react';
import { Item } from '../../types';
import { compressImageBase64, compressPngKeepAlpha, dosyayiOku } from '../../lib/imageCompressor';
import {
  ALAN_CM, KALIPLI, KESIMLI, OLCU_TABLOSU, URUN_ADI, kabariklik, kalipCizgisi, olcuDegerleri, uzaklikAlani, yolCiz,
  type Kalip, type Kesim, type Yuz
} from './kaliplar';

/**
 * Merch → 3B Stüdyo (yapisal-4, 6. tur; 1 Ekim: "tutarlı ve düzenlenebilir
 * 3B ürün görseli, ölçülerden").
 *
 * Ürünler: tişört, sweatshirt, kapüşonlu, bez çanta (kalıptan, yastık gibi
 * kabaran yüzeyler), şapka, kupa, poster (kendi geometrileriyle). Hepsi
 * ölçü tablosundan kurulur (kaliplar.ts); Kemal Ölçüler kutusundan
 * değiştirebilir. Aynı ışık, aynı zemin, aynı kamera açıları: bir dropun
 * ürünleri yan yana tek çekimden çıkmış gibi durur.
 *
 * Düzenlenebilenler: parça parça renk (gövde, kol, ribana, kapüşon, siper,
 * sap, kulp…), PNG katmanları (sürükle, boyut, açı), her katman için baskı
 * ya da nakış görünümü.
 *
 * Kayda yalnız düğmeyle yazılır:
 *   - "Galeri'ye kaydet": o anki görüntü Galeri'ye ürün görseli olarak düşer
 *   - "Tasarımı ürüne kaydet": ürün, kesim, renkler, ölçüler ve katmanlar
 *     ürünün `metadata.tasarim3b` alanına yazılır; ürün seçilince yeniden açılır.
 */

export type Teknik = 'baski' | 'nakis';

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
  /** baskı (varsayılan) ya da nakış görünümü */
  teknik?: Teknik;
}

/** Ürünün parçaları; her birinin rengi ayrı seçilir */
export type Parca = 'govde' | 'kol' | 'ribana' | 'kapuson' | 'ip' | 'sap' | 'siper' | 'dugme' | 'ic' | 'kulp' | 'cerceve';

export const PARCA_ADI: Record<Parca, string> = {
  govde: 'Gövde', kol: 'Kollar', ribana: 'Ribana / yaka', kapuson: 'Kapüşon', ip: 'Kordon',
  sap: 'Saplar', siper: 'Siper', dugme: 'Tepe düğmesi', ic: 'İç', kulp: 'Kulp', cerceve: 'Çerçeve'
};

const PARCALAR: Record<Kalip, Parca[]> = {
  tisort: ['govde', 'kol', 'ribana'],
  sweatshirt: ['govde', 'kol', 'ribana'],
  kapusonlu: ['govde', 'kol', 'ribana', 'kapuson', 'ip'],
  canta: ['govde', 'sap'],
  sapka: ['govde', 'siper', 'dugme'],
  kupa: ['govde', 'ic', 'kulp'],
  poster: ['govde', 'cerceve']
};

export interface Tasarim3B {
  kalip: Kalip;
  kesim: Kesim;
  /** gövde rengi (eski kayıtlarla uyum için ayrıca) */
  renk: string;
  /** parça renkleri; olmayan parça gövde rengini alır */
  renkler?: Partial<Record<Parca, string>>;
  /** Kemal'in ölçü düzeltmeleri (cm); olmayan tablo değeri */
  olcu?: Record<string, number>;
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

const TUVAL = 1024; // doku genişliği
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

/** Dört sabit açı: her ürün aynı açılardan görünür (tutarlılık) */
type Aci = 'on' | 'ucdortte' | 'yan' | 'arka';
const ACI_ADI: Record<Aci, string> = { on: 'Ön', ucdortte: '¾', yan: 'Yan', arka: 'Arka' };
const ACI_YON: Record<Aci, [number, number, number]> = {
  on: [0, 0.06, 1], ucdortte: [0.62, 0.1, 0.78], yan: [1, 0.06, 0.02], arka: [0, 0.06, -1]
};

/** Kupa / şapka / poster dokusunun en-boy oranı (yükseklik / genişlik) */
function dokuOrani(kalip: Kalip, v: Record<string, number>): number {
  if (kalip === 'kupa') return v.boy / (Math.PI * v.cap);
  if (kalip === 'poster') return v.boy / v.en;
  if (kalip === 'sapka') return 0.25;
  return 1;
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

interface Doku { tuval: HTMLCanvasElement; doku: THREE.CanvasTexture }

export default function Studyo3B({ items, urunler, kurumlar, baslangicUrunId, onUpdateItem, onAddItem }: Props) {
  const [urunId, setUrunId] = useState<string>(baslangicUrunId || '');
  const [kalip, setKalip] = useState<Kalip>('tisort');
  const [kesim, setKesim] = useState<Kesim>('regular');
  const [renkler, setRenkler] = useState<Partial<Record<Parca, string>>>({ govde: '#F3EFE8' });
  const [parca, setParca] = useState<Parca>('govde');
  const [olcu, setOlcu] = useState<Record<string, number>>({});
  const [olcuAcik, setOlcuAcik] = useState(false);
  const [katmanlar, setKatmanlar] = useState<Katman3B[]>([]);
  const [seciliKatman, setSeciliKatman] = useState<string | null>(null);
  const [galeriAcik, setGaleriAcik] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const govde = renkler.govde || '#F3EFE8';
  const renkAl = (p: Parca) => renkler[p] || (p === 'ic' ? '#FAF8F5' : p === 'cerceve' ? '#0E1C4F' : govde);

  const kapRef = useRef<HTMLDivElement>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const sahneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    giysi: THREE.Group;
    dokular: Record<Yuz, Doku>;
    dokuYap: (oran: number) => Doku;
    /** ürünün çerçevesi: kamera hedefi ve uzaklığı */
    cerceve: { merkez: THREE.Vector3; uzak: number };
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
  const olcuDeger = useMemo(() => olcuDegerleri(kalip, olcu), [kalip, olcu]);
  const olcuAnahtar = JSON.stringify(olcuDeger);
  const kalipli = KALIPLI.includes(kalip);

  // Ürün seçilince kayıtlı tasarımı aç
  useEffect(() => {
    if (baslangicUrunId) setUrunId(baslangicUrunId);
  }, [baslangicUrunId]);
  useEffect(() => {
    const t = (urun?.metadata as any)?.tasarim3b as Tasarim3B | undefined;
    if (!t) return;
    setKalip(t.kalip || 'tisort');
    setKesim(t.kesim || 'regular');
    setRenkler({ govde: t.renk || '#F3EFE8', ...(t.renkler || {}) });
    setOlcu(t.olcu || {});
    setKatmanlar(Array.isArray(t.katmanlar) ? t.katmanlar : []);
    setSeciliKatman(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urunId]);

  // Ürün değişince parça seçimi gövdeye döner, ölçü düzeltmeleri sıfırlanır
  const urunSec = (k: Kalip) => {
    if (k === kalip) return;
    setKalip(k);
    setParca('govde');
    setOlcu({});
  };

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

    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
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
    controls.target.set(0, 0.02, 0);

    const giysi = new THREE.Group();
    scene.add(giysi);

    const dokuYap = (oran: number): Doku => {
      const tuval = document.createElement('canvas');
      tuval.width = TUVAL; tuval.height = Math.max(64, Math.round(TUVAL * oran));
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

    const boyutla = () => {
      const w = kap.clientWidth, h = kap.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    boyutla();
    const gozcu = new ResizeObserver(boyutla);
    gozcu.observe(kap);

    sahneRef.current = {
      renderer, scene, camera, controls, giysi,
      dokular: { on: dokuYap(1), arka: dokuYap(1) },
      dokuYap,
      cerceve: { merkez: new THREE.Vector3(0, 0.02, 0), uzak: 2.25 },
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

  /** Kamerayı ürüne göre yerleştirir: her ürün kadrajı aynı oranda doldurur */
  const cercevele = (aci: Aci = 'on', animasyon = false) => {
    const s = sahneRef.current;
    if (!s) return;
    const kutu = new THREE.Box3().setFromObject(s.giysi);
    const merkez = kutu.getCenter(new THREE.Vector3());
    const boyut = kutu.getSize(new THREE.Vector3());
    const yaricap = Math.max(boyut.x, boyut.y, boyut.z) * 0.5;
    // dikey açı sığdırır; dar ekranda (telefon) yatay da sığsın diye geri çekil
    const pay = KALIPLI.includes(kalip) ? 1.35 : 1.55;
    const uzak = (yaricap * pay) / Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2)) / Math.min(1, s.camera.aspect);
    s.cerceve = { merkez, uzak };
    s.controls.target.copy(merkez);
    s.controls.minDistance = uzak * 0.45;
    s.controls.maxDistance = uzak * 2.2;
    const [x, y, z] = ACI_YON[aci];
    const hedef = new THREE.Vector3(x, y, z).normalize().multiplyScalar(uzak).add(merkez);
    if (!animasyon) { s.camera.position.copy(hedef); s.controls.update(); return; }
    const bas = s.camera.position.clone();
    const t0 = performance.now();
    const adim = () => {
      const t = Math.min(1, (performance.now() - t0) / 450);
      const e = t * t * (3 - 2 * t);
      s.camera.position.lerpVectors(bas, hedef, e);
      s.camera.position.sub(merkez).setLength(uzak).add(merkez);
      if (t < 1) requestAnimationFrame(adim);
    };
    adim();
  };

  // ---- ürün geometrisi: ürün / kesim / ölçü değişince ----
  useEffect(() => {
    const s = sahneRef.current;
    if (!s) return;
    s.giysi.children.slice().forEach(c => {
      c.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.dispose());
      });
      s.giysi.remove(c);
    });
    // dokular ürünün yüzey oranında yeniden kurulur
    const oran = dokuOrani(kalip, olcuDeger);
    (['on', 'arka'] as Yuz[]).forEach(y => {
      s.dokular[y].doku.dispose();
      s.dokular[y] = s.dokuYap(oran);
    });
    const kumas = (map: THREE.Texture | null, renk?: string, ek: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ map, color: renk ? new THREE.Color(renk) : 0xffffff, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, ...ek });
    const ekle = (geo: THREE.BufferGeometry, mat: THREE.Material, yuz?: Yuz, parcaAdi?: Parca) => {
      const m = new THREE.Mesh(geo, mat);
      if (yuz) m.userData.yuz = yuz;
      if (parcaAdi) m.userData.parca = parcaAdi;
      s.giysi.add(m);
      return m;
    };
    const v = olcuDeger;

    if (KALIPLI.includes(kalip)) {
      (['on', 'arka'] as Yuz[]).forEach(yuz => {
        const cizgi = kalipCizgisi(kalip, kesim, yuz, olcu);
        // maske dokusu: kenarı keskin kesmek için
        const mt = document.createElement('canvas');
        mt.width = TUVAL; mt.height = TUVAL;
        const mc = mt.getContext('2d')!;
        mc.fillStyle = '#000'; mc.fillRect(0, 0, TUVAL, TUVAL);
        mc.fillStyle = '#fff';
        yolCiz(mc, cizgi.dis, TUVAL / ALAN_CM);
        mc.fill();
        const maske = new THREE.CanvasTexture(mt);

        const alan = uzaklikAlani(cizgi, IZGARA);
        const derinlik = kalip === 'canta' ? 1.6 : kalip === 'tisort' ? 4.2 : 5.5;
        const z = kabariklik(alan, IZGARA, derinlik);
        const geo = new THREE.PlaneGeometry(ALAN_CM * BIRIM, ALAN_CM * BIRIM, IZGARA, IZGARA);
        const konum = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < konum.count; i++) konum.setZ(i, z[i] * BIRIM);
        geo.computeVertexNormals();
        const mesh = ekle(geo, kumas(s.dokular[yuz].doku, undefined, { alphaMap: maske, alphaTest: 0.5 }), yuz);
        // yaka çizgisi çizim alanında 10 cm aşağıda; giysiyi ortala
        mesh.position.y = (10 + 36 - ALAN_CM / 2) * BIRIM;
        if (yuz === 'arka') mesh.rotation.y = Math.PI;

        // bez çanta sapları: tüp
        if (kalip === 'canta' && cizgi.saplar && yuz === 'on') {
          const r = (v.sapEn / 2) * BIRIM;
          for (const sap of cizgi.saplar) {
            for (const zKonum of [0.9, -0.9]) {
              const yol = new THREE.CatmullRomCurve3(sap.map(([x, y]) => new THREE.Vector3((x - ALAN_CM / 2) * BIRIM, (ALAN_CM / 2 - y) * BIRIM + mesh.position.y, zKonum * BIRIM)));
              ekle(new THREE.TubeGeometry(yol, 48, r, 10, false), kumas(null, renkAl('sap')), undefined, 'sap');
            }
          }
        }
      });
      // kapüşon: yakanın arkasında yarım kabuk, ağzı öne bakar
      if (kalip === 'kapusonlu') {
        const en = (v.kapusonEn / 2) * BIRIM, boy = v.kapusonBoy * BIRIM;
        const kabuk = new THREE.SphereGeometry(1, 48, 32, Math.PI * 0.08, Math.PI * 0.84, 0, Math.PI * 0.62);
        kabuk.scale(en * 1.05, boy * 0.55, en * 1.25);
        const hood = ekle(kabuk, kumas(null, renkAl('kapuson')), undefined, 'kapuson');
        hood.rotation.x = -0.35;
        hood.rotation.y = Math.PI;
        hood.position.set(0, (ALAN_CM / 2 - 10) * BIRIM + (10 + 36 - ALAN_CM / 2) * BIRIM - boy * 0.08, -en * 0.55);
        // kordonlar
        for (const isaret of [-1, 1]) {
          const ip = ekle(new THREE.CylinderGeometry(0.35 * BIRIM, 0.35 * BIRIM, 26 * BIRIM, 8), kumas(null, renkAl('ip')), undefined, 'ip');
          ip.position.set(isaret * 4 * BIRIM, (ALAN_CM / 2 - 10 - 15) * BIRIM + (10 + 36 - ALAN_CM / 2) * BIRIM, 5.8 * BIRIM);
        }
      }
    } else if (kalip === 'kupa') {
      const r = (v.cap / 2) * BIRIM, h = v.boy * BIRIM;
      const yan = new THREE.CylinderGeometry(r, r, h, 96, 1, true);
      // dikiş yeri arkada kalsın: dokunun ortası (x = 0,5) öne, kulp sağda
      const yanMesh = ekle(yan, new THREE.MeshStandardMaterial({ map: s.dokular.on.doku, roughness: 0.28, metalness: 0, side: THREE.FrontSide }), 'on');
      yanMesh.rotation.y = Math.PI;
      ekle(new THREE.CylinderGeometry(r * 0.94, r * 0.94, h * 0.98, 64, 1, true), new THREE.MeshStandardMaterial({ color: renkAl('ic'), roughness: 0.3, side: THREE.BackSide }), undefined, 'ic');
      const dip = ekle(new THREE.CircleGeometry(r * 0.94, 64), new THREE.MeshStandardMaterial({ color: renkAl('ic'), roughness: 0.3 }), undefined, 'ic');
      dip.rotation.x = -Math.PI / 2; dip.position.y = -h * 0.45;
      const agiz = ekle(new THREE.RingGeometry(r * 0.94, r, 64), new THREE.MeshStandardMaterial({ color: renkAl('ic'), roughness: 0.3, side: THREE.DoubleSide }), undefined, 'ic');
      agiz.rotation.x = -Math.PI / 2; agiz.position.y = h / 2;
      const kulp = ekle(new THREE.TorusGeometry(h * 0.27, r * 0.13, 16, 48, Math.PI * 1.15), new THREE.MeshStandardMaterial({ color: renkAl('kulp'), roughness: 0.28 }), undefined, 'kulp');
      kulp.rotation.z = -Math.PI * 0.575; kulp.position.x = r * 1.02;
    } else if (kalip === 'poster') {
      const w = v.en * BIRIM, h = v.boy * BIRIM;
      ekle(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: s.dokular.on.doku, roughness: 0.85, side: THREE.FrontSide }), 'on');
      const pay = 1.6 * BIRIM, kal = 2 * BIRIM;
      const cerceve = new THREE.Shape();
      cerceve.moveTo(-w / 2 - pay, -h / 2 - pay); cerceve.lineTo(w / 2 + pay, -h / 2 - pay); cerceve.lineTo(w / 2 + pay, h / 2 + pay); cerceve.lineTo(-w / 2 - pay, h / 2 + pay);
      const delik = new THREE.Path();
      delik.moveTo(-w / 2, -h / 2); delik.lineTo(-w / 2, h / 2); delik.lineTo(w / 2, h / 2); delik.lineTo(w / 2, -h / 2);
      cerceve.holes.push(delik);
      const cg = new THREE.ExtrudeGeometry(cerceve, { depth: kal, bevelEnabled: false });
      const cm = ekle(cg, new THREE.MeshStandardMaterial({ color: renkAl('cerceve'), roughness: 0.6 }), undefined, 'cerceve');
      cm.position.z = -kal * 0.6;
      const arkalik = ekle(new THREE.PlaneGeometry(w + pay * 2, h + pay * 2), new THREE.MeshStandardMaterial({ color: renkAl('cerceve'), roughness: 0.6 }), undefined, 'cerceve');
      arkalik.rotation.y = Math.PI; arkalik.position.z = -kal * 0.6;
    } else if (kalip === 'sapka') {
      const r = (v.cevre / (2 * Math.PI)) * BIRIM, tepe = v.tepe * BIRIM;
      const tac = new THREE.SphereGeometry(r, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2);
      // tepe: yarım küreden biraz basık (beyzbol şapkası)
      tac.scale(1, tepe / (r * 1.3), 1);
      ekle(tac, kumas(s.dokular.on.doku), 'on');
      // siper: önde, tepenin alt kenarından dışarı yarım elips; hafif aşağı eğik
      const sd = v.siper * BIRIM;
      const siper = new THREE.Shape();
      siper.moveTo(r * 0.97, 0);
      for (let i = 0; i <= 32; i++) {
        const a = Math.PI * (i / 32);
        siper.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * (r * 0.97 + sd));
      }
      for (let i = 32; i >= 0; i--) {
        const a = Math.PI * (i / 32);
        siper.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93);
      }
      const sg = new THREE.ExtrudeGeometry(siper, { depth: 0.4 * BIRIM, bevelEnabled: true, bevelThickness: 0.1 * BIRIM, bevelSize: 0.15 * BIRIM, bevelSegments: 2 });
      const sm = ekle(sg, kumas(null, renkAl('siper')), undefined, 'siper');
      // şeklin y'si öne (+z), kalınlık aşağı
      sm.rotation.x = Math.PI / 2 + 0.16;
      sm.position.y = 0.2 * BIRIM;
      const dugme = ekle(new THREE.SphereGeometry(0.8 * BIRIM, 16, 8), kumas(null, renkAl('dugme')), undefined, 'dugme');
      dugme.position.y = tepe / 1.3;
    }
    dokulariCiz();
    cercevele('on');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalip, kesim, olcuAnahtar]);

  // parça renkleri (doku dışındaki parçalar): malzeme rengini güncelle
  useEffect(() => {
    const s = sahneRef.current;
    if (!s) return;
    s.giysi.traverse(o => {
      const m = o as THREE.Mesh;
      const p = m.userData?.parca as Parca | undefined;
      if (p && m.material) (m.material as THREE.MeshStandardMaterial).color.set(renkAl(p));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renkler]);

  /** Bir katmanı tuvale çizer; nakışta iplik dokusu ve kabarıklık gölgesi */
  const katmanCiz = (c: CanvasRenderingContext2D, img: HTMLImageElement, gen: number, yuk: number, teknik: Teknik) => {
    if (teknik === 'nakis') {
      const g = Math.max(1, Math.round(gen)), h = Math.max(1, Math.round(yuk));
      const t = document.createElement('canvas');
      t.width = g; t.height = h;
      const tc = t.getContext('2d')!;
      tc.drawImage(img, 0, 0, g, h);
      // iplik: ince eğik çizgiler, açık-koyu sırayla, yalnız görselin üstünde
      tc.globalCompositeOperation = 'source-atop';
      for (let i = -h; i < g; i += 3) {
        tc.strokeStyle = (i / 3) % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)';
        tc.lineWidth = 1.4;
        tc.beginPath(); tc.moveTo(i, 0); tc.lineTo(i + h * 0.7, h); tc.stroke();
      }
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.38)';
      c.shadowBlur = 4; c.shadowOffsetX = 1.5; c.shadowOffsetY = 2;
      c.drawImage(t, -gen / 2, -yuk / 2, gen, yuk);
      c.restore();
      return;
    }
    // baskı: kumaşın örgüsü görselin üstünden hafifçe görünür
    c.drawImage(img, -gen / 2, -yuk / 2, gen, yuk);
  };

  // ---- dokular: renk / katman değişince ----
  const dokulariCiz = (cerceveli = true) => {
    const s = sahneRef.current;
    if (!s) return;
    (['on', 'arka'] as Yuz[]).forEach(yuz => {
      const { tuval, doku } = s.dokular[yuz];
      const W = tuval.width, H = tuval.height;
      const c = tuval.getContext('2d')!;
      c.clearRect(0, 0, W, H);
      c.fillStyle = govde;
      c.fillRect(0, 0, W, H);
      if (kalip !== 'poster' && kalip !== 'kupa' && kalip !== 'sapka') {
        // örgü dokusu: çok ince, göze batmayan
        c.globalAlpha = acikMi(govde) ? 0.035 : 0.06;
        c.fillStyle = acikMi(govde) ? '#000' : '#fff';
        for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
        c.globalAlpha = 1;
      }
      if (kalipli) {
        const olcek = W / ALAN_CM;
        const cizgi = kalipCizgisi(kalip, kesim, yuz, olcu);
        const bolge = (p: [number, number][], renk: string) => {
          c.save();
          c.beginPath();
          p.forEach(([x, y], i) => (i ? c.lineTo(x * olcek, y * olcek) : c.moveTo(x * olcek, y * olcek)));
          c.closePath();
          c.fillStyle = renk;
          c.fill();
          c.restore();
        };
        // kollar
        if (renkAl('kol') !== govde) cizgi.kollar.forEach(k => bolge(k, renkAl('kol')));
        // ribana: etek, kol ağzı, yaka
        const rib = renkAl('ribana');
        const ribana = (p: [number, number][][]) => {
          c.save();
          c.beginPath();
          p.forEach(q => q.forEach(([x, y], i) => (i ? c.lineTo(x * olcek, y * olcek) : c.moveTo(x * olcek, y * olcek))));
          c.clip();
          c.fillStyle = tonla(rib, -0.06);
          c.fillRect(0, 0, W, H);
          c.fillStyle = tonla(rib, -0.16);
          for (let x = 0; x < W; x += 5) c.fillRect(x, 0, 2, H);
          c.restore();
        };
        if (cizgi.bantlar.length) ribana(cizgi.bantlar);
        if (cizgi.yakaDis.length) {
          c.save();
          c.beginPath();
          cizgi.yakaDis.forEach(([x, y], i) => (i ? c.lineTo(x * olcek, y * olcek) : c.moveTo(x * olcek, y * olcek)));
          cizgi.yakaIc.slice().reverse().forEach(([x, y]) => c.lineTo(x * olcek, y * olcek));
          c.closePath();
          c.fillStyle = tonla(rib, -0.1);
          c.fill();
          c.restore();
        }
        // kapüşonlu: önde kanguru cep
        if (kalip === 'kapusonlu' && yuz === 'on') {
          const o = olcuDeger;
          const x0 = ALAN_CM / 2, alt = 10 + o.boy - (o.ribana ?? 6) - 1;
          const cepEn = o.gogus * 0.62, cepBoy = o.boy * 0.28;
          c.save();
          c.beginPath();
          c.moveTo((x0 - cepEn / 2) * olcek, alt * olcek);
          c.lineTo((x0 + cepEn / 2) * olcek, alt * olcek);
          c.lineTo((x0 + cepEn / 2 - 5) * olcek, (alt - cepBoy) * olcek);
          c.lineTo((x0 - cepEn / 2 + 5) * olcek, (alt - cepBoy) * olcek);
          c.closePath();
          c.lineWidth = 5;
          c.strokeStyle = tonla(govde, -0.2);
          c.globalAlpha = 0.55;
          c.stroke();
          c.restore();
        }
        // dikiş: kenar boyunca ince gölge
        c.save();
        yolCiz(c, cizgi.dis, olcek);
        c.lineWidth = 6;
        c.strokeStyle = tonla(govde, -0.18);
        c.globalAlpha = 0.5;
        c.stroke();
        c.restore();
      }

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
        const gen = k.olcek * W;
        const yuk = gen * (img.naturalHeight / img.naturalWidth);
        c.save();
        c.translate(k.x * W, k.y * H);
        c.rotate((k.aci * Math.PI) / 180);
        katmanCiz(c, img, gen, yuk, k.teknik || 'baski');
        if (cerceveli && k.id === seciliKatman) {
          c.setLineDash([10, 8]);
          c.lineWidth = 3;
          c.strokeStyle = acikMi(govde) ? '#0E1C4F' : '#FAF8F5';
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
  }, [renkler, katmanlar, seciliKatman, gorselSayaci, galeriGorselleri]);

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
      // yalnız baskı alanı olan yüzeyler (ön / arka dokusu taşıyanlar)
      const yuzeyler = s.giysi.children.filter(c => c.userData.yuz);
      const sonuc = isin.intersectObjects(yuzeyler, false)[0];
      if (!sonuc || !sonuc.uv) return null;
      return { yuz: sonuc.object.userData.yuz as Yuz, x: sonuc.uv.x, y: 1 - sonuc.uv.y };
    };
    // noktanın katmanın içinde olup olmadığı (döndürülmüş dikdörtgen)
    const icinde = (k: Katman3B, x: number, y: number) => {
      const src = katmanKaynagi(k);
      const img = src ? gorselOnbellek.current.get(src) : undefined;
      const t = s.dokular[k.yuz].tuval;
      const oran = (img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1) * (t.width / t.height);
      const a = (-k.aci * Math.PI) / 180;
      const dx = x - k.x, dy = (y - k.y) * (t.height / t.width);
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      return Math.abs(lx) <= k.olcek / 2 + 0.01 && Math.abs(ly) <= (k.olcek * oran * (t.height / t.width)) / 2 + 0.01;
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
  const bak = (aci: Aci) => cercevele(aci, true);

  /** Baskı alanının varsayılan yeri: ürüne göre */
  const varsayilanYer = (yuz: Yuz): { x: number; y: number; olcek: number } => {
    if (kalip === 'kupa') return { x: 0.5, y: 0.5, olcek: 0.22 };
    if (kalip === 'sapka') return { x: 0.25, y: 0.55, olcek: 0.08 };
    if (kalip === 'poster') return { x: 0.5, y: 0.5, olcek: 0.7 };
    if (kalip === 'canta') return { x: 0.5, y: 0.5, olcek: 0.2 };
    return { x: 0.5, y: yuz === 'arka' ? 0.4 : 0.36, olcek: 0.2 };
  };

  // ---- katman işleri ----
  const katmanEkle = (k: Omit<Katman3B, 'id' | 'x' | 'y' | 'olcek' | 'aci' | 'yuz'>) => {
    const s = sahneRef.current;
    const tekYuz = kalip === 'kupa' || kalip === 'poster' || kalip === 'sapka';
    const yuz: Yuz = !tekYuz && s && s.camera.position.z < s.cerceve.merkez.z ? 'arka' : 'on';
    const yeni: Katman3B = { id: yeniId(), aci: 0, yuz, teknik: 'baski', ...varsayilanYer(yuz), ...k };
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

  const dosyaKoku = () => (urun?.title || 'kems-3b').toLowerCase()
    .replace(/[çc]/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const indirUrl = (url: string, ad: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = ad;
    a.click();
  };

  const indir = () => {
    const url = goruntu();
    if (url) indirUrl(url, `${dosyaKoku()}-${kalip}${KESIMLI.includes(kalip) ? `-${kesim}` : ''}.png`);
  };

  /**
   * Dört açı, aynı kare (1600 × 1600), aynı ışık ve zemin. Bütün ürünlerde
   * aynı kadraj: bir dropun görselleri yan yana tutarlı durur.
   */
  const dortAciIndir = async () => {
    const s = sahneRef.current;
    if (!s) return;
    setMesgul(true);
    const eskiKonum = s.camera.position.clone();
    const eskiOran = s.camera.aspect;
    const eskiBoyut = s.renderer.getSize(new THREE.Vector2());
    const eskiPiksel = s.renderer.getPixelRatio();
    try {
      dokulariCiz(false);
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(1600, 1600, false);
      s.camera.aspect = 1;
      s.camera.updateProjectionMatrix();
      const acilar: Aci[] = KALIPLI.includes(kalip) || kalip === 'sapka' ? ['on', 'ucdortte', 'yan', 'arka'] : ['on', 'ucdortte', 'yan'];
      for (const a of acilar) {
        cercevele(a);
        s.ciz();
        indirUrl(s.renderer.domElement.toDataURL('image/png'), `${dosyaKoku()}-${kalip}-${a === 'ucdortte' ? 'uc-dortte' : a}.png`);
        await new Promise(r => setTimeout(r, 250));
      }
      setMesaj(`${acilar.length} açı indirildi.`);
    } finally {
      s.renderer.setPixelRatio(eskiPiksel);
      s.renderer.setSize(eskiBoyut.x, eskiBoyut.y, false);
      s.camera.aspect = eskiOran;
      s.camera.updateProjectionMatrix();
      s.camera.position.copy(eskiKonum);
      dokulariCiz();
      setMesgul(false);
    }
  };

  const galeriyeKaydet = async () => {
    setMesgul(true);
    try {
      const url = goruntu();
      if (!url) return;
      const kucuk = await compressImageBase64(url, 1000, 1000, 0.82);
      await onAddItem({
        title: `${urun?.title || '3B deneme'} · ${URUN_ADI[kalip].toLocaleLowerCase('tr')}${KESIMLI.includes(kalip) ? ` ${kesim}` : ''}`,
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
        const o: Katman3B = { id: k.id, ad: k.ad, yuz: k.yuz, x: k.x, y: k.y, olcek: k.olcek, aci: k.aci, teknik: k.teknik || 'baski' };
        if (k.galeriId) o.galeriId = k.galeriId;
        else if (k.src) o.src = k.src;
        return o;
      });
      const parcaRenk: Partial<Record<Parca, string>> = {};
      for (const p of PARCALAR[kalip]) if (renkler[p]) parcaRenk[p] = renkler[p]!;
      const tasarim: Tasarim3B = { kalip, kesim, renk: govde, renkler: parcaRenk, olcu: { ...olcu }, katmanlar: temiz, guncelleme: Date.now() };
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
  const parcalar = PARCALAR[kalip];
  const seciliParca = parcalar.includes(parca) ? parca : 'govde';
  const seciliRenk = renkAl(seciliParca);
  const renkVer = (r: string) => setRenkler(x => ({ ...x, [seciliParca]: r }));
  const ikiYuzlu = KALIPLI.includes(kalip);

  const dugme = (aktif: boolean) =>
    `min-h-11 lg:min-h-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${aktif
      ? 'bg-[#0E1C4F] dark:bg-[#2C3C72] text-[#FAF8F5] border-[#0E1C4F] dark:border-[#2C3C72]'
      : 'bg-[#FAF8F5] dark:bg-[#13204A] text-[#0E1C4F] dark:text-[#F3EFE8] border-[#CFC5B4] hover:bg-[#F3EFE8] dark:hover:bg-[#1B2A5C]'}`;
  const baslik = 'text-[10px] font-mono font-bold uppercase tracking-wider text-[#6A5E4C] dark:text-[#A6B0C9] mb-2';
  const kutu = 'rounded-xl border border-[#CFC5B4] dark:border-[#2C3C72] bg-[#FAF8F5] dark:bg-[#13204A] p-4';

  const renkKaresi = (r: { ad: string; renk: string }) => (
    <button
      key={r.renk + r.ad}
      type="button"
      onClick={() => renkVer(r.renk)}
      title={`${r.ad} ${r.renk}`}
      aria-label={`${r.ad} ${r.renk}`}
      className={`w-9 h-9 rounded-full border-2 transition-transform ${seciliRenk.toUpperCase() === r.renk.toUpperCase()
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
          {(['on', 'ucdortte', 'yan', 'arka'] as Aci[]).filter(a => ikiYuzlu || kalip === 'sapka' || a !== 'arka').map(a => (
            <button key={a} type="button" className={dugme(false)} onClick={() => bak(a)}>{ACI_ADI[a]}</button>
          ))}
        </div>
        <p className="absolute bottom-3 left-3 right-3 text-[11px] text-[#6A5E4C] bg-[#FAF8F5]/85 rounded-lg px-3 py-1.5 w-fit">
          Döndürmek için boş yeri sürükle · PNG'yi ürünün üstünde sürükleyerek yerleştir
        </p>
      </div>

      {/* denetimler */}
      <div className="space-y-3">
        <div className={kutu}>
          <div className={baslik}>Merch ürünü</div>
          <select
            value={urunId}
            onChange={e => setUrunId(e.target.value)}
            className="w-full min-h-11 lg:min-h-0 bg-transparent border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2 py-1.5 text-sm text-[#0E1C4F] dark:text-[#F3EFE8]"
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
          <div className={baslik}>Ürün tipi</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(URUN_ADI) as Kalip[]).map(k => (
              <button key={k} type="button" className={dugme(kalip === k)} onClick={() => urunSec(k)}>{URUN_ADI[k]}</button>
            ))}
          </div>
          {KESIMLI.includes(kalip) && (
            <>
              <div className={`${baslik} mt-3`}>Kesim</div>
              <div className="flex gap-1.5">
                <button type="button" className={dugme(kesim === 'regular')} onClick={() => setKesim('regular')}>Regular</button>
                <button type="button" className={dugme(kesim === 'oversize')} onClick={() => setKesim('oversize')}>Oversize</button>
              </div>
            </>
          )}
          <button type="button" onClick={() => setOlcuAcik(a => !a)} className={`${dugme(olcuAcik)} mt-3 flex items-center gap-1`}>
            <Ruler className="w-3.5 h-3.5" /> Ölçüler {Object.keys(olcu).length ? `· ${Object.keys(olcu).length} değişti` : ''}
          </button>
          {olcuAcik && (
            <div className="mt-3 space-y-2 text-xs text-[#0E1C4F] dark:text-[#F3EFE8]">
              <p className="text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">
                {kalipli && kalip !== 'canta'
                  ? 'Referans beden M; ölçüler senin gönderdiğin beden tablosu ve tech pack şablonundaki noktalara göre (cm).'
                  : 'Piyasadaki standart ölçü (cm); istediğin gibi değiştir.'}
              </p>
              {OLCU_TABLOSU[kalip].map(n => (
                <label key={n.id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0">{n.ad}</span>
                  <input type="range" min={n.min} max={n.max} step={0.5} value={olcuDeger[n.id]}
                    onChange={e => setOlcu(o => ({ ...o, [n.id]: Number(e.target.value) }))} className="flex-1 accent-[#F26B6F]" />
                  <span className={`w-12 text-right font-mono ${olcu[n.id] !== undefined ? 'text-[#D6484C] dark:text-[#F26B6F]' : ''}`}>{olcuDeger[n.id]}</span>
                </label>
              ))}
              {Object.keys(olcu).length > 0 && (
                <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={() => setOlcu({})}>
                  <RotateCcw className="w-3 h-3" /> Tablodaki ölçülere dön
                </button>
              )}
            </div>
          )}
        </div>

        <div className={kutu}>
          <div className={baslik}>Renk</div>
          {parcalar.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {parcalar.map(p => (
                <button key={p} type="button" className={`${dugme(seciliParca === p)} flex items-center gap-1.5`} onClick={() => setParca(p)}>
                  <i className="w-3 h-3 rounded-full block border border-black/10" style={{ background: renkAl(p) }} /> {PARCA_ADI[p]}
                </button>
              ))}
            </div>
          )}
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
              value={/^#[0-9a-f]{6}$/i.test(seciliRenk) ? seciliRenk : '#F3EFE8'}
              onChange={e => renkVer(e.target.value.toUpperCase())}
              className="w-9 h-9 rounded border border-[#CFC5B4] bg-transparent cursor-pointer"
              aria-label="Serbest renk"
            />
            <input
              value={seciliRenk}
              onChange={e => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && renkVer(e.target.value.toUpperCase())}
              className="w-28 font-mono text-sm bg-transparent border border-[#CFC5B4] dark:border-[#2C3C72] rounded-lg px-2 py-1.5 text-[#0E1C4F] dark:text-[#F3EFE8]"
              aria-label="Renk kodu"
            />
            <span className="text-[11px] text-[#A99C87]">serbest</span>
          </div>
        </div>

        <div className={kutu}>
          <div className={baslik}>Baskı ve nakış</div>
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
            <p className="text-[11px] text-[#A99C87]">Henüz baskı yok. PNG ekle ya da Galeri'den seç.</p>
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
                <span className="text-[10px] font-mono text-[#6A5E4C]">{k.teknik === 'nakis' ? 'NAKIŞ' : 'BASKI'}{ikiYuzlu ? ` · ${k.yuz === 'on' ? 'ÖN' : 'ARKA'}` : ''}</span>
                <button type="button" aria-label="Üste al" onClick={e => { e.stopPropagation(); katmanSira(k.id, 1); }} className="p-1.5 text-[#6A5E4C] hover:text-[#0E1C4F]"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" aria-label="Alta al" onClick={e => { e.stopPropagation(); katmanSira(k.id, -1); }} className="p-1.5 text-[#6A5E4C] hover:text-[#0E1C4F]"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" aria-label="Katmanı sil" onClick={e => { e.stopPropagation(); katmanSil(k.id); }} className="p-1.5 text-[#6A5E4C] hover:text-[#F26B6F]"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
          {secili && (
            <div className="mt-3 pt-3 border-t border-[#CFC5B4] dark:border-[#2C3C72] space-y-2 text-xs text-[#0E1C4F] dark:text-[#F3EFE8]">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={dugme((secili.teknik || 'baski') === 'baski')} onClick={() => katmanGuncelle(secili.id, { teknik: 'baski' })}>Baskı</button>
                <button type="button" className={dugme(secili.teknik === 'nakis')} onClick={() => katmanGuncelle(secili.id, { teknik: 'nakis' })}>Nakış</button>
                {ikiYuzlu && (
                  <>
                    <button type="button" className={dugme(secili.yuz === 'on')} onClick={() => { katmanGuncelle(secili.id, { yuz: 'on' }); bak('on'); }}>Önde</button>
                    <button type="button" className={dugme(secili.yuz === 'arka')} onClick={() => { katmanGuncelle(secili.id, { yuz: 'arka' }); bak('arka'); }}>Arkada</button>
                  </>
                )}
                <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={() => katmanGuncelle(secili.id, { x: varsayilanYer(secili.yuz).x, aci: 0 })}>
                  <RotateCcw className="w-3 h-3" /> Ortala
                </button>
              </div>
              <label className="flex items-center gap-2">
                <span className="w-12">Boyut</span>
                <input type="range" min={0.02} max={kalip === 'poster' ? 1 : 0.6} step={0.005} value={secili.olcek}
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
            <button type="button" disabled={mesgul} className={`${dugme(true)} flex items-center gap-1 disabled:opacity-50`} onClick={() => void dortAciIndir()}>
              <Download className="w-3.5 h-3.5" /> Bütün açıları indir
            </button>
            <button type="button" className={`${dugme(false)} flex items-center gap-1`} onClick={indir}>
              <Download className="w-3.5 h-3.5" /> Bu görüntüyü indir
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
          <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">Bütün açılar: 1600 × 1600 PNG; her ürün aynı ışık, zemin ve kadrajla.</p>
          {mesaj && <p className="mt-2 text-[11px] text-[#6A5E4C] dark:text-[#A6B0C9]">{mesaj}</p>}
        </div>
      </div>
    </div>
  );
}

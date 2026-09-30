/**
 * 3B stüdyonun giysi kalıpları (yapisal-4, 6. tur).
 *
 * Giysi bir 3B model dosyasından gelmiyor; kalıbı kâğıt gibi çiziyoruz.
 * Ön ve arka parça aynı çizgiden kesilir, kenarda birleşir, ortaya doğru
 * yastık gibi kabarır. Böylece dosya indirmeden, her kesimde (regular,
 * oversize) ayrı ölçüyle çalışan bir tişört / sweatshirt çıkar.
 *
 * Birim santimetre; çizim alanı 120 × 120 cm, yaka ortası (0, 10).
 * x sağa, y aşağı büyür. Sonra sahnede 1 cm = 0,01 birim.
 */

export type Kalip = 'tisort' | 'sweatshirt';
export type Kesim = 'regular' | 'oversize';
export type Yuz = 'on' | 'arka';

export const ALAN_CM = 120;
const UST = 10; // yaka çizgisinin alanın tepesinden uzaklığı

type Nokta = [number, number];

interface Olcu {
  /** yakadan omuz ucuna yarım genişlik */
  omuz: number;
  /** omuzun yakadan aşağı düşüşü */
  omuzDusu: number;
  /** göğüs yarım genişliği */
  gogus: number;
  /** koltuk altının yakadan derinliği */
  koltuk: number;
  /** boy (yakadan etek ucuna) */
  boy: number;
  /** yaka yarım genişliği */
  yaka: number;
  /** yaka derinliği: ön / arka */
  onYaka: number;
  arkaYaka: number;
  /** kol: aşağı açı (derece), uzunluk, ağız genişliği */
  kolAci: number;
  kolBoy: number;
  kolAgiz: number;
  /** ribana (lastik) bant yükseklikleri; 0 = yok */
  etekBant: number;
  kolBant: number;
}

export function olculer(kalip: Kalip, kesim: Kesim): Olcu {
  const bol = kesim === 'oversize';
  if (kalip === 'tisort') {
    return {
      omuz: bol ? 29 : 23, omuzDusu: bol ? 5 : 4,
      gogus: bol ? 31 : 26, koltuk: bol ? 30 : 24,
      boy: bol ? 76 : 71,
      yaka: 9, onYaka: 9, arkaYaka: 2.5,
      kolAci: bol ? 42 : 34, kolBoy: bol ? 24 : 19, kolAgiz: bol ? 20 : 16,
      etekBant: 0, kolBant: 0
    };
  }
  return {
    omuz: bol ? 30 : 24, omuzDusu: bol ? 6 : 4.5,
    gogus: bol ? 32 : 27, koltuk: bol ? 31 : 25,
    boy: bol ? 74 : 68,
    yaka: 9.5, onYaka: 8, arkaYaka: 2.5,
    kolAci: bol ? 66 : 64, kolBoy: bol ? 60 : 58, kolAgiz: bol ? 13 : 12,
    etekBant: 6, kolBant: 6
  };
}

export interface KalipCizgisi {
  /** dış çizgi (kapalı), cm */
  dis: Nokta[];
  /** ribana bantları (etek, iki kol ağzı) — dörtgenler */
  bantlar: Nokta[][];
  /** yaka ribanası: iç ve dış yay */
  yakaDis: Nokta[];
  yakaIc: Nokta[];
}

/** Kalıbın dış çizgisi. `yuz` yalnız yaka derinliğini değiştirir. */
export function kalipCizgisi(kalip: Kalip, kesim: Kesim, yuz: Yuz): KalipCizgisi {
  const o = olculer(kalip, kesim);
  const yakaDerin = yuz === 'on' ? o.onYaka : o.arkaYaka;
  const r = (rad: number) => (rad * Math.PI) / 180;

  // sağ yarıyı kur, sonra aynala
  const omuzU: Nokta = [o.omuz, o.omuzDusu];
  const d: Nokta = [Math.cos(r(o.kolAci)), Math.sin(r(o.kolAci))];
  const dik: Nokta = [-d[1], d[0]]; // kolun içine / aşağı
  const kolDis: Nokta = [omuzU[0] + d[0] * o.kolBoy, omuzU[1] + d[1] * o.kolBoy];
  const kolIc: Nokta = [kolDis[0] + dik[0] * o.kolAgiz, kolDis[1] + dik[1] * o.kolAgiz];
  const koltuk: Nokta = [o.gogus, o.koltuk];
  const etek: Nokta = [o.gogus + (kesim === 'oversize' ? 0 : -0.5), o.boy];

  // yaka: yay
  const yakaYayi = (derin: number, gen: number, n = 12): Nokta[] => {
    const p: Nokta[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n; // 0 = sağ uç, 1 = sol uç
      const a = Math.PI * t;
      p.push([Math.cos(a) * gen, Math.sin(a) * derin]);
    }
    return p;
  };

  const sag: Nokta[] = [
    [o.yaka, 0],
    omuzU,
    kolDis,
    kolIc,
    koltuk,
    etek
  ];
  const sol = sag.map(([x, y]) => [-x, y] as Nokta).reverse();
  // etekten etek'e düz, sonra sol taraf yukarı, yaka yayı sağdan sola değil
  // soldan sağa geri: dış çizgiyi saat yönünde dolaşıyoruz.
  const yay = yakaYayi(yakaDerin, o.yaka).reverse(); // soldan sağa (üst → yay)
  const dis: Nokta[] = [...sag, ...sol, ...yay.slice(1, -1)];

  const kaydir = (p: Nokta[]): Nokta[] => p.map(([x, y]) => [x + ALAN_CM / 2, y + UST]);

  const bantlar: Nokta[][] = [];
  if (o.etekBant > 0) {
    bantlar.push([
      [-etek[0], etek[1] - o.etekBant], [etek[0], etek[1] - o.etekBant],
      [etek[0], etek[1] + 1], [-etek[0], etek[1] + 1]
    ]);
  }
  if (o.kolBant > 0) {
    for (const isaret of [1, -1]) {
      const geri = (p: Nokta, k: number): Nokta => [p[0] - d[0] * k, p[1] - d[1] * k];
      const q = [geri(kolDis, o.kolBant), geri(kolIc, o.kolBant), geri(kolIc, -1), geri(kolDis, -1)];
      bantlar.push(q.map(([x, y]) => [x * isaret, y] as Nokta));
    }
  }
  const yakaGen = 2.2;
  return {
    dis: kaydir(dis),
    bantlar: bantlar.map(kaydir),
    yakaIc: kaydir(yakaYayi(yakaDerin, o.yaka)),
    yakaDis: kaydir(yakaYayi(yakaDerin + yakaGen, o.yaka + yakaGen * 0.6))
  };
}

/** Kalıp çizgisini tuval yoluna çevirir (cm → piksel). */
export function yolCiz(ctx: CanvasRenderingContext2D, p: Nokta[], olcek: number) {
  ctx.beginPath();
  p.forEach(([x, y], i) => (i ? ctx.lineTo(x * olcek, y * olcek) : ctx.moveTo(x * olcek, y * olcek)));
  ctx.closePath();
}

/**
 * Maske ve kenara uzaklık. Giysinin kabarıklığı kenardan uzaklığa göre
 * hesaplanıyor: kenarda 0, ortada en kabarık.
 * Dönen `uzaklik` hücre cinsinden değil, santimetre.
 */
export function uzaklikAlani(cizgi: KalipCizgisi, n: number): { maske: Uint8Array; uzaklik: Float32Array } {
  const tuval = document.createElement('canvas');
  tuval.width = n; tuval.height = n;
  const ctx = tuval.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, n, n);
  ctx.fillStyle = '#fff';
  yolCiz(ctx, cizgi.dis, n / ALAN_CM);
  ctx.fill();
  const veri = ctx.getImageData(0, 0, n, n).data;
  const maske = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) maske[i] = veri[i * 4] > 127 ? 1 : 0;

  // iki geçişli pah uzaklığı (chamfer 3-4)
  const BUYUK = 1e9;
  const u = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) u[i] = maske[i] ? BUYUK : 0;
  const al = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : u[y * n + x]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (!u[i]) continue;
    u[i] = Math.min(u[i], al(x - 1, y) + 3, al(x, y - 1) + 3, al(x - 1, y - 1) + 4, al(x + 1, y - 1) + 4);
  }
  for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
    const i = y * n + x;
    if (!u[i]) continue;
    u[i] = Math.min(u[i], al(x + 1, y) + 3, al(x, y + 1) + 3, al(x + 1, y + 1) + 4, al(x - 1, y + 1) + 4);
  }
  const hucre = ALAN_CM / n;
  for (let i = 0; i < n * n; i++) u[i] = (u[i] / 3) * hucre;
  return { maske, uzaklik: u };
}

/**
 * Bir yüz için tepe yükseklikleri (santimetre). Izgara (n+1)×(n+1) tepe,
 * PlaneGeometry ile aynı sırada: üst satırdan alta, soldan sağa.
 */
export function kabariklik(alan: { maske: Uint8Array; uzaklik: Float32Array }, n: number, derinlik: number): Float32Array {
  const z = new Float32Array((n + 1) * (n + 1));
  const al = (x: number, y: number) => {
    const xi = Math.min(n - 1, Math.max(0, x)), yi = Math.min(n - 1, Math.max(0, y));
    return alan.uzaklik[yi * n + xi];
  };
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    // tepe dört hücrenin köşesinde; en küçüğünü al ki kenar kapansın
    const d = Math.min(al(x - 1, y - 1), al(x, y - 1), al(x - 1, y), al(x, y));
    const t = Math.min(1, d / 14);
    const cx = (x / n) * ALAN_CM, cy = (y / n) * ALAN_CM;
    // kumaş kırışığı: çok hafif, ortada biraz daha belirgin
    const kirisik = 0.25 * t * (Math.sin(cx * 0.21 + cy * 0.07) + 0.6 * Math.sin(cy * 0.33 - cx * 0.11));
    z[y * (n + 1) + x] = d > 0 ? derinlik * Math.sqrt(t) * (1 - 0.15 * t * t) + kirisik : 0;
  }
  return z;
}

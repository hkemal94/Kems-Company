/**
 * Düz [boylam, enlem, …] hattını sadeleştirir (Douglas–Peucker, `pay` metre).
 * 2 Ekim gece: Kurucu'da bir yolun parçası kaldırılınca kalan parça her
 * seferinde 8 kat çoğalıyordu; 351 m'lik bir sokak 4.377 noktaya, harita
 * kaydı 740 KB'a çıktı ve veritabanının günlük yazma kotası doldu. Kayda
 * yazılan her yol buradan geçer; çizgi gözle görülür biçimde değişmez.
 */
const ENLEM_M = 111320;
const BOYLAM_M = 111320 * Math.cos((39.6 * Math.PI) / 180);
export function hattiSadelestir(n: number[], pay = 0.3): number[] {
  const adet = Math.floor(n.length / 2);
  if (adet <= 2) return n;
  const x = (i: number) => n[2 * i] * BOYLAM_M, y = (i: number) => n[2 * i + 1] * ENLEM_M;
  const tut = new Array<boolean>(adet).fill(false);
  tut[0] = tut[adet - 1] = true;
  const yigin: Array<[number, number]> = [[0, adet - 1]];
  while (yigin.length) {
    const [a, b] = yigin.pop()!;
    const dx = x(b) - x(a), dy = y(b) - y(a), l = Math.hypot(dx, dy) || 1e-9;
    let en = -1, enD = pay;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (x(i) - x(a)) - dx * (y(i) - y(a))) / l;
      if (d > enD) { enD = d; en = i; }
    }
    if (en >= 0) { tut[en] = true; yigin.push([a, en], [en, b]); }
  }
  const c: number[] = [];
  for (let i = 0; i < adet; i++) if (tut[i]) c.push(n[2 * i], n[2 * i + 1]);
  return c;
}

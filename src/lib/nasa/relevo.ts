// Relevo do talhão a partir do modelo de elevação SRTM (NASA), servido como "terrarium tiles"
// pelo AWS Open Data (elevation-tiles-prod). Cada pixel PNG codifica a altitude:
// altitude = (R × 256 + G + B / 256) − 32768
import { PNG } from "pngjs";
import type { Polygon } from "geojson";

const TILE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";

export interface ClasseRelevo {
  ate: number;
  nome: string;
}
// Classes de relevo por declividade (Embrapa; Tabela 3 enviada pelo Baeta)
export const CLASSES_RELEVO: ClasseRelevo[] = [
  { ate: 3, nome: "Plano" },
  { ate: 8, nome: "Suave ondulado" },
  { ate: 13, nome: "Moderadamente ondulado" },
  { ate: 20, nome: "Ondulado" },
  { ate: 45, nome: "Forte ondulado" },
  { ate: Infinity, nome: "Montanhoso" },
];

export interface RelevoTalhao {
  fonte: "SRTM (NASA) via AWS Terrain Tiles";
  zoom: number;
  pixel_m: number;
  pontos: number;
  altitude_min: number;
  altitude_max: number;
  altitude_media: number;
  declividade_media: number;
  declividade_p90: number;
  classe: string;
  distribuicao: { nome: string; pct: number }[];
  atualizado_em: string;
}

export function classeDe(decl: number) {
  return CLASSES_RELEVO.find((c) => decl < c.ate)!.nome;
}

function lon2x(lon: number, z: number) { return ((lon + 180) / 360) * 2 ** z; }
function lat2y(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
function x2lon(x: number, z: number) { return (x / 2 ** z) * 360 - 180; }
function y2lat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function dentro(lon: number, lat: number, anel: number[][]) {
  let d = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

async function tile(z: number, x: number, y: number) {
  const res = await fetch(`${TILE}/${z}/${x}/${y}.png`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Relevo: tile ${z}/${x}/${y} respondeu ${res.status}`);
  return PNG.sync.read(Buffer.from(await res.arrayBuffer()));
}

export async function relevoDoTalhao(geom: Polygon): Promise<RelevoTalhao> {
  const anel = geom.coordinates[0];
  const lons = anel.map((c) => c[0]), lats = anel.map((c) => c[1]);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];

  // Zoom mais alto que caiba em até 9 tiles
  let z = 14;
  while (z > 8) {
    const nx = Math.floor(lon2x(e, z)) - Math.floor(lon2x(w, z)) + 1;
    const ny = Math.floor(lat2y(s, z)) - Math.floor(lat2y(n, z)) + 1;
    if (nx * ny <= 9) break;
    z--;
  }
  // Pixels globais (256 por tile) com 1 pixel de margem para o cálculo da declividade
  const px0 = Math.floor(lon2x(w, z) * 256) - 1, px1 = Math.ceil(lon2x(e, z) * 256) + 1;
  const py0 = Math.floor(lat2y(n, z) * 256) - 1, py1 = Math.ceil(lat2y(s, z) * 256) + 1;
  const tx0 = Math.floor(px0 / 256), tx1 = Math.floor(px1 / 256), ty0 = Math.floor(py0 / 256), ty1 = Math.floor(py1 / 256);

  const tiles = new Map<string, PNG>();
  await Promise.all(
    Array.from({ length: tx1 - tx0 + 1 }, (_, i) => tx0 + i).flatMap((tx) =>
      Array.from({ length: ty1 - ty0 + 1 }, (_, j) => ty0 + j).map(async (ty) => tiles.set(`${tx}/${ty}`, await tile(z, tx, ty))),
    ),
  );
  const alt = (px: number, py: number) => {
    const t = tiles.get(`${Math.floor(px / 256)}/${Math.floor(py / 256)}`)!;
    const i = ((py % 256) * 256 + (px % 256)) * 4;
    return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
  };

  const latMedia = (n + s) / 2;
  const pixel = (156543.03392 * Math.cos((latMedia * Math.PI) / 180)) / 2 ** z;
  const decls: number[] = [], alts: number[] = [];
  for (let py = py0 + 1; py < py1; py++) {
    for (let px = px0 + 1; px < px1; px++) {
      const lon = x2lon((px + 0.5) / 256, z), lat = y2lat((py + 0.5) / 256, z);
      if (!dentro(lon, lat, anel)) continue;
      const dzdx = (alt(px + 1, py) - alt(px - 1, py)) / (2 * pixel);
      const dzdy = (alt(px, py + 1) - alt(px, py - 1)) / (2 * pixel);
      decls.push(Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100);
      alts.push(alt(px, py));
    }
  }
  if (!decls.length) {
    // Talhão menor que um pixel: usa o pixel do centro
    const cx = Math.floor(lon2x((w + e) / 2, z) * 256), cy = Math.floor(lat2y((n + s) / 2, z) * 256);
    const dzdx = (alt(cx + 1, cy) - alt(cx - 1, cy)) / (2 * pixel), dzdy = (alt(cx, cy + 1) - alt(cx, cy - 1)) / (2 * pixel);
    decls.push(Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100);
    alts.push(alt(cx, cy));
  }
  const ord = [...decls].sort((a, b) => a - b);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const media = decls.reduce((a, b) => a + b, 0) / decls.length;
  return {
    fonte: "SRTM (NASA) via AWS Terrain Tiles",
    zoom: z,
    pixel_m: Math.round(pixel),
    pontos: decls.length,
    altitude_min: Math.round(Math.min(...alts)),
    altitude_max: Math.round(Math.max(...alts)),
    altitude_media: Math.round(alts.reduce((a, b) => a + b, 0) / alts.length),
    declividade_media: r1(media),
    declividade_p90: r1(ord[Math.floor(ord.length * 0.9)] ?? media),
    classe: classeDe(media),
    distribuicao: CLASSES_RELEVO.map((c, i) => {
      const de = i ? CLASSES_RELEVO[i - 1].ate : 0;
      return { nome: c.nome, pct: Math.round((100 * decls.filter((d) => d >= de && d < c.ate).length) / decls.length) };
    }).filter((d) => d.pct > 0),
    atualizado_em: new Date().toISOString(),
  };
}

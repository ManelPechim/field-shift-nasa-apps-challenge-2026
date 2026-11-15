// Busca de lugares e endereço aproximado de um ponto, pelo OpenStreetMap (Nominatim).
// Uso leve (1 pedido por segundo), chamado pelo navegador do técnico.
const BASE = "https://nominatim.openstreetmap.org";

export interface ResultadoBusca { nome: string; detalhe: string; lat: number; lon: number; zoom: number; tipo: string }
export interface EnderecoPonto { municipio: string | null; uf: string | null; endereco: string | null; nome: string | null }

interface Nominatim {
  lat: string; lon: string; name?: string; display_name: string; addresstype?: string; type?: string; class?: string; category?: string;
  address?: Record<string, string>;
}

const ZOOM: Record<string, number> = { state: 7, municipality: 11, city: 12, town: 13, village: 14, hamlet: 15, suburb: 14, road: 16 };
const GENERICOS = new Set(["road", "city", "town", "village", "municipality", "suburb", "state", "county", "postcode", "neighbourhood", "quarter", "country", "region", "state_district", "city_district"]);

export async function buscarLugares(q: string): Promise<ResultadoBusca[]> {
  const r = await fetch(`${BASE}/search?format=jsonv2&countrycodes=br&limit=6&addressdetails=1&accept-language=pt-BR&q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("busca indisponível");
  const j = (await r.json()) as Nominatim[];
  return j.map((x) => {
    const partes = x.display_name.split(", ");
    return { nome: x.name || partes[0], detalhe: partes.slice(1, 4).join(", "), lat: Number(x.lat), lon: Number(x.lon), zoom: ZOOM[x.addresstype ?? ""] ?? 16, tipo: x.addresstype ?? x.type ?? "" };
  });
}

export async function enderecoDoPonto(lat: number, lon: number): Promise<EnderecoPonto> {
  const r = await fetch(`${BASE}/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=pt-BR&lat=${lat}&lon=${lon}`);
  if (!r.ok) throw new Error("endereço indisponível");
  const x = (await r.json()) as Nominatim;
  const a = x.address ?? {};
  const municipio = a.city ?? a.town ?? a.municipality ?? a.village ?? a.county ?? null;
  const uf = (a["ISO3166-2-lvl4"] ?? "").replace(/^BR-/, "") || null;
  const local = a.hamlet ?? a.village ?? a.suburb ?? a.neighbourhood ?? a.quarter ?? a.isolated_dwelling ?? null;
  const endereco = [a.road, local !== municipio ? local : null, a.postcode].filter(Boolean).join(", ") || null;
  // Só aceita nome de lugar (fazenda, sítio, sede…), nunca de rua ou estrada
  const categoria = x.category ?? x.class ?? "";
  const nome = x.name && !GENERICOS.has(x.addresstype ?? "") && categoria !== "highway" && x.name !== a.road ? x.name : null;
  return { municipio, uf, endereco, nome };
}

/** Aceita "-29.50, -51.96", "-29,50 -51,96" etc. */
export function lerCoordenadas(q: string): { lat: number; lon: number } | null {
  const m = q.match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1].replace(",", ".")), lon = Number(m[2].replace(",", "."));
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

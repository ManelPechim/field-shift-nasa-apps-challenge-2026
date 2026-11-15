import type { Polygon } from "geojson";

/** O ponto [lon, lat] está dentro do polígono? (raio cruzando as bordas do anel externo) */
export function dentroDe(ponto: [number, number], p: Polygon) {
  const [x, y] = ponto;
  const anel = p.coordinates[0];
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function bboxDe(p: Polygon): [number, number, number, number] {
  const xs = p.coordinates[0].map((c) => c[0]), ys = p.coordinates[0].map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function coordenadasBR(lat: number, lon: number) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

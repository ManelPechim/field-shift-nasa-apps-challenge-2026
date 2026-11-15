import type { Polygon } from "geojson";

export function bboxDe(p: Polygon): [number, number, number, number] {
  const xs = p.coordinates[0].map((c) => c[0]), ys = p.coordinates[0].map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

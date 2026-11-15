"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapaLibre, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type StyleSpecification } from "maplibre-gl";
import area from "@turf/area";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { BuscaLocal } from "./busca-local";

// O Turbopack não empacota o worker do MapLibre; o build copia o arquivo para /public (ver "prebuild").
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface TalhaoNoMapa { id: string; nome: string; geojson: Polygon }
export interface Foco { lon: number; lat: number; zoom?: number; n: number }

// Camadas da NASA (GIBS / Worldview). Resolução: MODIS 250 m, SMAP 9 km, HLS 30 m.
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
export const CAMADAS_NASA = {
  ndvi: { nome: "Vegetação (NDVI MODIS, 8 dias)", url: (d: string) => `${GIBS}/MODIS_Terra_NDVI_8Day/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, maxzoom: 9, opacidade: 0.75 },
  smap: { nome: "Umidade da zona das raízes (SMAP L4)", url: (d: string) => `${GIBS}/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/${d}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, maxzoom: 6, opacidade: 0.65 },
  hls: { nome: "Imagem HLS 30 m (Landsat + Sentinel-2)", url: (d: string) => `${GIBS}/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${d}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`, maxzoom: 12, opacidade: 1 },
} as const;
type ChaveCamada = keyof typeof CAMADAS_NASA;

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagem para desenho: Esri, Maxar, Earthstar Geographics",
    },
    nomes: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "esri", type: "raster", source: "esri" },
    { id: "nomes", type: "raster", source: "nomes", paint: { "raster-opacity": 0.85 } },
  ],
};

const VAZIO: FeatureCollection = { type: "FeatureCollection", features: [] };

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

export function Mapa({
  talhoes,
  hrefTalhao,
  limite,
  ponto,
  foco,
  aoTocar,
  aoMoverPonto,
  desenhar,
  rotuloDesenho = "Desenhar talhão",
  busca = true,
  altura = "h-[420px]",
  camadaInicial,
}: {
  talhoes: TalhaoNoMapa[];
  hrefTalhao?: string;
  /** Limite da propriedade (só exibição) */
  limite?: Polygon | null;
  /** Ponto da propriedade [lon, lat] */
  ponto?: [number, number] | null;
  /** Muda o centro do mapa quando `n` muda */
  foco?: Foco | null;
  /** Toque no mapa quando não está desenhando */
  aoTocar?: (lon: number, lat: number) => void;
  /** Ponto arrastado */
  aoMoverPonto?: (lon: number, lat: number) => void;
  desenhar?: (poligono: Polygon | null, hectares: number) => void;
  rotuloDesenho?: string;
  busca?: boolean;
  altura?: string;
  camadaInicial?: ChaveCamada;
}) {
  const router = useRouter();
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const marcador = useRef<Marker | null>(null);
  const pontos = useRef<[number, number][]>([]);
  const desenhandoRef = useRef(false);
  const callbacks = useRef({ aoTocar, aoMoverPonto, desenhar });
  useEffect(() => { callbacks.current = { aoTocar, aoMoverPonto, desenhar }; });
  const [pronto, setPronto] = useState(false);
  const [desenhando, setDesenhando] = useState(false);
  const [nPontos, setNPontos] = useState(0);
  const [camada, setCamada] = useState<ChaveCamada | "">(camadaInicial ?? "");
  const [data, setData] = useState(diasAtras(10));

  useEffect(() => {
    if (!div.current) return;
    const pts = [...talhoes.flatMap((t) => t.geojson.coordinates[0]), ...(limite?.coordinates[0] ?? []), ...(ponto ? [ponto] : [])];
    const m = new MapaLibre({ container: div.current, style: ESTILO, center: ponto ?? [-51.5, -15], zoom: ponto ? 15 : 3.6, maxZoom: 19, attributionControl: { compact: true } });
    mapa.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("limite", { type: "geojson", data: VAZIO });
      m.addLayer({ id: "limite-fill", type: "fill", source: "limite", paint: { "fill-color": "#ffffff", "fill-opacity": 0.08 } });
      m.addLayer({ id: "limite-linha", type: "line", source: "limite", paint: { "line-color": "#ffffff", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
      m.addSource("talhoes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: talhoes.map((t) => ({ type: "Feature", properties: { id: t.id, nome: t.nome }, geometry: t.geojson })) },
      });
      m.addLayer({ id: "talhoes-fill", type: "fill", source: "talhoes", paint: { "fill-color": "#f2c94c", "fill-opacity": 0.18 } });
      m.addLayer({ id: "talhoes-linha", type: "line", source: "talhoes", paint: { "line-color": "#f2c94c", "line-width": 2.5 } });
      m.addSource("rascunho", { type: "geojson", data: VAZIO });
      m.addLayer({ id: "rascunho-fill", type: "fill", source: "rascunho", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#4fc3f7", "fill-opacity": 0.25 } });
      m.addLayer({ id: "rascunho-linha", type: "line", source: "rascunho", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": "#4fc3f7", "line-width": 2.5 } });
      m.addLayer({ id: "rascunho-pontos", type: "circle", source: "rascunho", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#0277bd", "circle-stroke-width": 2 } });
      if (pts.length > 1) {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 50, maxZoom: 16, duration: 0 });
      }
      for (const t of talhoes) {
        const anel = t.geojson.coordinates[0];
        const el = document.createElement("div");
        el.textContent = t.nome;
        el.className = "rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white pointer-events-none";
        new Marker({ element: el }).setLngLat([anel.reduce((a, p) => a + p[0], 0) / anel.length, anel.reduce((a, p) => a + p[1], 0) / anel.length]).addTo(m);
      }
      setPronto(true);
    });
    m.on("click", (e: MapMouseEvent) => {
      if (desenhandoRef.current) {
        pontos.current.push([e.lngLat.lng, e.lngLat.lat]);
        atualizarRascunho();
        return;
      }
      if (callbacks.current.aoTocar) { callbacks.current.aoTocar(e.lngLat.lng, e.lngLat.lat); return; }
      if (!hrefTalhao) return;
      const f = m.queryRenderedFeatures(e.point, { layers: ["talhoes-fill"] })[0];
      if (f?.properties?.id) router.push(`${hrefTalhao}${f.properties.id}`);
    });
    m.on("mousemove", (e: MapMouseEvent) => {
      if (desenhandoRef.current || !m.getLayer("talhoes-fill")) return;
      m.getCanvas().style.cursor = callbacks.current.aoTocar ? "crosshair" : hrefTalhao && m.queryRenderedFeatures(e.point, { layers: ["talhoes-fill"] }).length ? "pointer" : "";
    });
    return () => m.remove();
    // O mapa é criado uma vez; o resto entra pelos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limite da propriedade
  useEffect(() => {
    if (!pronto) return;
    (mapa.current?.getSource("limite") as GeoJSONSource | undefined)?.setData(limite ? { type: "Feature", properties: {}, geometry: limite } : VAZIO);
  }, [limite, pronto]);

  // Ponto da propriedade (marcador arrastável quando há aoMoverPonto)
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (!ponto) { marcador.current?.remove(); marcador.current = null; return; }
    if (!marcador.current) {
      marcador.current = new Marker({ color: "#e53935", draggable: !!callbacks.current.aoMoverPonto }).setLngLat(ponto).addTo(m);
      marcador.current.on("dragend", () => { const p = marcador.current!.getLngLat(); callbacks.current.aoMoverPonto?.(p.lng, p.lat); });
    } else marcador.current.setLngLat(ponto);
  }, [ponto]);

  // Voar até o local buscado
  useEffect(() => {
    if (foco) mapa.current?.flyTo({ center: [foco.lon, foco.lat], zoom: foco.zoom ?? 15 });
  }, [foco]);

  // Camada da NASA escolhida
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    if (m.getLayer("nasa")) m.removeLayer("nasa");
    if (m.getSource("nasa")) m.removeSource("nasa");
    if (!camada) return;
    const c = CAMADAS_NASA[camada];
    m.addSource("nasa", { type: "raster", tiles: [c.url(data)], tileSize: 256, maxzoom: c.maxzoom, attribution: "NASA GIBS / Worldview" });
    m.addLayer({ id: "nasa", type: "raster", source: "nasa", paint: { "raster-opacity": c.opacidade } }, "limite-fill");
  }, [camada, data, pronto]);

  function atualizarRascunho() {
    const p = pontos.current;
    setNPontos(p.length);
    const features: Feature[] = p.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }));
    if (p.length >= 2) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: p } });
    if (p.length >= 3) features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...p, p[0]]] } });
    (mapa.current?.getSource("rascunho") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    const desenhar = callbacks.current.desenhar;
    if (!desenhar) return;
    if (p.length >= 3) {
      const poly: Polygon = { type: "Polygon", coordinates: [[...p, p[0]]] };
      desenhar(poly, area(poly) / 10000);
    } else desenhar(null, 0);
  }

  function comecar() { pontos.current = []; desenhandoRef.current = true; setDesenhando(true); atualizarRascunho(); }
  function concluir() { desenhandoRef.current = false; setDesenhando(false); }
  function desfazer() { pontos.current.pop(); atualizarRascunho(); }
  function limpar() { pontos.current = []; desenhandoRef.current = false; setDesenhando(false); atualizarRascunho(); }

  return (
    <div className="grid gap-2">
      {busca && <BuscaLocal aoEscolher={(l) => mapa.current?.flyTo({ center: [l.lon, l.lat], zoom: l.zoom })} />}
      <div className="relative">
        <div ref={div} className={`w-full overflow-hidden rounded-xl border border-line ${altura}`} />
        {desenhando && (
          <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">
            Toque nos cantos, em volta da área. {nPontos} ponto{nPontos === 1 ? "" : "s"}.
          </div>
        )}
      </div>
      {desenhar && (
        <div className="flex flex-wrap gap-2">
          {!desenhando ? (
            <button type="button" className="btn btn-sm" onClick={comecar}>{nPontos >= 3 ? "Desenhar de novo" : rotuloDesenho}</button>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={concluir} disabled={nPontos < 3}>Concluir desenho</button>
              <button type="button" className="btn-ghost btn-sm" onClick={desfazer} disabled={!nPontos}>Desfazer ponto</button>
              <button type="button" className="btn-ghost btn-sm" onClick={limpar}>Cancelar</button>
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="camada" className="font-semibold">Camada da NASA:</label>
        <select id="camada" className="input w-auto min-h-9 py-1" value={camada} onChange={(e) => setCamada(e.target.value as ChaveCamada | "")}>
          <option value="">Nenhuma (só a imagem)</option>
          {(Object.keys(CAMADAS_NASA) as ChaveCamada[]).map((k) => <option key={k} value={k}>{CAMADAS_NASA[k].nome}</option>)}
        </select>
        {camada && <input type="date" aria-label="Data da camada" className="input w-auto min-h-9 py-1" value={data} max={diasAtras(1)} onChange={(e) => setData(e.target.value)} />}
      </div>
      {camada === "hls" && <p className="fonte">O HLS passa a cada 2 a 3 dias e nuvens escondem a imagem. Se aparecer vazio, troque a data.</p>}
      {camada && camada !== "hls" && <p className="fonte">Resolução {camada === "ndvi" ? "de 250 m" : "de 9 km"}: mostra a tendência da região, não o detalhe dentro do talhão.</p>}
    </div>
  );
}

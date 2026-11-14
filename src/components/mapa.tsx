"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapaLibre, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type StyleSpecification } from "maplibre-gl";
import area from "@turf/area";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";

// O Turbopack não empacota o worker do MapLibre; o build copia o arquivo para /public (ver "prebuild").
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface TalhaoNoMapa { id: string; nome: string; geojson: Polygon }

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

function bboxDe(ts: TalhaoNoMapa[]): [number, number, number, number] | null {
  const pts = ts.flatMap((t) => t.geojson.coordinates[0]);
  if (!pts.length) return null;
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

export function Mapa({
  talhoes,
  hrefTalhao,
  desenhar,
  altura = "h-[420px]",
  camadaInicial,
}: {
  talhoes: TalhaoNoMapa[];
  hrefTalhao?: string;
  desenhar?: (poligono: Polygon | null, hectares: number) => void;
  altura?: string;
  camadaInicial?: ChaveCamada;
}) {
  const router = useRouter();
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const pontos = useRef<[number, number][]>([]);
  const [desenhando, setDesenhando] = useState(false);
  const desenhandoRef = useRef(false);
  const [nPontos, setNPontos] = useState(0);
  const [camada, setCamada] = useState<ChaveCamada | "">(camadaInicial ?? "");
  const [data, setData] = useState(diasAtras(10));
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!div.current) return;
    const bb = bboxDe(talhoes);
    const m = new MapaLibre({
      container: div.current,
      style: ESTILO,
      center: [-51.9, -29.5],
      zoom: 4,
      maxZoom: 19,
      attributionControl: { compact: true },
    });
    mapa.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("talhoes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: talhoes.map((t) => ({ type: "Feature", properties: { id: t.id, nome: t.nome }, geometry: t.geojson })) },
      });
      m.addLayer({ id: "talhoes-fill", type: "fill", source: "talhoes", paint: { "fill-color": "#f2c94c", "fill-opacity": 0.18 } });
      m.addLayer({ id: "talhoes-linha", type: "line", source: "talhoes", paint: { "line-color": "#f2c94c", "line-width": 2.5 } });
      m.addSource("rascunho", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "rascunho-fill", type: "fill", source: "rascunho", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#4fc3f7", "fill-opacity": 0.25 } });
      m.addLayer({ id: "rascunho-linha", type: "line", source: "rascunho", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": "#4fc3f7", "line-width": 2.5 } });
      m.addLayer({ id: "rascunho-pontos", type: "circle", source: "rascunho", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#0277bd", "circle-stroke-width": 2 } });
      if (bb) m.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 50, maxZoom: 16, duration: 0 });
      for (const t of talhoes) {
        const anel = t.geojson.coordinates[0];
        const cx = anel.reduce((a, p) => a + p[0], 0) / anel.length, cy = anel.reduce((a, p) => a + p[1], 0) / anel.length;
        const el = document.createElement("div");
        el.textContent = t.nome;
        el.className = "rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white pointer-events-none";
        new Marker({ element: el }).setLngLat([cx, cy]).addTo(m);
      }
    });
    m.on("click", (e: MapMouseEvent) => {
      if (desenhandoRef.current) {
        pontos.current.push([e.lngLat.lng, e.lngLat.lat]);
        atualizarRascunho();
        return;
      }
      if (!hrefTalhao) return;
      const f = m.queryRenderedFeatures(e.point, { layers: ["talhoes-fill"] })[0];
      if (f?.properties?.id) router.push(`${hrefTalhao}${f.properties.id}`);
    });
    m.on("mousemove", (e: MapMouseEvent) => {
      if (desenhandoRef.current || !hrefTalhao || !m.getLayer("talhoes-fill")) return;
      m.getCanvas().style.cursor = m.queryRenderedFeatures(e.point, { layers: ["talhoes-fill"] }).length ? "pointer" : "";
    });
    return () => m.remove();
    // O mapa é criado uma vez; mudanças nos talhões recarregam a página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camada da NASA escolhida
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      if (m.getLayer("nasa")) m.removeLayer("nasa");
      if (m.getSource("nasa")) m.removeSource("nasa");
      if (!camada) return;
      const c = CAMADAS_NASA[camada];
      m.addSource("nasa", { type: "raster", tiles: [c.url(data)], tileSize: 256, maxzoom: c.maxzoom, attribution: "NASA GIBS / Worldview" });
      m.addLayer({ id: "nasa", type: "raster", source: "nasa", paint: { "raster-opacity": c.opacidade } }, m.getLayer("talhoes-fill") ? "talhoes-fill" : undefined);
    };
    if (m.isStyleLoaded()) aplicar(); else m.once("load", aplicar);
  }, [camada, data]);

  function atualizarRascunho() {
    const m = mapa.current;
    const p = pontos.current;
    setNPontos(p.length);
    const features: Feature[] = p.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }));
    if (p.length >= 2) features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: p } });
    if (p.length >= 3) features.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...p, p[0]]] } });
    (m?.getSource("rascunho") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features } as FeatureCollection);
    if (desenhar) {
      if (p.length >= 3) {
        const poly: Polygon = { type: "Polygon", coordinates: [[...p, p[0]]] };
        desenhar(poly, area(poly) / 10000);
      } else desenhar(null, 0);
    }
  }

  function comecar() { pontos.current = []; desenhandoRef.current = true; setDesenhando(true); atualizarRascunho(); }
  function concluir() { desenhandoRef.current = false; setDesenhando(false); }
  function desfazer() { pontos.current.pop(); atualizarRascunho(); }
  function limpar() { pontos.current = []; desenhandoRef.current = false; setDesenhando(false); atualizarRascunho(); }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setAviso("");
    const coord = busca.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
    if (coord) {
      const lat = Number(coord[1].replace(",", ".")), lon = Number(coord[2].replace(",", "."));
      mapa.current?.flyTo({ center: [lon, lat], zoom: 15 });
      return;
    }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(busca)}`);
      const j = await r.json();
      if (!j[0]) { setAviso("Não encontrei esse lugar. Tente “cidade, UF” ou coordenadas."); return; }
      mapa.current?.flyTo({ center: [Number(j[0].lon), Number(j[0].lat)], zoom: 13 });
    } catch {
      setAviso("A busca falhou. Tente de novo ou digite as coordenadas.");
    }
  }

  function gps() {
    setAviso("");
    if (!navigator.geolocation) { setAviso("Este aparelho não informa a localização."); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => mapa.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 16 }),
      () => setAviso("Não foi possível pegar a localização. Autorize o acesso ao GPS no navegador."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="grid gap-2">
      <form onSubmit={buscar} className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cidade ou coordenadas (-29.50, -51.96)" aria-label="Buscar lugar" />
        <button className="btn-ghost btn-sm">Buscar</button>
        <button type="button" className="btn-ghost btn-sm" onClick={gps}>Usar meu GPS</button>
      </form>
      {aviso && <p className="text-sm text-bad">{aviso}</p>}
      <div className="relative">
        <div ref={div} className={`w-full overflow-hidden rounded-xl border border-line ${altura}`} />
        {desenhando && (
          <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">
            Toque nos cantos do talhão, em volta. {nPontos} ponto{nPontos === 1 ? "" : "s"}.
          </div>
        )}
      </div>
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
      {desenhar && (
        <div className="flex flex-wrap gap-2">
          {!desenhando ? (
            <button type="button" className="btn btn-sm" onClick={comecar}>{nPontos >= 3 ? "Desenhar de novo" : "Desenhar talhão"}</button>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={concluir} disabled={nPontos < 3}>Concluir desenho</button>
              <button type="button" className="btn-ghost btn-sm" onClick={desfazer} disabled={!nPontos}>Desfazer ponto</button>
              <button type="button" className="btn-ghost btn-sm" onClick={limpar}>Cancelar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

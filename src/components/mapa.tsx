"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapaLibre, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type StyleSpecification } from "maplibre-gl";
import area from "@turf/area";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { BuscaLocal } from "./busca-local";
import { CAMADAS_NASA, LegendaSobreMapa, SobreCamada, type ChaveCamada } from "./camadas-nasa";
import { IconeCancelar, IconeConcluir, IconeDesenhar, IconeDesfazer, IconeRefazer } from "./icones";
import { COR_DA_SITUACAO, NOME_DA_SITUACAO, type PinoNoMapa } from "@/lib/pinos";

// O Turbopack não empacota o worker do MapLibre; o build copia o arquivo para /public (ver "prebuild").
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export const COR_PADRAO = "#f2c94c";
export interface TalhaoNoMapa { id: string; nome: string; geojson: Polygon; cor?: string }
/** Leva o mapa até um ponto (lon/lat/zoom) ou enquadra uma área (bbox: oeste, sul, leste, norte). Muda quando `n` muda. */
export interface Foco { lon: number; lat: number; zoom?: number; bbox?: [number, number, number, number]; n: number }

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagem de satélite: Esri, Maxar, Earthstar Geographics",
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
  corDesenho = "#4fc3f7",
  destaque,
  busca = true,
  altura = "h-[420px]",
  camadaInicial,
  camadas = true,
  pinos,
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
  /** Cor do desenho em andamento */
  corDesenho?: string;
  /** Talhão realçado (linha mais grossa) */
  destaque?: string | null;
  busca?: boolean;
  altura?: string;
  camadaInicial?: ChaveCamada;
  /** false: só a imagem de satélite, sem o seletor de camadas da NASA */
  camadas?: boolean;
  /** Relatos no local anexado; somem enquanto se desenha para não atrapalhar os toques */
  pinos?: PinoNoMapa[];
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
  const [opacidade, setOpacidade] = useState<number>(camadaInicial ? CAMADAS_NASA[camadaInicial].opacidade : 0.75);
  const [explicar, setExplicar] = useState(!!camadaInicial);

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
        data: { type: "FeatureCollection", features: talhoes.map((t) => ({ type: "Feature", properties: { id: t.id, nome: t.nome, cor: t.cor ?? COR_PADRAO }, geometry: t.geojson })) },
      });
      m.addLayer({ id: "talhoes-fill", type: "fill", source: "talhoes", paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.25 } });
      m.addLayer({ id: "talhoes-linha", type: "line", source: "talhoes", paint: { "line-color": ["get", "cor"], "line-width": 2.5 } });
      m.addSource("rascunho", { type: "geojson", data: VAZIO });
      m.addLayer({ id: "rascunho-fill", type: "fill", source: "rascunho", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": corDesenho, "fill-opacity": 0.3 } });
      m.addLayer({ id: "rascunho-linha", type: "line", source: "rascunho", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": corDesenho, "line-width": 3 } });
      m.addLayer({ id: "rascunho-pontos", type: "circle", source: "rascunho", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": corDesenho, "circle-stroke-width": 2 } });
      if (pts.length > 1) {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 50, maxZoom: 16, duration: 0 });
      }
      setPronto(true);
    });
    m.on("click", (e: MapMouseEvent) => {
      // Toque num pino é dele (o pino tem o próprio link), não do talhão por baixo
      if ((e.originalEvent.target as HTMLElement | null)?.closest?.(".maplibregl-marker[href]")) return;
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
    // O mapa pode nascer numa coluna que ainda está se ajustando: acompanha o tamanho do contêiner
    const tamanho = new ResizeObserver(() => m.resize());
    tamanho.observe(div.current);
    // O marcador do ponto pertence a este mapa: sai junto para ser recriado no próximo
    return () => { tamanho.disconnect(); marcador.current?.remove(); marcador.current = null; m.remove(); };
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

  // Voar até o local buscado ou enquadrar uma área
  useEffect(() => {
    // Espera o mapa carregar: senão o enquadramento inicial (todos os talhões) sobrescreve o foco
    if (!foco || !pronto) return;
    if (foco.bbox) mapa.current?.fitBounds([[foco.bbox[0], foco.bbox[1]], [foco.bbox[2], foco.bbox[3]]], { padding: 70, maxZoom: 17 });
    else mapa.current?.flyTo({ center: [foco.lon, foco.lat], zoom: foco.zoom ?? 15 });
  }, [foco, pronto]);

  // Talhões e seus nomes acompanham a prop: editar nome, cor ou contorno atualiza o mapa sem recriá-lo
  const chaveTalhoes = JSON.stringify(talhoes);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    const lista = JSON.parse(chaveTalhoes) as TalhaoNoMapa[];
    (m.getSource("talhoes") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: lista.map((t) => ({ type: "Feature", properties: { id: t.id, nome: t.nome, cor: t.cor ?? COR_PADRAO }, geometry: t.geojson })),
    });
    const rotulos = lista.map((t) => {
      const anel = t.geojson.coordinates[0];
      const el = document.createElement("div");
      el.textContent = t.nome;
      el.className = "rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white pointer-events-none";
      return new Marker({ element: el }).setLngLat([anel.reduce((a, p) => a + p[0], 0) / anel.length, anel.reduce((a, p) => a + p[1], 0) / anel.length]).addTo(m);
    });
    return () => rotulos.forEach((r) => r.remove());
  }, [chaveTalhoes, pronto]);

  // Pinos (relatos): um link por pino, que leva ao relato
  const chavePinos = JSON.stringify(pinos ?? []);
  useEffect(() => {
    const m = mapa.current;
    const lista = JSON.parse(chavePinos) as PinoNoMapa[];
    if (!m || !pronto || desenhando || !lista.length) return;
    const criados = lista.map((p) => {
      const el = document.createElement("a");
      el.href = p.href;
      el.title = p.titulo;
      el.setAttribute("aria-label", p.titulo);
      el.className = "block size-5 rounded-full border-[3px] border-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
      el.style.background = p.cor;
      el.addEventListener("click", (e) => { e.preventDefault(); router.push(p.href); });
      return new Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m);
    });
    return () => criados.forEach((c) => c.remove());
  }, [chavePinos, pronto, desenhando, router]);

  // Talhão realçado
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    const id = destaque ?? "";
    m.setPaintProperty("talhoes-linha", "line-width", ["case", ["==", ["get", "id"], id], 5, 2.5]);
    m.setPaintProperty("talhoes-fill", "fill-opacity", ["case", ["==", ["get", "id"], id], 0.45, 0.25]);
  }, [destaque, pronto]);

  // Cor do desenho em andamento
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    m.setPaintProperty("rascunho-fill", "fill-color", corDesenho);
    m.setPaintProperty("rascunho-linha", "line-color", corDesenho);
    m.setPaintProperty("rascunho-pontos", "circle-stroke-color", corDesenho);
  }, [corDesenho, pronto]);

  // Camada da NASA escolhida
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    if (m.getLayer("nasa")) m.removeLayer("nasa");
    if (m.getSource("nasa")) m.removeSource("nasa");
    if (!camada) return;
    const c = CAMADAS_NASA[camada];
    m.addSource("nasa", { type: "raster", tiles: [c.url(data)], tileSize: 256, maxzoom: c.maxzoom, attribution: "NASA GIBS / Worldview" });
    m.addLayer({ id: "nasa", type: "raster", source: "nasa", paint: { "raster-opacity": opacidade } }, "limite-fill");
    // A opacidade tem efeito próprio abaixo; não recria a camada a cada ajuste
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camada, data, pronto]);

  useEffect(() => {
    const m = mapa.current;
    if (m?.getLayer("nasa")) m.setPaintProperty("nasa", "raster-opacity", opacidade);
  }, [opacidade]);

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
      <div className={desenhar ? "grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]" : ""}>
      {desenhar && (
        <div className="flex flex-wrap content-start gap-2 md:flex-col md:flex-nowrap" role="toolbar" aria-label="Ferramentas de desenho">
          {!desenhando ? (
            <button type="button" className="btn btn-sm justify-start" onClick={comecar}>{nPontos >= 3 ? <IconeRefazer /> : <IconeDesenhar />}{nPontos >= 3 ? "Desenhar de novo" : rotuloDesenho}</button>
          ) : (
            <>
              <button type="button" className="btn btn-sm justify-start" onClick={concluir} disabled={nPontos < 3}><IconeConcluir />Concluir desenho</button>
              <button type="button" className="btn-ghost btn-sm justify-start" onClick={desfazer} disabled={!nPontos}><IconeDesfazer />Desfazer ponto</button>
              <button type="button" className="btn-ghost btn-sm justify-start" onClick={limpar}><IconeCancelar />Cancelar</button>
              <p className="text-xs text-muted md:mt-1">{nPontos < 3 ? "Marque pelo menos 3 cantos no mapa." : "Toque em Concluir quando fechar a área."}</p>
            </>
          )}
        </div>
      )}
      <div className="relative">
        <div ref={div} className={`w-full overflow-hidden rounded-xl border border-line ${altura}`} />
        {desenhando && (
          <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/75 px-2 py-1 text-xs text-white">
            Toque nos cantos, em volta da área. {nPontos} ponto{nPontos === 1 ? "" : "s"}.
          </div>
        )}
        {camada && <LegendaSobreMapa chave={camada} abaixo={desenhando} />}
      </div>
      </div>
      {!!pinos?.length && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <b className="font-semibold">Relatos:</b>
          {(Object.keys(COR_DA_SITUACAO) as (keyof typeof COR_DA_SITUACAO)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="size-3.5 rounded-full border-2 border-white shadow" style={{ background: COR_DA_SITUACAO[k] }} aria-hidden="true" />{NOME_DA_SITUACAO[k]}
            </span>
          ))}
          <span className="text-muted">Toque no pino para abrir o relato.</span>
        </div>
      )}
      {camadas && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <label htmlFor="camada" className="font-semibold">Camada da NASA:</label>
        <select id="camada" className="input w-auto min-h-9 py-1" value={camada}
          onChange={(e) => { const k = e.target.value as ChaveCamada | ""; setCamada(k); if (k) { setOpacidade(CAMADAS_NASA[k].opacidade); setExplicar(true); } }}>
          <option value="">Nenhuma (só a imagem de fundo)</option>
          {(Object.keys(CAMADAS_NASA) as ChaveCamada[]).map((k) => <option key={k} value={k}>{CAMADAS_NASA[k].nome}</option>)}
        </select>
        {camada && (
          <>
            <label className="flex items-center gap-1.5">Data <input type="date" className="input w-auto min-h-9 py-1" value={data} max={diasAtras(1)} onChange={(e) => setData(e.target.value)} /></label>
            <label className="flex items-center gap-1.5">Intensidade
              <input type="range" min={0.2} max={1} step={0.05} value={opacidade} onChange={(e) => setOpacidade(Number(e.target.value))} className="w-24 accent-[var(--brand)]" />
            </label>
          </>
        )}
        <button type="button" className="text-sm font-semibold text-brand underline" onClick={() => setExplicar(!explicar)} aria-expanded={explicar}>
          {explicar ? "Esconder explicação" : "O que é esta camada?"}
        </button>
      </div>}
      {camadas && explicar && <SobreCamada chave={camada} data={data} />}
    </div>
  );
}

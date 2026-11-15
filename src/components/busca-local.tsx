"use client";

import { useState } from "react";
import { buscarLugares, lerCoordenadas, type ResultadoBusca } from "@/lib/geocodificacao";

export interface Local { lon: number; lat: number; zoom: number; origem: "busca" | "coordenadas" | "gps" }

/** Barra de busca: município, endereço, nome de lugar, coordenadas ou GPS do aparelho. */
export function BuscaLocal({ aoEscolher, placeholder }: { aoEscolher: (l: Local) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [aviso, setAviso] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(""); setResultados([]);
    if (!q.trim()) return;
    const c = lerCoordenadas(q);
    if (c) { aoEscolher({ ...c, zoom: 16, origem: "coordenadas" }); return; }
    setBuscando(true);
    try {
      const r = await buscarLugares(q);
      if (!r.length) setAviso("Não encontrei esse lugar. Tente “município, UF”, uma estrada ou coordenadas.");
      else if (r.length === 1) aoEscolher({ lat: r[0].lat, lon: r[0].lon, zoom: r[0].zoom, origem: "busca" });
      else setResultados(r);
    } catch {
      setAviso("A busca não respondeu. Tente de novo ou digite as coordenadas.");
    } finally { setBuscando(false); }
  }

  function gps() {
    setAviso(""); setResultados([]);
    if (!navigator.geolocation) { setAviso("Este aparelho não informa a localização."); return; }
    setAviso("Pegando sua localização…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setAviso(""); aoEscolher({ lon: p.coords.longitude, lat: p.coords.latitude, zoom: 17, origem: "gps" }); },
      () => setAviso("Não foi possível pegar a localização. Autorize o GPS no navegador."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="relative">
      <form onSubmit={buscar} className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar lugar"
          placeholder={placeholder ?? "Município, estrada, nome do lugar ou coordenadas (-29.50, -51.96)"} />
        <button className="btn-ghost btn-sm" disabled={buscando}>{buscando ? "Buscando…" : "Buscar"}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={gps}>Estou no local (GPS)</button>
      </form>
      {aviso && <p className="mt-1 text-sm text-muted">{aviso}</p>}
      {resultados.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg" role="listbox" aria-label="Resultados da busca">
          {resultados.map((r, i) => (
            <li key={i}>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => { setResultados([]); aoEscolher({ lat: r.lat, lon: r.lon, zoom: r.zoom, origem: "busca" }); }}>
                <b className="block">{r.nome}</b>
                <span className="text-sm text-muted">{r.detalhe}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

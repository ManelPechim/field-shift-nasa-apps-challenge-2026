"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Polygon } from "geojson";
import { Area } from "@/components/area";
import { IconeVerNoMapa } from "@/components/icones";
import { Mapa, type Foco } from "@/components/mapa";

/** Cores que aparecem bem sobre a imagem de satélite */
const PALETA = [
  ["#f2c94c", "Amarelo"], ["#ff8a3d", "Laranja"], ["#ef4444", "Vermelho"], ["#ec4899", "Rosa"], ["#a855f7", "Roxo"],
  ["#38bdf8", "Azul"], ["#22d3ee", "Ciano"], ["#a3e635", "Verde-limão"], ["#ffffff", "Branco"],
] as const;

export interface TalhaoDaLista { id: string; nome: string; geojson: Polygon; area_ha: number | null; cor: string; rotacao: string | null }

function bbox(p: Polygon): [number, number, number, number] {
  const xs = p.coordinates[0].map((c) => c[0]), ys = p.coordinates[0].map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function TalhoesDaPropriedade({
  propriedadeId, talhoes, limite, ponto, rotacoes, acao,
}: {
  propriedadeId: string;
  talhoes: TalhaoDaLista[];
  limite: Polygon | null;
  ponto: [number, number];
  rotacoes: { id: string; nome: string; regiao: string }[];
  acao: (form: FormData) => Promise<void>;
}) {
  const usadas = new Set(talhoes.map((t) => t.cor.toLowerCase()));
  const [cor, setCor] = useState<string>(PALETA.find(([c]) => !usadas.has(c))?.[0] ?? PALETA[0][0]);
  const [poligono, setPoligono] = useState<Polygon | null>(null);
  const [ha, setHa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [foco, setFoco] = useState<Foco | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const n = useRef(0);
  const areaMapa = useRef<HTMLDivElement>(null);
  const regiao = ponto[1] < -24 ? "sul" : "cerrado";

  function verNoMapa(t: TalhaoDaLista) {
    const b = bbox(t.geojson);
    setFoco({ lon: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2, bbox: b, n: ++n.current });
    setDestaque(t.id);
    areaMapa.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="h2 mb-3">Talhões cadastrados {talhoes.length > 0 && <span className="font-normal text-muted">({talhoes.length})</span>}</h2>
        {!talhoes.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-5 text-center text-sm text-muted">
            Nenhum talhão ainda. Desenhe o primeiro no mapa abaixo.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {talhoes.map((t) => (
              <li key={t.id} className={`card grid gap-2 p-3 ${destaque === t.id ? "border-brand ring-1 ring-brand" : ""}`}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 size-4 shrink-0 rounded-full border border-black/20" style={{ background: t.cor }} aria-hidden="true" />
                  <div className="min-w-0">
                    <b className="block font-display leading-tight">{t.nome}</b>
                    <span className="text-sm text-muted"><Area ha={t.area_ha} /> · {t.rotacao ?? "rotação atual não informada"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => verNoMapa(t)}><IconeVerNoMapa />Ver no mapa</button>
                  <Link href={`/tecnico/talhoes/${t.id}`} className="btn btn-sm no-underline">Abrir talhão</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section ref={areaMapa} className="scroll-mt-24">
        <h2 className="h2 mb-1">Cadastrar novo talhão</h2>
        <p className="mb-3 text-sm text-muted">Toque em “Desenhar talhão” e marque os cantos da área sobre a imagem. A linha branca tracejada é o limite da propriedade; o marcador vermelho, o local cadastrado.</p>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Mapa talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nome, geojson: t.geojson, cor: t.cor }))} limite={limite} ponto={ponto}
            hrefTalhao="/tecnico/talhoes/" foco={foco} destaque={destaque} corDesenho={cor}
            desenhar={(p, h) => { setPoligono(p); setHa(h); }} altura="h-[480px]" />
          <form action={acao} onSubmit={() => setSalvando(true)} className="card grid content-start gap-4 p-4">
            <input type="hidden" name="propriedade_id" value={propriedadeId} />
            <input type="hidden" name="geojson" value={poligono ? JSON.stringify(poligono) : ""} />
            <input type="hidden" name="cor" value={cor} />
            <div className={`rounded-lg p-3 text-sm ${poligono ? "bg-ok-soft" : "bg-surface-2"}`}>
              {poligono ? <>Área desenhada: <b><Area ha={ha} /></b></> : "Nenhum talhão desenhado ainda."}
            </div>
            <div><label className="label" htmlFor="nome">Nome do talhão</label><input className="input" id="nome" name="nome" required placeholder="Talhão da baixada" /></div>
            <fieldset>
              <legend className="label">Cor no mapa</legend>
              <div className="flex flex-wrap items-center gap-2">
                {PALETA.map(([c, nome]) => (
                  <label key={c} className="cursor-pointer" title={nome + (usadas.has(c) ? " (já usada)" : "")}>
                    <input type="radio" name="cor_opcao" value={c} checked={cor === c} onChange={() => setCor(c)} className="peer sr-only" />
                    <span className="block size-7 rounded-full border-2 border-black/15 ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-sat" style={{ background: c }} />
                    <span className="sr-only">{nome}</span>
                  </label>
                ))}
                <label className="flex items-center gap-1 text-xs text-muted" title="Outra cor">
                  <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="size-7 cursor-pointer rounded border border-line bg-transparent p-0" aria-label="Escolher outra cor" />
                  outra
                </label>
              </div>
              <p className="mt-1 text-xs text-muted">A área desenhada já aparece nessa cor. Prefira uma cor diferente da dos outros talhões.</p>
            </fieldset>
            <div>
              <label className="label" htmlFor="rotacao_atual">O que se planta hoje</label>
              <select className="input" id="rotacao_atual" name="rotacao_atual" defaultValue="">
                <option value="">Não sei ainda</option>
                {rotacoes.filter((r) => r.regiao === regiao).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <button className="btn" disabled={!poligono || salvando}>{salvando ? "Salvando e buscando dados da NASA…" : "Salvar talhão"}</button>
          </form>
        </div>
      </section>
    </div>
  );
}

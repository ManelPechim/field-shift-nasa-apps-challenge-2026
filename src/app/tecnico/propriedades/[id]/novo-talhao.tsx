"use client";

import { useState } from "react";
import type { Polygon } from "geojson";
import { Mapa, type TalhaoNoMapa } from "@/components/mapa";

export function NovoTalhao({
  propriedadeId,
  talhoes,
  limite,
  ponto,
  rotacoes,
  acao,
}: {
  propriedadeId: string;
  talhoes: TalhaoNoMapa[];
  limite: Polygon | null;
  ponto: [number, number];
  rotacoes: { id: string; nome: string; regiao: string }[];
  acao: (form: FormData) => Promise<void>;
}) {
  const [poligono, setPoligono] = useState<Polygon | null>(null);
  const [ha, setHa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const lat = poligono?.coordinates[0][0][1] ?? ponto[1];
  const regiao = lat == null ? null : lat < -24 ? "sul" : "cerrado";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Mapa talhoes={talhoes} limite={limite} ponto={ponto} hrefTalhao="/tecnico/talhoes/" desenhar={(p, h) => { setPoligono(p); setHa(h); }} altura="h-[460px]" />
      <form action={acao} onSubmit={() => setSalvando(true)} className="card grid content-start gap-4 p-4">
        <input type="hidden" name="propriedade_id" value={propriedadeId} />
        <input type="hidden" name="geojson" value={poligono ? JSON.stringify(poligono) : ""} />
        <div>
          <span className="eyebrow">Novo talhão</span>
          <p className="text-sm text-muted">Toque em “Desenhar talhão” e marque os cantos sobre a imagem. Para áreas grandes, use mais pontos.</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          {poligono ? <>Área desenhada: <b>{ha.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha</b></> : "Nenhum talhão desenhado ainda."}
        </div>
        <div><label className="label" htmlFor="nome">Nome do talhão</label><input className="input" id="nome" name="nome" required placeholder="Talhão da baixada" /></div>
        <div>
          <label className="label" htmlFor="rotacao_atual">O que se planta hoje</label>
          <select className="input" id="rotacao_atual" name="rotacao_atual" defaultValue="">
            <option value="">Não sei ainda</option>
            {rotacoes.filter((r) => !regiao || r.regiao === regiao).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
        <button className="btn" disabled={!poligono || salvando}>{salvando ? "Salvando e buscando dados da NASA…" : "Salvar talhão"}</button>
      </form>
    </div>
  );
}

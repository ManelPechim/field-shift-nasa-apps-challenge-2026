"use client";

import { useRef, useState } from "react";
import type { Polygon } from "geojson";
import { Area } from "@/components/area";
import { ListaDeTalhoes, bboxDe, type TalhaoDaLista } from "@/components/lista-talhoes";
import { Mapa, type Foco } from "@/components/mapa";
import { SeletorDeCor, corLivre } from "@/components/seletor-cor";

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
  const [cor, setCor] = useState<string>(corLivre(usadas));
  const [poligono, setPoligono] = useState<Polygon | null>(null);
  const [ha, setHa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [foco, setFoco] = useState<Foco | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const n = useRef(0);
  const areaMapa = useRef<HTMLDivElement>(null);
  const regiao = ponto[1] < -24 ? "sul" : "cerrado";

  function verNoMapa(t: TalhaoDaLista) {
    const b = bboxDe(t.geojson);
    setFoco({ lon: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2, bbox: b, n: ++n.current });
    setDestaque(t.id);
    areaMapa.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="h2 mb-3">Talhões cadastrados {talhoes.length > 0 && <span className="font-normal text-muted">({talhoes.length})</span>}</h2>
        <ListaDeTalhoes talhoes={talhoes} destaque={destaque} aoVerNoMapa={verNoMapa} hrefTalhao="/tecnico/talhoes/"
          vazio="Nenhum talhão ainda. Desenhe o primeiro no mapa abaixo." />
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
            <div>
              <SeletorDeCor cor={cor} aoMudar={setCor} usadas={usadas} />
              <p className="mt-1 text-xs text-muted">A área desenhada já aparece nessa cor.</p>
            </div>
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

"use client";

import { useRef, useState } from "react";
import type { Polygon } from "geojson";
import { ListaDeTalhoes, bboxDe, type TalhaoDaLista } from "@/components/lista-talhoes";
import { Mapa, type Foco } from "@/components/mapa";

/** Lista dos talhões e, logo abaixo, o mapa da propriedade (só visualização). */
export function TalhoesEMapa({ talhoes, limite, ponto }: { talhoes: TalhaoDaLista[]; limite: Polygon | null; ponto: [number, number] }) {
  const [foco, setFoco] = useState<Foco | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const n = useRef(0);
  const areaMapa = useRef<HTMLElement>(null);

  function verNoMapa(t: TalhaoDaLista) {
    const b = bboxDe(t.geojson);
    setFoco({ lon: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2, bbox: b, n: ++n.current });
    setDestaque(t.id);
    areaMapa.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="h2 mb-3">Seus talhões {talhoes.length > 0 && <span className="font-normal text-muted">({talhoes.length})</span>}</h2>
        <p className="-mt-2 mb-3 text-sm text-muted">Talhão é cada pedaço da propriedade que recebe o mesmo manejo. A cor é a mesma do mapa.</p>
        <ListaDeTalhoes talhoes={talhoes} destaque={destaque} aoVerNoMapa={verNoMapa} hrefTalhao="/produtor/talhoes/"
          vazio="Seu técnico ainda não desenhou os talhões desta propriedade." />
      </section>

      <section ref={areaMapa} className="scroll-mt-24">
        <h2 className="h2 mb-1">Mapa da propriedade</h2>
        <p className="mb-3 text-sm text-muted">
          Linha branca tracejada: limite da propriedade. Marcador vermelho: local cadastrado. Cada talhão aparece na sua cor; toque nele para abrir.
          Em “Camada da NASA” dá para ver como está a vegetação e a umidade do solo vistas do satélite.
        </p>
        <Mapa talhoes={talhoes.map((t) => ({ id: t.id, nome: t.nome, geojson: t.geojson, cor: t.cor }))} limite={limite} ponto={ponto}
          hrefTalhao="/produtor/talhoes/" foco={foco} destaque={destaque} busca={false} altura="h-[460px]" />
      </section>
    </div>
  );
}

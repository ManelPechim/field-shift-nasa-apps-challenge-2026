"use client";

import centroid from "@turf/centroid";
import { useRef, useState } from "react";
import type { Polygon } from "geojson";
import { BuscaLocal, type Local } from "@/components/busca-local";
import { Mapa, type Foco } from "@/components/mapa";
import { enderecoDoPonto } from "@/lib/geocodificacao";

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function NovaPropriedade({ produtorId, acao }: { produtorId: string; acao: (f: FormData) => Promise<void> }) {
  const [ponto, setPonto] = useState<[number, number] | null>(null);
  const [limite, setLimite] = useState<Polygon | null>(null);
  const [ha, setHa] = useState(0);
  const [foco, setFoco] = useState<Foco | null>(null);
  const [campos, setCampos] = useState({ nome: "", municipio: "", uf: "", endereco: "", car: "", observacoes: "" });
  const [status, setStatus] = useState("");
  const [salvando, setSalvando] = useState(false);
  const pedido = useRef(0);
  const n = useRef(0);

  async function marcar(lon: number, lat: number) {
    setPonto([lon, lat]);
    const meu = ++pedido.current;
    setStatus("Buscando o endereço deste ponto…");
    try {
      const e = await enderecoDoPonto(lat, lon);
      if (meu !== pedido.current) return; // chegou um ponto mais novo
      setCampos((c) => ({
        ...c,
        municipio: e.municipio ?? c.municipio,
        uf: e.uf ?? c.uf,
        endereco: e.endereco ?? c.endereco,
        nome: c.nome || e.nome || "",
      }));
      setStatus(e.municipio ? `Preenchido pelo mapa: ${e.municipio}${e.uf ? ` - ${e.uf}` : ""}. Confira os campos.` : "O mapa não achou o município deste ponto. Preencha à mão.");
    } catch {
      if (meu === pedido.current) setStatus("Não deu para buscar o endereço agora. Preencha à mão.");
    }
  }

  function escolherLocal(l: Local) {
    setFoco({ lon: l.lon, lat: l.lat, zoom: l.zoom, n: ++n.current });
    // GPS e coordenadas apontam a propriedade; busca por nome/município só leva o mapa até lá
    if (l.origem !== "busca") marcar(l.lon, l.lat);
    else setStatus("Agora toque no mapa, em cima da propriedade.");
  }

  function aoDesenhar(p: Polygon | null, h: number) {
    setLimite(p);
    setHa(h);
    if (p && !ponto) {
      const [lon, lat] = centroid(p).geometry.coordinates;
      marcar(lon, lat);
    }
  }

  const set = (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setCampos({ ...campos, [k]: e.target.value });

  return (
    <div className="grid gap-3">
      <BuscaLocal aoEscolher={escolherLocal} placeholder="Município, estrada, nome da propriedade ou coordenadas (-29.50, -51.96)" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="grid content-start gap-2">
          <Mapa talhoes={[]} busca={false} foco={foco} ponto={ponto} limite={limite} aoTocar={marcar} aoMoverPonto={marcar}
            desenhar={aoDesenhar} rotuloDesenho="Desenhar o limite (opcional)" altura="h-[520px]" />
          <p className="text-sm text-muted">
            {ponto ? "Ponto marcado. Arraste o marcador para ajustar ou toque em outro lugar." : "Toque no mapa para marcar o local da propriedade."}
            {" "}O limite é opcional e pode ser desenhado depois.
          </p>
        </div>

        <form action={acao} onSubmit={() => setSalvando(true)} className="card grid content-start gap-3 p-4">
          <input type="hidden" name="produtor_id" value={produtorId} />
          <input type="hidden" name="lat" value={ponto?.[1] ?? ""} />
          <input type="hidden" name="lon" value={ponto?.[0] ?? ""} />
          <input type="hidden" name="limite" value={limite ? JSON.stringify(limite) : ""} />

          <div className={`rounded-lg p-3 text-sm ${ponto ? "bg-ok-soft" : "bg-warn-soft"}`}>
            {ponto ? (
              <>
                <b>Local marcado</b> · {ponto[1].toFixed(5)}, {ponto[0].toFixed(5)}
                {limite && <> · limite de <b>{ha.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha</b></>}
              </>
            ) : <b>Falta marcar o local no mapa</b>}
          </div>
          {status && <p role="status" className="text-sm text-muted">{status}</p>}

          <div><label className="label" htmlFor="nome">Nome da propriedade</label><input className="input" id="nome" name="nome" required value={campos.nome} onChange={set("nome")} placeholder="Sítio Boa Vista" /></div>
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
            <div><label className="label" htmlFor="municipio">Município</label><input className="input" id="municipio" name="municipio" value={campos.municipio} onChange={set("municipio")} /></div>
            <div>
              <label className="label" htmlFor="uf">UF</label>
              <select className="input px-2" id="uf" name="uf" value={campos.uf} onChange={set("uf")}>
                <option value="">—</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="endereco">Endereço ou referência</label>
            <input className="input" id="endereco" name="endereco" value={campos.endereco} onChange={set("endereco")} placeholder="Estrada, linha, localidade…" />
            <p className="mt-1 text-xs text-muted">No campo o endereço costuma ser a localidade ou a estrada. Complete com uma referência que ajude a chegar.</p>
          </div>
          <div>
            <label className="label" htmlFor="car">Número do CAR (opcional)</label>
            <input className="input" id="car" name="car" value={campos.car} onChange={set("car")} placeholder="RS-4307708-…" />
          </div>
          <div><label className="label" htmlFor="observacoes">Observações</label><textarea className="input min-h-20" id="observacoes" name="observacoes" value={campos.observacoes} onChange={set("observacoes")} /></div>
          <button className="btn" disabled={!ponto || salvando}>{salvando ? "Salvando…" : "Salvar e desenhar os talhões"}</button>
        </form>
      </div>
    </div>
  );
}

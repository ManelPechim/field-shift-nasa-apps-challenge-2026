"use client";

import { useState } from "react";
import type { ValoresSolo } from "@/lib/tipos";

interface Lida { codigo: string | null; descricao: string | null; profundidade: string | null; valores: ValoresSolo }

const CAMPOS: [keyof ValoresSolo, string, string][] = [
  ["ph", "pH (CaCl₂)", ""], ["ph_agua", "pH (água)", ""], ["smp", "Índice SMP", ""], ["p", "P", "mg/dm³"],
  ["k", "K", "mmolc/dm³"], ["ca", "Ca", "mmolc/dm³"], ["mg", "Mg", "mmolc/dm³"], ["al", "Al", "mmolc/dm³"],
  ["hal", "H + Al", "mmolc/dm³"], ["mo", "M.O.", "g/dm³"], ["argila", "Argila", "%"],
];

export function NovaAmostra({ talhaoId, acao }: { talhaoId: string; acao: (f: FormData) => Promise<void> }) {
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [path, setPath] = useState("");
  const [lidas, setLidas] = useState<Lida[]>([]);
  const [sel, setSel] = useState(0);
  const [valores, setValores] = useState<ValoresSolo>({ p_metodo: "resina" });
  const [meta, setMeta] = useState({ codigo: "", profundidade: "0-20 cm", laboratorio: "", data: "" });
  const [fonte, setFonte] = useState("manual");

  async function ler(arquivo: File) {
    setEnviando(true); setErro(""); setStatus("Enviando o laudo e lendo com IA… leva de 10 a 40 segundos.");
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      fd.append("talhao_id", talhaoId);
      const r = await fetch("/api/laudo", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro ?? "Não foi possível enviar."); setStatus(""); return; }
      setPath(j.path);
      if (j.amostras?.length) {
        setLidas(j.amostras); escolher(j.amostras, 0); setFonte("ia");
        setMeta((m) => ({ ...m, laboratorio: j.laboratorio ?? m.laboratorio, data: (j.data ?? "").match(/^\d{4}-\d{2}-\d{2}$/) ? j.data : m.data }));
        setStatus(`A IA encontrou ${j.amostras.length} amostra${j.amostras.length > 1 ? "s" : ""}. Confira cada número com o papel antes de salvar.${j.observacoes ? ` Observação: ${j.observacoes}` : ""}`);
      } else setStatus(j.aviso ?? "Arquivo guardado. Preencha os valores.");
    } catch {
      setErro("A conexão falhou. Tente de novo.");
      setStatus("");
    } finally { setEnviando(false); }
  }

  function escolher(lista: Lida[], i: number) {
    setSel(i);
    const a = lista[i];
    setValores({ p_metodo: "resina", ...a.valores });
    setMeta((m) => ({ ...m, codigo: a.codigo ?? "", profundidade: a.profundidade ?? a.descricao ?? m.profundidade }));
  }

  const sb = (valores.k ?? 0) + (valores.ca ?? 0) + (valores.mg ?? 0);
  const ctc = sb + (valores.hal ?? 0);
  const v = ctc > 0 ? (100 * sb) / ctc : null;

  return (
    <div className="card grid gap-4 p-4">
      <div>
        <span className="eyebrow">Nova amostra</span>
        <p className="text-sm text-muted">Fotografe o laudo (ou envie o PDF do laboratório). A IA preenche os campos; você confere e salva. Também dá para digitar direto.</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line p-5 text-center hover:border-brand hover:bg-brand-soft">
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="sr-only" disabled={enviando}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) ler(f); }} />
        <b className="font-display">{enviando ? "Lendo o laudo…" : "Tirar foto ou escolher arquivo do laudo"}</b>
        <span className="text-sm text-muted">JPG, PNG, WebP ou PDF, até 10 MB</span>
      </label>
      {status && <p role="status" className="text-sm">{status}</p>}
      {erro && <p role="alert" className="text-sm text-bad">{erro}</p>}

      {lidas.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Amostra do laudo">
          {lidas.map((a, i) => (
            <button key={i} type="button" onClick={() => escolher(lidas, i)} aria-pressed={i === sel}
              className={`rounded-full border px-3 py-1 font-mono text-xs ${i === sel ? "border-ink bg-ink text-surface" : "border-line"}`}>
              {a.codigo ?? `#${i + 1}`} · {a.profundidade ?? a.descricao}
            </button>
          ))}
        </div>
      )}

      <form action={acao} className="grid gap-4">
        <input type="hidden" name="talhao_id" value={talhaoId} />
        <input type="hidden" name="laudo_path" value={path} />
        <input type="hidden" name="fonte" value={fonte} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><label className="label" htmlFor="codigo_lab">Código</label><input className="input" id="codigo_lab" name="codigo_lab" value={meta.codigo} onChange={(e) => setMeta({ ...meta, codigo: e.target.value })} /></div>
          <div><label className="label" htmlFor="profundidade">Profundidade</label><input className="input" id="profundidade" name="profundidade" value={meta.profundidade} onChange={(e) => setMeta({ ...meta, profundidade: e.target.value })} /></div>
          <div><label className="label" htmlFor="laboratorio">Laboratório</label><input className="input" id="laboratorio" name="laboratorio" value={meta.laboratorio} onChange={(e) => setMeta({ ...meta, laboratorio: e.target.value })} /></div>
          <div><label className="label" htmlFor="data_coleta">Data da coleta</label><input className="input" type="date" id="data_coleta" name="data_coleta" value={meta.data} onChange={(e) => setMeta({ ...meta, data: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CAMPOS.map(([k, n, u]) => (
            <div key={k}>
              <label className="label" htmlFor={`f-${k}`}>{n} {u && <small className="font-mono text-[0.68rem] font-normal text-muted">{u}</small>}</label>
              <input className="input" id={`f-${k}`} name={k} type="number" step="any" inputMode="decimal"
                value={(valores[k] as number | null | undefined) ?? ""} onChange={(e) => setValores({ ...valores, [k]: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          ))}
          <div>
            <label className="label" htmlFor="p_metodo">Método do P</label>
            <select className="input" id="p_metodo" name="p_metodo" value={valores.p_metodo ?? "resina"} onChange={(e) => setValores({ ...valores, p_metodo: e.target.value as "resina" | "mehlich" })}>
              <option value="resina">Resina</option><option value="mehlich">Mehlich-1</option>
            </select>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-xs text-muted">Soma de bases</dt><dd className="font-display font-bold">{sb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</dd></div>
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-xs text-muted">CTC pH 7</dt><dd className="font-display font-bold">{ctc.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</dd></div>
          <div className="rounded-lg bg-surface-2 p-2"><dt className="text-xs text-muted">V%</dt><dd className="font-display font-bold">{v == null ? "—" : `${Math.round(v)}%`}</dd></div>
        </dl>
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer font-semibold">Análise biológica (BioAS), se houver</summary>
          <p className="mt-2 text-sm text-muted">Enzimas em mg de p-nitrofenol por kg de solo por hora. COT em g/kg; se ficar vazio, o app estima pela M.O. (M.O. ÷ 1,724).</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div><label className="label" htmlFor="beta">β-glicosidase</label><input className="input" id="beta" name="beta" type="number" step="any" /></div>
            <div><label className="label" htmlFor="aril">Arilsulfatase</label><input className="input" id="aril" name="aril" type="number" step="any" /></div>
            <div><label className="label" htmlFor="cot">COT (g/kg)</label><input className="input" id="cot" name="cot" type="number" step="any" /></div>
          </div>
        </details>
        <div><button className="btn">Salvar amostra</button></div>
      </form>
    </div>
  );
}

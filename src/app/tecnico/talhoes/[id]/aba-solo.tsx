import { Grafico4QM } from "@/components/graficos";
import { Selo, Vazio, dataBR } from "@/components/ui";
import { QUADRANTES, aeem, cotDaMO, diagnostico4QM, interpretar } from "@/lib/agro/solo";
import { excluirAmostra, salvarAmostra } from "@/app/tecnico/actions";
import type { Amostra, Talhao } from "@/lib/tipos";
import { NovaAmostra } from "./laudo";

export function AbaSolo({ talhao, amostras }: { talhao: Talhao; amostras: Amostra[] }) {
  const a = amostras[0];
  const I = a ? interpretar(a.valores) : null;
  const cot = a ? a.enzimas?.cot ?? (a.valores.mo != null ? cotDaMO(a.valores.mo) : null) : null;
  const ae = a?.enzimas && cot ? aeem(a.enzimas, cot) : null;
  const d4 = cot != null ? diagnostico4QM(cot, ae) : null;

  return (
    <div className="grid gap-8">
      {a && I ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="h2">Fertilidade</h2>
            <p className="mb-3 text-sm text-muted">Amostra {a.codigo_lab ?? ""} · {a.profundidade ?? ""} · {dataBR(a.data_coleta ?? a.criado_em)} · {a.fonte === "ia" ? "lida por IA e conferida" : "digitada"}</p>
            <ul className="card divide-y divide-line">
              {I.indicadores.map((i) => (
                <li key={i.nome} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                  <b className="font-semibold">{i.nome}</b>
                  <Selo tom={i.tom}>{i.classe}</Selo>
                  <span className="text-sm text-muted">{i.explicacao}</span>
                  <span className="text-right font-mono text-sm">{i.valor}</span>
                </li>
              ))}
            </ul>
            <span className="fonte">Faixas: Boletim 100 (IAC) para culturas anuais; M.O. pela referência RS/SC. Cada estado tem tabela própria: confira com o manual da sua região.</span>
          </div>
          <div>
            <h2 className="h2">Saúde do solo</h2>
            <p className="mb-3 text-sm text-muted">Modelo de quatro quadrantes: carbono orgânico (COT) × atividade das enzimas β-glicosidase e arilsulfatase (AEEM).</p>
            {d4 && <Grafico4QM notaCot={d4.notaCot} notaAeem={d4.notaAeem} />}
            {d4?.quadrante ? (
              <div className="card mt-3 p-4">
                <div className="flex items-center gap-2"><b className="font-display text-xl">{QUADRANTES[d4.quadrante].nome}</b><Selo tom={QUADRANTES[d4.quadrante].tom}>nota COT {d4.notaCot} · AEEM {d4.notaAeem}</Selo></div>
                <p className="mt-1">{QUADRANTES[d4.quadrante].descricao}</p>
                <ol className="mt-2 list-decimal pl-5 text-sm">{QUADRANTES[d4.quadrante].plano.map((p) => <li key={p}>{p}</li>)}</ol>
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
                Sem análise biológica: o app só sabe a altura no gráfico (carbono, nota {d4?.notaCot ?? "—"}). Peça a análise BioAS a um laboratório credenciado pela Embrapa para fechar o diagnóstico.
              </div>
            )}
            <p className="mt-2 text-xs text-muted">Referência: {d4?.referencia}. Para lavouras de grãos, a referência regional precisa ser calibrada; a fórmula da AEEM deve ser conferida com o autor do método.</p>
          </div>
        </section>
      ) : (
        <Vazio titulo="Nenhuma análise de solo neste talhão">Envie a foto do laudo abaixo. O plano fica mais preciso com a fertilidade e, se houver, a análise biológica.</Vazio>
      )}

      <section>
        <h2 className="h2 mb-3">Registrar laudo</h2>
        <NovaAmostra talhaoId={talhao.id} acao={salvarAmostra} />
      </section>

      {amostras.length > 0 && (
        <section>
          <h2 className="h2 mb-2">Histórico de amostras</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead><tr className="text-left font-mono text-xs uppercase text-muted">{["Data", "Prof.", "pH", "P", "K", "Ca", "Mg", "H+Al", "M.O.", "V%", ""].map((h) => <th key={h} className="border-b border-line px-2 py-1 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {amostras.map((x) => {
                  const ix = interpretar(x.valores);
                  return (
                    <tr key={x.id} className="font-mono">
                      <td className="border-b border-line px-2 py-1">{dataBR(x.data_coleta ?? x.criado_em)}</td>
                      <td className="border-b border-line px-2 py-1">{x.profundidade}</td>
                      {(["ph", "p", "k", "ca", "mg", "hal", "mo"] as const).map((k) => <td key={k} className="border-b border-line px-2 py-1">{x.valores[k] ?? "—"}</td>)}
                      <td className="border-b border-line px-2 py-1">{ix.v == null ? "—" : Math.round(ix.v)}</td>
                      <td className="border-b border-line px-2 py-1">
                        <form action={excluirAmostra}><input type="hidden" name="amostra_id" value={x.id} /><input type="hidden" name="talhao_id" value={talhao.id} /><button className="text-xs text-bad underline">Excluir</button></form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

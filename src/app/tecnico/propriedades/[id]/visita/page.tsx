import { notFound } from "next/navigation";
import { Pagina } from "@/components/ui";
import { Trilha } from "@/components/trilha";
import { exigirPerfil } from "@/lib/supabase/server";
import { registrarVisita } from "@/app/tecnico/actions";

export const metadata = { title: "Visita técnica" };

function Opcoes({ nome, titulo, ajuda, opcoes }: { nome: string; titulo: string; ajuda?: string; opcoes: [string, string][] }) {
  return (
    <fieldset>
      <legend className="label">{titulo}</legend>
      {ajuda && <p className="-mt-1 mb-2 text-xs text-muted">{ajuda}</p>}
      <div className="flex flex-wrap gap-2">
        {opcoes.map(([v, n]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={nome} value={v} className="peer sr-only" />
            <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:outline-2 peer-focus-visible:outline-sat">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function NovaVisita(props: PageProps<"/tecnico/propriedades/[id]/visita">) {
  const { id } = await props.params;
  const { talhao } = await props.searchParams;
  const { supabase } = await exigirPerfil("tecnico");
  const [{ data: p }, { data: talhoes }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, produtores(id, nome)").eq("id", id).maybeSingle<{ id: string; nome: string; produtores: { id: string; nome: string } }>(),
    supabase.from("talhoes").select("id, nome").eq("propriedade_id", id).order("criado_em"),
  ]);
  if (!p) notFound();

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Clientes", href: "/tecnico" },
        { rotulo: p.produtores.nome, href: `/tecnico/produtores/${p.produtores.id}` },
        { rotulo: p.nome, tipo: "Propriedade", href: `/tecnico/propriedades/${p.id}` },
        { rotulo: "Nova visita técnica" },
      ]} />
      <h1 className="h1 mt-2 mb-1">Visita técnica</h1>
      <p className="mb-6 max-w-2xl text-muted">Registre o que você viu e ouviu. Alagamento e erosão observados aqui ajustam os riscos calculados com os dados da NASA. Preencha só o que souber.</p>
      <form action={registrarVisita} className="grid max-w-3xl gap-6">
        <input type="hidden" name="propriedade_id" value={p.id} />
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="h2 sm:col-span-2">Contexto</h2>
          <div><label className="label" htmlFor="data">Data</label><input className="input" type="date" id="data" name="data" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div>
            <label className="label" htmlFor="talhao_id">Talhão</label>
            <select className="input" id="talhao_id" name="talhao_id" defaultValue={typeof talhao === "string" ? talhao : ""}>
              <option value="">Propriedade inteira</option>
              {talhoes?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label" htmlFor="objetivo">Objetivo da visita</label><input className="input" id="objetivo" name="objetivo" placeholder="Diagnóstico inicial, coleta de solo, acompanhamento…" /></div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="h2 sm:col-span-2">Situação atual</h2>
          <div><label className="label" htmlFor="uso_atual">Uso atual da área</label><input className="input" id="uso_atual" name="uso_atual" placeholder="Lavoura, pastagem, pousio…" /></div>
          <div><label className="label" htmlFor="cultura_atual">Cultura no campo agora</label><input className="input" id="cultura_atual" name="cultura_atual" placeholder="Soja, trigo, nada…" /></div>
          <div><label className="label" htmlFor="estadio">Estádio da cultura</label><input className="input" id="estadio" name="estadio" placeholder="Emergência, floração, maturação…" /></div>
          <div><label className="label" htmlFor="historico">Histórico de uso (últimos anos)</label><input className="input" id="historico" name="historico" placeholder="Soja/trigo há 10 anos, era campo nativo…" /></div>
        </section>

        <section className="card grid gap-5 p-5">
          <h2 className="h2">Solo e relevo observados</h2>
          <Opcoes nome="alagamento" titulo="A área alaga ou fica encharcada?" opcoes={[["nao", "Não"], ["as_vezes", "Às vezes, em chuva forte"], ["frequente", "Com frequência"]]} />
          <Opcoes nome="erosao" titulo="Sinais de erosão" ajuda="Laminar: perda de terra fina, raízes expostas. Sulcos: canaletas. Voçorocas: valas grandes." opcoes={[["nenhuma", "Nenhum"], ["laminar", "Laminar"], ["sulcos", "Sulcos"], ["vocorocas", "Voçorocas"]]} />
          <Opcoes nome="compactacao" titulo="Compactação" ajuda="Resistência ao enfiar a haste, raízes tortas, água empoçada." opcoes={[["nao", "Não"], ["suspeita", "Suspeita"], ["confirmada", "Confirmada"]]} />
          <Opcoes nome="cobertura_solo" titulo="Cobertura do solo hoje" opcoes={[["descoberto", "Descoberto"], ["parcial", "Parcial"], ["palhada", "Boa palhada"]]} />
          <Opcoes nome="plantio_direto" titulo="Usa plantio direto?" opcoes={[["sim", "Sim"], ["parcial", "Em parte"], ["nao", "Não, revolve o solo"]]} />
          <div><label className="label" htmlFor="pragas_doencas">Pragas, doenças ou plantas daninhas</label><input className="input" id="pragas_doencas" name="pragas_doencas" placeholder="Ferrugem, buva resistente, nematoides…" /></div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="h2 sm:col-span-2">Estrutura e objetivos do produtor</h2>
          <label className="flex items-center gap-2"><input type="checkbox" name="irrigacao" /> Tem irrigação</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="gado" /> Cria gado ou vende pasto</label>
          <div><label className="label" htmlFor="maquinario">Máquinas disponíveis</label><input className="input" id="maquinario" name="maquinario" placeholder="Plantadeira de plantio direto, pulverizador…" /></div>
          <div><label className="label" htmlFor="mercado">Para quem vende</label><input className="input" id="mercado" name="mercado" placeholder="Cooperativa, cerealista, feira…" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="objetivo_produtor">O que o produtor quer</label><input className="input" id="objetivo_produtor" name="objetivo_produtor" placeholder="Mais renda, recuperar o solo, reduzir custo com adubo…" /></div>
        </section>

        <section className="card grid gap-2 p-5">
          <label className="label" htmlFor="observacoes">Observações gerais</label>
          <textarea className="input min-h-28" id="observacoes" name="observacoes" />
        </section>
        <div><button className="btn">Salvar visita</button></div>
      </form>
    </Pagina>
  );
}

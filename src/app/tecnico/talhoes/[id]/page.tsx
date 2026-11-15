import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagina, num } from "@/components/ui";
import { Trilha } from "@/components/trilha";
import { exigirPerfil } from "@/lib/supabase/server";
import { dadosNasa } from "@/lib/dados";
import { ROTACOES, nomeRotacao, regiaoDe, rotacaoPorId } from "@/lib/agro/culturas";
import type { Amostra, Ocorrencia, Plano, Propriedade, Talhao, Tarefa, Visita } from "@/lib/tipos";
import { AbaDados } from "./aba-dados";
import { AbaSolo } from "./aba-solo";
import { AbaRotacoes } from "./aba-rotacoes";
import { AbaPlano } from "./aba-plano";
import { AbaCampo } from "./aba-campo";
import { CabecalhoDoTalhao } from "./editar-talhao";

const ABAS = [
  ["dados", "Dados da NASA"],
  ["solo", "Solo"],
  ["rotacoes", "Rotações"],
  ["plano", "Plano"],
  ["campo", "Campo"],
] as const;
type Aba = (typeof ABAS)[number][0];

export default async function PaginaTalhao(props: PageProps<"/tecnico/talhoes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const aba: Aba = (ABAS.map((a) => a[0]) as string[]).includes(String(sp.aba)) ? (sp.aba as Aba) : "dados";
  const { supabase } = await exigirPerfil("tecnico");

  const { data: t } = await supabase.from("talhoes").select("*").eq("id", id).maybeSingle<Talhao>();
  if (!t) notFound();
  const [{ data: prop }, { data: visitas }, { data: amostras }, { data: planos }, { data: tarefas }, { data: ocorrencias }, { data: vizinhos }] = await Promise.all([
    supabase.from("propriedades").select("*, produtores(id, nome)").eq("id", t.propriedade_id).single<Propriedade & { produtores: { id: string; nome: string } }>(),
    supabase.from("visitas").select("*").eq("propriedade_id", t.propriedade_id).or(`talhao_id.eq.${t.id},talhao_id.is.null`).order("data", { ascending: false }).returns<Visita[]>(),
    supabase.from("amostras").select("*").eq("talhao_id", t.id).order("criado_em", { ascending: false }).returns<Amostra[]>(),
    supabase.from("planos").select("*").eq("talhao_id", t.id).order("criado_em", { ascending: false }).returns<Plano[]>(),
    supabase.from("tarefas").select("*").eq("talhao_id", t.id).order("criado_em").returns<Tarefa[]>(),
    supabase.from("ocorrencias").select("*").eq("talhao_id", t.id).order("criado_em", { ascending: false }).returns<Ocorrencia[]>(),
    supabase.from("talhoes").select("id, nome, geojson, cor").eq("propriedade_id", t.propriedade_id).neq("id", t.id).order("criado_em").returns<Pick<Talhao, "id" | "nome" | "geojson" | "cor">[]>(),
  ]);
  const visita = visitas?.find((v) => v.talhao_id === t.id) ?? visitas?.[0] ?? null;
  const precisaNasa = aba === "dados" || aba === "rotacoes";
  const nasa = precisaNasa ? await dadosNasa(supabase, t, sp.atualizar === "1") : null;
  const novas = ocorrencias?.filter((o) => o.status === "nova").length ?? 0;
  const rotAtual = rotacaoPorId(t.rotacao_atual);

  return (
    <Pagina>
      <Trilha passos={[
        { rotulo: "Clientes", href: "/tecnico" },
        { rotulo: prop?.produtores.nome ?? "Cliente", href: `/tecnico/produtores/${prop?.produtores.id}` },
        { rotulo: prop?.nome ?? "Propriedade", tipo: "Propriedade", href: `/tecnico/propriedades/${t.propriedade_id}` },
        { rotulo: t.nome, tipo: "Talhão" },
      ]} />
      <div className="mt-2 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CabecalhoDoTalhao
            dados={{
              id: t.id, nome: t.nome, cor: t.cor, rotacaoAtual: t.rotacao_atual, areaHa: t.area_ha, geojson: t.geojson,
              vizinhos: vizinhos ?? [], limite: prop?.limite ?? null, ponto: [prop?.lon ?? t.centroide_lon ?? 0, prop?.lat ?? t.centroide_lat ?? 0],
              rotacoes: ROTACOES.filter((r) => r.atual && r.regiao === regiaoDe(t.centroide_lat ?? prop?.lat ?? 0)).map((r) => ({ id: r.id, nome: nomeRotacao(r) })),
              vinculos: { amostras: amostras?.length ?? 0, planos: planos?.length ?? 0, tarefas: tarefas?.length ?? 0, relatos: ocorrencias?.length ?? 0 },
            }}
            detalhes={<span className="eyebrow">{num(t.area_ha, 1)} ha · {num(t.centroide_lat, 4)}, {num(t.centroide_lon, 4)}</span>}
            rotacaoTexto={rotAtual ? nomeRotacao(rotAtual) : "rotação não informada"} />
        </div>
        <Link href={`/tecnico/propriedades/${t.propriedade_id}/visita?talhao=${t.id}`} className="btn-ghost btn-sm">Registrar visita</Link>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Seções do talhão">
        {ABAS.map(([k, n]) => (
          <Link key={k} href={`/tecnico/talhoes/${t.id}?aba=${k}`} aria-current={aba === k ? "page" : undefined}
            className={`whitespace-nowrap border-b-3 px-3 py-2 text-sm font-semibold no-underline ${aba === k ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
            {n}{k === "campo" && novas > 0 ? ` (${novas})` : ""}
          </Link>
        ))}
      </nav>

      {aba === "dados" && nasa && <AbaDados talhao={t} clima={nasa.clima} relevo={nasa.relevo} erros={nasa.erros} visita={visita} />}
      {aba === "solo" && <AbaSolo talhao={t} amostras={amostras ?? []} />}
      {aba === "rotacoes" && nasa && <AbaRotacoes talhao={t} clima={nasa.clima} relevo={nasa.relevo} visita={visita} amostra={amostras?.[0] ?? null} sp={sp} />}
      {aba === "plano" && <AbaPlano talhao={t} planos={planos ?? []} tarefas={tarefas ?? []} />}
      {aba === "campo" && <AbaCampo talhao={t} ocorrencias={ocorrencias ?? []} />}
    </Pagina>
  );
}

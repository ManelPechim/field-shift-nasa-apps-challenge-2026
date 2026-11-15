import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagina, Vazio, dataBR, num } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { formatarCelular, linkWhatsApp, sugerirSenha } from "@/lib/contato";
import { editarProdutor } from "@/app/tecnico/actions";
import type { Produtor } from "@/lib/tipos";
import { TrocarSenha } from "./trocar-senha";

interface Prop { id: string; nome: string; municipio: string | null; uf: string | null; area_ha: number | null; talhoes: { id: string; area_ha: number | null }[]; visitas: { data: string }[] }

export default async function PaginaProdutor(props: PageProps<"/tecnico/produtores/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("tecnico");
  const [{ data: p }, { data: propriedades }] = await Promise.all([
    supabase.from("produtores").select("*").eq("id", id).maybeSingle<Produtor>(),
    supabase.from("propriedades").select("id, nome, municipio, uf, area_ha, talhoes(id, area_ha), visitas(data)").eq("produtor_id", id).order("criado_em").returns<Prop[]>(),
  ]);
  if (!p) notFound();
  const primeiro = p.nome.split(" ")[0];

  return (
    <Pagina>
      <Link href="/tecnico" className="text-sm">← Clientes</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Cliente</span>
          <h1 className="h1">Propriedades de {p.nome}</h1>
        </div>
        <Link href={`/tecnico/produtores/${p.id}/propriedades/nova`} className="btn">Nova propriedade</Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          {!propriedades?.length ? (
            <Vazio titulo={`${primeiro} ainda não tem propriedade cadastrada`}>
              Marque a propriedade no mapa. Se estiver no local, use o GPS.
              <div className="mt-3"><Link href={`/tecnico/produtores/${p.id}/propriedades/nova`} className="btn btn-sm">Cadastrar a propriedade</Link></div>
            </Vazio>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {propriedades.map((pr) => {
                const haTalhoes = pr.talhoes.reduce((a, t) => a + (t.area_ha ?? 0), 0);
                const visitas = pr.visitas.map((v) => v.data).sort();
                return (
                  <li key={pr.id}>
                    <Link href={`/tecnico/propriedades/${pr.id}`} className="card block h-full p-4 text-ink no-underline hover:border-brand">
                      <b className="block font-display text-lg">{pr.nome}</b>
                      <span className="text-sm text-muted">{[pr.municipio, pr.uf].filter(Boolean).join(" - ") || "Município não informado"}</span>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div><dt className="text-muted">Área</dt><dd className="font-semibold">{pr.area_ha ? `${num(pr.area_ha, 1)} ha` : "—"}</dd></div>
                        <div><dt className="text-muted">Talhões</dt><dd className="font-semibold">{pr.talhoes.length}{haTalhoes ? ` · ${num(haTalhoes, 0)} ha` : ""}</dd></div>
                        <div><dt className="text-muted">Última visita</dt><dd className="font-semibold">{dataBR(visitas[visitas.length - 1])}</dd></div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="grid content-start gap-4">
          <section className="card grid gap-2 p-4">
            <h2 className="h2">Contato</h2>
            <p><span className="text-muted">Celular:</span> <b>{formatarCelular(p.telefone)}</b></p>
            <p className="break-all"><span className="text-muted">E-mail:</span> <b>{p.email}</b></p>
            <a className="btn-ghost btn-sm no-underline" href={linkWhatsApp(p.telefone)} target="_blank" rel="noreferrer">Conversar no WhatsApp</a>
          </section>
          <section className="card grid gap-3 p-4">
            <h2 className="h2">Acesso ao app</h2>
            <p className="text-sm text-muted">{primeiro} entra com o e-mail ou o celular e a senha que você criou. Se ele esquecer, crie uma senha nova e mande de novo.</p>
            <TrocarSenha produtorId={p.id} senhaSugerida={sugerirSenha()} />
          </section>
          <form action={editarProdutor} className="card grid gap-3 p-4">
            <h2 className="h2">Dados do cliente</h2>
            <input type="hidden" name="produtor_id" value={p.id} />
            <div><label className="label" htmlFor="nome">Nome</label><input className="input" id="nome" name="nome" defaultValue={p.nome} /></div>
            <div><label className="label" htmlFor="observacoes">Observações</label><textarea className="input min-h-20" id="observacoes" name="observacoes" defaultValue={p.observacoes ?? ""} /></div>
            <div><button className="btn-ghost btn-sm">Salvar</button></div>
          </form>
        </aside>
      </div>
    </Pagina>
  );
}

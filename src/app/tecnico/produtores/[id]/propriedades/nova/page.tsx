import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagina } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { criarPropriedade } from "@/app/tecnico/actions";
import { NovaPropriedade } from "./nova-propriedade";

export const metadata = { title: "Nova propriedade" };

export default async function PaginaNovaPropriedade(props: PageProps<"/tecnico/produtores/[id]/propriedades/nova">) {
  const { id } = await props.params;
  const { supabase } = await exigirPerfil("tecnico");
  const { data: p } = await supabase.from("produtores").select("id, nome").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <Pagina>
      <Link href={`/tecnico/produtores/${p.id}`} className="text-sm">← {p.nome}</Link>
      <span className="eyebrow mt-3 block">Passo 2 de 2 · Propriedade</span>
      <h1 className="h1 mb-1">Nova propriedade de {p.nome}</h1>
      <p className="mb-5 max-w-3xl text-muted">Encontre a área no mapa e toque no local da propriedade, ou use o GPS se estiver lá. Município, UF e endereço são preenchidos pelo mapa; confira e complete o resto.</p>
      <NovaPropriedade produtorId={p.id} acao={criarPropriedade} />
    </Pagina>
  );
}

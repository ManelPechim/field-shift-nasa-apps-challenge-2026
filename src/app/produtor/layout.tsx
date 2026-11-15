import { Topo } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";
import { BarraCelular } from "./barra-celular";

export default async function LayoutProdutor({ children }: LayoutProps<"/produtor">) {
  const { perfil } = await exigirPerfil("produtor");
  return (
    <>
      <Topo perfil={perfil} links={[{ href: "/produtor", nome: "Início" }, { href: "/produtor/relatar", nome: "Relatar" }]} />
      {/* Espaço para a barra fixa do celular não cobrir o fim da página */}
      <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
      <BarraCelular />
    </>
  );
}

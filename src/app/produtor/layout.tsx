import { Topo } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";

export default async function LayoutProdutor({ children }: LayoutProps<"/produtor">) {
  const { perfil } = await exigirPerfil("produtor");
  return (
    <>
      <Topo perfil={perfil} links={[{ href: "/produtor", nome: "Suas propriedades" }]} />
      {children}
    </>
  );
}

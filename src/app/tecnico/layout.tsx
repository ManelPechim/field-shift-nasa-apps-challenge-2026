import { Topo } from "@/components/ui";
import { exigirPerfil } from "@/lib/supabase/server";

export default async function LayoutTecnico({ children }: LayoutProps<"/tecnico">) {
  const { perfil } = await exigirPerfil("tecnico");
  return (
    <>
      <Topo perfil={perfil} links={[{ href: "/tecnico", nome: "Propriedades" }, { href: "/tecnico/propriedades/nova", nome: "Nova propriedade" }]} />
      {children}
    </>
  );
}

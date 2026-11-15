import Link from "next/link";
import { Pagina } from "@/components/ui";
import { sugerirSenha } from "@/lib/contato";
import { FormularioProdutor } from "./formulario";

export const metadata = { title: "Novo cliente" };

export default function NovoProdutor() {
  return (
    <Pagina>
      <Link href="/tecnico" className="text-sm">← Clientes</Link>
      <span className="eyebrow mt-3 block">Passo 1 de 2 · Cliente</span>
      <h1 className="h1 mb-1">Novo cliente</h1>
      <p className="mb-6 max-w-2xl text-muted">Cadastre o produtor e crie o acesso dele ao app. Depois você cadastra as propriedades dele no mapa.</p>
      <FormularioProdutor senhaSugerida={sugerirSenha()} />
    </Pagina>
  );
}

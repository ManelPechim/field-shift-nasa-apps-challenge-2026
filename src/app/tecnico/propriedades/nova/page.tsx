import { Pagina } from "@/components/ui";
import { criarPropriedade } from "@/app/tecnico/actions";

export const metadata = { title: "Nova propriedade" };

export default function NovaPropriedade() {
  return (
    <Pagina>
      <span className="eyebrow">Passo 1 · Cadastro</span>
      <h1 className="h1 mb-1">Nova propriedade</h1>
      <p className="mb-6 max-w-2xl text-muted">Depois de salvar, você desenha os talhões no mapa de satélite. O produtor passa a ver a propriedade quando criar a conta com o e-mail informado aqui.</p>
      <form action={criarPropriedade} className="card grid max-w-3xl gap-5 p-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="h2 mb-2">Propriedade</legend>
          <div className="sm:col-span-2"><label className="label" htmlFor="nome">Nome da propriedade</label><input className="input" id="nome" name="nome" required placeholder="Sítio Boa Vista" /></div>
          <div><label className="label" htmlFor="municipio">Município</label><input className="input" id="municipio" name="municipio" /></div>
          <div><label className="label" htmlFor="uf">UF</label><input className="input" id="uf" name="uf" maxLength={2} placeholder="RS" /></div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="car">Número do CAR (opcional)</label>
            <input className="input" id="car" name="car" placeholder="RS-4307708-XXXX…" />
            <p className="mt-1 text-xs text-muted">Cadastro Ambiental Rural. Ajuda a conferir os limites da propriedade no SICAR.</p>
          </div>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="h2 mb-2">Produtor</legend>
          <div className="sm:col-span-2"><label className="label" htmlFor="produtor_nome">Nome</label><input className="input" id="produtor_nome" name="produtor_nome" /></div>
          <div><label className="label" htmlFor="produtor_email">E-mail</label><input className="input" id="produtor_email" name="produtor_email" type="email" /></div>
          <div><label className="label" htmlFor="produtor_telefone">Celular (WhatsApp)</label><input className="input" id="produtor_telefone" name="produtor_telefone" type="tel" /></div>
        </fieldset>
        <div><label className="label" htmlFor="observacoes">Observações</label><textarea className="input min-h-24" id="observacoes" name="observacoes" /></div>
        <div><button className="btn">Salvar e desenhar talhões</button></div>
      </form>
    </Pagina>
  );
}

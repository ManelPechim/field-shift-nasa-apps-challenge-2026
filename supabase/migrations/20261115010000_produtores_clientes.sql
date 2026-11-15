-- Produtores viram clientes cadastrados pelo técnico (não há cadastro próprio de produtor).
-- Estrutura: técnico → produtores → propriedades → talhões.

-- Políticas e função que dependiam do e-mail do produtor gravado na propriedade
drop policy "ver propriedades" on public.propriedades;
drop policy "técnico cria propriedade" on public.propriedades;
drop policy "ver perfis ligados às minhas propriedades" on public.perfis;

create table public.produtores (
  id uuid primary key default gen_random_uuid(),
  tecnico_id uuid not null default auth.uid() references public.perfis (id),
  usuario_id uuid unique references auth.users on delete set null,
  nome text not null,
  email text not null,
  telefone text not null, -- só dígitos, com DDI 55
  observacoes text,
  criado_em timestamptz not null default now()
);
create index on public.produtores (tecnico_id);
create unique index produtores_telefone_unico on public.produtores (telefone);

alter table public.propriedades
  drop column produtor_nome,
  drop column produtor_email,
  drop column produtor_telefone,
  add column produtor_id uuid not null references public.produtores on delete cascade,
  add column lat double precision not null,
  add column lon double precision not null,
  add column limite jsonb,
  add column area_ha numeric,
  add column endereco text;
create index on public.propriedades (produtor_id);

create or replace function public.pode_ver_propriedade(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.propriedades p
    left join public.produtores pr on pr.id = p.produtor_id
    where p.id = pid and (p.tecnico_id = auth.uid() or pr.usuario_id = auth.uid())
  )
$$;

alter table public.produtores enable row level security;
create policy "técnico gerencia seus produtores" on public.produtores for all to authenticated
  using (tecnico_id = auth.uid()) with check (tecnico_id = auth.uid() and public.sou_tecnico());
create policy "produtor vê o próprio cadastro" on public.produtores for select to authenticated
  using (usuario_id = auth.uid());

-- Colunas comparadas direto (sem função) para que "insert ... returning" enxergue a linha nova
create policy "ver propriedades" on public.propriedades for select to authenticated
  using (tecnico_id = auth.uid() or produtor_id in (select id from public.produtores where usuario_id = auth.uid()));
create policy "técnico cria propriedade" on public.propriedades for insert to authenticated
  with check (
    tecnico_id = auth.uid() and public.sou_tecnico()
    and exists (select 1 from public.produtores pr where pr.id = produtor_id and pr.tecnico_id = auth.uid())
  );

create policy "ver perfis ligados" on public.perfis for select to authenticated
  using (
    id in (select usuario_id from public.produtores where tecnico_id = auth.uid())
    or id in (select tecnico_id from public.produtores where usuario_id = auth.uid())
  );

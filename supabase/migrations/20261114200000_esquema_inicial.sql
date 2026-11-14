-- Field Shift: esquema inicial
-- Dois papéis: técnico (agrônomo, técnico agrícola, extensionista) e produtor.
-- O técnico cadastra a propriedade e informa o e-mail do produtor; o produtor
-- passa a ver a propriedade quando entra com esse e-mail.

create type public.papel as enum ('tecnico', 'produtor');

create table public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  papel public.papel not null default 'produtor',
  email text,
  telefone text,
  registro_profissional text,
  instituicao text,
  criado_em timestamptz not null default now()
);

create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, papel, email, telefone, registro_profissional, instituicao)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'papel', '')::public.papel, 'produtor'),
    new.email,
    new.raw_user_meta_data ->> 'telefone',
    new.raw_user_meta_data ->> 'registro_profissional',
    new.raw_user_meta_data ->> 'instituicao'
  );
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

create table public.propriedades (
  id uuid primary key default gen_random_uuid(),
  tecnico_id uuid not null default auth.uid() references public.perfis (id),
  nome text not null,
  municipio text,
  uf text,
  car_codigo text,
  produtor_nome text,
  produtor_email text,
  produtor_telefone text,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index on public.propriedades (tecnico_id);
create index on public.propriedades (lower(produtor_email));

create table public.talhoes (
  id uuid primary key default gen_random_uuid(),
  propriedade_id uuid not null references public.propriedades on delete cascade,
  nome text not null,
  geojson jsonb not null,
  area_ha numeric,
  centroide_lat double precision,
  centroide_lon double precision,
  rotacao_atual text,
  cultura_atual text,
  criado_em timestamptz not null default now()
);
create index on public.talhoes (propriedade_id);

-- Visita técnica: diagnóstico do que está acontecendo hoje na propriedade
create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  propriedade_id uuid not null references public.propriedades on delete cascade,
  talhao_id uuid references public.talhoes on delete set null,
  tecnico_id uuid not null default auth.uid() references public.perfis (id),
  data date not null default current_date,
  objetivo text,
  condicoes jsonb not null default '{}'::jsonb,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index on public.visitas (propriedade_id);

-- Amostra de solo + laudo do laboratório
create table public.amostras (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes on delete cascade,
  visita_id uuid references public.visitas on delete set null,
  data_coleta date,
  profundidade text,
  codigo_lab text,
  laboratorio text,
  valores jsonb not null default '{}'::jsonb,
  enzimas jsonb,
  laudo_path text,
  fonte text not null default 'manual',
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index on public.amostras (talhao_id);

-- Dados da NASA guardados por talhão (evita chamar a API a cada página)
create table public.dados_nasa (
  talhao_id uuid not null references public.talhoes on delete cascade,
  tipo text not null,
  payload jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (talhao_id, tipo)
);

-- Plano de safra que o técnico publica para o produtor
create table public.planos (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes on delete cascade,
  safra text not null,
  rotacao_id text not null,
  rotacao_nome text not null,
  resumo_produtor text,
  justificativa text,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  publicado_em timestamptz,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index on public.planos (talhao_id);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes on delete cascade,
  plano_id uuid references public.planos on delete cascade,
  titulo text not null,
  descricao text,
  quando text,
  prazo date,
  status text not null default 'pendente' check (status in ('pendente', 'feita')),
  feita_em timestamptz,
  nota_produtor text,
  criado_em timestamptz not null default now()
);
create index on public.tarefas (talhao_id);

-- O que o produtor relata do campo
create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references public.talhoes on delete cascade,
  autor_id uuid not null default auth.uid() references public.perfis (id),
  tipo text not null,
  descricao text,
  foto_path text,
  lat double precision,
  lon double precision,
  status text not null default 'nova' check (status in ('nova', 'vista', 'resolvida')),
  resposta_tecnico text,
  criado_em timestamptz not null default now()
);
create index on public.ocorrencias (talhao_id);

-- ---------- Acesso (RLS) ----------
create function public.pode_ver_propriedade(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.propriedades p
    where p.id = pid
      and (p.tecnico_id = auth.uid() or lower(p.produtor_email) = lower(auth.jwt() ->> 'email'))
  )
$$;

create function public.eh_tecnico_da(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.propriedades p where p.id = pid and p.tecnico_id = auth.uid())
$$;

create function public.propriedade_do_talhao(tid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select propriedade_id from public.talhoes where id = tid
$$;

create function public.sou_tecnico() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'tecnico')
$$;

alter table public.perfis enable row level security;
alter table public.propriedades enable row level security;
alter table public.talhoes enable row level security;
alter table public.visitas enable row level security;
alter table public.amostras enable row level security;
alter table public.dados_nasa enable row level security;
alter table public.planos enable row level security;
alter table public.tarefas enable row level security;
alter table public.ocorrencias enable row level security;

create policy "ver o próprio perfil" on public.perfis for select to authenticated using (id = auth.uid());
create policy "ver perfis ligados às minhas propriedades" on public.perfis for select to authenticated
  using (exists (
    select 1 from public.propriedades p
    where (p.tecnico_id = auth.uid() and lower(p.produtor_email) = lower(perfis.email))
       or (p.tecnico_id = perfis.id and lower(p.produtor_email) = lower(auth.jwt() ->> 'email'))
  ));
create policy "editar o próprio perfil" on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "ver propriedades" on public.propriedades for select to authenticated using (public.pode_ver_propriedade(id));
create policy "técnico cria propriedade" on public.propriedades for insert to authenticated
  with check (tecnico_id = auth.uid() and public.sou_tecnico());
create policy "técnico edita propriedade" on public.propriedades for update to authenticated using (tecnico_id = auth.uid());
create policy "técnico apaga propriedade" on public.propriedades for delete to authenticated using (tecnico_id = auth.uid());

create policy "ver talhões" on public.talhoes for select to authenticated using (public.pode_ver_propriedade(propriedade_id));
create policy "técnico gerencia talhões" on public.talhoes for all to authenticated
  using (public.eh_tecnico_da(propriedade_id)) with check (public.eh_tecnico_da(propriedade_id));

create policy "ver visitas" on public.visitas for select to authenticated using (public.pode_ver_propriedade(propriedade_id));
create policy "técnico gerencia visitas" on public.visitas for all to authenticated
  using (public.eh_tecnico_da(propriedade_id)) with check (public.eh_tecnico_da(propriedade_id));

create policy "ver amostras" on public.amostras for select to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "técnico gerencia amostras" on public.amostras for all to authenticated
  using (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)))
  with check (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)));

create policy "ver dados da NASA" on public.dados_nasa for select to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "gravar dados da NASA" on public.dados_nasa for insert to authenticated
  with check (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "atualizar dados da NASA" on public.dados_nasa for update to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));

create policy "ver planos" on public.planos for select to authenticated
  using (
    public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id))
    or (status = 'publicado' and public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)))
  );
create policy "técnico gerencia planos" on public.planos for all to authenticated
  using (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)))
  with check (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)));

create policy "ver tarefas" on public.tarefas for select to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "técnico cria tarefas" on public.tarefas for insert to authenticated
  with check (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)));
create policy "técnico apaga tarefas" on public.tarefas for delete to authenticated
  using (public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)));
create policy "técnico e produtor atualizam tarefas" on public.tarefas for update to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));

create policy "ver ocorrências" on public.ocorrencias for select to authenticated
  using (public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "relatar ocorrência" on public.ocorrencias for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_ver_propriedade(public.propriedade_do_talhao(talhao_id)));
create policy "atualizar ocorrência" on public.ocorrencias for update to authenticated
  using (autor_id = auth.uid() or public.eh_tecnico_da(public.propriedade_do_talhao(talhao_id)));

-- ---------- Arquivos (fotos de laudo e de ocorrências) ----------
-- Caminho: <propriedade_id>/<pasta>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos', 'arquivos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

create policy "ver arquivos da propriedade" on storage.objects for select to authenticated
  using (bucket_id = 'arquivos' and public.pode_ver_propriedade(((storage.foldername(name))[1])::uuid));
create policy "enviar arquivos da propriedade" on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and public.pode_ver_propriedade(((storage.foldername(name))[1])::uuid));

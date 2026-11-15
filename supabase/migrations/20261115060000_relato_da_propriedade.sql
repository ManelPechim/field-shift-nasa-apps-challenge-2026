-- Relato pode ser da propriedade inteira (talhao_id nulo) ou de um talhão dela.
alter table public.ocorrencias add column propriedade_id uuid references public.propriedades on delete cascade;
update public.ocorrencias o set propriedade_id = t.propriedade_id from public.talhoes t where t.id = o.talhao_id;
alter table public.ocorrencias alter column propriedade_id set not null, alter column talhao_id drop not null;
create index on public.ocorrencias (propriedade_id);

-- Com talhão informado, a propriedade vem dele: impede relato de um talhão apontando para outra propriedade
create or replace function public.ocorrencia_propriedade_do_talhao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.talhao_id is not null then
    select t.propriedade_id into new.propriedade_id from public.talhoes t where t.id = new.talhao_id;
  end if;
  return new;
end $$;
create trigger ocorrencia_propriedade_do_talhao before insert or update of talhao_id, propriedade_id on public.ocorrencias
  for each row execute function public.ocorrencia_propriedade_do_talhao();

drop policy "ver ocorrências" on public.ocorrencias;
drop policy "relatar ocorrência" on public.ocorrencias;
drop policy "atualizar ocorrência" on public.ocorrencias;
create policy "ver ocorrências" on public.ocorrencias for select to authenticated
  using (public.pode_ver_propriedade(propriedade_id));
create policy "relatar ocorrência" on public.ocorrencias for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_ver_propriedade(propriedade_id));
create policy "atualizar ocorrência" on public.ocorrencias for update to authenticated
  using (autor_id = auth.uid() or public.eh_tecnico_da(propriedade_id));

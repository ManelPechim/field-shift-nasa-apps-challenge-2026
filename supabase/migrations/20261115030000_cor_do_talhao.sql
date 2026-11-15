-- Cor escolhida pelo técnico para identificar o talhão no mapa e nas listas.
alter table public.talhoes add column cor text not null default '#f2c94c'
  check (cor ~* '^#[0-9a-f]{6}$');

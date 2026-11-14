-- A política de leitura usava pode_ver_propriedade(id), uma função STABLE que não enxerga a
-- linha recém-inserida no mesmo comando. Por isso "insert ... returning" falhava com erro de RLS.
-- Comparar as colunas diretamente resolve.
drop policy "ver propriedades" on public.propriedades;
create policy "ver propriedades" on public.propriedades for select to authenticated
  using (tecnico_id = auth.uid() or lower(produtor_email) = lower(auth.jwt() ->> 'email'));

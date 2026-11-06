-- =====================================================================
-- NEXFIT · banco Supabase · v1
-- Rodar inteiro no Supabase: SQL Editor > New query > colar > Run.
-- Pode rodar de novo sem erro (usa IF NOT EXISTS / OR REPLACE).
--
-- Regra de ouro: toda tabela tem user_id e RLS ligado.
-- Cada pessoa logada só enxerga e altera os próprios dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFIL (1 linha por usuário, criada automaticamente no cadastro)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text,
  sexo             text check (sexo in ('M','F','O')),
  nascimento       date,
  altura_cm        numeric(5,1),
  objetivo         text check (objetivo in ('emagrecer','manter','ganhar_massa','performance')),
  nivel_atividade  text check (nivel_atividade in ('sedentario','leve','moderado','intenso','atleta')),
  -- metas diárias (preenchidas pelo usuário ou pelo nutricionista)
  meta_kcal        integer,
  meta_proteina_g  integer,
  meta_carbo_g     integer,
  meta_gordura_g   integer,
  meta_agua_ml     integer default 3000,
  descanso_padrao_seg integer default 90,
  -- preparado para monetização futura (não usado ainda)
  plano            text not null default 'free' check (plano in ('free','pro','elite')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create or replace function public.nexfit_novo_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists nexfit_on_auth_user_created on auth.users;
create trigger nexfit_on_auth_user_created
  after insert on auth.users
  for each row execute function public.nexfit_novo_usuario();

-- ---------------------------------------------------------------------
-- 2. TREINO
-- ---------------------------------------------------------------------
-- Fichas A, B, C, D, E...
create table if not exists public.fichas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia       text not null,                 -- 'A', 'B', 'C'...
  nome      text not null,                 -- 'Peito e tríceps'
  ordem     smallint not null default 0,
  ativa     boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, dia)
);

-- Exercícios prescritos em cada ficha
create table if not exists public.ficha_exercicios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id      uuid not null references public.fichas(id) on delete cascade,
  exercicio     text not null,             -- nome igual ao da biblioteca do app
  series        smallint not null default 3,
  reps          text not null default '10-12',   -- texto para aceitar '8-10', 'falha'...
  carga_kg      numeric(6,2),
  descanso_seg  integer not null default 90,
  obs           text,
  ordem         smallint not null default 0
);

-- Cada treino feito (uma ida à academia)
create table if not exists public.sessoes_treino (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id      uuid references public.fichas(id) on delete set null,
  dia           text,                      -- guarda a letra mesmo se a ficha for apagada
  data          date not null default current_date,
  iniciado_em   timestamptz not null default now(),
  concluido_em  timestamptz,
  duracao_seg   integer,
  volume_kg     numeric(10,2),             -- soma de carga x reps
  snapshot      jsonb,                     -- cópia da ficha no dia (histórico não muda se a ficha mudar)
  obs           text
);

-- Cada série realizada
create table if not exists public.series_feitas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sessao_id    uuid not null references public.sessoes_treino(id) on delete cascade,
  exercicio    text not null,
  serie_num    smallint not null,
  reps         smallint,
  carga_kg     numeric(6,2),
  descanso_seg integer,
  concluida_em timestamptz not null default now()
);

create table if not exists public.cardio (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data      date not null default current_date,
  tipo      text not null,                 -- esteira, bike, escada...
  minutos   integer not null,
  obs       text
);

-- Registro de dor/desconforto (já existe no app)
create table if not exists public.dores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        date not null default current_date,
  regiao      text not null,
  intensidade smallint check (intensidade between 0 and 10),
  obs         text
);

-- ---------------------------------------------------------------------
-- 3. EVOLUÇÃO CORPORAL
-- ---------------------------------------------------------------------
create table if not exists public.medidas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data         date not null default current_date,
  peso_kg      numeric(5,2),
  gordura_pct  numeric(4,1),
  cintura_cm   numeric(5,1),
  quadril_cm   numeric(5,1),
  peito_cm     numeric(5,1),
  braco_cm     numeric(5,1),
  coxa_cm      numeric(5,1),
  obs          text
);

-- Fotos: arquivo vai no Storage (bucket 'fotos'), aqui fica só o caminho
create table if not exists public.fotos_evolucao (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data      date not null default current_date,
  pose      text,                          -- frente, lado, costas
  caminho   text not null,                 -- '<user_id>/2026-11-06-frente.webp'
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. DIETA
-- ---------------------------------------------------------------------
-- Alimentos: user_id NULL = base comum (todos veem); com user_id = alimento próprio
-- Valores sempre por 100 g (padrão da tabela TACO)
create table if not exists public.alimentos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  nome          text not null,
  kcal_100g     numeric(6,1) not null,
  proteina_100g numeric(5,1) not null default 0,
  carbo_100g    numeric(5,1) not null default 0,
  gordura_100g  numeric(5,1) not null default 0,
  porcao_padrao_g numeric(6,1),            -- ex.: 1 ovo = 50 g
  porcao_nome   text,                      -- ex.: 'unidade', 'colher de sopa'
  fonte         text                       -- 'TACO', 'rótulo', 'próprio'
);

-- Plano alimentar (o que DEVE comer): refeições fixas do dia
create table if not exists public.plano_refeicoes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,                 -- 'Café da manhã', 'Almoço'...
  horario   time,
  ordem     smallint not null default 0
);

create table if not exists public.plano_itens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  refeicao_id   uuid not null references public.plano_refeicoes(id) on delete cascade,
  alimento_id   uuid not null references public.alimentos(id) on delete restrict,
  quantidade_g  numeric(7,1) not null,
  -- substituições equivalentes: itens com o mesmo grupo_troca na mesma refeição
  grupo_troca   smallint,
  ordem         smallint not null default 0
);

-- Diário (o que COMEU de fato). Valores copiados no momento do registro,
-- assim o histórico não muda se o alimento for editado depois.
create table if not exists public.diario_alimentar (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data          date not null default current_date,
  refeicao      text not null,             -- 'Café da manhã'...
  alimento_id   uuid references public.alimentos(id) on delete set null,
  descricao     text not null,
  quantidade_g  numeric(7,1),
  kcal          numeric(7,1) not null default 0,
  proteina_g    numeric(6,1) not null default 0,
  carbo_g       numeric(6,1) not null default 0,
  gordura_g     numeric(6,1) not null default 0,
  no_plano      boolean not null default true,   -- false = saiu da dieta
  criado_em     timestamptz not null default now()
);

create table if not exists public.agua (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data      date not null default current_date,
  ml        integer not null check (ml > 0 and ml <= 3000),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. FOCO E DISCIPLINA
-- ---------------------------------------------------------------------
create table if not exists public.habitos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,                 -- 'Dormir 7h', 'Sem refrigerante'...
  icone     text,
  ativo     boolean not null default true,
  ordem     smallint not null default 0
);

create table if not exists public.habitos_check (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habito_id uuid not null references public.habitos(id) on delete cascade,
  data      date not null default current_date,
  primary key (habito_id, data)
);

-- ---------------------------------------------------------------------
-- 6. ÍNDICES (consultas sempre filtram por usuário + data)
-- ---------------------------------------------------------------------
create index if not exists ix_ficha_ex_ficha     on public.ficha_exercicios (ficha_id, ordem);
create index if not exists ix_sessoes_user_data  on public.sessoes_treino (user_id, data desc);
create index if not exists ix_series_sessao      on public.series_feitas (sessao_id);
create index if not exists ix_series_user_ex     on public.series_feitas (user_id, exercicio, concluida_em desc);
create index if not exists ix_cardio_user_data   on public.cardio (user_id, data desc);
create index if not exists ix_dores_user_data    on public.dores (user_id, data desc);
create index if not exists ix_medidas_user_data  on public.medidas (user_id, data desc);
create index if not exists ix_fotos_user_data    on public.fotos_evolucao (user_id, data desc);
create index if not exists ix_alimentos_nome      on public.alimentos (lower(nome));
create index if not exists ix_alimentos_user      on public.alimentos (user_id);
create index if not exists ix_plano_ref_user      on public.plano_refeicoes (user_id, ordem);
create index if not exists ix_plano_itens_ref     on public.plano_itens (refeicao_id, ordem);
create index if not exists ix_diario_user_data    on public.diario_alimentar (user_id, data desc);
create index if not exists ix_agua_user_data      on public.agua (user_id, data desc);
create index if not exists ix_habitos_user        on public.habitos (user_id, ordem);
create index if not exists ix_habitos_check_user  on public.habitos_check (user_id, data desc);
create index if not exists ix_fichas_user         on public.fichas (user_id, ordem);

-- ---------------------------------------------------------------------
-- 7. SEGURANÇA (RLS) — cada um só vê o que é seu
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "perfil_proprio" on public.profiles;
create policy "perfil_proprio" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Usuário não pode se promover para 'pro'/'elite' sozinho:
-- só o backend (service_role) muda o plano.
create or replace function public.nexfit_trava_plano()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.plano is distinct from old.plano and coalesce(auth.role(), '') <> 'service_role' then
    new.plano := old.plano;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists nexfit_trava_plano on public.profiles;
create trigger nexfit_trava_plano before update on public.profiles
  for each row execute function public.nexfit_trava_plano();

-- Tabelas comuns: mesma regra para todas
do $$
declare t text;
begin
  foreach t in array array[
    'fichas','ficha_exercicios','sessoes_treino','series_feitas','cardio','dores',
    'medidas','fotos_evolucao','plano_refeicoes','plano_itens','diario_alimentar',
    'agua','habitos','habitos_check'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Alimentos: todos leem a base comum; cada um mexe só nos seus
alter table public.alimentos enable row level security;
drop policy if exists "alimentos_ler"    on public.alimentos;
drop policy if exists "alimentos_criar"  on public.alimentos;
drop policy if exists "alimentos_editar" on public.alimentos;
drop policy if exists "alimentos_apagar" on public.alimentos;
create policy "alimentos_ler" on public.alimentos for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "alimentos_criar" on public.alimentos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "alimentos_editar" on public.alimentos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alimentos_apagar" on public.alimentos for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 8. RESUMO DO DIA (o painel "Hoje" lê daqui)
-- security_invoker = respeita o RLS de quem consulta
-- ---------------------------------------------------------------------
create or replace view public.resumo_dia with (security_invoker = on) as
with dias as (
  select user_id, data from public.diario_alimentar
  union select user_id, data from public.agua
  union select user_id, data from public.sessoes_treino
  union select user_id, data from public.habitos_check
)
select
  d.user_id,
  d.data,
  coalesce((select sum(kcal)       from public.diario_alimentar x where x.user_id=d.user_id and x.data=d.data),0) as kcal,
  coalesce((select sum(proteina_g) from public.diario_alimentar x where x.user_id=d.user_id and x.data=d.data),0) as proteina_g,
  coalesce((select sum(carbo_g)    from public.diario_alimentar x where x.user_id=d.user_id and x.data=d.data),0) as carbo_g,
  coalesce((select sum(gordura_g)  from public.diario_alimentar x where x.user_id=d.user_id and x.data=d.data),0) as gordura_g,
  coalesce((select bool_and(no_plano) from public.diario_alimentar x where x.user_id=d.user_id and x.data=d.data),true) as dieta_ok,
  coalesce((select sum(ml)         from public.agua a where a.user_id=d.user_id and a.data=d.data),0) as agua_ml,
  exists(select 1 from public.sessoes_treino s where s.user_id=d.user_id and s.data=d.data and s.concluido_em is not null) as treinou,
  (select count(*) from public.habitos_check h where h.user_id=d.user_id and h.data=d.data) as habitos_feitos
from dias d;

-- ---------------------------------------------------------------------
-- 9. SEQUÊNCIA DE DIAS (streak) — dias seguidos com treino OU dieta ok
-- Uso no app: supabase.rpc('nexfit_sequencia')
-- ---------------------------------------------------------------------
create or replace function public.nexfit_sequencia()
returns integer language sql stable security invoker set search_path = '' as $$
  with ok as (
    select data from public.resumo_dia
    where user_id = (select auth.uid()) and (treinou or (dieta_ok and kcal > 0))
  ),
  marcados as (
    select data, data - (row_number() over (order by data))::int as grupo from ok
  ),
  grupos as (
    select grupo, max(data) as fim, count(*)::int as dias from marcados group by grupo
  )
  select coalesce((select dias from grupos where fim >= current_date - 1 order by fim desc limit 1), 0);
$$;

-- ---------------------------------------------------------------------
-- 10. STORAGE: bucket privado para fotos de evolução
-- Cada usuário só acessa a pasta com o próprio id: fotos/<user_id>/arquivo
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos_dono_ler"    on storage.objects;
drop policy if exists "fotos_dono_enviar" on storage.objects;
drop policy if exists "fotos_dono_apagar" on storage.objects;
create policy "fotos_dono_ler" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos_dono_enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos_dono_apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 11. Função do gatilho não pode ser chamada pela API
-- ---------------------------------------------------------------------
revoke execute on function public.nexfit_novo_usuario() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 12. ESTADO DO APP (sincronização entre aparelhos)
-- O app guarda treinos/recordes/histórico num objeto só; ele vai inteiro aqui.
-- ---------------------------------------------------------------------
create table if not exists public.app_estado (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dados         jsonb not null,
  versao        integer not null default 1,
  aparelho      text,
  atualizado_em timestamptz not null default now()
);
alter table public.app_estado enable row level security;
drop policy if exists "dono" on public.app_estado;
create policy "dono" on public.app_estado for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

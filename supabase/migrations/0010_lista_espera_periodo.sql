-- Edital Map · Fase 3 · Planos anuais: a lista de espera guarda o período escolhido (mensal ou anual).
-- O site no ar continua funcionando com a coluna aplicada (padrão 'mensal'). RLS e grants da 0009 não mudam.
-- Aplicar com npm run db:aplicar (uma transação só), antes de publicar o site novo.

set local lock_timeout = '10s';

alter table public.lista_espera
  add column periodo text not null default 'mensal'
  constraint lista_espera_periodo_check check (periodo in ('mensal', 'anual'));

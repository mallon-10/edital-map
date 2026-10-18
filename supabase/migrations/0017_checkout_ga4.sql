-- GA4 pelo servidor: o checkout guarda o client_id e o session_id do GA4 e se a pessoa aceitou os cookies, para o
-- webhook mandar a compra pelo Measurement Protocol (lib/pagamento/ga4.ts). Sem consentimento, nada é enviado.
alter table public.checkouts
  add column ga_cliente text check (ga_cliente is null or ga_cliente ~ '^\d{1,20}\.\d{1,20}$'),
  add column ga_sessao text check (ga_sessao is null or ga_sessao ~ '^\d{1,20}$'),
  add column consentimento boolean not null default false;

notify pgrst, 'reload schema';

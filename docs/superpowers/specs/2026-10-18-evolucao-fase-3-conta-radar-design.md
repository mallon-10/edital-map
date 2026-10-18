# Edital Map · Evolução · Fase 3 · Conta, onboarding e Meu Radar (design)

Origem: prompt "Evolução do SaaS Edital Map" (17/10/2026) §2, §3 (uso no perfil), §9 (navegação parcial), §11, §12. Decisões do dono: login por e-mail com código; domínio www.editalmap.com.br (DNS no Registro.br, Resend com SMTP no Supabase e `RESEND_API_KEY` na Vercel, 18/10). Base: Fase 2 no ar (termos relacionados, relevância 0–100, lista, edital).

## 1. Conta (login por código)

- Página **/entrar**: campo de e-mail → "Enviar código" → o Supabase Auth manda um e-mail (via Resend, remetente nao-responda@editalmap.com.br) com **código de 6 dígitos** → a pessoa digita o código → entra. Primeiro acesso cria a conta (sem senha, sem cadastro à parte).
- Sessão em cookies httpOnly do Supabase (`@supabase/ssr`), validada no servidor a cada página/rota que precisa de usuário (`auth.getUser()`, nunca só o cookie). Chave usada: a publicável (anon) do projeto, só no servidor; a service role continua só no servidor para os dados.
- Cabeçalho: "Entrar" quando não há sessão; com sessão, menu da conta (e-mail, "Meu Radar", "Editar meu radar", "Sair").
- Textos e erros em pt-BR: código errado/expirado, muitas tentativas (limite do Supabase), e-mail inválido. Reenvio após 60 s.
- E-mail do código: modelo "Magic Link" do Supabase trocado para mostrar `{{ .Token }}` em português (o dono cola o texto pronto, ou o controlador ajusta pela API se houver acesso).
- O limite do grátis continua por navegador nesta fase (mudança para conta fica na Fase 5).

## 2. Perfil de interesse e onboarding

- Um radar por conta nesta fase (tabela `radares` já existente, ampliada por migração **0014**): `termos` (produtos/serviços), `termos_excluir`, `ufs`, `municipios` (IBGE, novo), `valor_min`, `valor_max` (novo), `modalidades`, `so_me_epp` (novo, boolean), `atualizado_em`. `perfis` ganha `ultima_visita_radar` e o plano passa a aceitar `gratis | basic | pro` (sem dados existentes; nada a migrar).
- **Onboarding em 3 etapas** (/radar/comecar), no primeiro acesso de uma conta sem radar:
  1. **O que sua empresa vende?** Campo com sugestões do catálogo de termos (lib/relevancia/termos.ts) e chips removíveis; vários produtos/serviços; mínimo 1.
  2. **Onde sua empresa atende?** Todo o Brasil (padrão) · estados · municípios (busca de município como no filtro).
  3. **Que tipo de oportunidade procura?** Opcional: valor mínimo e máximo, modalidades, "Só exclusivas para ME/EPP" (usa o resumo dos itens, quando o PNCP informa), palavras para excluir. Botão "Pular" nesta etapa.
  - "Tipo de contratação" (compra/serviço/obra) **não entra** nesta fase: o banco não guarda esse campo e o filtro não seria confiável (não apresentar o que não funciona).
- Salvar leva ao Meu Radar. Tudo editável depois em /radar/editar (mesmas etapas numa página só).

## 3. Meu Radar (/radar)

- Exige conta (sem sessão → /entrar?voltar=/radar). Sem radar → onboarding.
- Cards (contagens reais, no máximo 4, sem métricas irrelevantes):
  - **Oportunidades para o seu perfil** (total aberto que casa com o radar);
  - **Novas desde a sua última visita** (publicadas depois de `ultima_visita_radar`; a visita é registrada ao sair/no fim do carregamento);
  - **Prazo próximo** (encerram em até 7 dias).
  - "Editais salvos" entra na Fase 4 (não aparece antes de existir).
- Lista personalizada com os mesmos cards da lista da Fase 2 (título, órgão, município/UF, valor, modalidade, prazo, publicação, relevância com explicação, "Ver edital"), ordenação (relevância, recentes, menor prazo, maior e menor valor) e paginação.
- Busca do radar = os termos do perfil (OR entre produtos), cada um com seus relacionados, termos excluídos, UFs **ou** municípios, faixa de valor, modalidades e ME/EPP. Mesmo banco e mesma pontuação da Fase 2; a explicação cita o produto do perfil ("Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.").
- Precisa de filtros novos no banco (0014): lista de municípios (`p_ibges`), valor máximo (`p_valor_max`) e ME/EPP (`p_so_me_epp`), nas funções de lista/contagem existentes (superconjunto, chamadas atuais seguem valendo).
- **Plano**: abrir e ordenar o radar **não consome** buscas do grátis (o radar é o perfil da pessoa, não uma busca avulsa). Grátis vê os **5 primeiros** do radar e as contagens; o restante aparece atrás do cartão dos planos ("Prévia do Radar"). Basic/Pro (quando houver pagamento) veem tudo. Abrir um edital continua contando como edital do dia.

## 4. Navegação (parcial)

- Cabeçalho: "Meu Radar" ao lado de Mapa/Alertas/Planos (computador); no celular, entra pelo menu da conta e por um card no topo da página inicial para quem tem conta ("Ver meu radar"). A reorganização completa do menu (Explorar, Minhas Oportunidades…) fica na Fase 5.

## 5. Dados, segurança e medição

- Migração 0014: colunas novas, checagens, índices por `user_id`; RLS ligado; nenhuma política para anon/authenticated (dados continuam só pelo servidor com service role, sempre filtrando pelo `user_id` da sessão validada). Funções novas/alteradas só para service_role.
- Isolamento: toda leitura/gravação de radar/perfil passa por `lib/servidor/conta.ts`, que recebe o `user_id` só de `auth.getUser()`. Teste garante que nenhuma rota aceita `user_id` vindo do navegador.
- Eventos novos (tipos em `eventos_tipo_check`): `conta_entrou` (primeiro login e logins), `onboarding_iniciado`, `onboarding_concluido` (com contagem de termos/UFs, sem e-mail), `radar_visto`. E-mail não vai para `eventos`.
- LGPD: guardar só e-mail (Supabase Auth) e as preferências; "Excluir minha conta" fica para a Fase 5 junto com o perfil completo (anotar no aceite).

## 6. Testes e aceite

- vitest: validação do onboarding (mínimo 1 termo, limites de tamanho, UFs/IBGE válidos, faixa de valor coerente), montagem da busca do radar (termos múltiplos → relacionados por termo, excluídos, filtros), explicação com "um dos produtos que você monitora", prévia de 5 no grátis, rotas que exigem sessão (401/redirect), nenhuma rota aceita user_id do cliente.
- Banco (controlador): 0014 aplicada; funções antigas seguem respondendo; `p_ibges`/`p_valor_max`/`p_so_me_epp` corretos; tempos do radar com 5 produtos < 500 ms.
- Ponta a ponta (controlador, com um e-mail do dono ou de teste): receber o código, entrar, fazer onboarding, ver o radar com contagens reais, editar, sair.
- Navegador 1440 e 390 px: /entrar, onboarding, radar, menu da conta.

- [ ] Login por código funcionando no domínio (e-mail chega pelo Resend, código entra, sair funciona).
- [ ] Onboarding em 3 etapas salvando o perfil; edição posterior.
- [ ] Meu Radar com cards reais, lista personalizada, ordenação, paginação e explicação pelo perfil; prévia de 5 no grátis.
- [ ] Isolamento entre usuários (só servidor, user_id da sessão); eventos novos gravados.
- [ ] Testes e typecheck passando; publicado e conferido.

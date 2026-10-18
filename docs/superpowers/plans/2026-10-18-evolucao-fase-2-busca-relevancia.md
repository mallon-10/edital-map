# Edital Map · Evolução · Fase 2 · Busca, relevância, lista e edital · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revogadas e anuladas fora das abertas em todo lugar (suspensas com etiqueta), busca com termos relacionados e termos excluídos (`-palavra`), relevância 0–100 com explicação e aviso, alternador Lista | Mapa no endereço (padrão Lista) com cards largos, ordenação, paginação numerada e estado vazio útil, e página do edital com resumo simples, datas separadas, identificador, situação, Compartilhar e "Abrir edital oficial" sempre acessível.

**Architecture:** Uma migração (`0011_busca_relevancia.sql`) põe a regra de "aberta" num lugar só (`public.em_aberto`) e a usa em `abertas`, `abertas_unicas`, `orgaos_abertos` e `relacionados`; `abertas_unicas` passa a receber todos os filtros e as consultas de texto já montadas; `buscar_editais` (plpgsql) recebe os termos digitados (`p_termos`), os relacionados (`p_relacionados`), os excluídos (`p_excluir`) e a ordem (`p_ordem`) e devolve, por edital, `situacao_id`, `pontuacao` e o que bateu (`termos_objeto`, `termos_itens`, `frase`); `mapa_editais` usa a mesma `abertas_unicas` com os mesmos termos. As assinaturas antigas saem na mesma transação e as novas são superconjuntos com padrão nulo: o site no ar continua funcionando depois da 0011. No site, tudo o que decide é puro e testado: `lib/relevancia/termos.ts` (grupos de termos, separação do digitado, `-palavra`, expansão), `lib/relevancia/pontuacao.ts` (`pontuar`, `explicar`, com os mesmos pesos de `public.pontuacao_busca`), `lib/relevancia/destaque.ts`, `lib/paginacao.ts`, `lib/vazio.ts`, `lib/situacao.ts`, `lib/resumoEdital.ts`, `lib/compartilhar.ts`. O servidor (`lib/servidor/consultas.ts`) manda os termos ao banco e anexa a cada card a relevância e os destaques. A página inicial ganha `vista`, `pagina` e `ordem` no endereço (`lib/urlBusca.ts`, escrito só por `trocarEndereco`), e nada disso entra na chave que conta a busca do dia.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + maplibre-gl 6, @supabase/supabase-js 2, Postgres 15 do Supabase (PostgREST, plpgsql, full text `portuguese` + `unaccent`), vitest 3, TypeScript 5, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-18-evolucao-fase-2-busca-relevancia-design.md` (vinculante). Regras do projeto: `CLAUDE.md`.

## Global Constraints

- Trabalho no worktree `C:\Users\jotap\worktrees\evolucao-f2` (Git Bash: `/c/Users/jotap/worktrees/evolucao-f2`), branch `evolucao-fase-2` (já existe e está ativo). Todos os comandos rodam na raiz do worktree. **Não ler nem mexer no checkout principal** (pasta do OneDrive). Não ler nem imprimir o `.env`.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/` ou `components/` também rodam `npm run build`.
- Schema só muda com migração nova: esta fase cria só `supabase/migrations/0011_busca_relevancia.sql`; não editar 0001–0010. **Implementadores não aplicam migração, não rodam SQL, não tocam no banco e não chamam o PNCP**: escrevem o SQL e as guardas de texto em vitest. Quem aplica e confere é o controlador (Task 4): `npm run db:aplicar -- supabase/migrations/0011_busca_relevancia.sql` (uma transação, `set local lock_timeout = '10s'`).
- Funções novas ou trocadas com `revoke execute on function ... from public, anon, authenticated;` e `grant execute on function ... to service_role;` explícitos **por assinatura** (como na 0007–0009).
- Assinaturas antigas de `buscar_editais`, `mapa_editais` e `abertas_unicas` saem na mesma transação; as novas aceitam as chamadas antigas (parâmetros novos com padrão nulo). Ordem obrigatória: 0011 (Task 4) → site novo (Task 12). Tabela em "Ordem de publicação".
- "Aberta" = `encerramento_em > now()` **e** `situacao_id not in (2, 3)` (Revogada, Anulada), em `public.em_aberto` e em nenhum outro lugar. Suspensa (4) continua aberta, com a etiqueta "Suspensa".
- Dados do site só pelo servidor (`lib/servidor/*`, `import 'server-only'`). `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL` nunca vão para o navegador nem para o git.
- Contagem do limite do grátis: semântica igual à de hoje (`combinacaoBusca` em `lib/limites.ts` não muda de regra). `vista`, `pagina` e `ordem` **nunca** entram na chave; um conjunto novo de termos (inclusive `-palavra`) entra, porque o termo bruto já entra.
- O endereço da página inicial só é escrito por `trocarEndereco` (`lib/cliente/endereco.ts`). Nunca `history.replaceState(null, …)`.
- Todo `<Link>` para `/edital/...` e para a página inicial com busca (`/?…`) tem `prefetch={false}` (guardas em `scripts/prefetch-edital.test.ts` e `scripts/celular.test.ts`). Sem `app/edital/[slug]/loading.tsx`, sem `cacheComponents`.
- Interface em português do Brasil, vocabulário "edital" e "Alertas". Só as cores e raios do design system em `app/globals.css` (`bg-pin`, `text-on-pin`, `bg-pin-soft`, `text-pin-strong`, `bg-ouro-soft`, `text-ouro-strong`, `bg-mata-soft`, `text-mata`, `bg-rio-soft`, `text-rio`, `bg-sunken`, `bg-raised`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `border-line-strong`, `rounded-xs/sm/md/lg`). Nenhuma cor nova (o cartão escuro `CartaoSelecionado` só reaproveita as classes que já tem).
- Textos do PNCP só passam por `lib/texto.ts` (`assunto`, `textoLimpo`, `nomeProprio`); sem IA; o resumo do edital só usa campos existentes.
- Textos exatos: aviso "Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar."; níveis Alta (≥ 70), Média (40–69), Baixa (< 40); ordens "Maior relevância", "Mais recentes", "Menor prazo", "Maior valor", "Menor valor"; suspensa "O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar."; cobertura "Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento"; "Link copiado"; estado vazio "Nenhum edital aberto para “…”…"; resumo "Este edital trata de {assunto}, do {órgão} ({município}/{UF}). Modalidade: {modalidade}. Valor estimado: {valor | não informado pelo órgão}. As propostas podem ser enviadas até {data}, às {hora}."
- `components/Mapa.tsx` não muda (nem o comportamento do mapa: clusters, pílulas, zoom no município).
- Implementadores verificam com `npm test`, `npm run typecheck` e `npm run build`; **não** sobem `npm run dev` contra o banco. Conferências no navegador são do controlador (Task 12).
- Fora do escopo (spec §5): conta, salvar/descartar, Meu Radar, alertas, mudança de plano/limite/cobrança.
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Estimativa de tempo

| Task | Quem | Modelo | Tempo estimado | Acumulado |
|---|---|---|---|---|
| 1 · Termos relacionados e leitura da busca | implementador | standard | 35 min | 0h35 |
| 2 · Pontuação, explicação e destaque | implementador | standard | 35 min | 1h10 |
| 3 · Migração 0011, guardas e conferências | implementador | capable | 60 min | 2h10 |
| 4 · Aplicar a 0011 e conferir | controlador | — | 30 min | 2h40 |
| 5 · Página, ordem e vista no endereço e na API | implementador | standard | 50 min | 3h30 |
| 6 · Servidor: termos, ordem e relevância | implementador | standard | 40 min | 4h10 |
| 7 · Peças da lista | implementador | standard | 55 min | 5h05 |
| 8 · Lista ligada: ordenação, paginação e estado vazio | implementador | capable | 50 min | 5h55 |
| 9 · Alternador Lista \| Mapa, vista larga e celular | implementador | capable | 55 min | 6h50 |
| 10 · Página do edital | implementador | standard | 50 min | 7h40 |
| 11 · Cobertura honesta | implementador | cheap | 15 min | 7h55 |
| 12 · Publicar e conferir | controlador | — | 50 min | 8h45 |
| 13 · Documentação e aceite | implementador + controlador | cheap | 15 min | 9h00 |

Revisões entre tasks somam ~20%: total realista **~11 h**. **Do dono: nada obrigatório** (opcional: abrir o site no celular depois da Task 12). Se a Task 4 medir a relevância acima de 500 ms com termo amplo, avisar com a nova estimativa (+30–60 min para o ajuste descrito em "Riscos").

## Decisões (onde a spec deixou espaço)

1. **Onde a relevância é calculada.** O banco ordena: `public.pontuacao_busca` (pesos fixos) roda dentro de `buscar_editais`; com ordem "Maior relevância" em todas as abertas da busca (precisa, para ordenar), nas outras ordens só nos 20 da página. O banco devolve também o que bateu (`termos_objeto`, `termos_itens`, `frase`). O site calcula o número do card e a explicação com `pontuar`/`explicar` (puras, testadas) a partir desses acertos. Os pesos são os mesmos nos dois lados (`PESOS`, guarda de texto na migração) e o servidor avisa no log se o número do banco e o do site diferirem; `scripts/conferir-relevancia.ts` compara os dois em produção. Trocar a origem dos termos (sinônimos → semântica) troca só `expandir`.
2. **Pesos.** "até 60/35/45/25" = valor do melhor tipo de acerto (não somam entre si): digitado no objeto 60, digitado só nos itens 35, relacionado no objeto 45, relacionado só nos itens 25. "Frase" (+15) = as palavras do termo digitado em sequência no objeto (por prefixo; uma palavra sozinha conta). "+5 cada (até +15)" = por termo distinto **além do primeiro**. Teto 100 (com estes pesos o máximo real é 90).
3. **"Objeto"** = a coluna `busca` (objeto + informação complementar), como o "Encontrado nos itens" de hoje.
4. **Termos relacionados viajam como array** (`p_relacionados text[]`), e os digitados também (`p_termos text[]`, separados no site com os mesmos separadores de `public.consulta`): o banco devolve exatamente as strings que recebeu, e o site as reconhece sem normalização. `q` continua (chamada antiga; ignorado quando vem `p_termos`).
5. **Expansão:** termo digitado expande quando a chave (sem acento, minúscula, sem "s" final de palavra com 4+ letras) é igual à de um termo de um grupo; o grupo inteiro entra, até 20 relacionados. Termo fora de grupo expande só para si.
6. **Negativos:** `-palavra` (uma palavra por hífen; hífen solto ou no meio da palavra não conta) exclui quem tem a palavra **no objeto**; os itens não excluem (um edital grande com um item citando a palavra não some).
7. **Paginação:** 20 por página nas duas vistas (o "Carregar mais" sai); `pagina=` no endereço; a ordenação aparece nas duas vistas.
8. **Mapa consistente:** lista, mapa, contagem e exportação passam pela mesma `abertas_unicas`, com a mesma `em_aberto` e os mesmos termos. O mapa só desenha editais com município conhecido; a conferência mede "lista = mapa + sem município".
9. **"Atualizado no Edital Map em"** = última sincronização com sucesso (`sync_estado`, a mesma da faixa): `sincronizada_em` só é gravada na inserção (worker/conferir.ts). A página mostra também "Última alteração no PNCP" (`atualizada_pncp_em`).
10. **Celular:** barra de baixo "Mapa" → vista Mapa (no topo); "Lista" → vista Lista. `tela=lista` (mapa em cima, lista embaixo, rolada) só existe na vista Mapa.
11. **Estado vazio:** sugestões só com número real > 0 (`/api/contagem`, que não conta): tirar um filtro (a que mais devolve primeiro = "o mais restritivo"), ampliar para Todo o Brasil, tirar os excluídos, e "termos parecidos" do catálogo (prefixo, "farda" → "fardamento"). Sugerir outro termo do mesmo grupo não serve: ele já está na busca (OR).
12. **Contagem** (`/api/contagem`) pede ordem "prazo" (não calcula a relevância de tudo só para um total). **Exportação** sai na ordem da lista.
13. **Revogada/anulada aberta por link direto:** a página do edital continua existindo e mostra a situação com aviso; some da lista, do mapa, dos órgãos e dos parecidos.

## Ordem de publicação (perigos)

| Momento | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| 0011 | Task 4: `gh run list --workflow sync.yml --limit 1` sem `in_progress` → aplicar → site no ar 200 → conferências [E1]–[E6] e `scripts/conferir-relevancia.ts`. Só depois, Task 12: `vercel deploy --prod --yes`. | Site novo antes da 0011: `buscar_editais`/`mapa_editais` não conhecem `p_termos`, `p_relacionados`, `p_excluir`, `p_ordem` → PostgREST recusa → lista, mapa, contagem e exportação dão 502. |
| 0011 aplicada, site antigo no ar | Nada a fazer: o site antigo chama as funções sem os parâmetros novos (padrão nulo) e ignora as colunas novas. Muda para ele: revogadas/anuladas somem (desejado) e, com termo, a ordem padrão vira relevância (o "Carregar mais" de 50 continua coerente, ordem determinística). | — |
| Cache | `/api/contagem` continua `CACHE_PUBLICO` (5 min no CDN): logo depois da publicação o "Ver N editais" pode mostrar o número antigo por até 5 min. | — |
| Sessão aberta no navegador | A volta guardada (`sessionStorage`) de antes da publicação não tem `vista`: o endereço novo não bate e a volta só não restaura. | — |
| Sempre | `db:aplicar` fora de uma rodada do sync. | `lock_timeout` de 10 s estoura; a migração inteira volta atrás. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/relevancia/termos.ts` (novo) | `GRUPOS`, `normalizar`, `chave`, `separarNegativos`, `gruposDigitados`, `expandir`, `interpretarBusca`, `temTermo`, `termosParecidos` |
| `lib/relevancia/pontuacao.ts` (novo) | `PESOS`, `Acertos`, `Relevancia`, `pontuar`, `nivel`, `explicar`, `relevancia`, `AVISO_RELEVANCIA` |
| `lib/relevancia/destaque.ts` (novo) | `destacar` (trechos marcados do título) |
| `lib/situacao.ts` (novo) | `SITUACOES_FORA_DAS_ABERTAS`, `rotuloSituacao`, `avisoSituacao`, `AVISO_SUSPENSA` |
| `supabase/migrations/0011_busca_relevancia.sql` (novo) | `em_aberto`, `termos_da_busca`, `consulta_termos`, `consulta_frase`, `pontuacao_busca`, `acertos_busca`, `abertas`, `abertas_unicas`, `buscar_editais`, `mapa_editais`, `orgaos_abertos`, `relacionados`, permissões |
| `scripts/migracoes.test.ts` | Guardas de texto da 0011 |
| `docs/evolucao-fase-2.sql` (novo), `scripts/conferir-relevancia.ts` (novo) | Conferências do controlador |
| `lib/tipos.ts` | `Ordem`; `FiltrosBusca.pagina/ordem` (sai `deslocamento`); `EditalResumo.situacao_id/relevancia/destaques`; `Edital.situacao_id/atualizada_pncp_em` |
| `lib/filtros.ts` | `POR_PAGINA` (20), `MAX_PAGINA`, `ORDENS`, `lerOrdem`, `ordemEfetiva`; `lerFiltros`/`chaveFiltros`/`paraParametros` com página e ordem |
| `lib/urlBusca.ts` | `Vista`, `EstadoTela`, `ESTADO_PADRAO`, `urlDaBusca(f, estado)`, `lerBuscaDaUrl → { busca, estado }`, `comTela` |
| `lib/limites.ts` | Só o comentário de `combinacaoBusca` (regra igual) |
| `lib/servidor/consultas.ts` | Termos, ordem e página para o banco; relevância e destaques no card; situação e datas no edital |
| `app/api/contagem/route.ts` | Página 1, ordem prazo |
| `lib/paginacao.ts`, `lib/vazio.ts` (novos) | Números da paginação; sugestões do estado vazio |
| `components/EtiquetaSituacao.tsx`, `components/inicio/{Relevancia,TituloDestacado,Paginacao,SeletorOrdem,CardLista,EstadoVazio,AlternadorVista}.tsx` (novos) | Peças da lista |
| `components/inicio/ColunaLista.tsx`, `CardCompacto.tsx`, `CartaoSelecionado.tsx`, `components/Explorador.tsx`, `app/page.tsx` | Lista ligada, vista, ordenação, paginação, estado vazio, celular |
| `lib/resumoEdital.ts`, `lib/compartilhar.ts` (novos), `components/edital/{FichaEdital,ResumoOportunidade,BotaoCompartilhar}.tsx` (novos), `components/edital/PrincipaisInformacoes.tsx`, `app/edital/[slug]/page.tsx` | Página do edital |
| `lib/cobertura.ts` (novo), `components/FaixaCobertura.tsx`, `app/sobre/page.tsx` | Cobertura honesta |
| `scripts/prefetch-edital.test.ts`, `scripts/celular.test.ts`, `scripts/edital.test.ts` (novo), `scripts/cobertura.test.ts` (novo) | Guardas |
| `CLAUDE.md`, spec §6, `docs/fase-3-metricas.md` | Documentação, aceite e números |

---

### Task 1: Termos relacionados e leitura da busca (`lib/relevancia/termos.ts`)

**Files:**
- Create: `lib/relevancia/termos.ts`
- Test: `lib/relevancia/termos.test.ts`

**Interfaces:**
- Consumes: nada (puro).
- Produces:
  - `type Grupo = { assunto: string; termos: readonly string[] }`; `GRUPOS: readonly Grupo[]`; `MAX_RELACIONADOS = 20`; `SIGLAS_TERMOS: ReadonlySet<string>`; `LIGACOES: ReadonlySet<string>`.
  - `normalizar(t: string): string` (sem acento, minúsculo, não alfanumérico vira espaço, espaços colapsados); `chave(t: string): string` (normalizar + tira o "s" final das palavras de 4+ letras).
  - `separarNegativos(q: string): { positivo: string; negativos: string[] }`.
  - `gruposDigitados(texto: string): string[]` (mesmos separadores de `public.consulta`; sem repetidos pela chave; só grupos com palavra de 2+ caracteres).
  - `type TermoRelacionado = { termo: string; assunto: string; de: string }`; `expandir(digitados: readonly string[]): TermoRelacionado[]`.
  - `type Busca = { positivo: string | null; digitados: string[]; relacionados: TermoRelacionado[]; excluidos: string[] }`; `interpretarBusca(q: string | null): Busca`; `temTermo(q: string | null): boolean`.
  - `termosParecidos(digitados: readonly string[], limite?: number): string[]`.

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `lib/relevancia/termos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  chave, expandir, GRUPOS, gruposDigitados, interpretarBusca, LIGACOES, MAX_RELACIONADOS, normalizar, separarNegativos,
  SIGLAS_TERMOS, temTermo, termosParecidos,
} from './termos';

describe('normalizar e chave', () => {
  it('sem acento, minúsculo, pontuação vira espaço, espaços colapsados', () => {
    expect(normalizar('  Luva   Nitrílica ')).toBe('luva nitrilica');
    expect(normalizar('Médico-Hospitalar')).toBe('medico hospitalar');
  });
  it('chave tira o "s" final das palavras de 4+ letras (plural simples)', () => {
    expect(chave('Uniformes')).toBe(chave('uniforme'));
    expect(chave('EPIs')).toBe('epi');
    expect(chave('gás')).toBe('gas');
  });
});

describe('grupos de termos', () => {
  const todos = GRUPOS.flatMap((g) => g.termos);
  it('nenhum termo tem separador de alternativas (public.consulta separaria)', () => {
    for (const t of todos) expect(t).not.toMatch(/[,;|]|\s(e|ou)\s/i);
  });
  it('cada palavra tem 4+ caracteres, é número, sigla conhecida ou palavra de ligação (a busca é por prefixo)', () => {
    const curtas = todos.filter((t) =>
      normalizar(t).split(' ').some((p) => p.length < 4 && !/^\d+$/.test(p) && !SIGLAS_TERMOS.has(p) && !LIGACOES.has(p)),
    );
    expect(curtas).toEqual([]);
  });
  it('nenhum termo repetido (pela chave), nem dentro do grupo nem entre grupos', () => {
    const chaves = todos.map(chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
  it('cada grupo cabe no limite de relacionados', () => {
    for (const g of GRUPOS) expect(g.termos.length - 1).toBeLessThanOrEqual(MAX_RELACIONADOS);
  });
  it('cada termo expande para todos os outros termos do seu grupo', () => {
    for (const g of GRUPOS) {
      for (const t of g.termos) {
        expect(expandir([t]).map((r) => r.termo).sort()).toEqual(g.termos.filter((x) => x !== t).sort());
      }
    }
  });
});

describe('expandir', () => {
  it('sem diferença de acento, maiúsculas ou plural', () => {
    expect(expandir(['UNIFORMES']).map((r) => r.termo)).toContain('fardamento');
    expect(expandir(['fardamentos']).map((r) => r.termo)).toContain('uniforme');
    expect(expandir(['Luva Nitrilica']).map((r) => r.termo)).toContain('botina');
  });
  it('termo fora de grupo expande só para si (nenhum relacionado)', () => {
    expect(expandir(['caneca'])).toEqual([]);
    expect(expandir(['luvas de couro de cabra'])).toEqual([]);
  });
  it('cada relacionado diz o assunto e o termo digitado que o trouxe', () => {
    expect(expandir(['uniforme'])[0]).toEqual({ termo: 'fardamento', assunto: 'uniformes profissionais', de: 'uniforme' });
  });
  it('dois digitados do mesmo grupo: sem repetidos e sem devolver o que foi digitado', () => {
    const r = expandir(['uniforme', 'jaleco']).map((x) => x.termo);
    expect(r).not.toContain('jaleco');
    expect(r).not.toContain('uniforme');
    expect(new Set(r).size).toBe(r.length);
  });
  it('no máximo MAX_RELACIONADOS', () => {
    expect(expandir(['EPI', 'uniforme', 'merenda'])).toHaveLength(MAX_RELACIONADOS);
  });
});

describe('separarNegativos', () => {
  it('tira "-palavra" e guarda a palavra', () => {
    expect(separarNegativos('uniforme -escolar')).toEqual({ positivo: 'uniforme', negativos: ['escolar'] });
  });
  it('mantém o separador que vinha colado no negativo', () => {
    expect(separarNegativos('luva -latex, botina')).toEqual({ positivo: 'luva, botina', negativos: ['latex'] });
  });
  it('hífen solto ou no meio da palavra não é negativo', () => {
    expect(separarNegativos('EPI - luva')).toEqual({ positivo: 'EPI - luva', negativos: [] });
    expect(separarNegativos('pré-moldado')).toEqual({ positivo: 'pré-moldado', negativos: [] });
  });
  it('negativo repetido entra uma vez; só negativos deixam o positivo vazio', () => {
    expect(separarNegativos('-escolar -Escolar')).toEqual({ positivo: '', negativos: ['escolar'] });
  });
});

describe('gruposDigitados (mesmos separadores de public.consulta)', () => {
  it('vírgula, ponto e vírgula, barra vertical, " e " e " ou " separam alternativas', () => {
    expect(gruposDigitados('EPI e uniformes, luva; bota | capacete ou óculos')).toEqual(['EPI', 'uniformes', 'luva', 'bota', 'capacete', 'óculos']);
  });
  it('palavras juntas ficam no mesmo grupo; repetido e grupo sem palavra de 2+ caracteres saem', () => {
    expect(gruposDigitados('luva  nitrílica, Luva Nitrilica, a')).toEqual(['luva nitrílica']);
  });
  it('vazio', () => {
    expect(gruposDigitados('   ')).toEqual([]);
  });
});

describe('interpretarBusca', () => {
  it('digitados, relacionados e excluídos', () => {
    const b = interpretarBusca('uniformes -escolar');
    expect(b.positivo).toBe('uniformes');
    expect(b.digitados).toEqual(['uniformes']);
    expect(b.excluidos).toEqual(['escolar']);
    expect(b.relacionados.map((r) => r.termo)).toContain('fardamento');
  });
  it('sem nada', () => {
    expect(interpretarBusca(null)).toEqual({ positivo: null, digitados: [], relacionados: [], excluidos: [] });
    expect(interpretarBusca('  ')).toEqual({ positivo: null, digitados: [], relacionados: [], excluidos: [] });
  });
  it('temTermo: só negativos não são termo', () => {
    expect(temTermo('luva')).toBe(true);
    expect(temTermo('-escolar')).toBe(false);
    expect(temTermo('')).toBe(false);
    expect(temTermo(null)).toBe(false);
  });
});

describe('termosParecidos (sugestões do estado vazio)', () => {
  it('termo do catálogo que começa como o digitado', () => {
    expect(termosParecidos(['farda'])).toEqual(['fardamento']);
  });
  it('nada parecido, sigla curta não vale, e digitado que já é de um grupo não sugere (os do grupo já estão na busca)', () => {
    expect(termosParecidos(['xyzw'])).toEqual([]);
    expect(termosParecidos(['epidemiologia'])).toEqual([]);
    expect(termosParecidos(['uniforme'])).toEqual([]);
    expect(termosParecidos(['luva'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/relevancia/termos.test.ts`
Expected: FAIL (módulo `./termos` não existe).

- [ ] **Step 3: Implementar**

Crie `lib/relevancia/termos.ts`:
```ts
/**
 * Termos relacionados da busca (sinônimos e expressões por assunto), a separação do que foi digitado e os termos
 * excluídos ("-palavra"). Puro: o servidor manda o resultado ao banco (buscar_editais e mapa_editais, 0011) e a
 * explicação da relevância usa os mesmos termos. Trocar a origem dos termos (sinônimos → busca semântica) muda só
 * `expandir`: lista, card e rotas continuam iguais.
 *
 * Regras de cada termo (testadas): sem vírgula, ponto e vírgula, barra vertical, " e " nem " ou " (public.consulta
 * separaria em alternativas); cada palavra com 4+ caracteres, número, sigla de SIGLAS_TERMOS ou palavra de ligação.
 * A busca do banco é por prefixo do radical: palavra curta acharia de tudo ("rodo" acha "rodovia").
 */

export type Grupo = { assunto: string; termos: readonly string[] };

export const GRUPOS: readonly Grupo[] = [
  {
    assunto: 'equipamentos de proteção individual',
    termos: [
      'EPI', 'equipamento de proteção individual', 'luva', 'luva nitrílica', 'luva de vaqueta', 'botina', 'bota de segurança',
      'calçado de segurança', 'capacete', 'protetor auricular', 'óculos de proteção', 'máscara PFF2', 'respirador',
      'cinto de segurança', 'colete refletivo', 'perneira',
    ],
  },
  {
    assunto: 'uniformes profissionais',
    termos: [
      'uniforme', 'fardamento', 'vestuário profissional', 'roupa profissional', 'jaleco', 'camiseta', 'camisa polo', 'jaqueta',
      'agasalho', 'avental', 'bermuda',
    ],
  },
  {
    assunto: 'materiais de limpeza',
    termos: [
      'material de limpeza', 'produto de limpeza', 'saneante', 'desinfetante', 'detergente', 'água sanitária', 'sabonete',
      'álcool 70', 'papel higiênico', 'papel toalha', 'saco de lixo', 'vassoura', 'higienização',
    ],
  },
  {
    assunto: 'materiais de construção',
    termos: [
      'material de construção', 'cimento', 'areia', 'brita', 'tijolo', 'bloco de concreto', 'argamassa', 'vergalhão', 'telha',
      'madeira', 'tinta', 'material hidráulico', 'material elétrico',
    ],
  },
  {
    assunto: 'móveis',
    termos: ['mobiliário', 'móveis', 'móvel', 'cadeira', 'armário', 'estante', 'sofá', 'longarina', 'mesa de escritório', 'mesa de reunião'],
  },
  {
    assunto: 'alimentos e merenda',
    termos: [
      'merenda', 'merenda escolar', 'alimentação escolar', 'gênero alimentício', 'hortifrutigranjeiro', 'carne bovina', 'frango',
      'leite', 'arroz', 'feijão', 'frutas', 'verduras',
    ],
  },
  {
    assunto: 'informática',
    termos: [
      'informática', 'computador', 'microcomputador', 'notebook', 'impressora', 'toner', 'cartucho de tinta', 'teclado', 'mouse',
      'nobreak', 'tablet', 'switch', 'software', 'licença de software',
    ],
  },
  {
    assunto: 'material de escritório',
    termos: ['material de escritório', 'material de expediente', 'papel A4', 'caneta', 'grampeador', 'envelope', 'clipe', 'lápis'],
  },
  {
    assunto: 'medicamentos e material hospitalar',
    termos: [
      'medicamento', 'fármaco', 'material hospitalar', 'material médico-hospitalar', 'insumo hospitalar', 'seringa', 'agulha',
      'gaze', 'luva de procedimento', 'soro fisiológico', 'curativo', 'cateter',
    ],
  },
  {
    assunto: 'veículos e peças',
    termos: [
      'veículo', 'automóvel', 'caminhão', 'ônibus', 'motocicleta', 'ambulância', 'peça automotiva', 'autopeças', 'pneu',
      'bateria automotiva', 'óleo lubrificante',
    ],
  },
  {
    assunto: 'combustíveis',
    termos: ['combustível', 'gasolina', 'óleo diesel', 'etanol', 'GLP', 'ARLA 32', 'abastecimento de veículos'],
  },
  {
    assunto: 'obras e reformas',
    termos: ['reforma', 'construção civil', 'pavimentação', 'recapeamento', 'edificação', 'ampliação de prédio', 'drenagem pluvial'],
  },
  {
    assunto: 'manutenção predial',
    termos: [
      'manutenção predial', 'manutenção preventiva', 'manutenção corretiva', 'conservação predial', 'pintura predial',
      'instalação elétrica', 'instalação hidráulica', 'ar-condicionado',
    ],
  },
  {
    assunto: 'serviços de saúde',
    termos: [
      'serviço de saúde', 'consulta médica', 'exame laboratorial', 'exame de imagem', 'plantão médico', 'atendimento médico',
      'fisioterapia', 'hemodiálise',
    ],
  },
];

/** Teto de relacionados por busca (cada um vira uma checagem por edital no banco). */
export const MAX_RELACIONADOS = 20;
/** Palavras curtas aceitas nos termos: siglas (e "ar", de ar-condicionado). */
export const SIGLAS_TERMOS: ReadonlySet<string> = new Set(['epi', 'pff2', 'glp', 'a4', 'ar']);
/** Palavras de ligação (o banco ignora como palavra vazia do português). */
export const LIGACOES: ReadonlySet<string> = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em']);

/** Sem acento, minúsculo, o que não é letra ou número vira espaço, espaços colapsados. */
export function normalizar(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Chave de comparação: normalizado e sem o "s" final das palavras de 4+ letras ("uniformes" = "uniforme"). */
export function chave(t: string): string {
  return normalizar(t)
    .split(' ')
    .map((p) => (p.length >= 4 && p.endsWith('s') ? p.slice(0, -1) : p))
    .join(' ');
}

/**
 * Tira do texto os termos excluídos ("-palavra": hífen colado numa letra ou número no começo da palavra).
 * Um separador colado no negativo ("-latex,") fica no positivo, para as alternativas não se juntarem.
 */
export function separarNegativos(q: string): { positivo: string; negativos: string[] } {
  const positivos: string[] = [];
  const negativos: string[] = [];
  for (const parte of q.trim().split(/\s+/)) {
    const m = /^-([\p{L}\p{N}][^,;|]*)([,;|]*)$/u.exec(parte);
    if (!m) {
      if (parte) positivos.push(parte);
      continue;
    }
    if (!negativos.some((n) => chave(n) === chave(m[1]))) negativos.push(m[1]);
    if (m[2]) positivos.push(m[2]);
  }
  return { positivo: positivos.join(' ').replace(/\s+([,;|])/g, '$1').trim(), negativos };
}

/** Mesmos separadores de public.consulta (0001): vírgula, ponto e vírgula, barra vertical, " e " e " ou ". */
const SEPARADORES = /\s*[,;|]\s*|\s+(?:e|é|ou)\s+/iu;

/** Alternativas digitadas, como o banco separa; sem repetidas (pela chave) e só com palavra de 2+ caracteres. */
export function gruposDigitados(texto: string): string[] {
  const vistos = new Set<string>();
  const grupos: string[] = [];
  for (const bruto of texto.split(SEPARADORES)) {
    const g = bruto.replace(/\s+/g, ' ').trim();
    const k = chave(g);
    if (!k.split(' ').some((p) => p.length >= 2) || vistos.has(k)) continue;
    vistos.add(k);
    grupos.push(g);
  }
  return grupos;
}

export type TermoRelacionado = { termo: string; assunto: string; de: string };

/** Para cada digitado que é termo de um grupo, os outros termos do grupo (sem repetir nem devolver um digitado). */
export function expandir(digitados: readonly string[]): TermoRelacionado[] {
  const vistos = new Set(digitados.map(chave));
  const saida: TermoRelacionado[] = [];
  for (const d of digitados) {
    const k = chave(d);
    for (const g of GRUPOS) {
      if (!g.termos.some((t) => chave(t) === k)) continue;
      for (const t of g.termos) {
        const kt = chave(t);
        if (vistos.has(kt)) continue;
        vistos.add(kt);
        saida.push({ termo: t, assunto: g.assunto, de: d });
        if (saida.length === MAX_RELACIONADOS) return saida;
      }
    }
  }
  return saida;
}

export type Busca = { positivo: string | null; digitados: string[]; relacionados: TermoRelacionado[]; excluidos: string[] };

/** O campo de busca inteiro → o que o banco recebe e o que a explicação usa. */
export function interpretarBusca(q: string | null): Busca {
  const { positivo, negativos } = separarNegativos(q ?? '');
  const digitados = gruposDigitados(positivo);
  return { positivo: positivo || null, digitados, relacionados: expandir(digitados), excluidos: negativos };
}

/** Há termo de busca (só "-palavra" não é termo: sem termo não há relevância). */
export function temTermo(q: string | null): boolean {
  return gruposDigitados(separarNegativos(q ?? '').positivo).length > 0;
}

/**
 * Termos do catálogo que começam como o digitado, ou o contrário (4+ caracteres): "farda" → "fardamento".
 * Só para digitados fora de grupo: os do grupo já estão na busca (expandir), sugerir um deles não traria nada novo.
 */
export function termosParecidos(digitados: readonly string[], limite = 2): string[] {
  const saida: string[] = [];
  for (const d of digitados) {
    const k = chave(d);
    if (k.length < 4 || GRUPOS.some((g) => g.termos.some((t) => chave(t) === k))) continue;
    for (const g of GRUPOS) {
      for (const t of g.termos) {
        const kt = chave(t);
        if (kt === k || kt.length < 4 || saida.includes(t)) continue;
        if (kt.startsWith(k) || k.startsWith(kt)) saida.push(t);
        if (saida.length === limite) return saida;
      }
    }
  }
  return saida;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/relevancia/termos.test.ts`
Expected: PASS. Se o teste de palavras curtas apontar um termo, troque o termo (não afrouxe a regra).

- [ ] **Step 5: Verificar e commitar**

Run: `npm test && npm run typecheck`
Expected: tudo passa.
```bash
git add lib/relevancia/termos.ts lib/relevancia/termos.test.ts
git commit -m "feat: termos relacionados, termos excluídos e separação da busca" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2: Pontuação, explicação e destaque (`lib/relevancia/pontuacao.ts`, `lib/relevancia/destaque.ts`)

**Files:**
- Create: `lib/relevancia/pontuacao.ts`, `lib/relevancia/destaque.ts`
- Test: `lib/relevancia/pontuacao.test.ts`, `lib/relevancia/destaque.test.ts`

**Interfaces:**
- Consumes: `Busca`, `interpretarBusca`, `normalizar` (Task 1).
- Produces:
  - `PESOS = { digitadoObjeto: 60, digitadoItens: 35, relacionadoObjeto: 45, relacionadoItens: 25, frase: 15, porTermo: 5, termosExtras: 3, teto: 100 } as const` (os mesmos números de `public.pontuacao_busca`; guarda na Task 3).
  - `type Acertos = { termosObjeto: string[]; termosItens: string[]; frase: boolean }` (colunas `termos_objeto`, `termos_itens` — só nos itens — e `frase` de `buscar_editais`).
  - `type NivelRelevancia = 'Alta' | 'Média' | 'Baixa'`; `type Relevancia = { pontos: number; nivel: NivelRelevancia; explicacao: string }`.
  - `AVISO_RELEVANCIA: string`; `pontuar(a: Acertos, b: Busca): number | null`; `nivel(p: number): NivelRelevancia`; `explicar(a: Acertos, b: Busca): string | null`; `relevancia(a: Acertos, b: Busca): Relevancia | null`.
  - `type Trecho = { texto: string; marcado: boolean }`; `destacar(texto: string, termos: readonly string[]): Trecho[]`.

- [ ] **Step 1: Escrever os testes (falhando)**

Crie `lib/relevancia/pontuacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AVISO_RELEVANCIA, explicar, nivel, PESOS, pontuar, relevancia, type Acertos } from './pontuacao';
import { interpretarBusca } from './termos';

const UNIFORMES = interpretarBusca('uniformes');
const ac = (termosObjeto: string[], termosItens: string[] = [], frase = false): Acertos => ({ termosObjeto, termosItens, frase });

describe('pontuar (0–100, determinística)', () => {
  it('digitado no objeto com a expressão inteira: 60 + 15', () => {
    expect(pontuar(ac(['uniformes'], [], true), UNIFORMES)).toBe(75);
  });
  it('digitado no objeto sem a expressão inteira: 60', () => {
    expect(pontuar(ac(['uniformes']), UNIFORMES)).toBe(60);
  });
  it('digitado só nos itens: 35', () => {
    expect(pontuar(ac([], ['uniformes']), UNIFORMES)).toBe(35);
  });
  it('relacionado no objeto: 45; só nos itens: 25', () => {
    expect(pontuar(ac(['fardamento']), UNIFORMES)).toBe(45);
    expect(pontuar(ac([], ['fardamento']), UNIFORMES)).toBe(25);
  });
  it('vale o melhor tipo de acerto, mais 5 por termo distinto além do primeiro', () => {
    expect(pontuar(ac(['fardamento'], ['uniformes']), UNIFORMES)).toBe(50);
    expect(pontuar(ac(['uniformes', 'fardamento', 'jaleco'], ['camiseta'], true), UNIFORMES)).toBe(90);
  });
  it('os termos extras somam no máximo 15', () => {
    expect(pontuar(ac(['uniformes', 'fardamento', 'jaleco', 'camiseta', 'jaqueta', 'agasalho'], [], true), UNIFORMES)).toBe(90);
  });
  it('fica entre 0 e o teto em qualquer combinação', () => {
    for (const obj of [[], ['uniformes'], ['fardamento'], ['uniformes', 'fardamento', 'jaleco', 'camiseta']]) {
      for (const itens of [[], ['agasalho'], ['bermuda', 'avental']]) {
        for (const frase of [false, true]) {
          const p = pontuar(ac(obj, itens, frase), UNIFORMES);
          if (p === null) continue;
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(PESOS.teto);
        }
      }
    }
  });
  it('sem termo, nada que bateu ou só termos fora da busca: sem pontuação', () => {
    expect(pontuar(ac([]), interpretarBusca(''))).toBeNull();
    expect(pontuar(ac([]), UNIFORMES)).toBeNull();
    expect(pontuar(ac(['xyz']), UNIFORMES)).toBeNull();
  });
  it('mesmos dados, mesmo número', () => {
    const a = ac(['fardamento', 'jaleco'], ['uniformes']);
    expect(pontuar(a, UNIFORMES)).toBe(pontuar({ ...a }, interpretarBusca('uniformes')));
  });
});

describe('nivel', () => {
  it('Alta ≥ 70, Média 40–69, Baixa < 40', () => {
    expect(nivel(70)).toBe('Alta');
    expect(nivel(69)).toBe('Média');
    expect(nivel(40)).toBe('Média');
    expect(nivel(39)).toBe('Baixa');
  });
});

describe('explicar (só cita o que bateu)', () => {
  it('digitado no objeto', () => {
    expect(explicar(ac(['uniformes'], [], true), UNIFORMES)).toBe('Menciona uniformes no objeto.');
  });
  it('relacionado no objeto, com o assunto do grupo', () => {
    expect(explicar(ac(['fardamento']), UNIFORMES)).toBe('Menciona fardamento, relacionado a uniformes profissionais, no objeto.');
    expect(explicar(ac(['fardamento', 'jaleco']), UNIFORMES)).toBe(
      'Menciona fardamento e jaleco, relacionados a uniformes profissionais, no objeto.',
    );
  });
  it('digitado só nos itens', () => {
    expect(explicar(ac([], ['luva nitrílica']), interpretarBusca('luva nitrílica'))).toBe('Menciona luva nitrílica nos itens.');
  });
  it('relacionado só nos itens', () => {
    expect(explicar(ac([], ['jaleco']), UNIFORMES)).toBe('Menciona jaleco, relacionado a uniformes profissionais, nos itens.');
  });
  it('nunca cita termo que não bateu', () => {
    const texto = explicar(ac(['fardamento']), UNIFORMES) ?? '';
    for (const r of UNIFORMES.relacionados.filter((x) => x.termo !== 'fardamento')) expect(texto).not.toContain(r.termo);
    expect(texto).not.toContain('uniformes no');
  });
  it('nada que bateu: sem explicação', () => {
    expect(explicar(ac([]), UNIFORMES)).toBeNull();
  });
});

describe('relevancia', () => {
  it('pontos, nível e explicação juntos', () => {
    expect(relevancia(ac(['uniformes'], [], true), UNIFORMES)).toEqual({ pontos: 75, nivel: 'Alta', explicacao: 'Menciona uniformes no objeto.' });
    expect(relevancia(ac([]), interpretarBusca(''))).toBeNull();
  });
  it('aviso fixo da spec', () => {
    expect(AVISO_RELEVANCIA).toBe(
      'Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar.',
    );
  });
});
```

Crie `lib/relevancia/destaque.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { destacar } from './destaque';

const juntar = (t: { texto: string }[]) => t.map((x) => x.texto).join('');

describe('destacar (termos buscados e relacionados no título)', () => {
  it('marca a palavra inteira que começa pelo termo (plural incluído)', () => {
    expect(destacar('Aquisição de uniformes escolares', ['uniforme'])).toEqual([
      { texto: 'Aquisição de ', marcado: false },
      { texto: 'uniformes', marcado: true },
      { texto: ' escolares', marcado: false },
    ]);
  });
  it('sem diferença de acento e maiúsculas; expressão marca cada palavra', () => {
    const t = destacar('Luvas nitrílicas descartáveis', ['luva nitrílica']);
    expect(t.filter((x) => x.marcado).map((x) => x.texto)).toEqual(['Luvas', 'nitrílicas']);
    expect(destacar('Compra de EPIs', ['EPI']).filter((x) => x.marcado).map((x) => x.texto)).toEqual(['EPIs']);
  });
  it('palavras de menos de 3 letras do termo não marcam', () => {
    expect(destacar('Luva de couro', ['de']).some((x) => x.marcado)).toBe(false);
  });
  it('sem termos ou sem texto', () => {
    expect(destacar('Luvas', [])).toEqual([{ texto: 'Luvas', marcado: false }]);
    expect(destacar('', ['luva'])).toEqual([]);
  });
  it('os trechos juntos são o texto original', () => {
    const texto = 'Fardamento e jaleco (camisetas) para a Guarda Municipal';
    expect(juntar(destacar(texto, ['fardamento', 'jaleco', 'camiseta']))).toBe(texto);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/relevancia/pontuacao.test.ts lib/relevancia/destaque.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

Crie `lib/relevancia/pontuacao.ts`:
```ts
import type { Busca } from './termos';

/**
 * Pesos da relevância (0–100). Os mesmos números estão em public.pontuacao_busca (0011), que ordena a lista no banco;
 * a guarda em scripts/migracoes.test.ts falha se um lado mudar sem o outro.
 * Melhor tipo de acerto (não somam entre si) + expressão inteira + 5 por termo distinto além do primeiro (até 3), teto 100.
 */
export const PESOS = {
  digitadoObjeto: 60,
  digitadoItens: 35,
  relacionadoObjeto: 45,
  relacionadoItens: 25,
  frase: 15,
  porTermo: 5,
  termosExtras: 3,
  teto: 100,
} as const;

/** O que bateu num edital (colunas termos_objeto, termos_itens e frase de buscar_editais). `termosItens`: só nos itens. */
export type Acertos = { termosObjeto: string[]; termosItens: string[]; frase: boolean };
export type NivelRelevancia = 'Alta' | 'Média' | 'Baixa';
export type Relevancia = { pontos: number; nivel: NivelRelevancia; explicacao: string };

export const AVISO_RELEVANCIA =
  'Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar.';

/** Só os termos que são da busca (o banco nunca devolve outros; aqui a regra fica explícita). */
function daBusca(a: Acertos, b: Busca) {
  const digitados = new Set(b.digitados);
  const relacionados = new Set(b.relacionados.map((r) => r.termo));
  const conhecido = (t: string) => digitados.has(t) || relacionados.has(t);
  return { digitados, relacionados, objeto: a.termosObjeto.filter(conhecido), itens: a.termosItens.filter(conhecido) };
}

/** Pontuação 0–100; null sem termo de busca ou quando nada da busca bateu (o card não mostra indicador). */
export function pontuar(a: Acertos, b: Busca): number | null {
  const { digitados, relacionados, objeto, itens } = daBusca(a, b);
  const distintos = new Set([...objeto, ...itens]).size;
  if (b.digitados.length === 0 || distintos === 0) return null;
  const tem = (lista: string[], conjunto: Set<string>) => lista.some((t) => conjunto.has(t));
  const base = Math.max(
    tem(objeto, digitados) ? PESOS.digitadoObjeto : 0,
    tem(itens, digitados) ? PESOS.digitadoItens : 0,
    tem(objeto, relacionados) ? PESOS.relacionadoObjeto : 0,
    tem(itens, relacionados) ? PESOS.relacionadoItens : 0,
  );
  const extras = PESOS.porTermo * Math.min(PESOS.termosExtras, Math.max(0, distintos - 1));
  return Math.min(PESOS.teto, base + (a.frase ? PESOS.frase : 0) + extras);
}

export function nivel(p: number): NivelRelevancia {
  if (p >= 70) return 'Alta';
  if (p >= 40) return 'Média';
  return 'Baixa';
}

const emLista = (ts: string[]) => (ts.length === 1 ? ts[0] : `${ts.slice(0, -1).join(', ')} e ${ts[ts.length - 1]}`);

/** Uma frase com o melhor acerto: digitado no objeto, relacionado no objeto, digitado nos itens, relacionado nos itens. */
export function explicar(a: Acertos, b: Busca): string | null {
  const { digitados, objeto, itens } = daBusca(a, b);
  const porTermo = new Map(b.relacionados.map((r) => [r.termo, r]));
  const relacionados = (lista: string[]) => {
    const rel = lista.filter((t) => porTermo.has(t));
    if (rel.length === 0) return null;
    // Só os do mesmo assunto do primeiro: a frase cita um assunto só.
    const assunto = porTermo.get(rel[0])!.assunto;
    const mesmos = rel.filter((t) => porTermo.get(t)!.assunto === assunto).slice(0, 2);
    return `${emLista(mesmos)}, ${mesmos.length === 1 ? 'relacionado' : 'relacionados'} a ${assunto}`;
  };
  const digObjeto = objeto.filter((t) => digitados.has(t)).slice(0, 3);
  if (digObjeto.length) return `Menciona ${emLista(digObjeto)} no objeto.`;
  const relObjeto = relacionados(objeto);
  if (relObjeto) return `Menciona ${relObjeto}, no objeto.`;
  const digItens = itens.filter((t) => digitados.has(t)).slice(0, 3);
  if (digItens.length) return `Menciona ${emLista(digItens)} nos itens.`;
  const relItens = relacionados(itens);
  return relItens ? `Menciona ${relItens}, nos itens.` : null;
}

export function relevancia(a: Acertos, b: Busca): Relevancia | null {
  const pontos = pontuar(a, b);
  if (pontos === null) return null;
  return { pontos, nivel: nivel(pontos), explicacao: explicar(a, b) ?? '' };
}
```

Crie `lib/relevancia/destaque.ts`:
```ts
import { normalizar } from './termos';

export type Trecho = { texto: string; marcado: boolean };

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Raiz de cada palavra dos termos (sem acento, minúscula, sem o "s" final), 3+ letras; as mais longas primeiro. */
function raizes(termos: readonly string[]): string[] {
  const r = new Set<string>();
  for (const t of termos) {
    for (const p of normalizar(t).split(' ')) {
      const raiz = p.length >= 4 && p.endsWith('s') ? p.slice(0, -1) : p;
      if (raiz.length >= 3) r.add(raiz);
    }
  }
  return [...r].sort((a, b) => b.length - a.length);
}

/** Trechos do texto com as palavras que começam por algum termo marcadas (o texto original não muda). */
export function destacar(texto: string, termos: readonly string[]): Trecho[] {
  if (!texto) return [];
  const rs = raizes(termos);
  if (rs.length === 0) return [{ texto, marcado: false }];
  const saida: Trecho[] = [];
  let fim = 0;
  for (const m of texto.matchAll(/[\p{L}\p{N}]+/gu)) {
    const base = semAcento(m[0]);
    if (!rs.some((r) => base.startsWith(r))) continue;
    const inicio = m.index ?? 0;
    if (inicio > fim) saida.push({ texto: texto.slice(fim, inicio), marcado: false });
    saida.push({ texto: m[0], marcado: true });
    fim = inicio + m[0].length;
  }
  if (fim < texto.length) saida.push({ texto: texto.slice(fim), marcado: false });
  return saida;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/relevancia`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

Run: `npm test && npm run typecheck`
```bash
git add lib/relevancia/pontuacao.ts lib/relevancia/pontuacao.test.ts lib/relevancia/destaque.ts lib/relevancia/destaque.test.ts
git commit -m "feat: pontuação de relevância, explicação e destaque dos termos" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Migração `0011` (abertas sem revogadas e anuladas, busca com termos e relevância), guardas e conferências

**Files:**
- Create: `supabase/migrations/0011_busca_relevancia.sql`, `lib/situacao.ts`, `lib/situacao.test.ts`, `docs/evolucao-fase-2.sql`, `scripts/conferir-relevancia.ts`
- Modify: `scripts/migracoes.test.ts` (bloco novo no fim), `lib/filtros.ts` (só `ORDENS`, para a guarda; o resto de ordem/página é da Task 5)

**Interfaces:**
- Consumes: `PESOS` (Task 2), `interpretarBusca`, `GRUPOS` (Task 1), `pontuar` (Task 2); `public.consulta(text)` (0001), `public.sem_acento`, `public.objeto_normalizado` (0003), `public.municipios_no_raio(text, int)` (0007); corpos de `abertas` (0005), `orgaos_abertos` (0007), `relacionados` (0008); `conectarBanco` de `scripts/banco-direto.ts`.
- Produces:
  - TS: `lib/situacao.ts` com `SITUACAO = { divulgada: 1, revogada: 2, anulada: 3, suspensa: 4 } as const`, `SITUACOES_FORA_DAS_ABERTAS = [2, 3] as const`, `AVISO_SUSPENSA`, `rotuloSituacao(id: number | null): 'Suspensa' | 'Revogada' | 'Anulada' | null`, `avisoSituacao(id: number | null): string | null`. Em `lib/filtros.ts`: `ORDENS: ReadonlyArray<{ id: Ordem; rotulo: string }>` e, em `lib/tipos.ts`, `type Ordem = 'relevancia' | 'recentes' | 'prazo' | 'maior_valor' | 'menor_valor'`.
  - SQL (só `service_role` executa):
    - `em_aberto(p_encerramento timestamptz, p_situacao int) returns boolean`
    - `termos_da_busca(q text, p_termos text[]) returns text[]`; `consulta_termos(p_termos text[]) returns tsquery`; `consulta_frase(p_termo text) returns tsquery`
    - `pontuacao_busca(p_digitado_objeto boolean, p_digitado_itens boolean, p_relacionado_objeto boolean, p_relacionado_itens boolean, p_frase boolean, p_distintos int) returns int`
    - `acertos_busca(p_busca tsvector, p_itens tsvector, p_termos text[], p_tqs tsquery[], p_frases tsquery[], p_digitados text[], p_relacionados text[]) returns table (termos_objeto text[], termos_itens text[], frase boolean, pontuacao int)`
    - `abertas_unicas(p_tq tsquery, p_tq_excluir tsquery, p_ufs text[] default null, p_valor_min numeric default null, p_modalidades int[] default null, p_orgao text default null, p_ibge text default null, p_raio_km int default null, p_dias int default null) returns setof contratacoes`
    - `buscar_editais(q, p_ufs, p_ibge, p_dias, p_valor_min, p_modalidades, p_limite, p_deslocamento, p_orgao, p_raio_km, p_termos text[], p_relacionados text[], p_excluir text[], p_ordem text)` — colunas de antes + `situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean`
    - `mapa_editais(q, p_ufs, p_dias, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_termos text[], p_relacionados text[], p_excluir text[])` — mesmas colunas de antes
    - `abertas`, `orgaos_abertos`, `relacionados`: mesmas assinaturas e colunas, com `em_aberto`.

- [ ] **Step 1: Situação (teste falhando)**

Crie `lib/situacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AVISO_SUSPENSA, avisoSituacao, rotuloSituacao, SITUACAO, SITUACOES_FORA_DAS_ABERTAS } from './situacao';

describe('situação oficial no PNCP', () => {
  it('revogada e anulada saem das abertas; suspensa fica', () => {
    expect(SITUACOES_FORA_DAS_ABERTAS).toEqual([SITUACAO.revogada, SITUACAO.anulada]);
    expect(SITUACOES_FORA_DAS_ABERTAS).not.toContain(SITUACAO.suspensa);
  });
  it('rótulos das etiquetas', () => {
    expect(rotuloSituacao(4)).toBe('Suspensa');
    expect(rotuloSituacao(2)).toBe('Revogada');
    expect(rotuloSituacao(3)).toBe('Anulada');
    expect(rotuloSituacao(1)).toBeNull();
    expect(rotuloSituacao(null)).toBeNull();
  });
  it('avisos (o da suspensa é o texto da spec)', () => {
    expect(AVISO_SUSPENSA).toBe('O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar.');
    expect(avisoSituacao(4)).toBe(AVISO_SUSPENSA);
    expect(avisoSituacao(2)).toBe('O órgão revogou esta licitação: ela não está mais aberta.');
    expect(avisoSituacao(3)).toBe('O órgão anulou esta licitação: ela não está mais aberta.');
    expect(avisoSituacao(1)).toBeNull();
  });
});
```

Run: `npx vitest run lib/situacao.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 2: Situação (implementar)**

Crie `lib/situacao.ts`:
```ts
/** Situação da contratação no PNCP (situacaoCompraId). */
export const SITUACAO = { divulgada: 1, revogada: 2, anulada: 3, suspensa: 4 } as const;

/** Situações que tiram o edital das abertas (public.em_aberto, 0011; guarda em scripts/migracoes.test.ts). */
export const SITUACOES_FORA_DAS_ABERTAS = [SITUACAO.revogada, SITUACAO.anulada] as const;

export const AVISO_SUSPENSA = 'O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar.';

export function rotuloSituacao(id: number | null): 'Suspensa' | 'Revogada' | 'Anulada' | null {
  if (id === SITUACAO.suspensa) return 'Suspensa';
  if (id === SITUACAO.revogada) return 'Revogada';
  if (id === SITUACAO.anulada) return 'Anulada';
  return null;
}

/** Aviso da página do edital (revogada e anulada só chegam lá por link direto: saem da lista, do mapa e dos parecidos). */
export function avisoSituacao(id: number | null): string | null {
  if (id === SITUACAO.suspensa) return AVISO_SUSPENSA;
  if (id === SITUACAO.revogada) return 'O órgão revogou esta licitação: ela não está mais aberta.';
  if (id === SITUACAO.anulada) return 'O órgão anulou esta licitação: ela não está mais aberta.';
  return null;
}
```

Run: `npx vitest run lib/situacao.test.ts`
Expected: PASS.

- [ ] **Step 3: Ordens (para a guarda)**

Em `lib/tipos.ts`, logo depois de `export type Cidade = …`, acrescente:
```ts
/** Ordem da lista (buscar_editais, 0011). Relevância só faz sentido com termo (sem termo vale "prazo"). */
export type Ordem = 'relevancia' | 'recentes' | 'prazo' | 'maior_valor' | 'menor_valor';
```
Em `lib/filtros.ts`, troque
```ts
import type { FiltrosBusca, FiltrosTela } from './tipos';
```
por
```ts
import type { FiltrosBusca, FiltrosTela, Ordem } from './tipos';
```
e, depois de `export const RAIOS_KM = [50, 100, 200] as const;`, acrescente:
```ts
/** Ordens da lista, na ordem do seletor. Os ids são os aceitos por buscar_editais (guarda em scripts/migracoes.test.ts). */
export const ORDENS: ReadonlyArray<{ id: Ordem; rotulo: string }> = [
  { id: 'relevancia', rotulo: 'Maior relevância' },
  { id: 'recentes', rotulo: 'Mais recentes' },
  { id: 'prazo', rotulo: 'Menor prazo' },
  { id: 'maior_valor', rotulo: 'Maior valor' },
  { id: 'menor_valor', rotulo: 'Menor valor' },
];
```

- [ ] **Step 4: Guardas da 0011 (teste falhando)**

No topo de `scripts/migracoes.test.ts`, depois de `import { TIPOS_EVENTO, TIPOS_EVENTO_SERVIDOR } from '../lib/eventos';`, acrescente:
```ts
import { ORDENS } from '../lib/filtros';
import { PESOS } from '../lib/relevancia/pontuacao';
import { SITUACOES_FORA_DAS_ABERTAS } from '../lib/situacao';
```
Acrescente ao fim de `scripts/migracoes.test.ts`:
```ts
/** Do `inicio` (ex.: "create function public.x(") até o `$$;` que fecha o corpo, com fim de linha \n. */
function corpoDe(texto: string, inicio: string): string {
  const t = texto.replace(/\r\n/g, '\n');
  const i = t.indexOf(inicio);
  if (i < 0) return '';
  const abre = t.indexOf('$$', i);
  return t.slice(i, t.indexOf('$$;', abre + 2) + 3);
}

describe('migração 0011 (busca, relevância e situação)', () => {
  const sql = ler('supabase/migrations/0011_busca_relevancia.sql');
  const corpo = (inicio: string) => {
    const c = corpoDe(sql, inicio);
    expect(c, inicio).not.toBe('');
    return c;
  };

  it('uma transação curta e o PostgREST relê as funções no fim', () => {
    expect(sql).toContain("set local lock_timeout = '10s';");
    expect(sql.trimEnd().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });
  it('as assinaturas antigas saem antes das novas (o site no ar segue chamando sem os parâmetros novos)', () => {
    const antigas = [
      'drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int);',
      'drop function public.mapa_editais(text, text[], int, numeric, int[], text, text, int);',
      'drop function public.abertas_unicas(text, text[], numeric, int[], text);',
    ];
    for (const d of antigas) {
      expect(sql).toContain(d);
      expect(sql.indexOf(d)).toBeLessThan(sql.indexOf('create function public.buscar_editais('));
    }
    const busca = corpo('create function public.buscar_editais(');
    for (const p of ["p_termos text[] default null", "p_relacionados text[] default null", "p_excluir text[] default null", "p_ordem text default null"]) {
      expect(busca).toContain(p);
    }
    expect(busca).toContain('situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean)');
    const mapa = corpo('create function public.mapa_editais(');
    for (const p of ["p_termos text[] default null", "p_relacionados text[] default null", "p_excluir text[] default null"]) {
      expect(mapa).toContain(p);
    }
  });
  it('aberta num lugar só: prazo no futuro e situação fora de revogada e anulada', () => {
    expect(corpo('create function public.em_aberto(')).toContain(
      `select p_encerramento > now() and coalesce(p_situacao, 0) not in (${SITUACOES_FORA_DAS_ABERTAS.join(', ')})`,
    );
    expect(sql.split('> now()').length - 1).toBe(1);
  });
  it('todas as funções que listam ou contam abertas usam em_aberto', () => {
    for (const f of [
      'create or replace function public.abertas(',
      'create function public.abertas_unicas(',
      'create or replace function public.orgaos_abertos(',
      'create or replace function public.relacionados(',
    ]) {
      expect(corpo(f)).toContain('public.em_aberto(');
    }
    for (const f of ['create function public.buscar_editais(', 'create function public.mapa_editais(']) {
      expect(corpo(f)).toContain('public.abertas_unicas(');
      expect(corpo(f)).toContain('public.termos_da_busca(q, p_termos)');
    }
  });
  it('abertas, orgaos_abertos e relacionados: o corpo de antes, só com em_aberto no lugar do prazo', () => {
    const igual = (novo: string, antigo: string, aberta: string, prazo: string) =>
      expect(novo.replace('create or replace function', 'create function').replace(aberta, prazo)).toBe(
        antigo.replace('create or replace function', 'create function'),
      );
    igual(
      corpo('create or replace function public.abertas('),
      corpoDe(ler('supabase/migrations/0005_palavras_itens.sql'), 'create or replace function public.abertas('),
      'public.em_aberto(c.encerramento_em, c.situacao_id)',
      'c.encerramento_em > now()',
    );
    igual(
      corpo('create or replace function public.orgaos_abertos('),
      corpoDe(ler('supabase/migrations/0007_recursos_pro.sql'), 'create function public.orgaos_abertos('),
      'public.em_aberto(c.encerramento_em, c.situacao_id)',
      'c.encerramento_em > now()',
    );
    igual(
      corpo('create or replace function public.relacionados('),
      corpoDe(ler('supabase/migrations/0008_relacionados_leve.sql'), 'create or replace function public.relacionados('),
      'public.em_aberto(a.encerramento_em, a.situacao_id)',
      'a.encerramento_em > now()',
    );
  });
  it('excluídos tiram pelo objeto; termos acham no objeto ou nas palavras dos itens', () => {
    const unicas = corpo('create function public.abertas_unicas(');
    expect(unicas).toContain('(p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)');
    expect(unicas).toContain('(p_tq_excluir is null or not c.busca @@ p_tq_excluir)');
    expect(unicas).toContain('(c.link_origem is null), c.atualizada_pncp_em desc, c.id');
  });
  it('pesos da pontuação iguais aos do site (PESOS)', () => {
    const p = corpo('create function public.pontuacao_busca(');
    expect(p).toContain(`select least(${PESOS.teto},`);
    expect(p).toContain(`case when p_digitado_objeto then ${PESOS.digitadoObjeto} else 0 end`);
    expect(p).toContain(`case when p_digitado_itens then ${PESOS.digitadoItens} else 0 end`);
    expect(p).toContain(`case when p_relacionado_objeto then ${PESOS.relacionadoObjeto} else 0 end`);
    expect(p).toContain(`case when p_relacionado_itens then ${PESOS.relacionadoItens} else 0 end`);
    expect(p).toContain(`+ case when p_frase then ${PESOS.frase} else 0 end`);
    expect(p).toContain(`+ ${PESOS.porTermo} * least(${PESOS.termosExtras}, greatest(0, coalesce(p_distintos, 0) - 1)))`);
  });
  it('acertos: termos dos itens são os que não estão no objeto; frase só dos digitados', () => {
    const a = corpo('create function public.acertos_busca(');
    expect(a).toContain('filter (where not coalesce(p_busca @@ u.tq, false) and p_itens @@ u.tq)');
    expect(a).toContain('coalesce(bool_or(p_busca @@ u.fr), false) as frase');
    expect(corpo('create function public.buscar_editais(')).toContain(
      'case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end',
    );
  });
  it('ordens iguais às do site; relevância ordena todas, as outras só a página', () => {
    const b = corpo('create function public.buscar_editais(');
    expect(b).toContain(`p_ordem in (${ORDENS.map((o) => `'${o.id}'`).join(', ')})`);
    expect(b).toContain('order by a.pontuacao desc, u.encerramento_em, u.id');
    expect(b).toContain("case when v_ordem = 'recentes' then u.publicada_em end desc nulls last");
    expect(b).toContain("case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last");
    expect(b).toContain("case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last");
    expect(b).toContain('set plan_cache_mode = force_custom_plan');
  });
  it('só o servidor executa (cada assinatura)', () => {
    for (const f of [
      'em_aberto(timestamptz, int)',
      'termos_da_busca(text, text[])',
      'consulta_termos(text[])',
      'consulta_frase(text)',
      'pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int)',
      'acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[])',
      'abertas(text, text[], numeric)',
      'abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int)',
      'buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text)',
      'mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])',
      'orgaos_abertos(text, int)',
      'relacionados(text, int)',
    ]) {
      expect(sql).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(sql).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});
```

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL (`ENOENT ... 0011_busca_relevancia.sql`).

- [ ] **Step 5: Escrever a migração**

Crie `supabase/migrations/0011_busca_relevancia.sql`:
```sql
-- Edital Map · Evolução · Fase 2 · Busca, relevância, lista e edital (0011).
-- 1. Aberta = prazo (encerramento_em) no futuro e situação diferente de Revogada (2) e Anulada (3), num lugar só:
--    public.em_aberto (a guarda confere que só ela compara o prazo com o agora).
--    Vale em abertas (worker/conferir), abertas_unicas (lista, mapa, contagem e exportação), orgaos_abertos e
--    relacionados. Suspensa (4) continua aberta (o site mostra a etiqueta).
-- 2. buscar_editais com os termos digitados (p_termos), os relacionados (p_relacionados), os excluídos (p_excluir) e a
--    ordem (p_ordem); devolve situacao_id, pontuacao (0–100) e o que bateu (termos_objeto, termos_itens, frase).
-- 3. mapa_editais com os mesmos termos e a mesma abertas_unicas: lista, mapa, painel e exportação contam os mesmos editais.
-- Os parâmetros novos têm padrão nulo e as assinaturas antigas saem nesta mesma transação: o site no ar (que chama
-- buscar_editais e mapa_editais sem eles) continua funcionando logo depois, já sem revogadas e anuladas.
-- Os pesos de pontuacao_busca e as ordens são os de lib/relevancia/pontuacao.ts e lib/filtros.ts (guarda em
-- scripts/migracoes.test.ts). Regra de duplicada igual à da 0007, em abertas_unicas, orgaos_abertos e relacionados.
-- Ordem: esta migração → conferências (docs/evolucao-fase-2.sql, npx tsx scripts/conferir-relevancia.ts) → vercel deploy --prod.
-- Aplicar com npm run db:aplicar (uma transação só).

set local lock_timeout = '10s';

-- Assinaturas antigas saem antes (parâmetros novos mudam a identidade da função).
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int);
drop function public.mapa_editais(text, text[], int, numeric, int[], text, text, int);
drop function public.abertas_unicas(text, text[], numeric, int[], text);

-- Aberta: prazo no futuro e situação que não é Revogada (2) nem Anulada (3). SQL simples: o planejador expande no
-- lugar da chamada (o índice de encerramento continua valendo).
create function public.em_aberto(p_encerramento timestamptz, p_situacao int)
returns boolean language sql stable parallel safe as $$
  select p_encerramento > now() and coalesce(p_situacao, 0) not in (2, 3)
$$;

-- Termos da busca: os já separados pelo site (p_termos) ou, na chamada antiga, o texto inteiro (consulta separa).
create function public.termos_da_busca(q text, p_termos text[])
returns text[] language sql immutable parallel safe as $$
  select coalesce(p_termos, case when coalesce(trim(q), '') = '' then '{}'::text[] else array[q] end)
$$;

-- Vários termos → "qualquer um deles", pelas regras de public.consulta (prefixo, sem acento). Nenhum → null.
create function public.consulta_termos(p_termos text[])
returns tsquery language sql immutable parallel safe as $$
  select case when coalesce(cardinality(p_termos), 0) = 0 then null
              else public.consulta(array_to_string(p_termos, ', ')) end
$$;

-- Expressão inteira: as palavras do termo (2+ caracteres, por prefixo) em sequência. Uma palavra: ela mesma.
-- Só palavras vazias ("de") → null (to_tsquery sem lexema não acharia nada e avisaria a cada linha).
create function public.consulta_frase(p_termo text)
returns tsquery language sql immutable parallel safe as $$
  select case when numnode(x.tq) > 0 then x.tq end
  from (
    select case when count(*) = 0 then null
                else to_tsquery('portuguese', string_agg(w.p || ':*', ' <-> ' order by w.n)) end as tq
    from regexp_split_to_table(lower(public.sem_acento(coalesce(p_termo, ''))), '[^a-z0-9]+') with ordinality as w(p, n)
    where length(w.p) >= 2
  ) x
$$;

-- Pontuação 0–100 (os pesos de PESOS em lib/relevancia/pontuacao.ts): o melhor tipo de acerto (digitado no objeto 60,
-- só nos itens 35; relacionado no objeto 45, só nos itens 25), mais 15 pela expressão inteira, mais 5 por termo
-- distinto além do primeiro (até 3), com teto 100.
create function public.pontuacao_busca(p_digitado_objeto boolean, p_digitado_itens boolean, p_relacionado_objeto boolean,
                                       p_relacionado_itens boolean, p_frase boolean, p_distintos int)
returns int language sql immutable parallel safe as $$
  select least(100,
    greatest(case when p_digitado_objeto then 60 else 0 end,
             case when p_digitado_itens then 35 else 0 end,
             case when p_relacionado_objeto then 45 else 0 end,
             case when p_relacionado_itens then 25 else 0 end)
    + case when p_frase then 15 else 0 end
    + 5 * least(3, greatest(0, coalesce(p_distintos, 0) - 1)))
$$;

-- O que bateu num edital: termos no objeto (coluna busca: objeto e informação complementar), termos só nos itens
-- (itens_palavras, sem os que já estão no objeto), se alguma expressão digitada aparece inteira, e a pontuação.
-- p_termos, p_tqs e p_frases andam juntos (mesma posição: digitados primeiro, depois relacionados).
create function public.acertos_busca(p_busca tsvector, p_itens tsvector, p_termos text[], p_tqs tsquery[],
                                     p_frases tsquery[], p_digitados text[], p_relacionados text[])
returns table (termos_objeto text[], termos_itens text[], frase boolean, pontuacao int)
language sql stable parallel safe as $$
  select m.obj, m.itens, m.frase,
         public.pontuacao_busca(m.obj && p_digitados, m.itens && p_digitados,
                                m.obj && p_relacionados, m.itens && p_relacionados,
                                m.frase, cardinality(m.obj) + cardinality(m.itens))
  from (
    select coalesce(array_agg(u.termo order by u.n) filter (where p_busca @@ u.tq), '{}'::text[]) as obj,
           coalesce(array_agg(u.termo order by u.n)
                      filter (where not coalesce(p_busca @@ u.tq, false) and p_itens @@ u.tq), '{}'::text[]) as itens,
           coalesce(bool_or(p_busca @@ u.fr), false) as frase
    from unnest(p_termos, p_tqs, p_frases) with ordinality as u(termo, tq, fr, n)
  ) m
$$;

-- Abertas que casam com a busca: no objeto/informação complementar ou nas palavras dos itens (worker/conferir usa).
create or replace function public.abertas(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns setof public.contratacoes language sql stable as $$
  with t as (select public.consulta(q) as tq)
  select c.*
  from public.contratacoes c, t
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (t.tq is null or c.busca @@ t.tq or c.itens_palavras @@ t.tq)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
$$;

-- Abertas sem duplicadas, com todos os filtros da busca: lista, mapa, contagem e exportação passam por aqui.
-- p_tq: termos digitados e relacionados ("qualquer um"), no objeto ou nas palavras dos itens; p_tq_excluir: sai quem
-- tem um termo excluído no objeto. Município: só ele; com p_raio_km, todos cuja sede está dentro do raio.
-- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
-- Duplicada (mesmo município, prazo, valor e objeto normalizado): fica a que tem link de origem; empate → atualizada
-- por último; empate → menor id. Os filtros vêm antes de tirar as duplicadas (os que dependem de município e prazo
-- usam as mesmas colunas da regra, então dá no mesmo; o do órgão faz a cópia que fica ser a do órgão escolhido).
create function public.abertas_unicas(p_tq tsquery, p_tq_excluir tsquery, p_ufs text[] default null,
                                      p_valor_min numeric default null, p_modalidades int[] default null,
                                      p_orgao text default null, p_ibge text default null, p_raio_km int default null,
                                      p_dias int default null)
returns setof public.contratacoes language sql stable as $$
  select distinct on (c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto)) c.*
  from public.contratacoes c
  where public.em_aberto(c.encerramento_em, c.situacao_id)
    and (p_tq is null or c.busca @@ p_tq or c.itens_palavras @@ p_tq)
    and (p_tq_excluir is null or not c.busca @@ p_tq_excluir)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or c.modalidade_id = any(p_modalidades))
    and (p_orgao is null or c.cnpj = p_orgao)
    and (p_ibge is null
         or (p_raio_km is null and c.codigo_ibge = p_ibge)
         or (p_raio_km is not null and c.codigo_ibge in (select public.municipios_no_raio(p_ibge, p_raio_km))))
    and (p_dias is null or c.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  order by c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
           (c.link_origem is null), c.atualizada_pncp_em desc, c.id
$$;

-- Lista. Ordens: relevancia (pontuação, depois prazo; padrão com termo), recentes (publicação mais nova), prazo
-- (encerramento mais próximo; padrão sem termo), maior_valor e menor_valor (valor não informado no fim); desempate por
-- prazo e id. Com relevância a pontuação é calculada em todas as abertas da busca (para ordenar); nas outras ordens,
-- só nas da página. Sem termo (ou termo sem palavra válida), pontuacao é nula e onde é 'objeto'.
-- plan_cache_mode: as consultas de dentro sempre planejadas com os valores (um "termo nulo" constante deixa o índice valer).
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0,
  p_orgao text default null, p_raio_km int default null,
  p_termos text[] default null, p_relacionados text[] default null, p_excluir text[] default null,
  p_ordem text default null)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, link_origem text, onde text, total bigint,
               situacao_id int, pontuacao int, termos_objeto text[], termos_itens text[], frase boolean)
language plpgsql stable set plan_cache_mode = force_custom_plan as $$
#variable_conflict use_column
declare
  v_digitados text[] := public.termos_da_busca(q, p_termos);
  v_relacionados text[] := coalesce(p_relacionados, '{}'::text[]);
  v_termos text[] := v_digitados || v_relacionados;
  v_tq tsquery := public.consulta_termos(v_digitados || v_relacionados);
  v_tq_excluir tsquery := public.consulta_termos(p_excluir);
  v_tqs tsquery[];
  v_frases tsquery[];
  v_ordem text := case when p_ordem in ('relevancia', 'recentes', 'prazo', 'maior_valor', 'menor_valor') then p_ordem end;
begin
  -- Uma consulta de texto por termo, montada uma vez (a frase só para os digitados).
  select array_agg(public.consulta(t.termo) order by t.n),
         array_agg(case when t.n <= cardinality(v_digitados) then public.consulta_frase(t.termo) end order by t.n)
    into v_tqs, v_frases
    from unnest(v_termos) with ordinality as t(termo, n);
  if v_tq is null then
    v_ordem := case when v_ordem is null or v_ordem = 'relevancia' then 'prazo' else v_ordem end;
  elsif v_ordem is null then
    v_ordem := 'relevancia';
  end if;

  if v_ordem = 'relevancia' then
    return query
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             count(*) over (), u.situacao_id, a.pontuacao, a.termos_objeto, a.termos_itens, a.frase
      from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      order by a.pontuacao desc, u.encerramento_em, u.id
      limit p_limite offset p_deslocamento;
  else
    return query
      with pagina as (
        select u.*, count(*) over () as total_da_busca
        from public.abertas_unicas(v_tq, v_tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
        order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
                 case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
                 case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
                 u.encerramento_em, u.id
        limit p_limite offset p_deslocamento
      )
      select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
             u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp, u.link_origem,
             case when v_tq is null or cardinality(a.termos_objeto) > 0 then 'objeto' else 'itens' end,
             u.total_da_busca, u.situacao_id, case when v_tq is not null then a.pontuacao end,
             a.termos_objeto, a.termos_itens, a.frase
      from pagina u
      cross join lateral public.acertos_busca(u.busca, u.itens_palavras, v_termos, v_tqs, v_frases, v_digitados, v_relacionados) a
      order by case when v_ordem = 'recentes' then u.publicada_em end desc nulls last,
               case when v_ordem = 'maior_valor' then nullif(u.valor_estimado, 0) end desc nulls last,
               case when v_ordem = 'menor_valor' then nullif(u.valor_estimado, 0) end asc nulls last,
               u.encerramento_em, u.id;
  end if;
end $$;

-- Mapa: um ponto por município sobre as mesmas abertas da lista (mesmos termos, excluídos e filtros).
-- O site só manda p_ibge ao mapa junto com o raio: a cidade sozinha não filtra o mapa.
create function public.mapa_editais(q text default null, p_ufs text[] default null, p_dias int default null,
                                    p_valor_min numeric default null, p_modalidades int[] default null,
                                    p_orgao text default null, p_ibge text default null, p_raio_km int default null,
                                    p_termos text[] default null, p_relacionados text[] default null,
                                    p_excluir text[] default null)
returns table (codigo_ibge text, nome text, uf text, lat double precision, lng double precision,
               qtd bigint, valor_total numeric, prazo_mais_proximo timestamptz)
language sql stable as $$
  with t as materialized (
    select public.consulta_termos(public.termos_da_busca(q, p_termos) || coalesce(p_relacionados, '{}'::text[])) as tq,
           public.consulta_termos(p_excluir) as tq_excluir
  )
  select m.codigo_ibge, m.nome, m.uf, m.lat, m.lng,
         count(*), sum(nullif(u.valor_estimado, 0)), min(u.encerramento_em)
  from t
  cross join lateral public.abertas_unicas(t.tq, t.tq_excluir, p_ufs, p_valor_min, p_modalidades, p_orgao, p_ibge, p_raio_km, p_dias) u
  join public.municipios m on m.codigo_ibge = u.codigo_ibge
  group by m.codigo_ibge, m.nome, m.uf, m.lat, m.lng
  order by m.codigo_ibge
$$;
```
Continue no mesmo arquivo com `orgaos_abertos` e `relacionados`: **copie o corpo exatamente** de `0007_recursos_pro.sql` (`create function public.orgaos_abertos(` … `$$;`) e de `0008_relacionados_leve.sql` (`create or replace function public.relacionados(` … `$$;`), trocando só `create function` por `create or replace function` no primeiro e a linha do prazo em cada um (a guarda compara o resto letra por letra):
```sql

-- Órgãos com editais abertos (corpo da 0007; aberta agora por em_aberto).
create or replace function public.orgaos_abertos(q text, p_limite int default 20)
returns table (cnpj text, nome text, uf text, qtd bigint)
language sql stable as $$
  with achadas as (
    select distinct on (c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto))
           c.cnpj, c.orgao_nome, c.uf
    from public.contratacoes c
    where public.em_aberto(c.encerramento_em, c.situacao_id)
      and public.sem_acento(c.orgao_nome) ilike '%' || public.sem_acento(q) || '%'
    order by c.cnpj, c.codigo_ibge, c.encerramento_em, c.valor_estimado, public.objeto_normalizado(c.objeto),
             (c.link_origem is null), c.atualizada_pncp_em desc, c.id
  )
  select a.cnpj, max(a.orgao_nome), mode() within group (order by a.uf), count(*)
  from achadas a
  group by a.cnpj
  order by count(*) desc, max(a.orgao_nome), a.cnpj
  limit p_limite
$$;

-- Editais parecidos abertos (corpo da 0008; aberta agora por em_aberto).
create or replace function public.relacionados(p_id text, p_limite int default 6)
returns table (id text, slug text, objeto text, orgao_nome text, municipio_nome text, uf text, valor_estimado numeric,
               encerramento_em timestamptz, publicada_em timestamptz, modalidade_nome text, srp boolean)
language sql stable as $$
  with genericas as (
    select tsvector_to_array(to_tsvector('portuguese',
      'contratacao contratar empresa empresas especializada especializado aquisicao aquisicoes registro precos preco '
      || 'futura futuras eventual eventuais fornecimento fornecer servico servicos prestacao objeto municipio municipal '
      || 'secretaria atender atendimento necessidade necessidades conforme termo referencia edital anexo lote lotes '
      || 'item itens quantidade quantidades demanda destinado destinada destinados destinadas visando material '
      || 'materiais diversos diversas geral gerais unidade unidades publica publico estadual federal especificacoes '
      || 'condicoes estabelecidas constantes parcelada parcelado entrega tipo '
      || 'outros outras outro outra demais kit kits conjunto conjuntos utilizacao utilizar')) as lexemas
  ),
  palavras as (
    select c.id, c.uf, c.codigo_ibge, c.encerramento_em, c.valor_estimado,
           public.objeto_normalizado(c.objeto) as objeto_norm,
           (select array_agg(p.lexeme order by p.pos)
              from (select u.lexeme, u.positions[1] as pos
                      from unnest(ts_filter(c.busca, '{a}')) u, genericas g
                     where u.lexeme ~ '^[a-z0-9]{3,}$'
                       and u.lexeme !~ '^[0-9]+$'
                       and u.lexeme <> all (g.lexemas)
                     order by u.positions[1], u.lexeme
                     limit 8) p) as lexemas
    from public.contratacoes c
    where c.id = p_id
  ),
  -- Uma linha, calculada uma vez. tq: "qualquer uma das palavras" só no objeto (peso A);
  -- tq_itens: as mesmas palavras sem peso, para itens_palavras (que não guarda peso).
  origem as materialized (
    select w.id, w.uf, w.codigo_ibge, w.encerramento_em, w.valor_estimado, w.objeto_norm,
           (array_to_string(w.lexemas, ':A | ') || ':A')::tsquery as tq,
           array_to_string(w.lexemas, ' | ')::tsquery as tq_itens
    from palavras w
    where cardinality(w.lexemas) > 0
  ),
  -- Relevância = ts_rank no objeto + 0,3 × ts_rank nas palavras dos itens, em dobro no mesmo UF.
  -- As 60 mais relevantes (empate → prazo mais próximo, depois id) seguem para tirar cópias e duplicadas.
  candidatas as (
    select a.id, a.slug, a.objeto, a.orgao_nome, a.municipio_nome, a.uf, a.valor_estimado, a.encerramento_em,
           a.publicada_em, a.modalidade_nome, a.srp, a.codigo_ibge, a.link_origem, a.atualizada_pncp_em,
           (ts_rank(a.busca, o.tq) + 0.3 * ts_rank(coalesce(a.itens_palavras, ''::tsvector), o.tq_itens))
             * (case when a.uf = o.uf then 2 else 1 end) as relevancia
    from origem o
    cross join public.contratacoes a
    where a.busca @@ o.tq
      and public.em_aberto(a.encerramento_em, a.situacao_id)
      and a.id <> o.id
    order by relevancia desc, a.encerramento_em, a.id
    limit 60
  ),
  normalizadas as (
    select k.*, public.objeto_normalizado(k.objeto) as objeto_norm
    from candidatas k
  ),
  unicas as (
    select distinct on (n.codigo_ibge, n.encerramento_em, n.valor_estimado, n.objeto_norm) n.*
    from normalizadas n
    cross join origem o
    -- Cópia do próprio edital (mesma regra de duplicada de abertas_unicas) também não conta.
    where not (n.codigo_ibge is not distinct from o.codigo_ibge
               and n.encerramento_em = o.encerramento_em
               and n.valor_estimado is not distinct from o.valor_estimado
               and n.objeto_norm = o.objeto_norm)
    order by n.codigo_ibge, n.encerramento_em, n.valor_estimado, n.objeto_norm,
             (n.link_origem is null), n.atualizada_pncp_em desc, n.id
  )
  select x.id, x.slug, x.objeto, x.orgao_nome, x.municipio_nome, x.uf, x.valor_estimado, x.encerramento_em,
         x.publicada_em, x.modalidade_nome, x.srp
  from unicas x
  order by x.relevancia desc, x.encerramento_em, x.id
  limit p_limite
$$;

-- Só o servidor (service_role) executa.
revoke execute on function public.em_aberto(timestamptz, int) from public, anon, authenticated;
revoke execute on function public.termos_da_busca(text, text[]) from public, anon, authenticated;
revoke execute on function public.consulta_termos(text[]) from public, anon, authenticated;
revoke execute on function public.consulta_frase(text) from public, anon, authenticated;
revoke execute on function public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int) from public, anon, authenticated;
revoke execute on function public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[]) from public, anon, authenticated;
revoke execute on function public.abertas(text, text[], numeric) from public, anon, authenticated;
revoke execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text) from public, anon, authenticated;
revoke execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[]) from public, anon, authenticated;
revoke execute on function public.orgaos_abertos(text, int) from public, anon, authenticated;
revoke execute on function public.relacionados(text, int) from public, anon, authenticated;
grant execute on function public.em_aberto(timestamptz, int) to service_role;
grant execute on function public.termos_da_busca(text, text[]) to service_role;
grant execute on function public.consulta_termos(text[]) to service_role;
grant execute on function public.consulta_frase(text) to service_role;
grant execute on function public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int) to service_role;
grant execute on function public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[]) to service_role;
grant execute on function public.abertas(text, text[], numeric) to service_role;
grant execute on function public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int) to service_role;
grant execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text) to service_role;
grant execute on function public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[]) to service_role;
grant execute on function public.orgaos_abertos(text, int) to service_role;
grant execute on function public.relacionados(text, int) to service_role;

-- O PostgREST relê as funções no commit.
notify pgrst, 'reload schema';
```
(O SQL acima vai inteiro, na ordem, num arquivo só. Se a guarda de "corpo de antes" falhar, a diferença é de cópia: compare com `git diff --no-index` entre o trecho da 0007/0008 e o da 0011.)

- [ ] **Step 6: Rodar as guardas**

Run: `npx vitest run scripts/migracoes.test.ts lib/situacao.test.ts`
Expected: PASS (todas as anteriores e o bloco novo).

- [ ] **Step 7: Conferências do controlador (arquivos)**

Crie `docs/evolucao-fase-2.sql`:
```sql
-- Edital Map · Evolução · Fase 2 · Busca, relevância e situação: conferências do controlador (0011).
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez; anotar em docs/fase-3-metricas.md.
-- Os arrays <...> vêm de `npx tsx scripts/conferir-relevancia.ts --mostrar` (copiar e colar).

-- ── [E0] ANTES da 0011: abertas por situação e totais de hoje (anotar para comparar com [E3]).
select situacao_id, situacao_nome, count(*) as abertas
from public.contratacoes where encerramento_em > now()
group by 1, 2 order by 1;
select (select max(total) from public.buscar_editais(p_limite => 1)) as lista,
       (select sum(qtd) from public.mapa_editais()) as mapa,
       (select max(total) from public.buscar_editais(q => 'uniforme', p_limite => 1)) as lista_uniforme;
-- Tempo de hoje com termo amplo (anotar "Execution Time"; é a régua da meta "como hoje").
explain (analyze, buffers) select * from public.buscar_editais(q => 'material');

-- ── [E1] Depois: permissões. Esperado: anon e autenticado false, servico true, nas 12 linhas.
select f,
       has_function_privilege('anon', f, 'execute') as anon,
       has_function_privilege('authenticated', f, 'execute') as autenticado,
       has_function_privilege('service_role', f, 'execute') as servico
from unnest(array[
  'public.em_aberto(timestamptz, int)',
  'public.termos_da_busca(text, text[])',
  'public.consulta_termos(text[])',
  'public.consulta_frase(text)',
  'public.pontuacao_busca(boolean, boolean, boolean, boolean, boolean, int)',
  'public.acertos_busca(tsvector, tsvector, text[], tsquery[], tsquery[], text[], text[])',
  'public.abertas(text, text[], numeric)',
  'public.abertas_unicas(tsquery, tsquery, text[], numeric, int[], text, text, int, int)',
  'public.buscar_editais(text, text[], text, int, numeric, int[], int, int, text, int, text[], text[], text[], text)',
  'public.mapa_editais(text, text[], int, numeric, int[], text, text, int, text[], text[], text[])',
  'public.orgaos_abertos(text, int)',
  'public.relacionados(text, int)']) as f;

-- ── [E2] Uma assinatura por função. Esperado: 3 linhas; buscar_editais termina em p_ordem, mapa_editais em p_excluir,
-- abertas_unicas começa em p_tq.
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in ('abertas_unicas', 'buscar_editais', 'mapa_editais')
order by 1;

-- ── [E3] Revogadas e anuladas fora em todas as funções; suspensas dentro.
-- Esperado: revogadas_anuladas = 0; suspensas ≈ situação 4 de [E0]; lista ≈ [E0] lista menos (2 + 3) de [E0].
select count(*) filter (where situacao_id in (2, 3)) as revogadas_anuladas,
       count(*) filter (where situacao_id = 4) as suspensas,
       max(total) as lista
from public.buscar_editais(p_limite => 100000, p_ordem => 'prazo');
-- Lista = mapa + editais sem município conhecido (o mapa só desenha quem tem município). Esperado: diferenca = 0.
select l.total - m.soma - s.sem_municipio as diferenca, l.total, m.soma, s.sem_municipio
from (select max(total) as total from public.buscar_editais(p_limite => 1)) l,
     (select sum(qtd) as soma from public.mapa_editais()) m,
     (select count(*) as sem_municipio from public.abertas_unicas(null, null) u
       where not exists (select 1 from public.municipios x where x.codigo_ibge = u.codigo_ibge)) s;
-- As quatro funções que listam abertas usam em_aberto. Esperado: 4 linhas.
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('abertas', 'abertas_unicas', 'orgaos_abertos', 'relacionados') and prosrc like '%em_aberto(%';
-- Órgãos: trocar <cnpj> pelo primeiro de orgaos_abertos('prefeitura', 1). Esperado: qtd = total.
select * from public.orgaos_abertos('prefeitura', 1);
select max(total) as total from public.buscar_editais(p_orgao => '<cnpj>', p_limite => 1);
-- Parecidos de 30 editais abertos ao acaso: nenhum revogado ou anulado. Esperado: 0.
select count(*) as parecidos_fora
from (select id from public.contratacoes where public.em_aberto(encerramento_em, situacao_id) order by random() limit 30) o
cross join lateral public.relacionados(o.id) r
join public.contratacoes x on x.id = r.id
where x.situacao_id in (2, 3);

-- ── [E4] Relacionados e excluídos ("uniformes", arrays de --mostrar).
-- Esperado: so_digitado <= com_relacionados; sem_escolar <= com_relacionados; escolar_restante = 0.
select (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_limite => 1)) as so_digitado,
       (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
          p_relacionados => '<relacionados de uniformes>', p_limite => 1)) as com_relacionados,
       (select max(total) from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
          p_relacionados => '<relacionados de uniformes>', p_excluir => '{escolar}', p_limite => 1)) as sem_escolar;
select count(*) as escolar_restante
from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>',
                           p_excluir => '{escolar}', p_limite => 100000, p_ordem => 'prazo') b
join public.contratacoes c on c.id = b.id
where c.busca @@ public.consulta('escolar');
-- Mapa com os mesmos termos. Esperado: diferenca = 0.
select l.total - m.soma - s.sem_municipio as diferenca
from (select max(total) as total from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}',
        p_relacionados => '<relacionados de uniformes>', p_limite => 1)) l,
     (select sum(qtd) as soma from public.mapa_editais(q => 'uniformes', p_termos => '{uniformes}',
        p_relacionados => '<relacionados de uniformes>')) m,
     (select count(*) as sem_municipio
        from public.abertas_unicas(public.consulta_termos('{uniformes}'::text[] || '<relacionados de uniformes>'::text[]), null) u
       where not exists (select 1 from public.municipios x where x.codigo_ibge = u.codigo_ibge)) s;
-- As 10 primeiras por relevância: anotar 3 (objeto, pontuação, termos) para conferir o card no site (Task 12).
select left(objeto, 80) as objeto, pontuacao, termos_objeto, termos_itens, frase
from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>', p_limite => 10);
-- Ordens: valor não informado no fim e nada subindo fora de ordem. Esperado: as duas contagens = 0.
with v as (select ordinality as i, nullif(valor_estimado, 0) as valor
           from public.buscar_editais(p_ordem => 'maior_valor', p_limite => 500) with ordinality)
select count(*) filter (where a.valor is null and b.valor is not null) as nulo_antes_de_valor,
       count(*) filter (where a.valor < b.valor) as subiu
from v a join v b on b.i = a.i + 1;

-- ── [E5] Tempos (meta: Execution Time < 500 ms; rodar cada um duas vezes e anotar a segunda).
explain (analyze, buffers) select * from public.buscar_editais(q => 'material', p_termos => '{material}', p_limite => 20, p_ordem => 'relevancia');
explain (analyze, buffers) select * from public.buscar_editais(q => 'material', p_termos => '{material}', p_limite => 20, p_ordem => 'prazo');
explain (analyze, buffers) select * from public.buscar_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>', p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(q => 'uniformes', p_termos => '{uniformes}', p_relacionados => '<relacionados de uniformes>', p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(p_limite => 20);
explain (analyze, buffers) select * from public.buscar_editais(p_limite => 20, p_ordem => 'maior_valor');
explain (analyze, buffers) select * from public.mapa_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>');
explain (analyze, buffers) select * from public.mapa_editais();
-- Contagem do "Ver N editais" (ordem prazo, sem relevância de tudo):
explain (analyze) select max(total) from public.buscar_editais(q => 'EPI', p_termos => '{EPI}', p_relacionados => '<relacionados de EPI>', p_limite => 20, p_ordem => 'prazo');
-- Passou de 500 ms com relevância? Ver "Riscos" no plano antes de publicar.

-- ── [E6] Termos relacionados no banco: quantas abertas cada um acha e 2 exemplos (procurar falsos positivos).
-- Pode levar até 1 min. Rodar com os termos de um grupo por vez (--mostrar imprime por grupo).
select t.termo, count(c.id) as abertas, (array_agg(left(c.objeto, 70) order by c.encerramento_em))[1:2] as exemplos
from unnest('<termos de um grupo>'::text[]) as t(termo)
cross join lateral (select public.consulta(t.termo) as tq offset 0) k
left join public.contratacoes c on public.em_aberto(c.encerramento_em, c.situacao_id) and c.busca @@ k.tq
group by t.termo
order by 2 desc;
```

Crie `scripts/conferir-relevancia.ts`:
```ts
// Conferência do controlador depois da 0011: a pontuação do banco (buscar_editais/pontuacao_busca) é a mesma de
// `pontuar` (site), a ordem por relevância não sobe, só aparecem termos da busca e os excluídos somem.
// Uso: npx tsx scripts/conferir-relevancia.ts            (confere; lê SUPABASE_DB_URL do .env; só leitura)
//      npx tsx scripts/conferir-relevancia.ts --mostrar  (imprime os arrays para colar em docs/evolucao-fase-2.sql)
import '../worker/ambiente';
import { pontuar } from '../lib/relevancia/pontuacao';
import { GRUPOS, interpretarBusca } from '../lib/relevancia/termos';
import { conectarBanco } from './banco-direto';

const BUSCAS = ['uniformes', 'EPI', 'luva nitrílica', 'material de limpeza -escolar', 'merenda, leite', 'computador'];
const literal = (a: readonly string[]) => `'{${a.map((t) => `"${t.replace(/["\\]/g, '\\$&')}"`).join(',')}}'`;

if (process.argv.includes('--mostrar')) {
  for (const q of BUSCAS) {
    const b = interpretarBusca(q);
    console.log(`-- ${q}`);
    console.log(`  p_termos => ${literal(b.digitados)}, p_relacionados => ${literal(b.relacionados.map((r) => r.termo))}, p_excluir => ${literal(b.excluidos)}`);
  }
  for (const g of GRUPOS) console.log(`-- [E6] ${g.assunto}\n${literal(g.termos)}`);
  process.exit(0);
}

type Linha = { id: string; pontuacao: number | null; termos_objeto: string[]; termos_itens: string[]; frase: boolean; total: string };

const cliente = conectarBanco(process.env);
await cliente.connect();
let falhou = false;
function conferir(ok: boolean, texto: string) {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${texto}`);
  if (!ok) falhou = true;
}

try {
  for (const q of BUSCAS) {
    const b = interpretarBusca(q);
    const args = [b.positivo, b.digitados, b.relacionados.map((r) => r.termo), b.excluidos];
    const inicio = performance.now();
    const { rows } = await cliente.query<Linha>(
      `select id, pontuacao, termos_objeto, termos_itens, frase, total
         from public.buscar_editais(q => $1, p_termos => $2, p_relacionados => $3, p_excluir => $4,
                                    p_ordem => 'relevancia', p_limite => 50)`,
      args,
    );
    const ms = Math.round(performance.now() - inicio);
    const pontos = rows.map((l) => pontuar({ termosObjeto: l.termos_objeto, termosItens: l.termos_itens, frase: l.frase }, b));
    conferir(rows.every((l, i) => l.pontuacao === pontos[i]), `${q}: pontuação do banco = pontuar (${rows.length} de ${rows[0]?.total ?? 0}, ${ms} ms)`);
    conferir(rows.every((l, i) => i === 0 || (rows[i - 1].pontuacao ?? 0) >= (l.pontuacao ?? 0)), `${q}: ordem por relevância não sobe`);
    const daBusca = new Set([...b.digitados, ...b.relacionados.map((r) => r.termo)]);
    conferir(rows.every((l) => [...l.termos_objeto, ...l.termos_itens].every((t) => daBusca.has(t))), `${q}: só termos da busca`);
    conferir(rows.every((l) => l.termos_objeto.length + l.termos_itens.length > 0), `${q}: todo edital tem um termo que bateu`);
    if (b.excluidos.length) {
      const { rows: r2 } = await cliente.query<{ n: number }>(
        `select count(*)::int as n
           from public.buscar_editais(q => $1, p_termos => $2, p_relacionados => $3, p_excluir => $4,
                                      p_ordem => 'prazo', p_limite => 100000) x
           join public.contratacoes c on c.id = x.id
          where c.busca @@ public.consulta_termos($4)`,
        args,
      );
      conferir(r2[0].n === 0, `${q}: nenhum edital com termo excluído no objeto`);
    }
  }
} finally {
  await cliente.end();
}
process.exit(falhou ? 1 : 0);
```

- [ ] **Step 8: Verificar e commitar**

Run: `npm test && npm run typecheck`
Expected: tudo passa. **Não** rodar `scripts/conferir-relevancia.ts` sem `--mostrar` (lê o banco; é do controlador). Pode rodar `npx tsx scripts/conferir-relevancia.ts --mostrar` (não conecta) para ver que imprime os arrays.
```bash
git add supabase/migrations/0011_busca_relevancia.sql scripts/migracoes.test.ts lib/situacao.ts lib/situacao.test.ts lib/tipos.ts lib/filtros.ts docs/evolucao-fase-2.sql scripts/conferir-relevancia.ts
git commit -m "feat: migração 0011 com aberta sem revogadas e anuladas, termos relacionados, excluídos, ordem e relevância" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 4 (controlador): aplicar a 0011 e conferir no banco

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: os arquivos da Task 3.
- Produces: 0011 aplicada em produção (pré-requisito da Task 12); números anotados.

Todos os passos são do controlador (o `.env` do worktree tem `SUPABASE_DB_URL`; nunca imprimir).

- [ ] **Step 1: Pré-condições**

Task 3 commitada. `gh run list --workflow sync.yml --limit 1`: nenhuma rodada `in_progress` (se houver, esperar). `npx tsx scripts/conferir-relevancia.ts --mostrar` e guardar a saída (arrays de [E4]–[E6]). Rodar [E0] de `docs/evolucao-fase-2.sql` e anotar (situações, totais, tempo de "material").

- [ ] **Step 2: Aplicar**

Run: `npm run db:aplicar -- supabase/migrations/0011_busca_relevancia.sql`
Expected: `[migração] busca_relevancia aplicada`. `lock timeout`: esperar o sync terminar e repetir (nada ficou aplicado). Erro de sintaxe ou "structure of query does not match function result type": nada ficou aplicado; corrigir na Task 3 (novo commit) e repetir.

- [ ] **Step 3: Site no ar continua de pé (chamadas antigas)**

```bash
B=https://edital-map.vercel.app
H='cookie: em_interno=1'
for u in / "/api/busca?q=luva" "/api/mapa?q=luva" "/api/busca?q=luva&deslocamento=50" "/api/contagem?q=luva"; do curl -s -H "$H" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
S=$(curl -s -H "$H" "$B/api/busca?q=luva" | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(r.editais[0].slug)")
curl -s -H "$H" -o /dev/null -w "%{http_code} edital\n" "$B/edital/$S"
```
Expected: `200` em todas. Qualquer 502: olhar o log da Vercel; se for a 0011, parar e avisar o dono (o site no ar depende dela agora).

- [ ] **Step 4: Conferências**

Rodar [E1]–[E6] de `docs/evolucao-fase-2.sql` (uma seção por vez, com os arrays do Step 1), conferindo o "Esperado". Depois:

Run: `npx tsx scripts/conferir-relevancia.ts`
Expected: só linhas `ok` e saída 0 (6 buscas × 4–5 checagens). Qualquer `FALHA`: parar, anotar o caso e avisar o dono antes de publicar.

Em [E5], se alguma linha com relevância passar de 500 ms: ver "Riscos" (ajuste com nova migração 0012 antes da Task 12) e avisar o dono com a nova estimativa. Em [E6], termo com muitos falsos positivos (exemplos sem relação com o assunto): anotar; a troca do termo é um commit na Task 1 (não muda o banco).

- [ ] **Step 5: Registrar e commitar**

Acrescente ao fim de `docs/fase-3-metricas.md`:
```markdown

## Evolução · Fase 2 · Busca e relevância (0011)

- 0011 aplicada em aaaa-mm-dd hh:mm UTC; site no ar seguiu 200 (busca, mapa, "Carregar mais", contagem, edital).
- Antes [E0]: N abertas (situação 2: N, 3: N, 4: N); lista N, mapa N; "material" N ms.
- Depois [E3]: revogadas/anuladas na lista 0; suspensas N; lista N (= mapa N + sem município N).
- [E4] uniformes: só digitado N, com relacionados N, sem "escolar" N (escolar restante 0).
- [E5] tempos (2ª execução): material/relevância N ms, material/prazo N ms, EPI N ms, uniformes N ms, sem termo N ms, maior valor N ms, mapa EPI N ms, mapa N ms.
- [E6] termos com falso positivo: (nenhum | lista).
- scripts/conferir-relevancia.ts: todas ok.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: 0011 aplicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: Página, ordem e vista no endereço e na API

**Files:**
- Modify: `lib/tipos.ts`, `lib/filtros.ts`, `lib/urlBusca.ts`, `lib/limites.ts` (comentário), `lib/servidor/consultas.ts` (página → deslocamento), `app/api/contagem/route.ts`, `app/page.tsx`, `components/Explorador.tsx` (só o necessário para compilar)
- Test: `lib/filtros.test.ts`, `lib/urlBusca.test.ts`, `lib/limites.test.ts`, `lib/servidor/uso.test.ts`, `lib/servidor/consultas.test.ts`, `app/api/rotas-limite.test.ts`

**Interfaces:**
- Consumes: `Ordem`, `ORDENS` (Task 3).
- Produces:
  - `FiltrosBusca` sem `deslocamento`, com `pagina: number` (1..`MAX_PAGINA`) e `ordem: Ordem | null`.
  - `lib/filtros.ts`: `POR_PAGINA = 20`, `MAX_PAGINA = 1000`, `lerOrdem(v: string | null): Ordem | null`, `ordemEfetiva(ordem: Ordem | null, temTermo: boolean): Ordem`, `paraParametros(f, { comCidade?, pagina?, ordem? })`.
  - `lib/urlBusca.ts`: `type Vista = 'lista' | 'mapa'`, `type EstadoTela = { vista: Vista; tela: Tela; pagina: number; ordem: Ordem | null }`, `ESTADO_PADRAO`, `urlDaBusca(f: FiltrosTela, estado?: Partial<EstadoTela>): string`, `lerBuscaDaUrl(p): { busca: FiltrosBusca; estado: EstadoTela }`, `comTela(endereco, tela)` (Mapa → `vista=mapa`; Lista → sem vista).
  - API: `/api/busca`, `/api/mapa`, `/api/exportar` e `/api/contagem` aceitam `pagina` e `ordem` (o `deslocamento` antigo é ignorado). A lista devolve 20 por página.
  - Comportamento intermediário até a Task 8/9: a página inicial continua a de hoje (sempre `vista=mapa` no endereço) e o "Carregar mais" pede a página seguinte.

- [ ] **Step 1: Testes de filtros (falhando)**

Em `lib/filtros.test.ts`:
1. No import, acrescente `ordemEfetiva, ORDENS` à lista de `./filtros`.
2. Troque `const BASE = { q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null };` por
```ts
const BASE = { q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null };
```
3. Troque o teste `'aceita os valores válidos'` por
```ts
  it('aceita os valores válidos', () => {
    expect(ler('q=%20EPI%20e%20uniformes%20&uf=sc&ibge=4205407&dias=7&pagina=3&ordem=recentes&valor=50000&modalidades=8,6,6')).toEqual({
      q: 'EPI e uniformes', uf: 'SC', ibge: '4205407', dias: 7, pagina: 3, ordem: 'recentes', valorMin: 50000, modalidades: [6, 8], orgao: null, raio: null,
    });
  });
```
4. Troque o teste `'limita o termo a 100 caracteres e o deslocamento a 0..20000'` por
```ts
  it('limita o termo a 100 caracteres, a página a 1..1000 e a ordem às conhecidas; o deslocamento antigo não vale mais', () => {
    expect(ler(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
    expect(ler('pagina=0').pagina).toBe(1);
    expect(ler('pagina=1001').pagina).toBe(1);
    expect(ler('pagina=1.5').pagina).toBe(1);
    expect(ler('pagina=1000').pagina).toBe(1000);
    expect(ler('ordem=maior_valor').ordem).toBe('maior_valor');
    expect(ler('ordem=aleatoria').ordem).toBeNull();
    expect(ler('deslocamento=50')).toEqual(BASE);
  });
```
5. No `describe('chaveFiltros')`, no teste `'muda quando o filtro muda'`, acrescente antes do `});`:
```ts
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&pagina=2')));
    expect(chaveFiltros(ler('q=epi'))).not.toBe(chaveFiltros(ler('q=epi&ordem=recentes')));
```
6. No `describe('paraParametros')`, troque o teste `'monta os parâmetros que a API entende'` por
```ts
  it('monta os parâmetros que a API entende (página 1 e ordem padrão ficam fora)', () => {
    expect(paraParametros(TELA, { pagina: 3, ordem: 'maior_valor' }).toString()).toBe(
      'q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407&ordem=maior_valor&pagina=3',
    );
    expect(paraParametros(TELA, { pagina: 1, ordem: null }).toString()).toBe('q=EPI&uf=SC&dias=7&valor=50000&modalidades=6%2C8&ibge=4205407');
  });
```
e, no teste `'ida e volta com lerFiltros'`, troque `deslocamento: 0` por `pagina: 1, ordem: null`.
7. Acrescente ao fim do arquivo:
```ts
describe('ordemEfetiva', () => {
  it('com termo: a pedida, ou relevância', () => {
    expect(ordemEfetiva(null, true)).toBe('relevancia');
    expect(ordemEfetiva('maior_valor', true)).toBe('maior_valor');
  });
  it('sem termo: relevância (ou nada) vira menor prazo; as outras ficam', () => {
    expect(ordemEfetiva(null, false)).toBe('prazo');
    expect(ordemEfetiva('relevancia', false)).toBe('prazo');
    expect(ordemEfetiva('recentes', false)).toBe('recentes');
  });
  it('ORDENS: os rótulos da spec, na ordem do seletor', () => {
    expect(ORDENS.map((o) => o.rotulo)).toEqual(['Maior relevância', 'Mais recentes', 'Menor prazo', 'Maior valor', 'Menor valor']);
  });
});
```

- [ ] **Step 2: Testes do endereço, do limite e do servidor (falhando)**

Em `lib/urlBusca.test.ts`:
1. Troque o import de `./urlBusca` por
```ts
import {
  comTela, ESTADO_PADRAO, lerBuscaDaUrl, mesmaBusca, montarTela, paraUrlSearchParams, telaPelaRolagem, urlDaBusca, type EstadoTela,
} from './urlBusca';
```
2. Troque os testes `'sem nada preenchido: só "/"'`, `'escreve os filtros com os nomes da spec, modalidades em ordem'`, `'ida e volta: os mesmos filtros (com os nomes vindos do banco) e a mesma tela'`, `'a página faz a mesma busca que a lista faria (com raio a UF não vai para a API)'`, `'lê "municipio" como ibge e ignora o que a API recusaria'` e `'comTela troca só a tela'` por:
```ts
  it('sem nada preenchido: só "/" (vista Lista, página 1 e ordem padrão ficam fora; tela só no Mapa)', () => {
    expect(urlDaBusca(VAZIO)).toBe('/');
    expect(urlDaBusca(VAZIO, ESTADO_PADRAO)).toBe('/');
    expect(urlDaBusca(VAZIO, { tela: 'lista' })).toBe('/');
    expect(urlDaBusca(VAZIO, { vista: 'mapa' })).toBe('/?vista=mapa');
    expect(urlDaBusca(VAZIO, { vista: 'mapa', tela: 'lista' })).toBe('/?vista=mapa&tela=lista');
  });
  it('escreve os filtros com os nomes da spec, modalidades em ordem, depois ordem, página e vista', () => {
    expect(urlDaBusca(CHEIO, { vista: 'mapa', tela: 'lista', pagina: 3, ordem: 'maior_valor' })).toBe(
      '/?q=luva+nitr%C3%ADlica&uf=SC&municipio=4209102&valor=50000&modalidades=6%2C8&orgao=83102285000107&raio=100&dias=7&ordem=maior_valor&pagina=3&vista=mapa&tela=lista',
    );
  });
  it('ida e volta: os mesmos filtros (com os nomes vindos do banco) e o mesmo estado', () => {
    const casos: FiltrosTela[] = [VAZIO, CHEIO, { ...VAZIO, q: 'botina' }, { ...VAZIO, uf: 'SC', cidade: JOINVILLE }, { ...VAZIO, orgao: ORGAO }];
    const estados: EstadoTela[] = [
      ESTADO_PADRAO,
      { vista: 'mapa', tela: 'mapa', pagina: 1, ordem: null },
      { vista: 'mapa', tela: 'lista', pagina: 2, ordem: 'prazo' },
      { vista: 'lista', tela: 'mapa', pagina: 4, ordem: 'recentes' },
    ];
    for (const f of casos) {
      for (const estado of estados) {
        const lido = ler(urlDaBusca(f, estado));
        expect(montarTela(lido.busca, f.cidade, f.orgao)).toEqual({ ...f, modalidades: [...f.modalidades].sort((a, b) => a - b) });
        expect(lido.estado).toEqual(estado);
      }
    }
  });
  it('a página faz a mesma busca que a lista faria (com raio a UF não vai para a API)', () => {
    const { busca, estado } = ler(urlDaBusca(CHEIO, { pagina: 2, ordem: 'recentes' }));
    expect(lerFiltros(paraParametros(montarTela(busca, JOINVILLE, ORGAO), { pagina: estado.pagina, ordem: estado.ordem }))).toEqual({
      ...busca,
      uf: null,
    });
  });
  it('lê "municipio" como ibge e ignora o que a API recusaria', () => {
    expect(ler('/?municipio=4209102&uf=sc&valor=7&dias=30&deslocamento=100&tela=x').busca).toEqual({
      q: null, uf: 'SC', ibge: '4209102', dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null,
    });
    expect(ler('/?ibge=4209102').busca.ibge).toBeNull();
    expect(ler('/?vista=x').estado).toEqual(ESTADO_PADRAO);
    expect(ler('/?tela=lista').estado.tela).toBe('mapa');
    expect(ler('/?pagina=0&ordem=x').estado).toEqual(ESTADO_PADRAO);
  });
```
e, no lugar do antigo `'comTela troca só a tela'`:
```ts
  it('comTela: Mapa leva à vista Mapa; Lista, à vista Lista (a tela do celular sai)', () => {
    expect(comTela('/?q=luva', 'lista')).toBe('/?q=luva');
    expect(comTela('/?q=luva', 'mapa')).toBe('/?q=luva&vista=mapa');
    expect(comTela('/?q=luva&vista=mapa&tela=lista', 'lista')).toBe('/?q=luva');
    expect(comTela('/?q=luva&vista=mapa&tela=lista', 'mapa')).toBe('/?q=luva&vista=mapa');
    expect(comTela('/', 'mapa')).toBe('/?vista=mapa');
    expect(comTela('/', 'lista')).toBe('/');
  });
```
(Os testes `'município que não existe no banco sai…'`, `'município de outra UF…'`, `'searchParams da página…'`, `mesmaBusca` e `telaPelaRolagem` ficam como estão. O tipo `Tela` deixa de ser importado no teste.)

Em `lib/limites.test.ts`, troque o teste `'prazo e "Carregar mais" não mudam a busca (e o prazo sozinho não conta)'` por
```ts
  it('prazo, página e ordem não mudam a busca (e sozinhos não contam)', () => {
    expect(combinacaoBusca(busca('q=luva&dias=7&pagina=3&ordem=maior_valor'))).toBe(combinacaoBusca(busca('q=luva')));
    expect(combinacaoBusca(busca('dias=7'))).toBeNull();
    expect(combinacaoBusca(busca('pagina=2&ordem=recentes'))).toBeNull();
  });
  it('termos excluídos ("-palavra") fazem outra busca', () => {
    expect(combinacaoBusca(busca('q=luva -latex'))).not.toBe(combinacaoBusca(busca('q=luva')));
  });
```

Em `lib/servidor/uso.test.ts`, troque
```ts
  it('lista, mapa, prazo e "Carregar mais" da mesma busca usam a mesma chave', async () => {
    await decidirBusca(CTX, busca('q=luva&ibge=4209102'), { avisar: true });
    await decidirBusca(CTX, busca('q=luva&ibge=4209102&dias=7&deslocamento=50'), { avisar: false });
```
por
```ts
  it('lista, mapa, prazo, página e ordem da mesma busca usam a mesma chave', async () => {
    await decidirBusca(CTX, busca('q=luva&ibge=4209102'), { avisar: true });
    await decidirBusca(CTX, busca('q=luva&ibge=4209102&dias=7&pagina=3&ordem=maior_valor'), { avisar: false });
```

Em `lib/servidor/consultas.test.ts`:
1. Troque `q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null, orgao: null, raio: null,` (no `SEM_FILTRO`) por `q: null, uf: null, ibge: null, dias: null, pagina: 1, ordem: null, valorMin: null, modalidades: null, orgao: null, raio: null,`.
2. No teste `'buscarEditais chama buscar_editais com os argumentos da 0007'`, troque `q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, deslocamento: 50, valorMin: 1000, modalidades: [6, 8], orgao: '83102244000102', raio: 100,` por `q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, pagina: 3, ordem: null, valorMin: 1000, modalidades: [6, 8], orgao: '83102244000102', raio: 100,` e, no `toMatchObject`, `p_limite: 50, p_deslocamento: 50,` por `p_limite: 20, p_deslocamento: 40,`.
3. No teste `'lê em páginas de 1.000 até 2.000, desde o começo, com os mesmos filtros da busca'`, troque `deslocamento: 50` por `pagina: 3`.

Em `app/api/rotas-limite.test.ts`, no teste de `/api/contagem`, troque `pedido('/api/contagem?q=luva&deslocamento=50')` por `pedido('/api/contagem?q=luva&pagina=3')` e `expect.objectContaining({ q: 'luva', deslocamento: 0 })` por `expect.objectContaining({ q: 'luva', pagina: 1 })`.

Run: `npx vitest run lib/filtros.test.ts lib/urlBusca.test.ts lib/limites.test.ts lib/servidor app/api`
Expected: FAIL (tipos e funções novas não existem; `deslocamento` ainda é lido).

- [ ] **Step 3: Implementar tipos e filtros**

Em `lib/tipos.ts`, em `FiltrosBusca`, troque
```ts
  dias: number | null;
  deslocamento: number;
```
por
```ts
  dias: number | null;
  /** Página da lista (1..MAX_PAGINA), de POR_PAGINA editais. Mudar de página não conta como outra busca. */
  pagina: number;
  /** Ordem pedida; null = a padrão (relevância com termo, menor prazo sem termo). Não conta como outra busca. */
  ordem: Ordem | null;
```

Em `lib/filtros.ts`:
1. Depois do bloco `ORDENS` (Task 3), acrescente:
```ts
/** Editais por página da lista (as duas vistas). */
export const POR_PAGINA = 20;
/** Última página aceita (20.000 editais). */
export const MAX_PAGINA = 1000;

export function lerOrdem(v: string | null): Ordem | null {
  return ORDENS.find((o) => o.id === v)?.id ?? null;
}

/** Ordem que vale: a pedida; sem pedido, relevância com termo e menor prazo sem termo (relevância sem termo vira prazo). */
export function ordemEfetiva(ordem: Ordem | null, temTermo: boolean): Ordem {
  if (!temTermo) return ordem === null || ordem === 'relevancia' ? 'prazo' : ordem;
  return ordem ?? 'relevancia';
}
```
2. Em `lerFiltros`, troque
```ts
  const d = Number(p.get('deslocamento') ?? 0);
  const deslocamento = Number.isInteger(d) && d >= 0 && d <= 20000 ? d : 0;
```
por
```ts
  const pg = Number(p.get('pagina') ?? 1);
  const pagina = Number.isInteger(pg) && pg >= 1 && pg <= MAX_PAGINA ? pg : 1;
  const ordem = lerOrdem(p.get('ordem'));
```
e `return { q, uf, ibge, dias, deslocamento, valorMin, modalidades: ids.length ? ids : null, orgao, raio };` por `return { q, uf, ibge, dias, pagina, ordem, valorMin, modalidades: ids.length ? ids : null, orgao, raio };`.
3. Em `chaveFiltros`, troque `f.dias, f.deslocamento, f.valorMin` por `f.dias, f.pagina, f.ordem, f.valorMin`.
4. Em `paraParametros`, troque a assinatura `export function paraParametros(f: FiltrosTela, opcoes: { comCidade?: boolean; deslocamento?: number } = {}): URLSearchParams {` por
```ts
export function paraParametros(
  f: FiltrosTela,
  opcoes: { comCidade?: boolean; pagina?: number; ordem?: Ordem | null } = {},
): URLSearchParams {
```
e `if (opcoes.deslocamento) p.set('deslocamento', String(opcoes.deslocamento));` por
```ts
  if (opcoes.ordem) p.set('ordem', opcoes.ordem);
  if (opcoes.pagina && opcoes.pagina > 1) p.set('pagina', String(opcoes.pagina));
```
e, no comentário acima da função, troque "Filtros da tela → parâmetros de `/api/busca`, `/api/mapa` e `/api/exportar`." por "Filtros da tela (e a página e a ordem da lista) → parâmetros de `/api/busca`, `/api/mapa`, `/api/exportar` e `/api/contagem`.".

Em `lib/limites.ts`, no comentário de `combinacaoBusca`, troque "Prazo (`dias`) e página (`deslocamento`) não entram;" por "Prazo (`dias`), página (`pagina`) e ordem (`ordem`) não entram (nem a vista, que nem chega à API);".

- [ ] **Step 4: Implementar o endereço**

Substitua o começo de `lib/urlBusca.ts` (do primeiro `import` até o fim de `lerBuscaDaUrl`) por:
```ts
import { lerFiltros, normalizarTela } from './filtros';
import type { Cidade, FiltrosBusca, FiltrosTela, Ordem, Orgao } from './tipos';

/**
 * Na vista Mapa, a parte da página inicial em que o celular (abaixo de lg) está: o mapa, em cima, ou a lista, embaixo.
 * No endereço, `tela=lista` (só com `vista=mapa`) faz a página abrir rolada até a lista.
 */
export type Tela = 'mapa' | 'lista';
/** Resultado em Lista (cards largos; padrão) ou em Mapa (a tela de três colunas). Trocar não conta como busca. */
export type Vista = 'lista' | 'mapa';
/** O que, além dos filtros, a página inicial guarda no endereço. Nada disso entra na busca contada do dia. */
export type EstadoTela = { vista: Vista; tela: Tela; pagina: number; ordem: Ordem | null };
export const ESTADO_PADRAO: EstadoTela = { vista: 'lista', tela: 'mapa', pagina: 1, ordem: null };

/**
 * Endereço da página inicial com a busca, para voltar do edital e compartilhar:
 * /?q=luva&uf=SC&municipio=4209102&valor=50000&modalidades=6,8&orgao=…&raio=100&dias=7[&ordem=…][&pagina=N][&vista=mapa[&tela=lista]].
 * `municipio` é o código IBGE (na API o mesmo valor se chama `ibge`). Os padrões ficam fora: vista Lista, página 1, ordem padrão.
 */
export function urlDaBusca(f: FiltrosTela, estado: Partial<EstadoTela> = {}): string {
  const e = { ...ESTADO_PADRAO, ...estado };
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.set('q', q);
  if (f.uf) p.set('uf', f.uf);
  if (f.cidade) p.set('municipio', f.cidade.ibge);
  if (f.valorMin) p.set('valor', String(f.valorMin));
  if (f.modalidades.length) p.set('modalidades', [...f.modalidades].sort((a, b) => a - b).join(','));
  if (f.orgao) p.set('orgao', f.orgao.cnpj);
  if (f.cidade && f.raio) p.set('raio', String(f.raio));
  if (f.seteDias) p.set('dias', '7');
  if (e.ordem) p.set('ordem', e.ordem);
  if (e.pagina > 1) p.set('pagina', String(e.pagina));
  if (e.vista === 'mapa') {
    p.set('vista', 'mapa');
    if (e.tela === 'lista') p.set('tela', 'lista');
  }
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}

/** Lê a busca do endereço com as mesmas validações da API (`lerFiltros`), com a página e a ordem; e a vista e a tela. */
export function lerBuscaDaUrl(p: URLSearchParams): { busca: FiltrosBusca; estado: EstadoTela } {
  const api = new URLSearchParams(p);
  api.delete('ibge');
  api.delete('municipio');
  const municipio = p.get('municipio');
  if (municipio) api.set('ibge', municipio);
  const busca = lerFiltros(api);
  const vista: Vista = p.get('vista') === 'mapa' ? 'mapa' : 'lista';
  const tela: Tela = vista === 'mapa' && p.get('tela') === 'lista' ? 'lista' : 'mapa';
  return { busca, estado: { vista, tela, pagina: busca.pagina, ordem: busca.ordem } };
}
```
E troque a função `comTela` por:
```ts
/** Mesmo endereço de busca na vista Mapa ou na vista Lista (links Mapa e Lista da barra do celular nas outras páginas). */
export function comTela(endereco: string, tela: Tela): string {
  const p = new URLSearchParams(endereco.split('?')[1] ?? '');
  p.delete('tela');
  if (tela === 'mapa') p.set('vista', 'mapa');
  else p.delete('vista');
  const texto = p.toString();
  return texto ? `/?${texto}` : '/';
}
```
(`montarTela`, `paraUrlSearchParams`, `mesmaBusca` e `telaPelaRolagem` não mudam.)

- [ ] **Step 5: Servidor, contagem e chamadores (compilar)**

Em `lib/servidor/consultas.ts`:
1. Troque `import { chaveFiltros } from '../filtros';` por `import { chaveFiltros, POR_PAGINA } from '../filtros';` e apague a linha `export const POR_PAGINA = 50;`.
2. Em `buscarEditais`, troque `p_deslocamento: f.deslocamento,` por `p_deslocamento: (f.pagina - 1) * POR_PAGINA,`.
3. Em `pontosDoMapa`, troque `chaveFiltros({ ...f, ibge, deslocamento: 0 })` por `chaveFiltros({ ...f, ibge, pagina: 1, ordem: null })`.

Em `app/api/contagem/route.ts`, troque `buscarEditais({ ...filtros, deslocamento: 0 })` por `buscarEditais({ ...filtros, pagina: 1 })`.

Em `app/page.tsx`:
1. Troque `const { busca, tela } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));` por
```ts
  const { busca, estado } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));
  // Até a vista Lista existir (Task 9), a página inicial é a de hoje (vista Mapa).
  const tela = estado.tela;
```
2. Troque `` key={`${urlDaBusca(filtros, tela)}@${agora}`} `` por `` key={`${urlDaBusca(filtros, { vista: 'mapa', tela })}@${agora}`} ``.

Em `components/Explorador.tsx`:
1. Troque `import { buscaDoCampo, filtrosAtivos, normalizarTela, paraParametros, recursosUsados } from '@/lib/filtros';` por `import { buscaDoCampo, filtrosAtivos, normalizarTela, paraParametros, POR_PAGINA, recursosUsados } from '@/lib/filtros';`.
2. Troque `trocarEndereco(urlDaBusca(f, nova));` por `trocarEndereco(urlDaBusca(f, { vista: 'mapa', tela: nova }));`.
3. Troque `trocarEndereco(urlDaBusca(filtrosIniciais, telaInicial));` por `trocarEndereco(urlDaBusca(filtrosIniciais, { vista: 'mapa', tela: telaInicial }));`.
4. Troque `endereco: urlDaBusca(atual.filtros, atual.tela),` por `endereco: urlDaBusca(atual.filtros, { vista: 'mapa', tela: atual.tela }),`.
5. Em `carregarMais`, troque `` `/api/busca?${paraParametros(filtros, { deslocamento: resultado.editais.length })}` `` por `` `/api/busca?${paraParametros(filtros, { pagina: Math.floor(resultado.editais.length / POR_PAGINA) + 1 })}` ``.

(`components/BarraCelular.tsx` não muda: `comTela` mudou de sentido e a barra só passa a ter a vista Lista na Task 9.)

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa. Se `typecheck` apontar outro uso de `deslocamento`, troque pela página (`grep -rn deslocamento app components lib` deve voltar vazio, fora de comentários do worker).

- [ ] **Step 7: Commit**

```bash
git add lib/tipos.ts lib/filtros.ts lib/filtros.test.ts lib/urlBusca.ts lib/urlBusca.test.ts lib/limites.ts lib/limites.test.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts lib/servidor/uso.test.ts app/api/contagem/route.ts app/api/rotas-limite.test.ts app/page.tsx components/Explorador.tsx
git commit -m "feat: página, ordem e vista no endereço e na API (20 por página; não contam como busca)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Servidor: termos, ordem e relevância (`lib/servidor/consultas.ts`)

**Files:**
- Modify: `lib/tipos.ts`, `lib/servidor/consultas.ts`, `app/api/contagem/route.ts`
- Test: `lib/servidor/consultas.test.ts`, `lib/csv.test.ts` (fixture), `app/api/rotas-limite.test.ts`

**Interfaces:**
- Consumes: `interpretarBusca`, `Busca` (Task 1); `relevancia`, `Acertos`, `Relevancia` (Task 2); `ordemEfetiva`, `POR_PAGINA` (Task 5); colunas novas de `buscar_editais` e parâmetros novos de `buscar_editais`/`mapa_editais` (Task 3, aplicada na Task 4).
- Produces:
  - `EditalResumo` ganha `situacao_id: number | null`, `relevancia: Relevancia | null`, `destaques: string[]` (termos que bateram no objeto, para o destaque do título).
  - `Edital` ganha `situacao_id: number | null` e `atualizada_pncp_em: string | null`.
  - `buscarEditais`/`exportarEditais` mandam `q` (sem os excluídos), `p_termos`, `p_relacionados`, `p_excluir`, `p_ordem` (efetiva); `pontosDoMapa` manda `q`, `p_termos`, `p_relacionados`, `p_excluir`. `/api/contagem` pede `ordem: 'prazo'`.

- [ ] **Step 1: Testes (falhando)**

Em `lib/servidor/consultas.test.ts`:
1. Troque
```ts
  const ARGS_BUSCA = ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento', 'p_orgao', 'p_raio_km'].sort();
  const ARGS_MAPA = ['q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_orgao', 'p_ibge', 'p_raio_km'].sort();
```
por
```ts
  const ARGS_BUSCA = [
    'q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento', 'p_orgao', 'p_raio_km',
    'p_termos', 'p_relacionados', 'p_excluir', 'p_ordem',
  ].sort();
  const ARGS_MAPA = [
    'q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_orgao', 'p_ibge', 'p_raio_km', 'p_termos', 'p_relacionados', 'p_excluir',
  ].sort();
```
2. No teste `'buscarEditais manda todas as chaves também sem filtros'`, troque o `toMatchObject` por
```ts
    expect(chamadas[0].args).toMatchObject({
      q: null, p_ufs: null, p_valor_min: null, p_modalidades: null, p_orgao: null, p_raio_km: null,
      p_termos: [], p_relacionados: [], p_excluir: [], p_ordem: 'prazo',
    });
```
3. Troque o teste `'buscarEditais mapeia as colunas da 0007 (link_origem fica de fora do card)'` inteiro por:
```ts
  it('buscarEditais mapeia as colunas da 0011 com a relevância e os destaques (link_origem fica de fora do card)', async () => {
    respostaRpc = [
      {
        id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
        municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: '1000.50',
        encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
        link_origem: 'https://compras.joinville.sc.gov.br/1', onde: 'itens', total: 1,
        situacao_id: 4, pontuacao: 35, termos_objeto: [], termos_itens: ['nitrilica'], frase: false,
      },
    ];
    const r = await buscarEditais({ ...SEM_FILTRO, q: 'nitrilica' });
    expect(r).toEqual({
      total: 1,
      editais: [
        {
          id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
          municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: 1000.5,
          encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
          onde: 'itens', situacao_id: 4,
          relevancia: { pontos: 35, nivel: 'Baixa', explicacao: 'Menciona nitrilica nos itens.' },
          destaques: [],
        },
      ],
    });
  });

  it('busca com termo: digitados, relacionados, excluídos e a ordem padrão (relevância) vão separados', async () => {
    await buscarEditais({ ...SEM_FILTRO, q: 'uniformes -escolar' });
    const a = chamadas[0].args;
    expect(a).toMatchObject({ q: 'uniformes', p_termos: ['uniformes'], p_excluir: ['escolar'], p_ordem: 'relevancia' });
    expect(a.p_relacionados).toContain('fardamento');
  });

  it('ordem pedida vai como veio; relevância sem termo vira prazo', async () => {
    await buscarEditais({ ...SEM_FILTRO, q: 'luva', ordem: 'maior_valor' });
    await buscarEditais({ ...SEM_FILTRO, ordem: 'relevancia' });
    expect(chamadas.map((c) => c.args.p_ordem)).toEqual(['maior_valor', 'prazo']);
  });

  it('pontuação do banco diferente da do site vai para o log (a ordem é do banco, o número é do site)', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    respostaRpc = [
      {
        id: 'C2', slug: '00394452000103-2026-2', objeto: 'Uniformes', orgao_nome: 'X', unidade_nome: null, municipio_nome: null, uf: 'SC',
        codigo_ibge: null, valor_estimado: null, encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null,
        modalidade_nome: null, srp: false, link_origem: null, onde: 'objeto', total: 1,
        situacao_id: 1, pontuacao: 10, termos_objeto: ['uniformes'], termos_itens: [], frase: true,
      },
    ];
    const r = await buscarEditais({ ...SEM_FILTRO, q: 'uniformes' });
    expect(r.editais[0].relevancia?.pontos).toBe(75);
    expect(r.editais[0].destaques).toEqual(['uniformes']);
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
  });

  it('o mapa recebe os mesmos termos da lista', async () => {
    await pontosDoMapa({ ...SEM_FILTRO, q: 'uniformes -escolar' });
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chamadas[0].args).toMatchObject({ q: 'uniformes', p_termos: ['uniformes'], p_excluir: ['escolar'] });
    expect(chamadas[0].args.p_relacionados).toContain('fardamento');
  });
```

Em `lib/csv.test.ts`, no objeto `EDITAL`, troque `modalidade_nome: 'Pregão - Eletrônico', srp: false, onde: 'objeto', link_origem: null,` por `modalidade_nome: 'Pregão - Eletrônico', srp: false, onde: 'objeto', link_origem: null, situacao_id: null, relevancia: null, destaques: [],`.

Em `app/api/rotas-limite.test.ts`, no teste de `/api/contagem`, troque `expect.objectContaining({ q: 'luva', pagina: 1 })` por `expect.objectContaining({ q: 'luva', pagina: 1, ordem: 'prazo' })`.

Run: `npx vitest run lib/servidor/consultas.test.ts lib/csv.test.ts app/api`
Expected: FAIL (argumentos e campos novos ainda não existem).

- [ ] **Step 2: Tipos**

Em `lib/tipos.ts`:
1. No topo, acrescente `import type { Relevancia } from './relevancia/pontuacao';`.
2. Em `EditalResumo`, depois de `onde: 'objeto' | 'itens';`, acrescente:
```ts
  /** Situação oficial no PNCP (4 = Suspensa: o card mostra a etiqueta). */
  situacao_id: number | null;
  /** Só com termo de busca: pontuação 0–100, nível e explicação (lib/relevancia/pontuacao.ts). */
  relevancia: Relevancia | null;
  /** Termos (digitados e relacionados) que bateram no objeto: destaque do título. */
  destaques: string[];
```
3. Em `Edital`, depois de `situacao_nome: string | null;`, acrescente `situacao_id: number | null;` e, depois de `link_origem: string | null;`, acrescente `/** Última alteração da contratação no PNCP. */ atualizada_pncp_em: string | null;`.

- [ ] **Step 3: Consultas**

Em `lib/servidor/consultas.ts`:
1. Troque `import { chaveFiltros, POR_PAGINA } from '../filtros';` por:
```ts
import { chaveFiltros, ordemEfetiva, POR_PAGINA } from '../filtros';
import { relevancia, type Acertos } from '../relevancia/pontuacao';
import { interpretarBusca, type Busca } from '../relevancia/termos';
```
2. Troque a função `argumentosBusca` inteira por:
```ts
/** Argumentos de buscar_editais (0011), sem a página: os termos vão separados (digitados, relacionados, excluídos). */
function argumentosBusca(f: FiltrosBusca, b: Busca) {
  return {
    // Texto sem os excluídos. Com p_termos o banco usa os termos; q fica para a chamada antiga.
    q: b.positivo,
    // Com raio a UF não filtra: o raio atravessa a divisa de estado.
    p_ufs: f.uf && !f.raio ? [f.uf] : null,
    p_ibge: f.ibge,
    p_dias: f.dias,
    p_valor_min: f.valorMin,
    p_modalidades: f.modalidades,
    p_orgao: f.orgao,
    p_raio_km: f.raio,
    p_termos: b.digitados,
    p_relacionados: b.relacionados.map((r) => r.termo),
    p_excluir: b.excluidos,
    p_ordem: ordemEfetiva(f.ordem, b.digitados.length > 0),
  };
}

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
```
3. Troque a função `paraResumo` inteira por:
```ts
/** Uma linha de buscar_editais → card da lista, com a relevância (número e explicação calculados aqui, pela busca). */
function paraResumo(l: Linha, b: Busca): EditalResumo {
  const acertos: Acertos = { termosObjeto: lista(l.termos_objeto), termosItens: lista(l.termos_itens), frase: l.frase === true };
  const rel = relevancia(acertos, b);
  // A ordem vem do banco (pontuacao_busca) e o número do card vem daqui (pontuar), com os mesmos pesos.
  const doBanco = num(l.pontuacao);
  if (rel && doBanco !== null && doBanco !== rel.pontos) {
    console.warn(`relevância diferente no edital ${String(l.id)}: banco ${doBanco}, site ${rel.pontos}`);
  }
  return {
    id: String(l.id),
    slug: String(l.slug),
    objeto: String(l.objeto),
    orgao_nome: String(l.orgao_nome),
    unidade_nome: texto(l.unidade_nome),
    municipio_nome: texto(l.municipio_nome),
    uf: String(l.uf),
    codigo_ibge: texto(l.codigo_ibge),
    valor_estimado: num(l.valor_estimado),
    encerramento_em: String(l.encerramento_em),
    publicada_em: texto(l.publicada_em),
    modalidade_nome: texto(l.modalidade_nome),
    srp: Boolean(l.srp),
    onde: l.onde === 'itens' ? 'itens' : 'objeto',
    situacao_id: num(l.situacao_id),
    relevancia: rel,
    destaques: acertos.termosObjeto,
  };
}
```
4. Em `buscarEditais`, troque o corpo do `cache(...)` por:
```ts
  return cache(`busca:${chaveFiltros(f)}`, async () => {
    const b = interpretarBusca(f.q);
    const { data, error } = await supabaseServidor().rpc('buscar_editais', {
      ...argumentosBusca(f, b),
      p_limite: POR_PAGINA,
      p_deslocamento: (f.pagina - 1) * POR_PAGINA,
    });
    if (error) throw new Error(`buscar_editais: ${error.message}`);
    const linhas = (data ?? []) as Linha[];
    return { total: Number(linhas[0]?.total ?? 0), editais: linhas.map((l) => paraResumo(l, b)) };
  });
```
5. Em `pontosDoMapa`, troque
```ts
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: f.q,
```
por
```ts
      const { data, error } = await supabaseServidor()
        .rpc('mapa_editais', {
          q: b.positivo,
          p_termos: b.digitados,
          p_relacionados: b.relacionados.map((r) => r.termo),
          p_excluir: b.excluidos,
```
e, logo antes de `const pontos: PontoMapa[] = [];`, acrescente `const b = interpretarBusca(f.q);`.
6. Em `edital`, na lista do `.select(...)`, troque `modalidade_nome, situacao_nome, srp,` por `modalidade_nome, situacao_id, situacao_nome, srp,` e `encerramento_em, link_origem'` por `encerramento_em, link_origem, atualizada_pncp_em'`; e troque `return data ? ({ ...data, valor_estimado: num(data.valor_estimado) } as Edital) : null;` por `return data ? ({ ...data, valor_estimado: num(data.valor_estimado), situacao_id: num(data.situacao_id) } as Edital) : null;`.
7. Em `exportarEditais`, logo no começo da função, acrescente `const b = interpretarBusca(f.q);`; troque `...argumentosBusca(f),` por `...argumentosBusca(f, b),` e `editais.push({ ...paraResumo(l), link_origem: texto(l.link_origem) });` por `editais.push({ ...paraResumo(l, b), link_origem: texto(l.link_origem) });`.

Em `app/api/contagem/route.ts`, troque `buscarEditais({ ...filtros, pagina: 1 })` por:
```ts
buscarEditais({ ...filtros, pagina: 1, ordem: 'prazo' })
```
e, no comentário da função, acrescente: "Ordem prazo: o total é o mesmo e o banco não calcula a relevância de todas.".

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add lib/tipos.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts lib/csv.test.ts app/api/contagem/route.ts app/api/rotas-limite.test.ts
git commit -m "feat: busca com termos relacionados, excluídos e ordem; relevância e destaques no card" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Peças da lista (paginação, estado vazio, relevância, destaque, ordem, situação, card largo)

**Files:**
- Create: `lib/paginacao.ts`, `lib/paginacao.test.ts`, `lib/vazio.ts`, `lib/vazio.test.ts`, `components/EtiquetaSituacao.tsx`, `components/inicio/Relevancia.tsx`, `components/inicio/TituloDestacado.tsx`, `components/inicio/Paginacao.tsx`, `components/inicio/SeletorOrdem.tsx`, `components/inicio/CardLista.tsx`, `components/inicio/EstadoVazio.tsx`
- Modify: `scripts/prefetch-edital.test.ts`

**Interfaces:**
- Consumes: `POR_PAGINA`, `MAX_PAGINA`, `ORDENS`, `paraParametros` (Tasks 3 e 5); `Relevancia`, `NivelRelevancia`, `AVISO_RELEVANCIA` (Task 2); `destacar` (Task 2); `rotuloSituacao` (Task 3); `interpretarBusca`, `separarNegativos`, `termosParecidos` (Task 1); `EditalResumo` com `situacao_id`, `relevancia`, `destaques` (Task 6); `etiqueta`, `moeda`, `data`, `dataHora`, `numero` (`lib/formato.ts`); `assunto`, `nomeProprio` (`lib/texto.ts`); `modalidadeCurta` (`lib/participacao.ts`); `ESTILO_ETIQUETA`, `PONTO_ETIQUETA` (`components/inicio/estilos.ts`).
- Produces:
  - `totalPaginas(total: number, porPagina?: number): number`; `type ItemPaginacao = number | 'reticencias'`; `itensPaginacao(atual: number, total: number): ItemPaginacao[]`.
  - `type Sugestao = { rotulo: string; filtros: FiltrosTela }`; `MAX_SUGESTOES = 3`; `sugestoesVazio(f: FiltrosTela): Sugestao[]`; `escolherSugestoes(candidatas: Sugestao[], totais: ReadonlyArray<number | null>): Array<Sugestao & { total: number }>`; `descreverVazio(f: FiltrosTela): string`.
  - Componentes: `<EtiquetaSituacao situacaoId />`, `<PilulaRelevancia relevancia />`, `<IndicadorRelevancia relevancia />`, `<TituloDestacado texto termos />`, `<Paginacao pagina total carregando aoIr />`, `<SeletorOrdem ordem temTermo aoMudar />`, `<CardLista edital agora />`, `<EstadoVazio filtros aoAplicar />`.

- [ ] **Step 1: Testes puros e guarda (falhando)**

Crie `lib/paginacao.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { itensPaginacao, totalPaginas } from './paginacao';

describe('totalPaginas', () => {
  it('20 por página, pelo menos 1, no máximo 1000', () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(20)).toBe(1);
    expect(totalPaginas(21)).toBe(2);
    expect(totalPaginas(1_000_000)).toBe(1000);
  });
});

describe('itensPaginacao', () => {
  it('até 7 páginas: todas', () => {
    expect(itensPaginacao(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('no começo, no meio e no fim', () => {
    expect(itensPaginacao(1, 10)).toEqual([1, 2, 3, 4, 'reticencias', 10]);
    expect(itensPaginacao(3, 10)).toEqual([1, 2, 3, 4, 'reticencias', 10]);
    expect(itensPaginacao(5, 10)).toEqual([1, 'reticencias', 4, 5, 6, 'reticencias', 10]);
    expect(itensPaginacao(10, 10)).toEqual([1, 'reticencias', 7, 8, 9, 10]);
  });
  it('página fora do intervalo fica no limite', () => {
    expect(itensPaginacao(99, 10)).toEqual(itensPaginacao(10, 10));
  });
});
```

Crie `lib/vazio.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { FiltrosTela } from './tipos';
import { descreverVazio, escolherSugestoes, MAX_SUGESTOES, sugestoesVazio } from './vazio';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const CHEIO: FiltrosTela = {
  q: 'luva', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [6], seteDias: true,
  orgao: { cnpj: '83102244000102', nome: 'Município de Joinville' }, raio: null,
};

describe('sugestoesVazio (cada uma tira um filtro só)', () => {
  it('uma por filtro ligado, na ordem', () => {
    expect(sugestoesVazio(CHEIO).map((s) => s.rotulo)).toEqual([
      'Ampliar para Todo o Brasil', 'Todo o estado (SC)', 'Tirar o valor mínimo', 'Todas as modalidades', 'Todos os órgãos', 'Todos os prazos',
    ]);
  });
  it('cada sugestão muda só o seu filtro', () => {
    const [brasil, estado, valor, , , prazo] = sugestoesVazio(CHEIO);
    expect(brasil.filtros).toEqual({ ...CHEIO, uf: '', cidade: null, raio: null });
    expect(estado.filtros).toEqual({ ...CHEIO, cidade: null, raio: null });
    expect(valor.filtros).toEqual({ ...CHEIO, valorMin: null });
    expect(prazo.filtros).toEqual({ ...CHEIO, seteDias: false });
  });
  it('termos excluídos e termos parecidos do catálogo', () => {
    expect(sugestoesVazio({ ...VAZIO, q: 'luva -latex' }).map((s) => [s.rotulo, s.filtros.q])).toEqual([['Sem os termos excluídos', 'luva']]);
    expect(sugestoesVazio({ ...VAZIO, q: 'farda' }).map((s) => [s.rotulo, s.filtros.q])).toEqual([['Buscar “fardamento”', 'fardamento']]);
  });
  it('sem filtro nem termo parecido: nada', () => {
    expect(sugestoesVazio({ ...VAZIO, q: 'xyzw' })).toEqual([]);
  });
});

describe('escolherSugestoes (só as que trazem editais, as que mais trazem primeiro)', () => {
  it('ordena pelo total, tira zero e sem resposta, até MAX_SUGESTOES', () => {
    const c = sugestoesVazio(CHEIO);
    const escolhidas = escolherSugestoes(c, [0, 12, null, 40, 3, 7]);
    expect(escolhidas.map((s) => [s.rotulo, s.total])).toEqual([
      ['Todas as modalidades', 40], ['Todo o estado (SC)', 12], ['Todos os prazos', 7],
    ]);
    expect(escolhidas).toHaveLength(MAX_SUGESTOES);
  });
});

describe('descreverVazio', () => {
  it('com termo e lugar', () => {
    expect(descreverVazio(CHEIO)).toBe('Nenhum edital aberto para “luva” em Joinville/SC.');
    expect(descreverVazio({ ...VAZIO, q: 'luva', uf: 'SC' })).toBe('Nenhum edital aberto para “luva” em SC.');
    expect(descreverVazio({ ...CHEIO, raio: 100 })).toBe('Nenhum edital aberto para “luva” em Joinville/SC e até 100 km.');
  });
  it('sem termo', () => {
    expect(descreverVazio({ ...VAZIO, valorMin: 50_000 })).toBe('Nenhum edital aberto com esses filtros.');
  });
});
```

Em `scripts/prefetch-edital.test.ts`, dentro do `describe`, depois do teste `'todo <Link> com href para /edital/ tem prefetch={false}'`, acrescente:
```ts
  it('todo <Link> para a página inicial com busca (/?…) tem prefetch={false} (abrir conta como busca)', () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosTsx('app'), ...arquivosTsx('components')]) {
      for (const a of aberturasDeLink(readFileSync(join(RAIZ, arquivo), 'utf8'))) {
        if (/href=\{?[`"']\/\?/.test(a) && !a.includes('prefetch={false}')) faltando.push(`${arquivo}: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    expect(faltando).toEqual([]);
  });
```

Run: `npx vitest run lib/paginacao.test.ts lib/vazio.test.ts scripts/prefetch-edital.test.ts`
Expected: FAIL nos dois arquivos novos (módulos não existem); a guarda nova já passa.

- [ ] **Step 2: Implementar os módulos puros**

Crie `lib/paginacao.ts`:
```ts
import { MAX_PAGINA, POR_PAGINA } from './filtros';

/** Quantas páginas a lista tem (pelo menos 1, no máximo MAX_PAGINA). */
export function totalPaginas(total: number, porPagina = POR_PAGINA): number {
  return Math.min(MAX_PAGINA, Math.max(1, Math.ceil(total / porPagina)));
}

export type ItemPaginacao = number | 'reticencias';

/** Até 7 páginas, todas; senão a primeira, a última e a vizinhança da atual, com reticências nos buracos. */
export function itensPaginacao(atual: number, total: number): ItemPaginacao[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const a = Math.min(Math.max(1, atual), total);
  let inicio = Math.max(2, a - 1);
  let fim = Math.min(total - 1, a + 1);
  if (a <= 3) {
    inicio = 2;
    fim = 4;
  }
  if (a >= total - 2) {
    inicio = total - 3;
    fim = total - 1;
  }
  const itens: ItemPaginacao[] = [1];
  if (inicio > 2) itens.push('reticencias');
  for (let n = inicio; n <= fim; n++) itens.push(n);
  if (fim < total - 1) itens.push('reticencias');
  itens.push(total);
  return itens;
}
```

Crie `lib/vazio.ts`:
```ts
import { interpretarBusca, separarNegativos, termosParecidos } from './relevancia/termos';
import type { FiltrosTela } from './tipos';

/** Outra busca para propor quando a lista vem vazia (o número que ela traria vem de /api/contagem, que não conta). */
export type Sugestao = { rotulo: string; filtros: FiltrosTela };
export const MAX_SUGESTOES = 3;

/** Uma sugestão por filtro ligado (cada uma tira só aquele), sem os excluídos, e termos parecidos do catálogo. */
export function sugestoesVazio(f: FiltrosTela): Sugestao[] {
  const s: Sugestao[] = [];
  if (f.uf || f.cidade) s.push({ rotulo: 'Ampliar para Todo o Brasil', filtros: { ...f, uf: '', cidade: null, raio: null } });
  if (f.cidade && f.uf) s.push({ rotulo: `Todo o estado (${f.uf})`, filtros: { ...f, cidade: null, raio: null } });
  if (f.valorMin) s.push({ rotulo: 'Tirar o valor mínimo', filtros: { ...f, valorMin: null } });
  if (f.modalidades.length) s.push({ rotulo: 'Todas as modalidades', filtros: { ...f, modalidades: [] } });
  if (f.orgao) s.push({ rotulo: 'Todos os órgãos', filtros: { ...f, orgao: null } });
  if (f.seteDias) s.push({ rotulo: 'Todos os prazos', filtros: { ...f, seteDias: false } });
  const { positivo, negativos } = separarNegativos(f.q);
  if (negativos.length) s.push({ rotulo: 'Sem os termos excluídos', filtros: { ...f, q: positivo } });
  for (const t of termosParecidos(interpretarBusca(f.q).digitados)) s.push({ rotulo: `Buscar “${t}”`, filtros: { ...f, q: t } });
  return s;
}

/** Só as que trazem editais, as que mais trazem primeiro (a primeira é a do filtro mais restritivo), até MAX_SUGESTOES. */
export function escolherSugestoes(candidatas: Sugestao[], totais: ReadonlyArray<number | null>): Array<Sugestao & { total: number }> {
  return candidatas
    .map((s, i) => ({ ...s, total: totais[i] ?? 0 }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_SUGESTOES);
}

/** "Nenhum edital aberto para “luva” em Joinville/SC." */
export function descreverVazio(f: FiltrosTela): string {
  const q = f.q.trim();
  const lugar = f.cidade ? ` em ${f.cidade.nome}/${f.cidade.uf}${f.raio ? ` e até ${f.raio} km` : ''}` : f.uf ? ` em ${f.uf}` : '';
  return q ? `Nenhum edital aberto para “${q}”${lugar}.` : `Nenhum edital aberto com esses filtros${lugar}.`;
}
```

Run: `npx vitest run lib/paginacao.test.ts lib/vazio.test.ts`
Expected: PASS.

- [ ] **Step 3: Componentes**

Crie `components/EtiquetaSituacao.tsx`:
```tsx
import { rotuloSituacao } from '@/lib/situacao';

/** "Suspensa" (e, por link direto, "Revogada"/"Anulada") nos cards e no edital; nada para as outras situações. */
export function EtiquetaSituacao({ situacaoId }: { situacaoId: number | null }) {
  const rotulo = rotuloSituacao(situacaoId);
  if (!rotulo) return null;
  return <span className="inline-flex w-fit items-center rounded-xs bg-pin-soft px-2 py-0.5 text-xs font-semibold text-pin-strong">{rotulo}</span>;
}
```

Crie `components/inicio/Relevancia.tsx`:
```tsx
'use client';

import { useId, useState } from 'react';
import { AVISO_RELEVANCIA, type NivelRelevancia, type Relevancia } from '@/lib/relevancia/pontuacao';

const ESTILO_NIVEL: Record<NivelRelevancia, string> = {
  Alta: 'bg-mata-soft text-mata',
  Média: 'bg-ouro-soft text-ouro-strong',
  Baixa: 'bg-sunken text-ink-muted',
};
const rotulo = (r: Relevancia) => `Relevância ${r.nivel.toLocaleLowerCase('pt-BR')}`;

/** Só o nível (card compacto e resumo escuro); o aviso fica no title. */
export function PilulaRelevancia({ relevancia }: { relevancia: Relevancia }) {
  return (
    <span title={AVISO_RELEVANCIA} className={`inline-flex w-fit items-center rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_NIVEL[relevancia.nivel]}`}>
      {rotulo(relevancia)}
    </span>
  );
}

/** Nível e pontuação, o "?" que abre o aviso (tocar também abre: no celular não há tooltip) e a explicação. */
export function IndicadorRelevancia({ relevancia }: { relevancia: Relevancia }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_NIVEL[relevancia.nivel]}`}>
          {rotulo(relevancia)} · <span className="font-mono">{relevancia.pontos}</span>
        </span>
        {/* 20 px visíveis, 44 px de toque (a área invisível passa 12 px de cada lado). */}
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={id}
          aria-label="O que é a relevância"
          title={AVISO_RELEVANCIA}
          onClick={() => setAberto((v) => !v)}
          className="relative inline-flex size-5 items-center justify-center rounded-full border border-line-strong text-[11px] font-bold text-ink-muted after:absolute after:-inset-3"
        >
          ?
        </button>
      </div>
      {aberto ? (
        <p id={id} className="text-xs text-ink-muted">
          {AVISO_RELEVANCIA}
        </p>
      ) : null}
      {relevancia.explicacao ? <p className="text-[13px]">{relevancia.explicacao}</p> : null}
    </div>
  );
}
```

Crie `components/inicio/TituloDestacado.tsx`:
```tsx
import { destacar } from '@/lib/relevancia/destaque';

/** Título com os termos que bateram no objeto marcados (o texto é o de assunto(); nada é inventado). */
export function TituloDestacado({ texto, termos }: { texto: string; termos: readonly string[] }) {
  return (
    <>
      {destacar(texto, termos).map((t, i) =>
        t.marcado ? (
          <mark key={i} className="rounded-xs bg-ouro-soft px-0.5 text-ink">
            {t.texto}
          </mark>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}
```

Crie `components/inicio/Paginacao.tsx`:
```tsx
'use client';

import { itensPaginacao, totalPaginas } from '@/lib/paginacao';

const BOTAO = 'inline-flex h-11 min-w-11 items-center justify-center rounded-sm border px-2 font-mono text-sm font-semibold disabled:opacity-50';

type Props = { pagina: number; total: number; carregando: boolean; aoIr: (pagina: number) => void };

/** Paginação numerada da lista (mudar de página não conta como busca). Some com uma página só. */
export function Paginacao({ pagina, total, carregando, aoIr }: Props) {
  const n = totalPaginas(total);
  if (n <= 1) return null;
  return (
    <nav aria-label="Páginas da lista" className="flex shrink-0 flex-wrap items-center justify-center gap-1 py-3">
      <button type="button" onClick={() => aoIr(pagina - 1)} disabled={carregando || pagina <= 1} aria-label="Página anterior" className={`${BOTAO} border-line-strong bg-raised`}>
        ‹
      </button>
      {itensPaginacao(pagina, n).map((item, i) =>
        item === 'reticencias' ? (
          <span key={`r${i}`} aria-hidden="true" className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => (item === pagina ? undefined : aoIr(item))}
            disabled={carregando}
            aria-current={item === pagina ? 'page' : undefined}
            aria-label={`Página ${item}`}
            className={`${BOTAO} ${item === pagina ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised'}`}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" onClick={() => aoIr(pagina + 1)} disabled={carregando || pagina >= n} aria-label="Próxima página" className={`${BOTAO} border-line-strong bg-raised`}>
        ›
      </button>
    </nav>
  );
}
```

Crie `components/inicio/SeletorOrdem.tsx`:
```tsx
'use client';

import { ORDENS } from '@/lib/filtros';
import type { Ordem } from '@/lib/tipos';

type Props = { ordem: Ordem; temTermo: boolean; aoMudar: (o: Ordem) => void };

/** Ordenação da lista ("Maior relevância" só aparece com termo de busca). Trocar não conta como busca. */
export function SeletorOrdem({ ordem, temTermo, aoMudar }: Props) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-[13px]">
      <span className="text-ink-muted">Ordenar por</span>
      <select
        value={ordem}
        onChange={(e) => aoMudar(e.target.value as Ordem)}
        className="h-11 rounded-sm border border-line-strong bg-raised px-2 text-[13px] font-semibold lg:h-9 [&>option]:bg-raised [&>option]:text-ink"
      >
        {ORDENS.filter((o) => temTermo || o.id !== 'relevancia').map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Crie `components/inicio/CardLista.tsx`:
```tsx
import Link from 'next/link';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { data, dataHora, etiqueta, moeda } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';
import { IndicadorRelevancia } from './Relevancia';
import { TituloDestacado } from './TituloDestacado';

const ROTULO = 'text-xs text-ink-muted';

/**
 * Card largo da vista Lista: título descritivo com destaque, órgão, município/UF, valor, modalidade, prazo, publicação,
 * relevância com explicação (com termo) e "Suspensa". O título é o link (a área toda do card abre o edital);
 * o "?" da relevância fica por cima. Sem prefetch: cada edital aberto conta no limite do dia.
 */
export function CardLista({ edital: e, agora }: { edital: EditalResumo; agora: Date }) {
  const et = etiqueta(e, agora);
  const valor = moeda(e.valor_estimado);
  const { titulo, tipo } = assunto(e.objeto);
  const forma = [modalidadeCurta(e.modalidade_nome), e.srp ? 'Registro de preços' : null].filter(Boolean).join(' · ');
  return (
    <article className="relative flex shrink-0 flex-col gap-2.5 rounded-md border border-line bg-raised p-4 transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
          <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
          {et.texto}
        </span>
        <EtiquetaSituacao situacaoId={e.situacao_id} />
        {tipo ? <span className="rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{tipo}</span> : null}
      </div>
      <h3 className="line-clamp-3 text-[16px] font-bold leading-snug">
        <Link href={`/edital/${e.slug}`} prefetch={false} className="after:absolute after:inset-0 after:rounded-md">
          <TituloDestacado texto={titulo} termos={e.destaques} />
        </Link>
      </h3>
      <p className="text-[13px] text-ink-muted">
        {nomeProprio(e.orgao_nome)} · {e.municipio_nome ?? 'Município não informado'}/{e.uf}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <div>
          <dt className={ROTULO}>Valor estimado</dt>
          <dd className="font-mono font-medium">{valor ?? 'Valor não informado'}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Modalidade</dt>
          <dd>{forma || 'Não informada'}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Propostas até</dt>
          <dd className="font-mono">{dataHora(e.encerramento_em)}</dd>
        </div>
        <div>
          <dt className={ROTULO}>Publicado em</dt>
          <dd className="font-mono">{e.publicada_em ? data(e.publicada_em) : 'Não informado'}</dd>
        </div>
      </dl>
      {e.relevancia ? (
        <div className="relative z-10 w-fit">
          <IndicadorRelevancia relevancia={e.relevancia} />
        </div>
      ) : null}
    </article>
  );
}
```

Crie `components/inicio/EstadoVazio.tsx`:
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { paraParametros } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { FiltrosTela } from '@/lib/tipos';
import { descreverVazio, escolherSugestoes, sugestoesVazio } from '@/lib/vazio';

type Props = { filtros: FiltrosTela; aoAplicar: (f: FiltrosTela) => void };

async function contar(f: FiltrosTela): Promise<number | null> {
  try {
    const r = await fetch(`/api/contagem?${paraParametros(f)}`);
    if (!r.ok) return null;
    const corpo = (await r.json()) as { total?: unknown };
    return typeof corpo.total === 'number' ? corpo.total : null;
  } catch {
    return null;
  }
}

/** Lista vazia: diz o que foi buscado e propõe outras buscas que trazem editais (com o número, por /api/contagem). */
export function EstadoVazio({ filtros, aoAplicar }: Props) {
  const candidatas = useMemo(() => sugestoesVazio(filtros), [filtros]);
  const [totais, setTotais] = useState<Array<number | null> | null>(null);
  useEffect(() => {
    let valendo = true;
    setTotais(null);
    void Promise.all(candidatas.map(contar)).then((t) => {
      if (valendo) setTotais(t);
    });
    return () => {
      valendo = false;
    };
  }, [candidatas]);
  const boas = totais ? escolherSugestoes(candidatas, totais) : [];
  return (
    <div className="flex flex-col gap-3 px-2 py-6">
      <p className="font-semibold">{descreverVazio(filtros)}</p>
      {totais === null && candidatas.length > 0 ? <p className="text-sm text-ink-muted">Procurando sugestões…</p> : null}
      {boas.length > 0 ? (
        <>
          <p className="text-sm text-ink-muted">Experimente:</p>
          <ul className="flex flex-col gap-2">
            {boas.map((s) => (
              <li key={s.rotulo}>
                <button
                  type="button"
                  onClick={() => aoAplicar(s.filtros)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-line-strong bg-raised px-3 text-left text-sm font-semibold hover:bg-sunken"
                >
                  <span>{s.rotulo}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">
                    {numero(s.total)} {s.total === 1 ? 'edital' : 'editais'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : totais !== null ? (
        <p className="text-sm text-ink-muted">Tente outro termo ou tire um filtro.</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Verificar e commitar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (os componentes ainda não são usados; o typecheck cobre todos).
```bash
git add lib/paginacao.ts lib/paginacao.test.ts lib/vazio.ts lib/vazio.test.ts components/EtiquetaSituacao.tsx components/inicio/Relevancia.tsx components/inicio/TituloDestacado.tsx components/inicio/Paginacao.tsx components/inicio/SeletorOrdem.tsx components/inicio/CardLista.tsx components/inicio/EstadoVazio.tsx scripts/prefetch-edital.test.ts
git commit -m "feat: peças da lista (paginação, ordem, relevância, destaque, situação, card largo e estado vazio)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8: Lista ligada: ordenação, paginação, estado vazio, suspensa e relevância nos cards

**Files:**
- Modify: `components/inicio/ColunaLista.tsx` (arquivo inteiro), `components/Explorador.tsx`, `components/inicio/CardCompacto.tsx`, `components/inicio/CartaoSelecionado.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: Task 5 (`EstadoTela`, `urlDaBusca(f, estado)`, `paraParametros(f, { pagina, ordem })`, `ordemEfetiva`), Task 7 (componentes), `temTermo` (Task 1).
- Produces:
  - `Explorador` recebe `estadoInicial: EstadoTela` (no lugar de `telaInicial`) e guarda `vista`, `pagina`, `ordem`; tudo vai ao endereço por `escreverEndereco` (que chama `trocarEndereco`).
  - `ColunaLista` com as props `vista?: Vista` (padrão `'mapa'`), `filtros`, `pagina`, `ordem` (efetiva), `temTermo`, `aoMudarOrdem`, `aoIrPagina`, `aoAplicar` (sem `seteDias`, `cidade`, `raio`, `carregandoMais`, `aoCarregarMais`).
  - "Carregar mais" sai; mudar de página ou de ordem pede `/api/busca` com `pagina`/`ordem` (mesma chave: não conta) e não grava o evento `busca`.

- [ ] **Step 1: `ColunaLista` (arquivo inteiro)**

Substitua `components/inicio/ColunaLista.tsx` por:
```tsx
'use client';

import { useEffect, useState, type RefObject } from 'react';
import { CartaoLimite } from '@/components/CartaoLimite';
import { moedaCurta, numero } from '@/lib/formato';
import type { Limite } from '@/lib/limites';
import type { Painel } from '@/lib/painel';
import type { Cidade, EditalResumo, FiltrosTela, Ordem, ResultadoBusca } from '@/lib/tipos';
import type { Vista } from '@/lib/urlBusca';
import { BotaoExportar } from './BotaoExportar';
import { CardCompacto } from './CardCompacto';
import { CardLista } from './CardLista';
import { EstadoVazio } from './EstadoVazio';
import { Paginacao } from './Paginacao';
import { SeletorOrdem } from './SeletorOrdem';

type Props = {
  resultado: ResultadoBusca;
  agora: Date;
  painel: Painel;
  /** Falso enquanto os pontos do mapa não chegaram: o resumo (UFs, valor) ainda não é verdadeiro. */
  painelPronto?: boolean;
  /** Lista: cards largos (vista Lista). Mapa: cards compactos na coluna da esquerda (vista Mapa). */
  vista?: Vista;
  /** Filtros aplicados (cidade e prazo aparecem aqui; o estado vazio propõe outras buscas a partir deles). */
  filtros: FiltrosTela;
  selecionadoId: string | null;
  carregandoLista: boolean;
  erro: string | null;
  /** Busca nova além das 3 do dia: no lugar da lista, o cartão dos planos. */
  limite: Limite | null;
  pagina: number;
  /** Ordem que vale agora (ordemEfetiva). */
  ordem: Ordem;
  temTermo: boolean;
  /** Parâmetros da busca atual (os mesmos de /api/busca, com a ordem), para o botão Exportar. */
  parametrosBusca: string;
  /** Área que rola a partir de lg (a página guarda a posição para voltar do edital no mesmo lugar). No celular rola a página. */
  listaRef: RefObject<HTMLDivElement | null>;
  aoRolar: (topo: number) => void;
  aoTirarCidade: () => void;
  aoSelecionar: (e: EditalResumo) => void;
  aoMudarPrazo: (seteDias: boolean) => void;
  aoMudarOrdem: (o: Ordem) => void;
  aoIrPagina: (pagina: number) => void;
  /** Sugestão do estado vazio: outra busca (conta como busca nova). */
  aoAplicar: (f: FiltrosTela) => void;
};

const ALTERNADOR = 'h-8 flex-1 rounded-sm text-[13px] font-semibold transition-colors';

/** Celular: o município escolhido (com o raio), com o × para tirar; no computador ele aparece nos chips. */
function PilulaCidade({ cidade, raio, aoTirar }: { cidade: Cidade; raio: number | null; aoTirar: () => void }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-ink pl-2 text-xs font-semibold text-surface lg:hidden">
      <span className="truncate">
        {cidade.nome}/{cidade.uf}
        {raio ? ` + ${raio} km` : ''}
      </span>
      {/* 24 px visíveis, 44 px de toque (a área invisível passa 10 px de cada lado). */}
      <button
        type="button"
        onClick={aoTirar}
        aria-label="Tirar filtro de cidade"
        className="relative size-6 shrink-0 text-base leading-none after:absolute after:-inset-2.5"
      >
        ×
      </button>
    </span>
  );
}

/**
 * Contagem, resumo, prazo, ordem, Exportar, os cards e a paginação. A partir de lg rola por dentro;
 * no celular fica no fluxo da página (quem rola é a página).
 */
export function ColunaLista(p: Props) {
  const { total, editais } = p.resultado;
  const vista = p.vista ?? 'mapa';
  const { cidade, raio, seteDias } = p.filtros;
  const painelPronto = p.painelPronto ?? true;
  const [erroExportar, setErroExportar] = useState<string | null>(null);
  // Toda busca nova e toda troca de página ou de ordem volta ao topo da lista.
  // O erro da exportação é da busca em que ocorreu: some quando a busca muda.
  useEffect(() => setErroExportar(null), [p.parametrosBusca]);
  useEffect(() => {
    if (p.carregandoLista) p.listaRef.current?.scrollTo({ top: 0 });
  }, [p.carregandoLista, p.listaRef]);

  if (p.limite) {
    return (
      <div className="flex flex-col p-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {/* Celular: o município fica à mão acima do cartão (tirar o filtro pode voltar a uma busca já feita hoje). */}
        {cidade ? (
          <div className="mb-3 flex lg:hidden">
            <PilulaCidade cidade={cidade} raio={raio} aoTirar={p.aoTirarCidade} />
          </div>
        ) : null}
        <CartaoLimite tipo={p.limite.tipo} />
      </div>
    );
  }

  const valor = moedaCurta(p.painel.valorTotal);
  const vazia = editais.length === 0 && !p.carregandoLista && !p.erro;
  return (
    <>
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <p aria-live="polite" className="flex shrink-0 items-baseline gap-2">
            <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] lg:text-[34px]">
              {p.carregandoLista && editais.length === 0 ? '…' : numero(total)}
            </span>
            <span className="text-[15px] font-bold">{total === 1 ? 'edital aberto' : 'editais abertos'}</span>
          </p>
          {cidade ? <PilulaCidade cidade={cidade} raio={raio} aoTirar={p.aoTirarCidade} /> : null}
          <span className="ml-auto">
            <BotaoExportar parametros={p.parametrosBusca} total={total} aoErro={setErroExportar} />
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {painelPronto
            ? `${p.painel.ufs} ${p.painel.ufs === 1 ? 'UF' : 'UFs'} · ${valor ? `${valor} em valor estimado` : 'valor não informado'}`
            : 'Carregando o resumo…'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 gap-1 rounded-md bg-sunken p-1" role="group" aria-label="Prazo">
            <button
              type="button"
              aria-pressed={!seteDias}
              onClick={() => p.aoMudarPrazo(false)}
              className={`${ALTERNADOR} ${!seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Todos abertos
            </button>
            <button
              type="button"
              aria-pressed={seteDias}
              onClick={() => p.aoMudarPrazo(true)}
              className={`${ALTERNADOR} ${seteDias ? 'bg-raised shadow-sm' : 'text-ink-muted'}`}
            >
              Encerram em 7 dias
            </button>
          </div>
          <SeletorOrdem ordem={p.ordem} temTermo={p.temTermo} aoMudar={p.aoMudarOrdem} />
        </div>
      </div>
      <div className="mt-3 flex flex-col lg:min-h-0 lg:flex-1">
        {vista === 'mapa' ? (
          <p className="mb-3 shrink-0 font-mono text-[11px] text-ink-muted lg:hidden">
            Editais abertos de todo o Brasil · o ponto é a sede do órgão, não o local de entrega
          </p>
        ) : null}
        {p.erro ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{p.erro}</p> : null}
        {erroExportar ? <p role="alert" className="mb-3 shrink-0 rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{erroExportar}</p> : null}
        <div
          ref={p.listaRef}
          onScroll={(e) => p.aoRolar(e.currentTarget.scrollTop)}
          aria-busy={p.carregandoLista}
          className={`flex flex-col ${vista === 'lista' ? 'gap-3' : 'gap-2.5'} p-1 transition-opacity lg:min-h-0 lg:flex-1 lg:overflow-y-auto ${p.carregandoLista ? 'opacity-60' : ''}`}
        >
          {vazia && total > 0 ? (
            <div className="flex flex-col items-start gap-2 px-2 py-6">
              <p className="text-ink-muted">Esta página não tem editais.</p>
              <button type="button" onClick={() => p.aoIrPagina(1)} className="h-11 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold">
                Ir para a página 1
              </button>
            </div>
          ) : null}
          {vazia && total === 0 ? <EstadoVazio filtros={p.filtros} aoAplicar={p.aoAplicar} /> : null}
          {editais.map((e) =>
            vista === 'lista' ? (
              <CardLista key={e.id} edital={e} agora={p.agora} />
            ) : (
              <CardCompacto key={e.id} edital={e} agora={p.agora} selecionado={e.id === p.selecionadoId} aoSelecionar={() => p.aoSelecionar(e)} />
            ),
          )}
          <Paginacao pagina={p.pagina} total={total} carregando={p.carregandoLista} aoIr={p.aoIrPagina} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: `Explorador` com página e ordem**

Em `components/Explorador.tsx`:
1. Imports: troque `import { buscaDoCampo, filtrosAtivos, normalizarTela, paraParametros, POR_PAGINA, recursosUsados } from '@/lib/filtros';` por `import { buscaDoCampo, filtrosAtivos, normalizarTela, ordemEfetiva, paraParametros, recursosUsados } from '@/lib/filtros';`; troque `import type { Cidade, EditalResumo, FiltrosTela, PontoMapa, ResultadoBusca } from '@/lib/tipos';` por `import type { Cidade, EditalResumo, FiltrosTela, Ordem, PontoMapa, ResultadoBusca } from '@/lib/tipos';`; troque `import { mesmaBusca, telaPelaRolagem, urlDaBusca, type Tela } from '@/lib/urlBusca';` por `import { mesmaBusca, telaPelaRolagem, urlDaBusca, type EstadoTela, type Tela, type Vista } from '@/lib/urlBusca';`; acrescente `import { temTermo } from '@/lib/relevancia/termos';` depois do import de `@/lib/painel`.
2. Em `type Props`, troque `telaInicial: Tela;` por:
```ts
  /** Vista, parte do celular, página e ordem lidas do endereço. */
  estadoInicial: EstadoTela;
```
e, na assinatura, `export function Explorador({ filtrosIniciais, telaInicial, inicial, limiteInicial, agoraInicial, atualizadoEm }: Props) {` por `export function Explorador({ filtrosIniciais, estadoInicial, inicial, limiteInicial, agoraInicial, atualizadoEm }: Props) {`.
3. Troque `const [tela, setTela] = useState<Tela>(telaInicial);` por:
```ts
  const [tela, setTela] = useState<Tela>(estadoInicial.tela);
  // Lista ou Mapa, página e ordem da lista: vão no endereço e não contam como busca.
  const [vista, setVista] = useState<Vista>(estadoInicial.vista);
  const [pagina, setPagina] = useState(estadoInicial.pagina);
  const [ordem, setOrdem] = useState<Ordem | null>(estadoInicial.ordem);
```
troque `const [ativoBarra, setAtivoBarra] = useState<Tela>(telaInicial);` por `const [ativoBarra, setAtivoBarra] = useState<Tela>(estadoInicial.tela);` e apague a linha `const [carregandoMais, setCarregandoMais] = useState(false);`.
4. Logo depois de `const ignorarRolagemAte = useRef(0);`, acrescente:
```ts
  // O que vai no endereço além dos filtros (vista, tela, página, ordem), sempre o mais recente (callbacks antigos leem daqui).
  const estadoAtual = useRef<EstadoTela>(estadoInicial);
  /** Escreve a busca no endereço com o estado atual mais as mudanças (sem recarregar nem criar entrada no histórico). */
  const escreverEndereco = useCallback((f: FiltrosTela, mudancas: Partial<EstadoTela> = {}) => {
    estadoAtual.current = { ...estadoAtual.current, ...mudancas };
    trocarEndereco(urlDaBusca(f, estadoAtual.current));
  }, []);
```
5. Logo depois de `const selecionado = …;`, acrescente `const comTermo = temTermo(filtros.q);`.
6. Troque a função `trocarTela` inteira por:
```ts
  /** Troca a tela do celular e escreve a busca no endereço (sem recarregar a página nem criar entrada no histórico). */
  const trocarTela = useCallback(
    (nova: Tela, f: FiltrosTela) => {
      setTela(nova);
      escreverEndereco(f, { tela: nova });
    },
    [escreverEndereco],
  );
```
7. Em `carregarLista`, troque `async (f: FiltrosTela) => {` por `async (f: FiltrosTela, lista: { pagina?: number; ordem?: Ordem | null } = {}) => {`, apague a linha `setCarregandoMais(false);` e troque `` const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f)}`, ERRO_LISTA); `` por:
```ts
        // Mesma busca em outra página ou ordem: mesma chave no limite do dia (não conta de novo).
        const ordemPedida = lista.ordem === undefined ? estadoAtual.current.ordem : lista.ordem;
        const novo = await obter<RespostaBusca>(`/api/busca?${paraParametros(f, { pagina: lista.pagina ?? 1, ordem: ordemPedida })}`, ERRO_LISTA);
```
8. No efeito de montagem: logo depois de `setTela(volta.tela);` acrescente `estadoAtual.current = { ...estadoAtual.current, tela: volta.tela };`; troque `trocarEndereco(urlDaBusca(filtrosIniciais, { vista: 'mapa', tela: telaInicial }));` por `trocarEndereco(urlDaBusca(filtrosIniciais, estadoInicial));`; troque `if (telaInicial === 'lista') rolarPara('lista', 'auto');` por `if (estadoInicial.tela === 'lista') rolarPara('lista', 'auto');`; troque `endereco: urlDaBusca(atual.filtros, { vista: 'mapa', tela: atual.tela }),` por `endereco: urlDaBusca(atual.filtros, { ...estadoAtual.current, tela: atual.tela }),`; e nas listas de dependências deste efeito e do `useLayoutEffect` acima dele troque `telaInicial` por `estadoInicial`.
9. Em `aplicar`, logo depois de `setAnimarFoco(true);`, acrescente:
```ts
    // Filtro novo começa na página 1 (a ordem escolhida fica).
    setPagina(1);
    estadoAtual.current = { ...estadoAtual.current, pagina: 1 };
```
10. Troque a função `carregarMais` inteira por:
```ts
  /** Outra página da mesma busca: não conta como busca nem grava o evento "busca"; o mapa não muda. */
  function irParaPagina(n: number) {
    if (n === pagina || carregandoLista) return;
    setPagina(n);
    escreverEndereco(filtros, { pagina: n });
    // Celular: a lista rola com a página; volta ao começo dela.
    if (ehCelular()) inicioLista.current?.scrollIntoView({ block: 'start', behavior: comportamento() });
    void carregarLista(filtros, { pagina: n });
  }

  /** Outra ordem da mesma busca: volta à página 1; não conta como busca. */
  function mudarOrdem(o: Ordem) {
    setOrdem(o);
    setPagina(1);
    escreverEndereco(filtros, { ordem: o, pagina: 1 });
    void carregarLista(filtros, { pagina: 1, ordem: o });
  }
```
11. Troque o bloco `<ColunaLista … />` inteiro por:
```tsx
          <ColunaLista
            resultado={resultado}
            agora={agora}
            painel={painel}
            painelPronto={pontosProntos}
            filtros={filtros}
            selecionadoId={selecionado?.id ?? null}
            carregandoLista={carregandoLista}
            erro={erroLista}
            limite={limite}
            pagina={pagina}
            ordem={ordemEfetiva(ordem, comTermo)}
            temTermo={comTermo}
            parametrosBusca={paraParametros(filtros, { ordem }).toString()}
            listaRef={listaRef}
            aoRolar={(topo) => {
              rolagem.current = topo;
            }}
            aoTirarCidade={() => aplicar({ ...filtros, cidade: null })}
            aoSelecionar={selecionar}
            aoMudarPrazo={(seteDias) => aplicar({ ...filtros, seteDias })}
            aoMudarOrdem={mudarOrdem}
            aoIrPagina={irParaPagina}
            aoAplicar={(f) => aplicar(f)}
          />
```
(`vista` e `setVista` são usados na Task 9.)

- [ ] **Step 3: Cards e resumo com situação e relevância**

Em `components/inicio/CardCompacto.tsx`:
1. Depois de `import type { EditalResumo } from '@/lib/tipos';`, acrescente:
```ts
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { PilulaRelevancia } from './Relevancia';
import { TituloDestacado } from './TituloDestacado';
```
2. Troque `<span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>` por
```tsx
        <span className="line-clamp-3 text-[14px] font-semibold leading-5">
          <TituloDestacado texto={titulo} termos={edital.destaques} />
        </span>
```
3. Troque o último `<span className={`inline-flex w-fit items-center gap-1.5 …`}>…{et.texto}</span>` (a etiqueta de prazo) por:
```tsx
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
          <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
          {et.texto}
        </span>
        <EtiquetaSituacao situacaoId={edital.situacao_id} />
        {edital.relevancia ? <PilulaRelevancia relevancia={edital.relevancia} /> : null}
      </span>
```

Em `components/inicio/CartaoSelecionado.tsx`:
1. Depois de `import { PinoMini } from './Icones';`, acrescente:
```ts
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { PilulaRelevancia } from './Relevancia';
```
2. Troque `<h2 className="pr-6 text-[17px] font-bold leading-snug">{assunto(e.objeto).titulo}</h2>` por:
```tsx
      <h2 className="pr-6 text-[17px] font-bold leading-snug">{assunto(e.objeto).titulo}</h2>
      <EtiquetaSituacao situacaoId={e.situacao_id} />
      {e.relevancia ? (
        <div className="flex flex-col gap-1">
          <PilulaRelevancia relevancia={e.relevancia} />
          {e.relevancia.explicacao ? <p className="text-[13px] text-[#c7d6d3]">{e.relevancia.explicacao}</p> : null}
        </div>
      ) : null}
```

- [ ] **Step 4: Página inicial com o estado do endereço**

Em `app/page.tsx`:
1. Troque
```ts
  const { busca, estado } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));
  // Até a vista Lista existir (Task 9), a página inicial é a de hoje (vista Mapa).
  const tela = estado.tela;
```
por `const { busca, estado } = lerBuscaDaUrl(paraUrlSearchParams(await searchParams));`.
2. Troque `const daLista = lerFiltros(paraParametros(filtros));` por:
```ts
  // Página e ordem vêm do endereço e não mudam a chave do limite (a mesma busca em outra página não conta de novo).
  const daLista = lerFiltros(paraParametros(filtros, { pagina: estado.pagina, ordem: estado.ordem }));
```
3. Troque `` key={`${urlDaBusca(filtros, { vista: 'mapa', tela })}@${agora}`} `` por `` key={`${urlDaBusca(filtros, estado)}@${agora}`} `` e `telaInicial={tela}` por `estadoInicial={estado}`.

- [ ] **Step 5: Verificar e commitar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (guardas de `scripts/celular.test.ts` incluídas: a coluna não rola por dentro abaixo de lg).
```bash
git add components/inicio/ColunaLista.tsx components/Explorador.tsx components/inicio/CardCompacto.tsx components/inicio/CartaoSelecionado.tsx app/page.tsx
git commit -m "feat: lista com ordenação, paginação numerada, estado vazio, suspensa e relevância nos cards" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 9: Alternador Lista | Mapa, vista larga e celular

**Files:**
- Create: `components/inicio/AlternadorVista.tsx`
- Modify: `components/Explorador.tsx`, `components/BarraCelular.tsx` (comentários)
- Test: `scripts/celular.test.ts`

**Interfaces:**
- Consumes: Task 8 (`vista`, `setVista`, `escreverEndereco`, `estadoAtual`, `irPara`, `rolarPara`), `ColunaLista` com `vista` (Task 8), `comTela` (Task 5), `IconeLista`, `IconeMapa` (`components/inicio/Icones.tsx`).
- Produces:
  - `<AlternadorVista vista aoMudar />` (Lista primeiro; `aria-pressed`; 44 px no celular).
  - Explorador: `mudarVista(v: Vista)` (não busca de novo, não conta, escreve `vista` por `trocarEndereco`), `aoBarra(t: Tela)` (barra do celular: Mapa → vista Mapa no topo; Lista → vista Lista). Vista Lista: coluna larga com `CardLista` e, no computador, "Onde mais compram" à direita; vista Mapa: a tela de hoje sem nenhuma mudança no `Mapa`.

- [ ] **Step 1: Guardas (falhando)**

Acrescente dentro do `describe('celular', ...)` de `scripts/celular.test.ts`:
```ts
  it('alternador Lista | Mapa no topo dos resultados; o mapa só existe na vista Mapa', () => {
    const explorador = ler('components/Explorador.tsx');
    expect(explorador).toContain('<AlternadorVista vista={vista} aoMudar={mudarVista} />');
    expect(explorador).toMatch(/\{naLista \? null : \(\s*<section aria-label="Mapa"/);
    expect(explorador).toContain("lg:grid-cols-[minmax(0,1fr)_300px]");
    const alternador = ler('components/inicio/AlternadorVista.tsx');
    expect(alternador.indexOf("'lista'")).toBeLessThan(alternador.indexOf("'mapa'"));
    expect(alternador).toContain('aria-pressed');
    expect(alternador).toContain('h-11');
  });

  it('vista, página e ordem só entram no endereço por trocarEndereco', () => {
    for (const f of ['components/Explorador.tsx', 'components/inicio/ColunaLista.tsx', 'components/inicio/AlternadorVista.tsx', 'components/inicio/Paginacao.tsx']) {
      expect(ler(f)).not.toContain('history.replaceState');
      expect(ler(f)).not.toContain('history.pushState');
    }
    expect(ler('components/Explorador.tsx')).toContain('trocarEndereco(urlDaBusca(f, estadoAtual.current))');
  });
```

Run: `npx vitest run scripts/celular.test.ts`
Expected: FAIL (alternador não existe).

- [ ] **Step 2: Alternador**

Crie `components/inicio/AlternadorVista.tsx`:
```tsx
'use client';

import type { Vista } from '@/lib/urlBusca';
import { IconeLista, IconeMapa } from './Icones';

const OPCOES: ReadonlyArray<{ vista: Vista; rotulo: string }> = [
  { vista: 'lista', rotulo: 'Lista' },
  { vista: 'mapa', rotulo: 'Mapa' },
];

/** Lista | Mapa no topo dos resultados (computador e celular). Trocar não busca de novo nem conta como busca. */
export function AlternadorVista({ vista, aoMudar }: { vista: Vista; aoMudar: (v: Vista) => void }) {
  return (
    <div role="group" aria-label="Ver resultados em" className="flex w-full gap-1 rounded-md bg-sunken p-1 lg:w-auto">
      {OPCOES.map((o) => (
        <button
          key={o.vista}
          type="button"
          aria-pressed={vista === o.vista}
          onClick={() => {
            if (vista !== o.vista) aoMudar(o.vista);
          }}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold lg:h-9 lg:flex-none ${
            vista === o.vista ? 'bg-raised shadow-sm' : 'text-ink-muted'
          }`}
        >
          {o.vista === 'lista' ? <IconeLista className="size-4" /> : <IconeMapa className="size-4" />}
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Explorador com as duas vistas**

Em `components/Explorador.tsx`:
1. Depois de `import { BuscaPrincipal } from './inicio/BuscaPrincipal';`, acrescente `import { AlternadorVista } from './inicio/AlternadorVista';`.
2. Troque `const [ativoBarra, setAtivoBarra] = useState<Tela>(estadoInicial.tela);` por `const [ativoBarra, setAtivoBarra] = useState<Tela>(estadoInicial.vista === 'lista' ? 'lista' : estadoInicial.tela);`.
3. Logo depois de `const comTermo = temTermo(filtros.q);`, acrescente `const naLista = vista === 'lista';`.
4. No efeito de montagem, troque `setAtivoBarra(volta.tela);` por `setAtivoBarra(estadoAtual.current.vista === 'lista' ? 'lista' : volta.tela);`.
5. Depois da função `selecionar`, acrescente:
```ts
  /** Lista | Mapa: só troca a tela (os pontos do mapa já estão carregados) e escreve a vista no endereço. Não conta. */
  function mudarVista(v: Vista) {
    if (v === vista) return;
    setVista(v);
    // Na Lista a "tela" do celular não existe; no Mapa a página começa no mapa.
    setTela('mapa');
    escreverEndereco(filtros, { vista: v, tela: 'mapa' });
    setAtivoBarra(v === 'lista' ? 'lista' : 'mapa');
    if (ehCelular()) window.scrollTo({ top: 0 });
  }

  /** Barra do celular: Mapa leva à vista Mapa (no topo); Lista leva à vista Lista (no começo da lista). */
  function aoBarra(t: Tela) {
    if (t === 'mapa') {
      if (vista !== 'mapa') mudarVista('mapa');
      irPara('mapa', filtros);
    } else if (vista !== 'lista') {
      mudarVista('lista');
    } else {
      setAtivoBarra('lista');
      rolarPara('lista');
    }
  }
```
6. No JSX, logo depois do bloco
```tsx
        <div className="hidden lg:block">
          <Chips filtros={filtros} pontos={pontos} atualizadoEm={atualizadoEm} agora={agora} aoMudar={aplicar} />
        </div>
```
acrescente:
```tsx
        {/* Lista | Mapa no topo dos resultados, nas duas larguras (vai no endereço e não conta como busca). */}
        <div className="mt-3 flex lg:mt-0 lg:justify-end">
          <AlternadorVista vista={vista} aoMudar={mudarVista} />
        </div>
```
7. Troque a abertura do `<main …>` e o `<h1>` por:
```tsx
      <main
        className={`flex flex-col pt-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:px-6 lg:pb-6 lg:pt-4 ${
          naLista ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : 'lg:grid-cols-[360px_minmax(0,1fr)_300px]'
        }`}
      >
        <h1 className="sr-only">{naLista ? 'Editais abertos' : 'Editais abertos no mapa'}</h1>
```
8. No `<ColunaLista`, acrescente a prop `vista={vista}` (logo depois de `painelPronto={pontosProntos}`).
9. Troque o bloco da seção do mapa (do comentário `{/* Celular: primeiro na página, com 58svh … */}` até o `</section>` dela) por:
```tsx
        {/* Vista Mapa. Celular: primeiro na página, com 58svh (pinça e um dedo mexem no mapa; fora dele, arrastar rola a página). */}
        {naLista ? null : (
          <section aria-label="Mapa" className="relative order-first h-[58svh] min-h-0 shrink-0 overflow-hidden bg-raised lg:order-none lg:h-auto lg:rounded-lg lg:border lg:border-line">
            <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} sede={sedeMapa} animarFoco={animarFoco} />
            {/* No celular a observação fica embaixo do mapa, no começo da lista. */}
            <p className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-sm bg-raised/85 px-2 py-1 text-xs text-ink-muted lg:block">
              O ponto é a sede do órgão, não o local de entrega.
            </p>
            {erroMapa ? (
              <p role="alert" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-sm bg-pin-soft px-3 py-2 text-xs text-pin-strong">
                {erroMapa}
              </p>
            ) : null}
          </section>
        )}
```
10. No `<aside …>`, troque `{selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}` por `{!naLista && selecionado ? <CartaoSelecionado edital={selecionado} agora={agora} /> : null}`.
11. Troque `<BarraCelular ativo={ativoBarra} aoTrocarTela={(t) => irPara(t, filtros)} />` por `<BarraCelular ativo={ativoBarra} aoTrocarTela={aoBarra} />`.

Em `components/BarraCelular.tsx`, troque os comentários `/** Só na página inicial: Mapa e Lista rolam a própria página (Mapa ao topo, Lista ao início da lista). */` por `/** Só na página inicial: Mapa leva à vista Mapa (no topo); Lista, à vista Lista. */` e `// Fora da página inicial, Mapa e Lista voltam para a última busca feita (guardada pela página inicial): Mapa no topo,` + `// Lista já rolada até a lista.` por `// Fora da página inicial, Mapa e Lista voltam para a última busca feita (guardada pela página inicial),` + `// na vista Mapa ou na vista Lista (comTela).`.

- [ ] **Step 4: Verificar e commitar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (inclusive as guardas antigas de `scripts/celular.test.ts`: mapa com `order-first`, `h-[58svh]`, lista sem `fixed`/`absolute`, `scrollIntoView`).
```bash
git add components/inicio/AlternadorVista.tsx components/Explorador.tsx components/BarraCelular.tsx scripts/celular.test.ts
git commit -m "feat: alternador Lista | Mapa no endereço (padrão Lista), vista larga e barra do celular" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10: Página do edital (resumo, informações principais, situação, Compartilhar, link oficial sempre)

**Files:**
- Create: `lib/resumoEdital.ts`, `lib/resumoEdital.test.ts`, `lib/compartilhar.ts`, `lib/compartilhar.test.ts`, `components/edital/ResumoOportunidade.tsx`, `components/edital/FichaEdital.tsx`, `components/edital/BotaoCompartilhar.tsx`, `scripts/edital.test.ts`
- Modify: `app/edital/[slug]/page.tsx` (arquivo inteiro), `components/edital/PrincipaisInformacoes.tsx`

**Interfaces:**
- Consumes: `Edital` com `situacao_id`, `atualizada_pncp_em` (Task 6); `avisoSituacao` (Task 3); `EtiquetaSituacao` (Task 7); `assunto`, `nomeProprio`, `textoLimpo` (`lib/texto.ts`); `moeda`, `data`, `hora`, `dataHora`, `prazo`, `linkOficial` (`lib/formato.ts`); `modalidadeCurta`, `criterioTexto`, `textoMeEpp` (`lib/participacao.ts`); `atualizadoEm()` (consultas).
- Produces:
  - `NAO_INFORMADO = 'não informado pelo órgão'`; `comPreposicao(orgao: string): string`; `minusculaInicial(t: string): string`; `resumoOportunidade(e: Edital): string[]`.
  - `type ModoCompartilhar = 'nativo' | 'copiar' | 'mostrar'`; `modoCompartilhar(a: { temShare: boolean; celular: boolean; temCopiar: boolean }): ModoCompartilhar`; `LINK_COPIADO = 'Link copiado'`; `linkDoEdital(origem: string, slug: string): string`.
  - `<ResumoOportunidade frases />`, `<FichaEdital edital agora atualizadoEm />`, `<BotaoCompartilhar titulo slug />`.
  - Página: "Abrir edital oficial" (cabeçalho e barra fixa do celular) e "Compartilhar" fora do bloqueio; etiqueta e aviso de situação no cabeçalho; resumo e informações principais dentro do bloco liberado.

- [ ] **Step 1: Testes (falhando)**

Crie `lib/resumoEdital.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { data, hora, moeda } from './formato';
import { comPreposicao, minusculaInicial, NAO_INFORMADO, resumoOportunidade } from './resumoEdital';
import { assunto } from './texto';
import type { Edital } from './tipos';

const E: Edital = {
  id: '83102244000102-1-000077/2026', slug: '83102244000102-2026-77', cnpj: '83102244000102', ano: 2026, sequencial: 77,
  objeto: 'Aquisição de luvas nitrílicas para a Secretaria de Saúde', info_complementar: null, orgao_nome: 'MUNICIPIO DE JOINVILLE',
  unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', modalidade_nome: 'Pregão - Eletrônico',
  situacao_id: 1, situacao_nome: 'Divulgada no PNCP', esfera: 'M', srp: false, valor_estimado: 12500,
  publicada_em: '2026-10-10T12:00:00Z', abertura_em: null, encerramento_em: '2026-10-25T13:00:00Z', link_origem: null,
  atualizada_pncp_em: '2026-10-11T12:00:00Z',
};

describe('resumoOportunidade (só com os campos que existem)', () => {
  it('com todos os dados: as quatro frases da spec', () => {
    expect(resumoOportunidade(E)).toEqual([
      `Este edital trata de ${minusculaInicial(assunto(E.objeto).titulo)}, do Municipio de Joinville (Joinville/SC).`,
      'Modalidade: Pregão eletrônico.',
      `Valor estimado: ${moeda(12500)}.`,
      `As propostas podem ser enviadas até ${data(E.encerramento_em!)}, às ${hora(E.encerramento_em!)}.`,
    ]);
  });
  it('sem valor (nulo ou zero) e sem prazo: "não informado pelo órgão"', () => {
    for (const valor_estimado of [null, 0]) {
      const f = resumoOportunidade({ ...E, valor_estimado, encerramento_em: null });
      expect(f).toContain(`Valor estimado: ${NAO_INFORMADO}.`);
      expect(f).toContain(`Prazo para as propostas: ${NAO_INFORMADO}.`);
    }
  });
  it('sem modalidade a frase sai; sem município fica só a UF', () => {
    const f = resumoOportunidade({ ...E, modalidade_nome: null, municipio_nome: null });
    expect(f).toHaveLength(3);
    expect(f[0]).toMatch(/\(SC\)\.$/);
  });
  it('nunca escreve null nem undefined', () => {
    const f = resumoOportunidade({ ...E, modalidade_nome: null, municipio_nome: null, valor_estimado: null, encerramento_em: null, unidade_nome: null });
    expect(f.join(' ')).not.toMatch(/null|undefined/);
  });
});

describe('comPreposicao', () => {
  it('do ou da conforme o começo do nome do órgão', () => {
    expect(comPreposicao('Município de Joinville')).toBe('do Município de Joinville');
    expect(comPreposicao('Prefeitura Municipal de Itajai')).toBe('da Prefeitura Municipal de Itajai');
    expect(comPreposicao('Secretaria de Estado da Saúde')).toBe('da Secretaria de Estado da Saúde');
    expect(comPreposicao('Fundacao Hospitalar')).toBe('da Fundacao Hospitalar');
    expect(comPreposicao('Fundo Municipal de Saúde')).toBe('do Fundo Municipal de Saúde');
  });
});

describe('minusculaInicial', () => {
  it('minúscula no começo, menos em sigla', () => {
    expect(minusculaInicial('Luvas nitrílicas')).toBe('luvas nitrílicas');
    expect(minusculaInicial('EPIs diversos')).toBe('EPIs diversos');
    expect(minusculaInicial('06 carretas')).toBe('06 carretas');
  });
});
```

Crie `lib/compartilhar.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LINK_COPIADO, linkDoEdital, modoCompartilhar } from './compartilhar';

describe('modoCompartilhar', () => {
  it('celular com Web Share: a folha do sistema', () => {
    expect(modoCompartilhar({ temShare: true, celular: true, temCopiar: true })).toBe('nativo');
  });
  it('computador: copiar o link (mesmo com Web Share)', () => {
    expect(modoCompartilhar({ temShare: true, celular: false, temCopiar: true })).toBe('copiar');
    expect(modoCompartilhar({ temShare: false, celular: true, temCopiar: true })).toBe('copiar');
  });
  it('sem área de transferência: Web Share se houver; senão, mostrar o link', () => {
    expect(modoCompartilhar({ temShare: true, celular: false, temCopiar: false })).toBe('nativo');
    expect(modoCompartilhar({ temShare: false, celular: false, temCopiar: false })).toBe('mostrar');
  });
});

describe('linkDoEdital', () => {
  it('endereço do edital sem parâmetros', () => {
    expect(linkDoEdital('https://edital-map.vercel.app', '83102244000102-2026-77')).toBe('https://edital-map.vercel.app/edital/83102244000102-2026-77');
  });
  it('texto do aviso', () => {
    expect(LINK_COPIADO).toBe('Link copiado');
  });
});
```

Crie `scripts/edital.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('página do edital', () => {
  const pagina = ler('app/edital/[slug]/page.tsx');
  const bloco = pagina.indexOf('{detalhes ? (');
  it('"Abrir edital oficial" e "Compartilhar" não dependem do limite do dia (ficam antes do bloco liberado)', () => {
    expect(bloco).toBeGreaterThan(-1);
    expect(pagina).not.toMatch(/detalhes\s*\?\s*<BotaoEditalOficial/);
    expect(pagina.indexOf('<BotaoEditalOficial')).toBeGreaterThan(-1);
    expect(pagina.indexOf('<BotaoEditalOficial')).toBeLessThan(bloco);
    expect(pagina.indexOf('variante="barra"')).toBeLessThan(bloco);
    expect(pagina.indexOf('<BotaoCompartilhar')).toBeLessThan(bloco);
  });
  it('situação no cabeçalho; resumo e informações principais no bloco liberado', () => {
    expect(pagina.indexOf('avisoSituacao(e.situacao_id)')).toBeLessThan(bloco);
    expect(pagina.indexOf('<EtiquetaSituacao')).toBeLessThan(bloco);
    expect(pagina.indexOf('<ResumoOportunidade')).toBeGreaterThan(bloco);
    expect(pagina.indexOf('<FichaEdital')).toBeGreaterThan(bloco);
  });
});
```

Run: `npx vitest run lib/resumoEdital.test.ts lib/compartilhar.test.ts scripts/edital.test.ts`
Expected: FAIL.

- [ ] **Step 2: Módulos puros**

Crie `lib/resumoEdital.ts`:
```ts
import { data, hora, moeda } from './formato';
import { modalidadeCurta } from './participacao';
import { assunto, nomeProprio } from './texto';
import type { Edital } from './tipos';

export const NAO_INFORMADO = 'não informado pelo órgão';

/** Começos de nome de órgão no feminino (sem acento, minúsculos). O resto leva "do". */
const FEMININOS =
  /^(prefeitura|secretaria|universidade|fundacao|camara|empresa|companhia|policia|assembleia|agencia|defensoria|procuradoria|superintendencia|diretoria|autarquia|controladoria|coordenadoria|escola|faculdade|caixa|base|marinha|forca|junta|justica|ouvidoria|gerencia|unidade|subprefeitura|corregedoria|comissao)(?=\s|$)/;

/** "do Município de Joinville", "da Prefeitura Municipal de Itajaí" (nome já limpo por nomeProprio). */
export function comPreposicao(orgao: string): string {
  const base = orgao.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return `${FEMININOS.test(base) ? 'da' : 'do'} ${orgao}`;
}

/** Primeira letra minúscula para caber no meio da frase, menos quando a primeira palavra é sigla ("EPIs", "UBS"). */
export function minusculaInicial(t: string): string {
  const primeira = t.split(/\s/)[0] ?? '';
  if ((primeira.match(/\p{Lu}/gu) ?? []).length >= 2) return t;
  return t.replace(/^\p{Lu}/u, (l) => l.toLocaleLowerCase('pt-BR'));
}

/**
 * Resumo da oportunidade em linguagem simples, só com campos que existem (sem IA, sem inventar):
 * assunto, órgão e local; modalidade (a frase sai sem ela); valor e prazo (ou "não informado pelo órgão").
 */
export function resumoOportunidade(e: Edital): string[] {
  const local = e.municipio_nome ? `${e.municipio_nome}/${e.uf}` : e.uf;
  const frases = [`Este edital trata de ${minusculaInicial(assunto(e.objeto).titulo)}, ${comPreposicao(nomeProprio(e.orgao_nome))} (${local}).`];
  const modalidade = modalidadeCurta(e.modalidade_nome);
  if (modalidade) frases.push(`Modalidade: ${modalidade}.`);
  frases.push(`Valor estimado: ${moeda(e.valor_estimado) ?? NAO_INFORMADO}.`);
  frases.push(
    e.encerramento_em
      ? `As propostas podem ser enviadas até ${data(e.encerramento_em)}, às ${hora(e.encerramento_em)}.`
      : `Prazo para as propostas: ${NAO_INFORMADO}.`,
  );
  return frases;
}
```

Crie `lib/compartilhar.ts`:
```ts
export type ModoCompartilhar = 'nativo' | 'copiar' | 'mostrar';

/** Celular com Web Share: a folha do sistema. Computador: copiar o link. Sem área de transferência: Web Share ou mostrar o link. */
export function modoCompartilhar(a: { temShare: boolean; celular: boolean; temCopiar: boolean }): ModoCompartilhar {
  if (a.celular && a.temShare) return 'nativo';
  if (a.temCopiar) return 'copiar';
  return a.temShare ? 'nativo' : 'mostrar';
}

export const LINK_COPIADO = 'Link copiado';

/** Endereço do edital para compartilhar: sem parâmetros (?itens=todos) nem âncora. */
export function linkDoEdital(origem: string, slug: string): string {
  return `${origem}/edital/${slug}`;
}
```

Run: `npx vitest run lib/resumoEdital.test.ts lib/compartilhar.test.ts`
Expected: PASS.

- [ ] **Step 3: Componentes do edital**

Crie `components/edital/ResumoOportunidade.tsx`:
```tsx
/** Resumo da oportunidade em linguagem simples (frases de resumoOportunidade). */
export function ResumoOportunidade({ frases }: { frases: string[] }) {
  return (
    <section aria-labelledby="resumo" className="rounded-lg border border-line bg-raised p-5">
      <h2 id="resumo" className="mb-2 text-[17px] font-bold">Resumo da oportunidade</h2>
      <p className="text-[15px] leading-relaxed">{frases.join(' ')}</p>
      <p className="mt-2 text-[13px] text-ink-muted">Montado com os dados publicados pelo órgão no PNCP. As regras valem conforme o edital oficial.</p>
    </section>
  );
}
```

Crie `components/edital/FichaEdital.tsx`:
```tsx
import type { ReactNode } from 'react';
import { dataHora, moeda, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { nomeProprio, textoLimpo } from '@/lib/texto';
import type { Edital } from '@/lib/tipos';

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-4">
      <dt className="text-[13px] font-semibold text-ink-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

const Falta = () => <span className="text-ink-muted">Não informado pelo órgão</span>;

/** Informações principais num bloco só; o que o PNCP não trouxe aparece como "Não informado pelo órgão". */
export function FichaEdital({ edital: e, agora, atualizadoEm }: { edital: Edital; agora: Date; atualizadoEm: string | null }) {
  const valor = moeda(e.valor_estimado);
  const p = prazo(e.encerramento_em, agora);
  const modalidade = modalidadeCurta(e.modalidade_nome);
  return (
    <section aria-labelledby="ficha" className="rounded-lg border border-line bg-raised p-5">
      <h2 id="ficha" className="mb-1 text-[17px] font-bold">Informações principais</h2>
      <dl>
        <Linha rotulo="Objeto">{textoLimpo(e.objeto)}</Linha>
        <Linha rotulo="Órgão">
          {nomeProprio(e.orgao_nome)}
          {e.unidade_nome ? <span className="block text-[13px] text-ink-muted">{nomeProprio(e.unidade_nome)}</span> : null}
        </Linha>
        <Linha rotulo="Município/UF">{e.municipio_nome ? `${e.municipio_nome}/${e.uf}` : <>{e.uf} · <Falta /></>}</Linha>
        <Linha rotulo="Modalidade">
          {modalidade ?? <Falta />}
          {e.srp ? ' · Registro de preços' : ''}
        </Linha>
        <Linha rotulo="Identificador no PNCP">
          <span className="font-mono text-[14px]">{e.id}</span>
        </Linha>
        <Linha rotulo="Valor estimado">{valor ? <span className="font-mono">{valor}</span> : <Falta />}</Linha>
        <Linha rotulo="Publicado no PNCP em">{e.publicada_em ? <span className="font-mono">{dataHora(e.publicada_em)}</span> : <Falta />}</Linha>
        <Linha rotulo="Prazo para propostas">
          {e.encerramento_em ? (
            <>
              <span className="font-mono">{dataHora(e.encerramento_em)}</span> <span className="text-[13px] text-ink-muted">· {p.texto}</span>
            </>
          ) : (
            <Falta />
          )}
        </Linha>
        <Linha rotulo="Situação oficial">{e.situacao_nome ?? <Falta />}</Linha>
        <Linha rotulo="Fonte">PNCP (Portal Nacional de Contratações Públicas)</Linha>
        <Linha rotulo="Última alteração no PNCP">
          {e.atualizada_pncp_em ? <span className="font-mono">{dataHora(e.atualizada_pncp_em)}</span> : <Falta />}
        </Linha>
        <Linha rotulo="Atualizado no Edital Map em">
          {atualizadoEm ? <span className="font-mono">{dataHora(atualizadoEm)}</span> : <span className="text-ink-muted">Sem registro da última atualização</span>}
        </Linha>
      </dl>
    </section>
  );
}
```

Crie `components/edital/BotaoCompartilhar.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { LINK_COPIADO, linkDoEdital, modoCompartilhar } from '@/lib/compartilhar';

/** Compartilhar: folha do sistema no celular; no computador copia o link e avisa "Link copiado". */
export function BotaoCompartilhar({ titulo, slug }: { titulo: string; slug: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function compartilhar() {
    const url = linkDoEdital(window.location.origin, slug);
    const modo = modoCompartilhar({
      temShare: typeof navigator.share === 'function',
      celular: window.matchMedia('(pointer: coarse)').matches,
      temCopiar: typeof navigator.clipboard?.writeText === 'function',
    });
    if (modo === 'nativo') {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // a pessoa fechou a folha: nada a fazer
      }
      return;
    }
    if (modo === 'copiar') {
      try {
        await navigator.clipboard.writeText(url);
        setAviso(LINK_COPIADO);
        return;
      } catch {
        // sem permissão: mostra o link para copiar à mão
      }
    }
    setAviso(`Copie o link: ${url}`);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={compartilhar}
        className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
      >
        Compartilhar
      </button>
      <span
        role="status"
        aria-live="polite"
        className={aviso ? 'absolute left-0 top-full z-20 mt-1 w-max max-w-[80vw] break-all rounded-sm bg-ink px-2 py-1 text-xs text-surface' : 'sr-only'}
      >
        {aviso ?? ''}
      </span>
    </span>
  );
}
```

Em `components/edital/PrincipaisInformacoes.tsx`:
1. Troque
```tsx
          <span className="text-[13px] text-ink-muted">Onde: {sistemaDaDisputa(e.link_origem)}</span>
```
por
```tsx
          <span className="text-[13px] text-ink-muted">Onde: {sistemaDaDisputa(e.link_origem)}</span>
          {criterioTexto(resumo.criterios) ? null : <span className="text-[13px] text-ink-muted">Critério de julgamento: não informado pelo órgão</span>}
```
2. Troque
```tsx
        {meEpp ? (
          <Cartao rotulo="ME/EPP" destaque={resumo.exclusivos > 0 || resumo.cota > 0}>
            <span className="text-[15px] font-semibold">{meEpp}</span>
          </Cartao>
        ) : null}
```
por
```tsx
        {meEpp ? (
          <Cartao rotulo="ME/EPP" destaque={resumo.exclusivos > 0 || resumo.cota > 0}>
            <span className="text-[15px] font-semibold">{meEpp}</span>
          </Cartao>
        ) : (
          <Cartao rotulo="ME/EPP">
            <span className="text-[15px] text-ink-muted">Não informado pelo órgão</span>
          </Cartao>
        )}
```

- [ ] **Step 4: Página do edital (arquivo inteiro)**

Substitua `app/edital/[slug]/page.tsx` por:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BotaoEditalOficial } from '@/components/BotaoEditalOficial';
import { Cabecalho } from '@/components/Cabecalho';
import { CartaoLimite } from '@/components/CartaoLimite';
import { BotaoCompartilhar } from '@/components/edital/BotaoCompartilhar';
import { DocumentosEdital } from '@/components/edital/DocumentosEdital';
import { FichaEdital } from '@/components/edital/FichaEdital';
import { ListaItens } from '@/components/edital/ListaItens';
import { PrincipaisInformacoes } from '@/components/edital/PrincipaisInformacoes';
import { Relacionados } from '@/components/edital/Relacionados';
import { ResumoOportunidade } from '@/components/edital/ResumoOportunidade';
import { TextoRecolhivel } from '@/components/edital/TextoRecolhivel';
import { EtiquetaSituacao } from '@/components/EtiquetaSituacao';
import { TAG_PRAZO, TEXTO_PRAZO } from '@/components/estilosPrazo';
import { FaixaCobertura } from '@/components/FaixaCobertura';
import { RegistrarAbertura } from '@/components/RegistrarAbertura';
import { VitrineEmBreve } from '@/components/VitrineEmBreve';
import { SLUG_EDITAL } from '@/lib/eventos';
import { linkOficial, prazo } from '@/lib/formato';
import { modalidadeCurta } from '@/lib/participacao';
import { resumoOportunidade } from '@/lib/resumoEdital';
import { arquivosDoEdital, atualizadoEm, edital, itensDoEdital, relacionados, resumoItens } from '@/lib/servidor/consultas';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { decidirEdital, usoDoDia } from '@/lib/servidor/uso';
import { avisoSituacao } from '@/lib/situacao';
import { assunto, lotesDaInfo, nomeProprio, paragrafos } from '@/lib/texto';
import type { Edital, EditalRelacionado, ResumoItens } from '@/lib/tipos';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ itens?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_EDITAL.test(slug)) return { title: 'Edital' };
  const e = await edital(slug);
  if (!e) return { title: 'Edital não encontrado' };
  const t = assunto(e.objeto).titulo;
  return { title: t.length > 70 ? `${t.slice(0, 69)}…` : t };
}

const ETIQUETA = 'rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted';

/** Resumo de reserva: se a consulta do resumo falhar, a página do edital continua de pé. */
const RESUMO_VAZIO: ResumoItens = { total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] };

/** Itens, documentos, resumo e parecidos: só consultados quando o edital está liberado para este navegador hoje. */
async function detalhesDoEdital(e: Edital, todos: boolean) {
  const [itens, arquivos, resumo, parecidos] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    arquivosDoEdital(e),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    // Falha nos parecidos não derruba a página: o bloco só não aparece.
    relacionados(e.id).catch((erro: unknown): EditalRelacionado[] => {
      console.error(`relacionados ${e.id}:`, erro);
      return [];
    }),
  ]);
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  return { itens, arquivos, resumo, parecidos, totalItens: Math.max(resumo.total, itens?.length ?? 0) };
}

export default async function PaginaEdital({ params, searchParams }: Props) {
  await connection();
  const { slug } = await params;
  const { itens: modoItens } = await searchParams;
  if (!SLUG_EDITAL.test(slug)) notFound();
  const e = await edital(slug);
  if (!e) notFound();

  // Cada edital diferente aberto no dia conta no grátis (reabrir não conta). Interno e visitante sem cookie: liberado.
  const ctx = await contextoDaPagina();
  const decisao = await decidirEdital(ctx, e.slug);
  const todos = modoItens === 'todos';
  // A faixa do plano grátis lê o uso depois de contar este edital.
  const [atualizado, detalhes, uso] = await Promise.all([
    atualizadoEm(),
    decisao.permitido ? detalhesDoEdital(e, todos) : Promise.resolve(null),
    usoDoDia(ctx),
  ]);
  const agora = new Date();
  const p = prazo(e.encerramento_em, agora);
  const titulo = assunto(e.objeto);
  const local = `${e.municipio_nome ?? '—'}/${e.uf}`;
  const lotes = e.info_complementar ? lotesDaInfo(e.info_complementar) : null;
  const textoInfo = e.info_complementar && !lotes ? paragrafos(e.info_complementar) : [];
  const exclusivoTotal = detalhes !== null && detalhes.resumo.total > 0 && detalhes.resumo.exclusivos === detalhes.resumo.total;
  const aviso = avisoSituacao(e.situacao_id);

  return (
    <>
      <Cabecalho uso={uso} />
      <FaixaCobertura atualizadoEm={atualizado} />
      {detalhes ? <RegistrarAbertura slug={e.slug} /> : null}
      {/* Celular: espaço no fim para a barra fixa do "Abrir edital oficial" (a de navegação já tem o dela). */}
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-28 pt-6 md:px-6 lg:pb-6">
        <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <span>{local}</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.situacao}</span>
              <span className={`text-[13px] ${TEXTO_PRAZO[p.tom]}`}>{p.texto}</span>
              <EtiquetaSituacao situacaoId={e.situacao_id} />
              {titulo.tipo ? <span className={ETIQUETA}>{titulo.tipo}</span> : null}
              {e.modalidade_nome ? <span className={ETIQUETA}>{modalidadeCurta(e.modalidade_nome)}</span> : null}
              {e.srp ? <span className={ETIQUETA}>Registro de preços</span> : null}
              {exclusivoTotal ? <span className="rounded-xs bg-mata-soft px-2 py-0.5 text-xs font-semibold text-mata">Exclusivo ME/EPP</span> : null}
            </div>
            <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.015em] md:text-[32px]">{titulo.titulo}</h1>
            <p className="text-[15px] text-ink-muted">
              {[nomeProprio(e.orgao_nome), e.unidade_nome ? nomeProprio(e.unidade_nome) : null, local].filter(Boolean).join(' · ')}
            </p>
            {aviso ? (
              <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
                {aviso}
              </p>
            ) : null}
          </div>
          {/* "Abrir edital oficial" e "Compartilhar" ficam sempre à mão, inclusive com os editais grátis do dia esgotados:
              o cartão dos planos esconde o detalhe, não a fonte oficial. */}
          <div className="flex flex-wrap gap-2">
            <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} />
            <BotaoCompartilhar titulo={titulo.titulo} slug={e.slug} />
            <Link
              href={`/alertas?uf=${e.uf}`}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Criar alerta para editais parecidos
            </Link>
          </div>
        </section>

        {/* Celular: "Abrir edital oficial" fixo acima da barra de navegação (sempre, como no cabeçalho do computador). */}
        <div className="fixed inset-x-0 bottom-[var(--altura-barra)] z-30 border-t border-line bg-raised py-3 pl-[calc(16px+env(safe-area-inset-left))] pr-[calc(16px+env(safe-area-inset-right))] lg:hidden">
          <BotaoEditalOficial href={linkOficial(e)} slug={e.slug} variante="barra" />
        </div>

        {/* Tudo abaixo do cabeçalho fica atrás do cartão quando os editais grátis do dia acabaram.
            Seção nova da página entra dentro deste bloco (e a consulta dela, em detalhesDoEdital). */}
        {detalhes ? (
          <>
            <ResumoOportunidade frases={resumoOportunidade(e)} />
            <FichaEdital edital={e} agora={agora} atualizadoEm={atualizado} />
            <PrincipaisInformacoes edital={e} resumo={{ ...detalhes.resumo, total: detalhes.totalItens }} agora={agora} />

            <div className="flex flex-wrap items-start gap-5">
              <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-1 text-[17px] font-bold">Documentos do edital</h2>
                  <p className="mb-2 text-[13px] text-ink-muted">Os documentos exigidos para participar estão no edital e no termo de referência.</p>
                  <DocumentosEdital arquivos={detalhes.arquivos} slug={e.slug} />
                </section>
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-3 text-[17px] font-bold">Itens da licitação</h2>
                  <ListaItens itens={detalhes.itens} total={detalhes.totalItens} slug={e.slug} todos={todos} />
                </section>
                <Relacionados editais={detalhes.parecidos} origem={e.slug} agora={agora} />
                <section className="rounded-lg border border-line bg-raised p-5">
                  <h2 className="mb-2 text-[17px] font-bold">Informações complementares</h2>
                  {lotes ? (
                    <ol className="flex flex-col gap-1.5 text-[15px]">
                      {lotes.map((l) => (
                        <li key={l.numero} className="break-words">
                          <span className="font-semibold">Lote {l.numero}</span> · {l.texto}
                        </li>
                      ))}
                    </ol>
                  ) : textoInfo.length > 0 ? (
                    <TextoRecolhivel paragrafos={textoInfo} />
                  ) : (
                    <p className="text-[15px] text-ink-muted">Não informado pelo órgão.</p>
                  )}
                </section>
              </div>
              <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
                <VitrineEmBreve slug={e.slug} />
                <section className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5 text-[15px]">
                  <h2 className="text-base font-bold">Local</h2>
                  <p>
                    <span className="block text-xs text-ink-muted">Sede do órgão comprador</span>
                    {local}
                  </p>
                  <p className="text-[13px] text-ink-muted">O local de entrega pode ser outro: confira no edital.</p>
                </section>
                <p className="rounded-md bg-sunken p-4 text-[13px] text-ink-muted">
                  O Edital Map ajuda a encontrar editais. Não participa da licitação: as regras valem conforme o edital oficial.
                </p>
              </aside>
            </div>
          </>
        ) : (
          <CartaoLimite tipo="edital" />
        )}
      </main>
    </>
  );
}
```
(Mudanças em relação à página de hoje: botão oficial e barra fixa fora do bloqueio; "Compartilhar"; etiqueta e aviso de situação; "Resumo da oportunidade" e "Informações principais" no topo do bloco liberado; o "Objeto completo", a situação, a publicação e a fonte passaram para as informações principais; "Informações complementares" sempre aparece; "Mapa" no caminho virou "Início", porque a página inicial abre na Lista.)

- [ ] **Step 5: Verificar e commitar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa (inclusive `scripts/prefetch-edital.test.ts`: os links novos para `/edital` têm `prefetch={false}`; os da página do edital não mudaram).
```bash
git add lib/resumoEdital.ts lib/resumoEdital.test.ts lib/compartilhar.ts lib/compartilhar.test.ts components/edital/ResumoOportunidade.tsx components/edital/FichaEdital.tsx components/edital/BotaoCompartilhar.tsx components/edital/PrincipaisInformacoes.tsx "app/edital/[slug]/page.tsx" scripts/edital.test.ts
git commit -m "feat: edital com resumo simples, informações principais, situação, Compartilhar e link oficial sempre acessível" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 11: Cobertura honesta

**Files:**
- Create: `lib/cobertura.ts`, `lib/cobertura.test.ts`, `scripts/cobertura.test.ts`
- Modify: `components/FaixaCobertura.tsx`, `components/inicio/ColunaLista.tsx`, `app/sobre/page.tsx`

**Interfaces:**
- Consumes: `MODALIDADES` (`lib/filtros.ts`).
- Produces: `FONTE_COBERTURA = 'Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento'` no rodapé da lista, na faixa do edital e em /sobre.

- [ ] **Step 1: Testes (falhando)**

Crie `lib/cobertura.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FONTE_COBERTURA } from './cobertura';
import { MODALIDADES } from './filtros';

describe('cobertura honesta', () => {
  it('texto da spec', () => {
    expect(FONTE_COBERTURA).toBe('Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento');
  });
  it('as modalidades buscadas (6, 7, 4, 8, 12) aparecem no texto', () => {
    expect(MODALIDADES.map((m) => m.id).sort((a, b) => a - b)).toEqual([4, 6, 7, 8, 12]);
    for (const m of MODALIDADES) expect(FONTE_COBERTURA).toContain(m.nome.split(' ')[0]);
  });
});
```

Crie `scripts/cobertura.test.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const arquivosTsx = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[]).filter((f) => f.endsWith('.tsx')).map((f) => join(pasta, f));

describe('cobertura honesta (spec §1)', () => {
  it('ninguém promete todas as licitações do Brasil', () => {
    for (const f of [...arquivosTsx('app'), ...arquivosTsx('components')]) expect(ler(f), f).not.toMatch(/todas as licita/i);
  });
  it('rodapé da lista, faixa do edital e /sobre mostram a fonte e as modalidades', () => {
    for (const f of ['components/inicio/ColunaLista.tsx', 'components/FaixaCobertura.tsx', 'app/sobre/page.tsx']) {
      expect(ler(f), f).toContain('{FONTE_COBERTURA}');
    }
  });
});
```

Run: `npx vitest run lib/cobertura.test.ts scripts/cobertura.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar**

Crie `lib/cobertura.ts`:
```ts
/** Alcance do site sem prometer todas as licitações: a fonte e as modalidades que o espelho copia (6, 7, 4, 8, 12). */
export const FONTE_COBERTURA = 'Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento';
```

Substitua `components/FaixaCobertura.tsx` por:
```tsx
import { FONTE_COBERTURA } from '@/lib/cobertura';
import { haQuanto } from '@/lib/formato';

export function FaixaCobertura({ atualizadoEm }: { atualizadoEm: string | null }) {
  return (
    <p className="shrink-0 truncate border-b border-line bg-sunken px-4 py-2 text-xs text-ink-muted md:px-6 md:text-[13px] md:leading-normal">
      {FONTE_COBERTURA}
      {atualizadoEm ? <> · atualizado {haQuanto(atualizadoEm, new Date())}</> : null}
    </p>
  );
}
```

Em `components/inicio/ColunaLista.tsx`:
1. Acrescente `import { FONTE_COBERTURA } from '@/lib/cobertura';` depois de `import { CartaoLimite } from '@/components/CartaoLimite';`.
2. Troque `Editais abertos de todo o Brasil · o ponto é a sede do órgão, não o local de entrega` por `O ponto é a sede do órgão, não o local de entrega`.
3. Logo depois de `<Paginacao pagina={p.pagina} total={total} carregando={p.carregandoLista} aoIr={p.aoIrPagina} />`, acrescente:
```tsx
          <p className="shrink-0 px-1 pb-2 pt-1 text-center font-mono text-[11px] text-ink-muted">{FONTE_COBERTURA}</p>
```

Em `app/sobre/page.tsx`:
1. Acrescente `import { FONTE_COBERTURA } from '@/lib/cobertura';` depois dos imports.
2. Troque
```tsx
          <p>
            Do PNCP, o Portal Nacional de Contratações Públicas, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia esses
            dados a cada 3 horas: editais abertos de todo o Brasil.
          </p>
```
por
```tsx
          <p>
            Do PNCP, o Portal Nacional de Contratações Públicas, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia esses
            dados a cada 3 horas: editais abertos de todo o Brasil nas modalidades Pregão, Concorrência, Dispensa e Credenciamento. Licitações
            publicadas só em outros portais, ou em outras modalidades (como leilão e concurso), não aparecem aqui. Revogadas e anuladas saem da
            lista; suspensas aparecem com a etiqueta &quot;Suspensa&quot;.
          </p>
          <p className="text-[13px] text-ink-muted">{FONTE_COBERTURA}</p>
```

- [ ] **Step 3: Verificar e commitar**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.
```bash
git add lib/cobertura.ts lib/cobertura.test.ts scripts/cobertura.test.ts components/FaixaCobertura.tsx components/inicio/ColunaLista.tsx app/sobre/page.tsx
git commit -m "feat: cobertura honesta (fonte PNCP e modalidades) na lista, no edital e em Sobre" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12 (controlador): publicar, conferir e capturar

**Files:**
- Modify: `docs/fase-3-metricas.md`

**Interfaces:**
- Consumes: Tasks 1–11 no branch; 0011 aplicada (Task 4).
- Produces: site publicado e conferido; números em `docs/fase-3-metricas.md`.

Todos os passos são do controlador. Não publicar sem a Task 4 ter passado (ver "Ordem de publicação").

- [ ] **Step 1: Pré-condições**

`npm test && npm run typecheck && npm run build` passam. `select name from supabase_migrations.schema_migrations order by version;` contém `busca_relevancia`. Sem `.vercel/` no worktree: `vercel link --yes --project edital-map` (time JPM Company; a pasta já está no `.gitignore`).

- [ ] **Step 2: Publicar**

`vercel deploy --prod --yes`. "Not authorized": repetir uma vez; falhou de novo, parar e avisar o dono.

- [ ] **Step 3: Rotas (interno, sem limite)**

```bash
B=https://edital-map.vercel.app
I='cookie: em_interno=1'
j() { node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));$1"; }
curl -s -H "$I" "$B/api/busca?q=uniformes" | j "console.log(r.total, r.editais.length); for (const e of r.editais.slice(0,3)) console.log(e.relevancia?.pontos, e.relevancia?.nivel, '|', e.relevancia?.explicacao, '|', e.destaques.join(','))"
curl -s -H "$I" "$B/api/busca?q=uniformes%20-escolar" | j "console.log(r.total)"
curl -s -H "$I" "$B/api/busca?q=uniformes&ordem=maior_valor&pagina=2" | j "const v=r.editais.map(e=>e.valor_estimado||0);console.log(r.editais.length, v.every((x,i)=>i===0||x===0||v[i-1]>=x))"
curl -s -H "$I" "$B/api/busca" | j "console.log(r.total, r.editais.every(e=>e.relevancia===null), r.editais.every(e=>e.situacao_id!==2&&e.situacao_id!==3))"
curl -s -H "$I" "$B/api/contagem?q=uniformes"; echo
curl -s -H "$I" "$B/api/mapa?q=uniformes" | j "console.log(r.reduce((s,p)=>s+p.qtd,0))"
curl -s -H "$I" "$B/api/exportar?q=uniformes&ordem=maior_valor" | wc -l
for u in "/" "/?vista=mapa" "/?q=luva&tela=lista" "/?q=uniformes&pagina=2&ordem=recentes" "/sobre"; do curl -s -H "$I" -o /dev/null -w "%{http_code} $u\n" "$B$u"; done
```
Expected: `uniformes` com total N e 20 editais, pontos que não sobem, explicação com termo que aparece no título/objeto, destaques; com `-escolar` total ≤ N; `maior_valor` página 2 com 20 e `true`; sem termo `true true`; contagem `{"total":N}` igual ao total da busca; soma do mapa ≤ N (diferença = editais sem município); CSV com min(N, 2000) + 1 linhas; `200` nas cinco páginas.

- [ ] **Step 4: Limite do grátis (visitante não interno)**

```bash
J="<scratchpad>/cookies-evolucao-f2.txt"; rm -f "$J"
curl -s -o /dev/null -c "$J" "$B/sobre"
for u in "q=luva" "q=luva&pagina=2" "q=luva&ordem=recentes" "q=luva&dias=7"; do curl -s -b "$J" -o /dev/null -w "%{http_code} $u\n" "$B/api/busca?$u"; done
curl -s -b "$J" -o /dev/null "$B/api/mapa?q=luva"
curl -s -b "$J" -o /dev/null "$B/?q=luva&vista=mapa&pagina=3"
curl -s -b "$J" "$B/api/uso"; echo
curl -s -b "$J" -o /dev/null "$B/api/busca?q=luva%20-latex"
curl -s -b "$J" "$B/api/uso"; echo
S=$(curl -s -H "$I" "$B/api/busca?q=luva" | j "console.log(r.editais.slice(0,4).map(e=>e.slug).join(' '))"); set -- $S
for s in "$1" "$2" "$3"; do curl -s -b "$J" -o /dev/null "$B/edital/$s"; done
P=$(curl -s -b "$J" "$B/edital/$4")
echo "$P" | grep -c "Você abriu os 3 editais grátis de hoje"
echo "$P" | grep -c "Abrir edital oficial"
echo "$P" | grep -c "Compartilhar"
V=$(grep em_visitante "$J" | awk '{print $7}')
curl -s -o /dev/null -w "%{http_code} marca o visitante de teste como interno\n" -X POST -H "content-type: application/json" -H "cookie: em_visitante=$V; em_interno=1" -d '{"tipo":"busca","detalhe":{"q":"teste"}}' "$B/api/eventos"
```
Expected: `200` nas quatro buscas; o primeiro `/api/uso` com `"buscas":1` (página, ordem, prazo, mapa e a página inicial com vista/página não contaram de novo); o segundo com `"buscas":2` (`-latex` é outra busca); o 4º edital mostra o cartão (`1`) **e** "Abrir edital oficial" (≥ 1) e "Compartilhar" (≥ 1); evento `204`.

- [ ] **Step 5: Situação**

No SQL Editor: `select slug from public.contratacoes where situacao_id = 4 and public.em_aberto(encerramento_em, situacao_id) limit 1;` e `select slug from public.contratacoes where situacao_id in (2, 3) and encerramento_em > now() limit 1;`.
```bash
curl -s -H "$I" "$B/edital/<slug suspensa>" | grep -c "O órgão suspendeu esta licitação"
curl -s -H "$I" "$B/edital/<slug revogada>" | grep -c "não está mais aberta"
curl -s -H "$I" "$B/api/busca?q=<palavra do objeto da revogada>" | j "console.log(r.editais.some(e=>e.slug==='<slug revogada>'))"
```
Expected: `1`, `1`, `false`.

- [ ] **Step 6: Navegador (1440 px e 390 px, perfil interno)**

No site publicado:
1. Computador (1440): abre na **Lista** (alternador "Lista | Mapa" no topo, Lista marcada); cards largos com título (até 3 linhas) com termos destacados, órgão, município/UF, valor, modalidade, prazo, publicação, "Relevância alta · 75" com o "?" (abre o aviso da spec) e a explicação; "Onde mais compram" à direita. Ordenar por cada uma das 5 ordens (valor não informado no fim em Maior/Menor valor; sem termo, "Maior relevância" some); paginação numerada (ir à página 3; endereço com `pagina=3`; voltar à 1).
2. "Mapa": a tela de três colunas de hoje, com clusters, pílulas, zoom no município e filtros como antes; o endereço ganha `vista=mapa`; voltar para "Lista" não refaz a busca (sem "Buscando…").
3. Busca `uniformes -escolar`: nenhum card com "escolar" no título; `xyzw qualquer` com UF SC: estado vazio "Nenhum edital aberto para “xyzw qualquer” em SC." com sugestões que trazem número ("Ampliar para Todo o Brasil · N editais" só se N > 0); `farda` sozinho, se vier vazio: "Buscar “fardamento”".
4. Card "Suspensa" (se houver na busca): etiqueta no card e, no edital, o aviso.
5. Edital: "Resumo da oportunidade" (frases da spec), "Informações principais" (objeto, órgão, município/UF, modalidade, identificador, valor, publicação, prazo, situação, fonte, última alteração no PNCP, atualizado no Edital Map), itens, documentos, ME/EPP ("Não informado pelo órgão" quando faltar); "Compartilhar" → "Link copiado" e o link colado abre o mesmo edital.
6. Celular (390 × 844): alternador em largura total; Lista abre por padrão; barra de baixo: "Mapa" leva à vista Mapa (mapa em cima, lista embaixo, como hoje), "Lista" volta à vista Lista; tocar num card abre o edital e voltar devolve a mesma vista, página e posição; "Compartilhar" abre a folha do sistema; "Abrir edital oficial" fixo acima da barra.
7. Perfil novo (não interno): abrir 4 editais; no 4º, cartão dos planos **com** "Abrir edital oficial" e "Compartilhar" no cabeçalho e na barra fixa do celular. No fim, `$B/sobre?interno=1` nesse perfil.

Capturas: Edge invisível na porta 9333 (instruções no topo de `scripts/capturas.mjs`) e `CAPTURAS_INTERNO=1 npm run capturas -- $B <slug1> <slug2>`; olhar `inicio` e `edital-*` em 1440 e 390 px.

- [ ] **Step 7: Registrar e commitar**

Acrescente à seção "Evolução · Fase 2 · Busca e relevância (0011)" de `docs/fase-3-metricas.md`:
```markdown
- Publicado em aaaa-mm-dd hh:mm. curl: uniformes N editais (20 por página), -escolar N, maior valor pág. 2 em ordem, sem termo sem relevância, contagem = total, mapa N (+ N sem município), CSV N linhas; limite: página/ordem/vista/mapa não contaram, -latex contou; 4º edital com cartão, link oficial e Compartilhar.
- Situação: suspensa com aviso; revogada fora da busca e com aviso no link direto.
- Navegador 1440 e 390 px: alternador, Lista padrão, ordens, paginação, destaque, relevância e aviso, estado vazio, edital com resumo e informações principais, Compartilhar, link oficial com limite. Capturas em .capturas/.
- Tempos de produção: /api/busca?q=uniformes N s, /api/busca?q=material N s, /api/mapa?q=uniformes N s, edital N s.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: evolução fase 2 publicada e conferida" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13: Documentação e aceite

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-18-evolucao-fase-2-busca-relevancia-design.md` (§6)

**Interfaces:**
- Consumes: resultado das Tasks 4 e 12.
- Produces: regras novas no `CLAUDE.md`; aceite marcado na spec.

- [ ] **Step 1: `CLAUDE.md`**

1. Depois da linha que começa com `- Limites do grátis, página Planos e celular:`, acrescente:
```markdown
- Evolução · Fase 2 (busca, relevância, lista e edital): spec docs/superpowers/specs/2026-10-18-evolucao-fase-2-busca-relevancia-design.md, plano docs/superpowers/plans/2026-10-18-evolucao-fase-2-busca-relevancia.md, conferências docs/evolucao-fase-2.sql e `npx tsx scripts/conferir-relevancia.ts` (0011: `em_aberto`, `abertas_unicas` com todos os filtros, `buscar_editais` com `p_termos`/`p_relacionados`/`p_excluir`/`p_ordem`, `pontuacao_busca`, `acertos_busca`).
```
2. Troque
```markdown
- "Aberta" = encerramento_em > now(). Não confiar no endpoint /proposta para isso; ele só serve para encontrar contratações na carga.
```
por
```markdown
- "Aberta" = encerramento_em > now() e situacao_id fora de 2 (Revogada) e 3 (Anulada), num lugar só: `public.em_aberto` (0011), usada por lista, mapa, contagem, exportação, órgãos e parecidos. Suspensa (4) continua aberta, com a etiqueta "Suspensa". Não confiar no endpoint /proposta para isso; ele só serve para encontrar contratações na carga.
```
3. Depois da linha que começa com `- Textos do PNCP só passam pela limpeza de lib/texto.ts`, acrescente:
```markdown
- Busca e relevância: termos relacionados em lib/relevancia/termos.ts (grupos por assunto; termo sem separador e com palavras de 4+ caracteres, número ou sigla, porque a busca é por prefixo); "-palavra" exclui pelo objeto. Pontuação 0–100 com os pesos de `PESOS` (lib/relevancia/pontuacao.ts) iguais aos de `public.pontuacao_busca` (guarda em scripts/migracoes.test.ts): o banco ordena, o site calcula o número e a explicação (`pontuar`/`explicar`) e avisa no log se diferirem. Lista com 20 por página (`POR_PAGINA`) e ordens Maior relevância · Mais recentes · Menor prazo · Maior valor · Menor valor (valor não informado no fim).
- Cobertura: dizer `FONTE_COBERTURA` (lib/cobertura.ts, "Fonte: PNCP · Pregão, Concorrência, Dispensa e Credenciamento"), sem prometer todas as licitações.
```
4. Troque o começo da linha `- Página inicial em três colunas a partir de lg (1024 px). Abaixo: uma página só que rola, …` por `- Página inicial: alternador Lista | Mapa no topo dos resultados (padrão Lista; \`vista=mapa\` no endereço; trocar não conta). Lista: cards largos (CardLista) e, no computador, "Onde mais compram" à direita. Mapa: três colunas a partir de lg (1024 px). Abaixo: uma página só que rola, …` (o resto da linha fica) e, na mesma linha, troque `barra fixa embaixo (Mapa · Lista · Alertas · Planos, components/BarraCelular.tsx, \`--altura-barra\`; a rolagem só acende o item, nunca escreve o endereço)` por `barra fixa embaixo (Mapa · Lista · Alertas · Planos, components/BarraCelular.tsx, \`--altura-barra\`; Mapa leva à vista Mapa e Lista à vista Lista; a rolagem só acende o item, nunca escreve o endereço)`.
5. Na linha `- Limite do grátis: …`, troque `(prazo e página não contam; com raio a UF não entra; vazia não conta)` por `(prazo, página, ordem e vista não contam; termos excluídos "-palavra" contam como outra busca; com raio a UF não entra; vazia não conta)`.
6. Na linha `- Sinal de limite: …`, troque `e, bloqueada, troca tudo abaixo do cabeçalho pelo cartão dos planos (seção nova entra dentro desse bloco)` por `e, bloqueada, troca tudo abaixo do cabeçalho pelo cartão dos planos (seção nova entra dentro desse bloco); "Abrir edital oficial" e "Compartilhar" ficam fora do bloqueio`.
7. Na linha `- Busca no endereço: …`, troque `` `/?q=&uf=&municipio=&valor=&modalidades=&orgao=&raio=&dias=7&tela=lista` (lib/urlBusca.ts) `` por `` `/?q=&uf=&municipio=&valor=&modalidades=&orgao=&raio=&dias=7&ordem=&pagina=&vista=mapa&tela=lista` (lib/urlBusca.ts; padrões fora do endereço: vista Lista, página 1, ordem padrão; `tela` só na vista Mapa) ``.
8. Na linha `- /planos: …`, troque `Pagamento e cadeado do "Abrir edital oficial" só com o Stripe.` por `Pagamento só com o Stripe. O "Abrir edital oficial" fica sempre acessível (spec da evolução, Fase 2).`.

- [ ] **Step 2: Aceite na spec**

Na seção 6 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (data da publicação, `docs/fase-3-metricas.md`, capturas); o que faltar fica `[ ]` com uma frase do que falta.

- [ ] **Step 3: Verificação final e commit**

Run: `npm test && npm run typecheck && npm run build`
```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-18-evolucao-fase-2-busca-relevancia-design.md
git commit -m "docs: evolução fase 2 no ar, regras novas e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```
Merge no `main` e push: só com o ok do dono (fora deste plano).

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 aberta sem revogadas (2) e anuladas (3) em `abertas_unicas`, `buscar_editais`, `mapa_editais`, `orgaos_abertos`, `relacionados`, contagens | Task 3 (`em_aberto` num lugar só, guardas), Task 4 ([E3]), Task 12 (Step 5) |
| §1 suspensa listada com etiqueta e aviso no edital | Tasks 3 (`lib/situacao.ts`), 7 (`EtiquetaSituacao`), 8 (cards), 10 (cabeçalho do edital) |
| §1 edital: publicação, prazo, "Atualizado no Edital Map em", situação, identificador | Tasks 6 (`situacao_id`, `atualizada_pncp_em`), 10 (`FichaEdital`) |
| §1 cobertura honesta (rodapé da lista, /sobre) | Task 11 |
| §2 termos relacionados versionados, normalizados, testados | Task 1 |
| §2 busca digitado + relacionados (OR) no objeto e nos itens, com o índice atual; negativos | Tasks 1 (`separarNegativos`), 3 (`abertas_unicas`, `consulta_termos`), 6 (argumentos) |
| §2 pontuação 0–100 determinística (pesos, frase, termos distintos, teto, sem termo) | Tasks 2 (`pontuar`), 3 (`pontuacao_busca`, guarda dos pesos), 4 (`conferir-relevancia.ts`) |
| §2 explicação só com o que bateu; Alta/Média/Baixa; aviso fixo | Tasks 2 (`explicar`, `nivel`, `AVISO_RELEVANCIA`), 7 (`IndicadorRelevancia`) |
| §2 estrutura para busca semântica (`pontuar` com entradas e saída definidas) | Tasks 1–2 (`Busca`, `Acertos`, `expandir` como ponto de troca) |
| §3 alternador Lista \| Mapa no endereço (`vista`), sem contar, sem perder filtros; padrão Lista | Tasks 5 (`EstadoTela`), 9 |
| §3 Lista: cards informativos, destaque, ordenações (valor nulo no fim), paginação de 20 (`pagina=`, não conta), "Onde mais compram" à direita | Tasks 3 (ordens no banco), 5 (página/ordem), 7 (peças), 8 (ligação), 9 (vista larga) |
| §3 Mapa: a tela de hoje sem mudança | Task 9 (`Mapa.tsx` intocado; seção igual) |
| §3 estado vazio útil (filtro mais restritivo com número, termo, Todo o Brasil) | Task 7 (`lib/vazio.ts`, `EstadoVazio`), Decisão 11 |
| §3 contagens iguais em lista, mapa, painel e exportação | Tasks 3 (mesma `abertas_unicas`), 4 ([E3]/[E4] "diferenca = 0"), 12 |
| §4 bloco único de informações principais | Task 10 (`FichaEdital`) |
| §4 resumo da oportunidade só com campos existentes | Task 10 (`resumoOportunidade`) |
| §4 complementares com "não informado pelo órgão" | Task 10 (`PrincipaisInformacoes`, complementares) |
| §4 "Abrir edital oficial" sempre (inclusive com limite); Compartilhar (Web Share / copiar com "Link copiado") | Task 10 (página, `BotaoCompartilhar`, guarda `scripts/edital.test.ts`), Task 12 (Step 4) |
| §5 fora do escopo | Global Constraints |
| §6 vitest (expansão, pontuação, explicação, ordenações, destaque, resumo, vista e página sem contar) | Tasks 1, 2, 5 (`combinacaoBusca`), 7, 10 |
| §6 banco (antes/depois, relacionados e negativos, tempos < 500 ms) | Task 4 ([E0]–[E6]) |
| §6 navegador 1440/390 e aceite | Tasks 12, 13 |

## Riscos conhecidos (para o revisor e o controlador)

- **Relevância em todas as abertas da busca.** Ordenar por relevância calcula os acertos (até 21 termos × objeto e itens) em todas as linhas da busca. Termo amplo sem grupo (1 termo) é barato; termo de grupo traz até 20 relacionados, mas acha menos linhas. Se [E5] passar de 500 ms: (1) baixar `MAX_RELACIONADOS` para 12 (só TS, sem migração); (2) se não bastar, migração 0012 que calcula a relevância só nas 2.000 abertas de prazo mais próximo (o total continua o de todas). Avisar o dono antes.
- **Busca por prefixo do radical.** Termos curtos acham de tudo; a regra de 4+ caracteres está testada e [E6] mostra os falsos positivos reais por termo. Trocar um termo é só TS.
- **Duas contas da mesma pontuação** (banco para ordenar, site para mostrar). Os pesos têm guarda de texto, a separação dos termos é a mesma (o site manda `p_termos` já separados) e o servidor avisa no log se diferirem; `conferir-relevancia.ts` compara em produção.
- **Site antigo depois da 0011.** Com termo, a ordem padrão vira relevância (o "Carregar mais" de 50 continua coerente). Revogadas e anuladas somem antes do site novo (desejado).
- **Mapa remonta ao trocar de vista** (o zoom volta ao enquadramento da busca). Comportamento do mapa em si não muda.
- **Excluídos só pelo objeto.** Um edital com "-palavra" só nos itens continua (decisão 6); o texto do campo é livre.
- **Página fora do intervalo** (endereço antigo com `pagina=40` e agora 3 páginas): a lista mostra "Esta página não tem editais" com "Ir para a página 1".
- **Contagem no CDN** (`/api/contagem` 5 min): logo depois da publicação o número da folha de Filtros pode estar velho por até 5 min.

## Auto-revisão (writing-plans)

1. **Cobertura da spec:** cada item de §1–§6 aponta para uma task na tabela acima; nenhum sem task. §5 (fora do escopo) está nas Global Constraints.
2. **Placeholders:** nenhum "TBD"/"TODO"/"implementar depois"; todo passo de código tem o código; os `aaaa-mm-dd`, `N` e `<…>` aparecem só nos registros e nas consultas do controlador (Tasks 4 e 12), que são números a anotar ou valores copiados da saída de `--mostrar`/SQL.
3. **Consistência de nomes e tipos:** `Busca`/`interpretarBusca`/`temTermo`/`termosParecidos` (Task 1) nas Tasks 2, 6, 7, 8; `PESOS`/`Acertos`/`Relevancia`/`pontuar`/`explicar`/`relevancia`/`AVISO_RELEVANCIA` (Task 2) nas Tasks 3 (guarda), 4 (script), 6, 7; `destacar` (Task 2) em `TituloDestacado` (Task 7); `SITUACOES_FORA_DAS_ABERTAS`/`rotuloSituacao`/`avisoSituacao` (Task 3) nas Tasks 7 e 10; `Ordem`/`ORDENS` (Task 3) nas Tasks 5, 7, 8; `POR_PAGINA`/`MAX_PAGINA`/`ordemEfetiva`/`paraParametros(f, { pagina, ordem })` (Task 5) nas Tasks 6, 7, 8; `Vista`/`EstadoTela`/`ESTADO_PADRAO`/`urlDaBusca(f, estado)`/`lerBuscaDaUrl → { busca, estado }` (Task 5) nas Tasks 8 e 9; `EditalResumo.situacao_id/relevancia/destaques` e `Edital.situacao_id/atualizada_pncp_em` (Task 6) nas Tasks 7, 8, 10; colunas SQL `termos_objeto`/`termos_itens`/`frase`/`pontuacao`/`situacao_id` (Task 3) lidas em `paraResumo` (Task 6) e no script (Task 3); parâmetros `p_termos`/`p_relacionados`/`p_excluir`/`p_ordem` (Task 3) mandados por `argumentosBusca` e `pontosDoMapa` (Task 6); props de `ColunaLista` (Task 8) passadas pelo Explorador (Tasks 8 e 9); `mudarVista`/`aoBarra`/`naLista` (Task 9) nas guardas de `scripts/celular.test.ts`.

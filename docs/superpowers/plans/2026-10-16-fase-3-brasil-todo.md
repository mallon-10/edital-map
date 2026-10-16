# Edital Map · Fase 3 · Brasil todo · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir as 27 UFs sem sair do plano grátis do Supabase (500 MB), mantendo a busca dentro dos itens.

**Architecture:** Três marcos medidos, nesta ordem (decisão 8 da spec). **M1:** a migração `0005` acrescenta `contratacoes.itens_palavras` (tsvector sem posições, mesma configuração de texto de `itens.busca`, índice GIN) e `contratacoes.itens_resumo` (jsonb), preenche as duas a partir da tabela `itens`, troca a busca "nos itens" para as palavras (sem `item_trecho`) e faz `resumo_itens` ler a coluna; o worker passa a gravar só palavras + resumo (função SQL `gravar_resumo_itens`), e a página do edital busca a lista de itens no PNCP na hora. **M2:** a migração `0006` apaga a tabela `itens`, cria a retenção diária (pg_cron) e põe o sync a cada 3 h; o controlador roda `VACUUM FULL` e mede. **M3:** o worker consulta o PNCP sem `uf` (`UFS=BR`), herda as chaves de estado por UF, não grava o que está fora da retenção; a carga nacional soma publicações dos últimos 30 dias e o `/proposta`; o mapa pinta os 27 estados e os textos passam a "Editais abertos de todo o Brasil".

**Tech Stack:** Node 24 + TypeScript (tsx), vitest 3, @supabase/supabase-js 2, zod 3, pg 8 (scripts), Postgres 15 do Supabase (pg_cron, pg_net), Next.js 16 (App Router) + React 19 + Tailwind 4 + maplibre-gl 6, GitHub Actions, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-16-fase-3-brasil-todo-design.md`

## Global Constraints

- Repositório na pasta atual (OneDrive, caminho com espaço e acento: sempre entre aspas). Git Bash. Trabalho no branch `fase-3-brasil-todo`, criado do `main` no primeiro passo da Task 1.
- TDD com vitest: teste primeiro. `npm test` e `npm run typecheck` passam antes de cada commit; tasks que mexem em `app/` ou `components/` também rodam `npm run build`.
- Schema só muda com migração nova: esta fase cria `supabase/migrations/0005_palavras_itens.sql` e `supabase/migrations/0006_retencao.sql`; não editar 0001–0004. Quem aplica é o controlador: `npm run db:aplicar -- supabase/migrations/NNNN_nome.sql` (uma transação só; `VACUUM` nunca vai dentro de migração).
- Supabase: projeto `edital-map`, ref `omtwaflypzlebjoeubvp`, `sa-east-1`, plano grátis (teto 500 MB). Meta: banco abaixo de 300 MB depois da carga do Brasil todo, medido com `pg_database_size`.
- PNCP: consulta limitada a 20 chamadas/min por IP (`criarRitmo`, rajada 10); 429 espera 30/60/120 s; 5xx/timeout 2/4/8 s; a base de itens (`/api/pncp/v1/orgaos/.../itens`) não tem esse limite. `tamanhoPagina` máx. 50; vazio = 204; itens paginam (pedir 50, teto 200 páginas).
- Modalidades da v1: 6, 8, 4, 7, 12.
- "Aberta" = `encerramento_em > now()`. O endpoint `/v1/contratacoes/proposta` serve só para **encontrar** contratações na carga; nunca para decidir se está aberta.
- Retenção: contratação com `encerramento_em` há mais de 7 dias (`encerramento_em < now() - interval '7 days'`) ou sem `encerramento_em` é apagada todo dia e não é gravada pelo worker. Encerrada há ≤ 7 dias continua abrindo pelo link, com a etiqueta "Encerrado".
- Datas do PNCP vêm sem fuso: `deBrasilia()` (America/Sao_Paulo) antes de gravar.
- Texto dos itens no banco: `strip(to_tsvector('portuguese', public.sem_acento(...)))`, a mesma configuração de `itens.busca` (0001). O texto das descrições não é guardado.
- `itens_resumo` = `{ total, materiais, servicos, com_beneficio, exclusivos, cota, criterios[] }` (benefício 1 = exclusiva ME/EPP, 3 = cota reservada), as mesmas regras de `resumo_itens`.
- `UFS` vazio ou `BR` = país inteiro numa consulta só (sem `uf` no PNCP); chave de estado `atualizacao:BR:<modalidade>`.
- Sync a cada 3 h: `'17 */3 * * *'` no GitHub Actions (`.github/workflows/sync.yml`) e no job `sync-pncp` do pg_cron.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o navegador nem para o git. Dados do site só pelo servidor (`lib/servidor/*`, `import 'server-only'`), cache de 5 min (`criarCache`).
- Interface em português do Brasil. Textos do PNCP só passam por `lib/texto.ts` (`partirItem` etc.). Texto de cobertura: "Editais abertos de todo o Brasil".
- Não rodar `worker:*`, não chamar o PNCP e não tocar no banco, exceto nos passos marcados **(controlador)**.
- Todo commit termina com `Co-Authored-By: <nome do modelo que escreveu o commit> <noreply@anthropic.com>` (nos comandos abaixo, `<modelo>`).

## Ordem de publicação (perigos)

| Marco | Ordem obrigatória | O que quebra se inverter |
|---|---|---|
| M1 | Task 8: `0005` aplicada → merge no `main` + push → `npm run worker:reler-itens` → `vercel deploy --prod` | Worker novo no `main` antes da `0005`: o sync do GitHub chama `gravar_resumo_itens` e filtra `itens_resumo`, que não existem, e nenhuma compra nova ganha itens. |
| M2 | Task 10: só depois de o site em produção e o worker do `main` serem os do M1 (nenhum lê `itens`) → `0006` → merge + push → `db:medir -- --vacuum` | `0006` antes do M1 no ar: a página do edital publicada lê a tabela `itens` apagada (erro) e o worker antigo falha ao gravar itens. |
| M3 | Task 16: carga nacional rodando do branch, na máquina do dono → só depois dela o merge (workflow com `UFS: BR`) → `vercel deploy --prod` | Workflow nacional antes da carga: rodadas longas lendo o país inteiro sem as chaves `atualizacao:BR:*` da carga. Site com "todo o Brasil" antes da carga: mapa com 24 estados vazios. |
| Sempre | `db:aplicar` e `db:medir -- --vacuum` fora do minuto 17 das horas de sync (conferir `gh run list --workflow sync.yml --limit 1`: nenhuma rodada `in_progress`) | `VACUUM FULL` trava `contratacoes` enquanto roda; migração no meio de uma rodada mistura estados. |

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `worker/itens.ts` (novo) | Palavras únicas das descrições, resumo dos itens, total a partir do jsonb |
| `scripts/tamanhos.ts`, `scripts/medir-banco.ts` (novos), `package.json` | `npm run db:medir [-- --vacuum]`: tamanho do banco e das tabelas; `VACUUM FULL` fora de transação |
| `supabase/migrations/0005_palavras_itens.sql` (novo) | Colunas, preenchimento a partir de `itens`, índice GIN, `gravar_resumo_itens`, `abertas`/`buscar_editais`/`resumo_itens` novas |
| `supabase/migrations/0006_retencao.sql` (novo) | Apaga `itens`, retenção diária, sync a cada 3 h no pg_cron |
| `scripts/migracoes.test.ts` (novo) | Guardas de texto das migrações e do workflow (configuração de texto, permissões, agendas, `UFS`) |
| `docs/fase-3-conferencia.sql` (novo) | Consultas de conferência do controlador (M1, M2, M3) |
| `docs/fase-3-metricas.md` (novo, controlador) | Tamanhos medidos, carga, rodadas do sync |
| `worker/banco.ts`, `worker/testes/fakes.ts` | `gravarResumoItens`, `abertasSemItens` por `itens_resumo`, `removerContratacoes`, `estadosDaModalidade` |
| `worker/sincronizar.ts`, `worker/reler.ts`, `worker/reler-itens.ts`, `worker/resumo.ts` | Grava palavras + resumo; herança da chave BR; retenção; `processarPaginas` |
| `worker/config.ts`, `worker/mapear.ts`, `worker/pncp/cliente.ts` | `UF_BRASIL`, `lerUfs` com BR, `RETENCAO_DIAS`, `foraDaRetencao`, consulta sem `uf`, `/proposta` |
| `worker/carga.ts`, `worker/backfill.ts` | Carga nacional com `/proposta`; estado só se ausente |
| `worker/conferir.ts`, `worker/conferencia/*` | Itens do PNCP contra o resumo; abertas por UF contra o `/proposta` |
| `lib/servidor/itensPncp.ts` (novo), `lib/servidor/consultas.ts`, `lib/tipos.ts` | Itens do edital do PNCP na hora; busca sem trecho |
| `app/edital/[slug]/page.tsx`, `components/edital/ListaItens.tsx` | "Itens indisponíveis agora" quando o PNCP falha |
| `components/inicio/CardCompacto.tsx` | "Encontrado nos itens" sem trecho |
| `lib/painel.ts`, `lib/filtros.ts`, `components/Mapa.tsx`, `components/inicio/{LegendaMapa,Chips,BuscaPrincipal,ColunaLista}.tsx`, `components/{FaixaCobertura,FormAlerta}.tsx`, `app/sobre/page.tsx` | 27 estados pintados, textos "todo o Brasil" |
| `.github/workflows/sync.yml` | `'17 */3 * * *'` (M2) e `UFS: BR` (M3) |
| `CLAUDE.md`, spec §8 | Documentação e aceite |

---

## M1 · Itens viram palavras + resumo (SC, PR, RS)

### Task 1: Palavras e resumo dos itens (`worker/itens.ts`)

**Files:**
- Create: `worker/itens.ts`, `worker/itens.test.ts`

**Interfaces:**
- Consumes: `LinhaItem` de `worker/mapear.ts` (campos `descricao`, `material_ou_servico`, `beneficio_id`, `criterio_julgamento`).
- Produces:
  - `type ResumoItensBanco = { total: number; materiais: number; servicos: number; com_beneficio: number; exclusivos: number; cota: number; criterios: string[] }`
  - `palavrasDosItens(descricoes: string[]): string` — palavras únicas (separadas por espaço, sem repetir maiúscula/minúscula), na ordem em que aparecem.
  - `resumirItens(itens: Array<Pick<LinhaItem, 'material_ou_servico' | 'beneficio_id' | 'criterio_julgamento'>>): ResumoItensBanco`
  - `totalDeItens(resumo: unknown): number` — `total` do jsonb `itens_resumo`, 0 quando não há.

- [ ] **Step 1: Criar o branch**

```bash
git checkout main
git pull --ff-only
git checkout -b fase-3-brasil-todo
```

- [ ] **Step 2: Escrever o teste (falhando)**

`worker/itens.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { palavrasDosItens, resumirItens, totalDeItens } from './itens';

describe('palavrasDosItens', () => {
  it('junta as palavras de todas as descrições sem repetir, na ordem em que aparecem', () => {
    expect(palavrasDosItens(['Luva nitrílica tamanho M', 'LUVA de vaqueta tamanho G'])).toBe(
      'Luva nitrílica tamanho M de vaqueta G',
    );
  });
  it('separa só por espaço: pontuação e hífen ficam na palavra (o Postgres separa depois)', () => {
    expect(palavrasDosItens(['Guarda-pó  brim,\tcor: branca', 'guarda-pó brim, cor: azul'])).toBe('Guarda-pó brim, cor: branca azul');
  });
  it('sem descrições, texto vazio', () => {
    expect(palavrasDosItens([])).toBe('');
    expect(palavrasDosItens(['   '])).toBe('');
  });
});

describe('resumirItens', () => {
  it('conta tipos, benefício ME/EPP (1 = exclusiva, 3 = cota) e critérios sem repetir', () => {
    expect(
      resumirItens([
        { material_ou_servico: 'M', beneficio_id: 1, criterio_julgamento: 'Menor preço' },
        { material_ou_servico: 'M', beneficio_id: 3, criterio_julgamento: 'Menor preço' },
        { material_ou_servico: 'S', beneficio_id: 4, criterio_julgamento: 'Maior desconto' },
        { material_ou_servico: null, beneficio_id: null, criterio_julgamento: null },
      ]),
    ).toEqual({ total: 4, materiais: 2, servicos: 1, com_beneficio: 3, exclusivos: 1, cota: 1, criterios: ['Maior desconto', 'Menor preço'] });
  });
  it('lista vazia', () => {
    expect(resumirItens([])).toEqual({ total: 0, materiais: 0, servicos: 0, com_beneficio: 0, exclusivos: 0, cota: 0, criterios: [] });
  });
});

describe('totalDeItens', () => {
  it('lê o total do jsonb e devolve 0 sem resumo', () => {
    expect(totalDeItens({ total: 31, materiais: 31 })).toBe(31);
    expect(totalDeItens(null)).toBe(0);
    expect(totalDeItens({ total: '31' })).toBe(0);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run worker/itens.test.ts`
Expected: FAIL — `Failed to resolve import "./itens"`.

- [ ] **Step 4: Implementar**

`worker/itens.ts`:
```ts
import type { LinhaItem } from './mapear';

/** O que cada contratação guarda dos itens, além das palavras (coluna `itens_resumo`). */
export type ResumoItensBanco = {
  total: number;
  materiais: number;
  servicos: number;
  com_beneficio: number;
  /** Participação exclusiva para ME/EPP (tipoBeneficio 1). */
  exclusivos: number;
  /** Cota reservada para ME/EPP (tipoBeneficio 3). */
  cota: number;
  criterios: string[];
};

/**
 * Palavras únicas de todas as descrições, separadas por espaço, na ordem em que aparecem.
 * Só corta repetição para a chamada ao banco ficar pequena: o Postgres (gravar_resumo_itens) tira acento,
 * separa pontuação, reduz ao radical e descarta posições. Separar só por espaço não muda os lexemas,
 * porque o analisador do Postgres nunca junta duas palavras separadas por espaço.
 */
export function palavrasDosItens(descricoes: string[]): string {
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const descricao of descricoes) {
    for (const palavra of descricao.split(/\s+/)) {
      if (!palavra) continue;
      const chave = palavra.toLocaleLowerCase('pt-BR');
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      saida.push(palavra);
    }
  }
  return saida.join(' ');
}

/** Tipos, ME/EPP e critérios dos itens, com as mesmas regras da função SQL resumo_itens da 0004. */
export function resumirItens(
  itens: Array<Pick<LinhaItem, 'material_ou_servico' | 'beneficio_id' | 'criterio_julgamento'>>,
): ResumoItensBanco {
  const criterios = new Set<string>();
  const r = { total: itens.length, materiais: 0, servicos: 0, com_beneficio: 0, exclusivos: 0, cota: 0 };
  for (const i of itens) {
    if (i.material_ou_servico === 'M') r.materiais++;
    else if (i.material_ou_servico === 'S') r.servicos++;
    if (i.beneficio_id !== null) r.com_beneficio++;
    if (i.beneficio_id === 1) r.exclusivos++;
    if (i.beneficio_id === 3) r.cota++;
    if (i.criterio_julgamento) criterios.add(i.criterio_julgamento);
  }
  return { ...r, criterios: [...criterios].sort() };
}

/** `total` do jsonb `itens_resumo` lido do banco; 0 quando a compra ainda não tem resumo. */
export function totalDeItens(resumo: unknown): number {
  const total = typeof resumo === 'object' && resumo !== null ? (resumo as { total?: unknown }).total : undefined;
  return typeof total === 'number' ? total : 0;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run worker/itens.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add worker/itens.ts worker/itens.test.ts
git commit -m "feat: palavras únicas e resumo dos itens de uma contratação" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 2: Medir o banco (`npm run db:medir`)

**Files:**
- Create: `scripts/tamanhos.ts`, `scripts/tamanhos.test.ts`, `scripts/medir-banco.ts`
- Modify: `package.json` (script `db:medir`)

**Interfaces:**
- Consumes: `lerUrlBanco(env)` de `scripts/migracao.ts`.
- Produces:
  - `type Tamanho = { nome: string; bytes: number }`; `SQL_TAMANHOS: string` (linha `banco` + uma por tabela de `public`).
  - `mb(bytes: number): string` (ex.: `'321,0 MB'`); `formatarTamanhos(linhas: Tamanho[], metaMb?: number): string`.
  - Comando `npm run db:medir [-- --vacuum]` (usado pelo controlador nas Tasks 8, 10 e 16).

- [ ] **Step 1: Escrever o teste (falhando)**

`scripts/tamanhos.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatarTamanhos, mb } from './tamanhos';

const MB = 1024 * 1024;

describe('mb', () => {
  it('megabytes com vírgula e uma casa', () => {
    expect(mb(321 * MB)).toBe('321,0 MB');
    expect(mb(1.5 * MB)).toBe('1,5 MB');
  });
});

describe('formatarTamanhos', () => {
  it('banco primeiro, com aviso acima da meta, e tabelas da maior para a menor', () => {
    expect(
      formatarTamanhos([
        { nome: 'contratacoes', bytes: 134 * MB },
        { nome: 'banco', bytes: 321 * MB },
        { nome: 'itens', bytes: 175 * MB },
      ]),
    ).toBe('Banco: 321,0 MB (acima da meta de 300 MB)\n  itens: 175,0 MB\n  contratacoes: 134,0 MB');
  });
  it('abaixo da meta não avisa', () => {
    expect(formatarTamanhos([{ nome: 'banco', bytes: 250 * MB }])).toBe('Banco: 250,0 MB');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/tamanhos.test.ts`
Expected: FAIL — `Failed to resolve import "./tamanhos"`.

- [ ] **Step 3: Implementar**

`scripts/tamanhos.ts`:
```ts
export type Tamanho = { nome: string; bytes: number };

/** Tamanho do banco inteiro (linha 'banco') e de cada tabela de public, com índices e TOAST. */
export const SQL_TAMANHOS = `
select 'banco' as nome, pg_database_size(current_database()) as bytes
union all
select c.relname, pg_total_relation_size(c.oid)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'`;

export function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatarTamanhos(linhas: Tamanho[], metaMb = 300): string {
  const banco = linhas.find((l) => l.nome === 'banco');
  const tabelas = linhas.filter((l) => l.nome !== 'banco').sort((a, b) => b.bytes - a.bytes);
  const aviso = banco && banco.bytes > metaMb * 1024 * 1024 ? ` (acima da meta de ${metaMb} MB)` : '';
  return [`Banco: ${banco ? mb(banco.bytes) : '?'}${aviso}`, ...tabelas.map((t) => `  ${t.nome}: ${mb(t.bytes)}`)].join('\n');
}
```

`scripts/medir-banco.ts`:
```ts
// Uso: npm run db:medir            → tamanho do banco e das tabelas
//      npm run db:medir -- --vacuum → mede, roda VACUUM FULL em contratacoes (fora de transação) e mede de novo
// Lê SUPABASE_DB_URL do .env (URI do Session pooler). Nunca imprime a URI.
// O VACUUM FULL trava a tabela contratacoes enquanto roda: não usar durante uma rodada do sync.
import { parseArgs } from 'node:util';
import pg from 'pg';
import '../worker/ambiente';
import { lerUrlBanco } from './migracao';
import { formatarTamanhos, SQL_TAMANHOS, type Tamanho } from './tamanhos';

const { values } = parseArgs({ options: { vacuum: { type: 'boolean', default: false } } });
const url = new URL(lerUrlBanco(process.env));
url.searchParams.delete('sslmode');
// O Supabase assina com CA própria (fora do repositório do sistema): conexão cifrada, sem verificar a cadeia.
const cliente = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

async function medir(titulo: string): Promise<void> {
  const { rows } = await cliente.query(SQL_TAMANHOS);
  const linhas: Tamanho[] = (rows as Array<{ nome: string; bytes: string | number }>).map((r) => ({
    nome: r.nome,
    bytes: Number(r.bytes),
  }));
  console.log(`[medir] ${titulo}\n${formatarTamanhos(linhas)}`);
}

await cliente.connect();
try {
  await medir(values.vacuum ? 'antes do VACUUM FULL' : 'agora');
  if (values.vacuum) {
    await cliente.query('set statement_timeout = 0');
    const inicio = Date.now();
    await cliente.query('vacuum (full, analyze) public.contratacoes');
    console.log(`[medir] VACUUM FULL em contratacoes: ${Math.round((Date.now() - inicio) / 1000)} s`);
    await medir('depois do VACUUM FULL');
  }
} finally {
  await cliente.end();
}
```

`package.json`, em `scripts`, depois de `"db:aplicar": "tsx scripts/aplicar-migracao.ts",`:
```json
    "db:medir": "tsx scripts/medir-banco.ts",
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run scripts/tamanhos.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add scripts/tamanhos.ts scripts/tamanhos.test.ts scripts/medir-banco.ts package.json
git commit -m "feat: npm run db:medir mostra o tamanho do banco e roda VACUUM FULL quando pedido" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 3: Migração `0005` (palavras e resumo dos itens na contratação)

**Files:**
- Create: `supabase/migrations/0005_palavras_itens.sql`, `scripts/migracoes.test.ts`, `docs/fase-3-conferencia.sql`

**Interfaces:**
- Consumes: `public.sem_acento`, `public.consulta`, `public.abertas_unicas` (0004), `itens.busca` (0001).
- Produces (SQL, só o servidor executa):
  - `contratacoes.itens_palavras tsvector` (sem posições) + índice GIN `contratacoes_itens_palavras_idx`; `contratacoes.itens_resumo jsonb`.
  - `gravar_resumo_itens(p_id text, p_palavras text, p_resumo jsonb) returns void`.
  - `abertas(q, p_ufs, p_valor_min)` com `c.itens_palavras @@ t.tq` no lugar da subconsulta em `itens`.
  - `buscar_editais(q, p_ufs, p_ibge, p_dias, p_valor_min, p_modalidades, p_limite, p_deslocamento) returns table (id, slug, objeto, orgao_nome, unidade_nome, municipio_nome, uf, codigo_ibge, valor_estimado, encerramento_em, publicada_em, modalidade_nome, srp, onde, total)` — mesmos parâmetros da 0004, sem a coluna `item_trecho`.
  - `resumo_itens(p_contratacao text)` com as mesmas colunas da 0004, lendo `itens_resumo` (sempre uma linha; zeros sem resumo).
- O site e o worker já publicados continuam funcionando depois da 0005: o site antigo lê `item_trecho` com `texto(undefined) = null` (o card só some com o trecho) e ainda lê a tabela `itens`, que só sai na 0006; o worker antigo continua gravando `itens`.

- [ ] **Step 1: Escrever o teste (falhando)**

`scripts/migracoes.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('migração 0005 (palavras dos itens)', () => {
  const sql = ler('supabase/migrations/0005_palavras_itens.sql');
  it('usa a mesma configuração de texto de itens.busca (0001)', () => {
    expect(ler('supabase/migrations/0001_init.sql')).toContain("to_tsvector('portuguese', public.sem_acento(descricao))");
    expect(sql).toContain("strip(to_tsvector('portuguese', public.sem_acento(coalesce(p_palavras, ''))))");
  });
  it('a busca nos itens usa itens_palavras e a lista não devolve mais o trecho do item', () => {
    expect(sql).toContain('c.itens_palavras @@ t.tq');
    expect(sql).not.toContain('item_trecho');
  });
  it('só o servidor grava palavras e resumo e busca editais', () => {
    expect(sql).toContain('revoke execute on function public.gravar_resumo_itens(text, text, jsonb) from public, anon, authenticated;');
    expect(sql).toContain(
      'revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;',
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL — `ENOENT: no such file or directory` em `0005_palavras_itens.sql`.

- [ ] **Step 3: Escrever a migração**

`supabase/migrations/0005_palavras_itens.sql`:
```sql
-- Edital Map · Fase 3 · Brasil todo · M1: os itens viram palavras + resumo na própria contratação.
-- itens_palavras: os lexemas de todas as descrições dos itens, sem posições, na configuração de itens.busca.
-- itens_resumo: { total, materiais, servicos, com_beneficio, exclusivos, cota, criterios[] }.
-- A busca "achou nos itens" usa as palavras; o trecho do item que bateu deixa de existir.
-- A tabela itens continua até a 0006 (conferência antes de apagar).
-- Ordem: esta migração → merge no main (worker novo) → npm run worker:reler-itens → vercel deploy --prod.

set local statement_timeout = 0;

alter table public.contratacoes
  add column itens_palavras tsvector,
  add column itens_resumo jsonb;

-- Preenche o que já existe a partir da tabela itens. As palavras são a união dos lexemas de itens.busca
-- (já sem acento e em português): o mesmo conjunto que a busca encontrava item a item.
with palavras as (
  select i.contratacao_id, array_to_tsvector(array_agg(distinct u.lexeme)) as v
  from public.itens i
  cross join lateral unnest(i.busca) as u(lexeme, positions, weights)
  group by i.contratacao_id
),
resumos as (
  select i.contratacao_id,
         jsonb_build_object(
           'total', count(*),
           'materiais', count(*) filter (where i.material_ou_servico = 'M'),
           'servicos', count(*) filter (where i.material_ou_servico = 'S'),
           'com_beneficio', count(*) filter (where i.beneficio_id is not null),
           'exclusivos', count(*) filter (where i.beneficio_id = 1),
           'cota', count(*) filter (where i.beneficio_id = 3),
           'criterios', coalesce(
             jsonb_agg(distinct i.criterio_julgamento order by i.criterio_julgamento)
               filter (where i.criterio_julgamento is not null),
             '[]'::jsonb)
         ) as r
  from public.itens i
  group by i.contratacao_id
)
update public.contratacoes c
   set itens_palavras = p.v,
       itens_resumo = s.r
  from resumos s
  left join palavras p on p.contratacao_id = s.contratacao_id
 where c.id = s.contratacao_id;

create index contratacoes_itens_palavras_idx on public.contratacoes using gin (itens_palavras);

-- O worker chama depois de ler os itens no PNCP: grava palavras + resumo sem guardar o texto das descrições.
create function public.gravar_resumo_itens(p_id text, p_palavras text, p_resumo jsonb)
returns void language sql as $$
  update public.contratacoes
     set itens_palavras = strip(to_tsvector('portuguese', public.sem_acento(coalesce(p_palavras, '')))),
         itens_resumo = p_resumo
   where id = p_id
$$;

-- Abertas que casam com a busca: no objeto/informação complementar ou nas palavras dos itens.
create or replace function public.abertas(q text, p_ufs text[] default null, p_valor_min numeric default null)
returns setof public.contratacoes language sql stable as $$
  with t as (select public.consulta(q) as tq)
  select c.*
  from public.contratacoes c, t
  where c.encerramento_em > now()
    and (t.tq is null or c.busca @@ t.tq or c.itens_palavras @@ t.tq)
    and (p_ufs is null or cardinality(p_ufs) = 0 or c.uf = any(p_ufs))
    and (p_valor_min is null or c.valor_estimado >= p_valor_min)
$$;

-- Lista: bloco objeto, depois bloco itens; dentro de cada bloco, prazo mais próximo. Sem o trecho do item.
drop function public.buscar_editais(text, text[], text, int, numeric, int[], int, int);
create function public.buscar_editais(
  q text default null, p_ufs text[] default null, p_ibge text default null, p_dias int default null,
  p_valor_min numeric default null, p_modalidades int[] default null,
  p_limite int default 50, p_deslocamento int default 0)
returns table (id text, slug text, objeto text, orgao_nome text, unidade_nome text, municipio_nome text, uf text,
               codigo_ibge text, valor_estimado numeric, encerramento_em timestamptz, publicada_em timestamptz,
               modalidade_nome text, srp boolean, onde text, total bigint)
language sql stable as $$
  with t as (select public.consulta(q) as tq),
  base as (
    select u.id, u.slug, u.objeto, u.orgao_nome, u.unidade_nome, u.municipio_nome, u.uf, u.codigo_ibge,
           u.valor_estimado, u.encerramento_em, u.publicada_em, u.modalidade_nome, u.srp,
           case when t.tq is null or u.busca @@ t.tq then 'objeto' else 'itens' end as onde_
    from public.abertas_unicas(q, p_ufs, p_valor_min, p_modalidades) u, t
    where (p_ibge is null or u.codigo_ibge = p_ibge)
      -- p_dias conta dias de calendário de Brasília (até o fim do dia hoje + p_dias), como o prazo do card.
      and (p_dias is null or u.encerramento_em < (date_trunc('day', now() at time zone 'America/Sao_Paulo') + make_interval(days => p_dias + 1)) at time zone 'America/Sao_Paulo')
  )
  select b.id, b.slug, b.objeto, b.orgao_nome, b.unidade_nome, b.municipio_nome, b.uf, b.codigo_ibge,
         b.valor_estimado, b.encerramento_em, b.publicada_em, b.modalidade_nome, b.srp, b.onde_,
         count(*) over ()
  from base b
  order by (b.onde_ = 'itens'), b.encerramento_em, b.id
  limit p_limite offset p_deslocamento
$$;

-- Resumo dos itens de um edital: as mesmas colunas da 0004, agora lidas de itens_resumo (sempre uma linha).
create or replace function public.resumo_itens(p_contratacao text)
returns table (total bigint, materiais bigint, servicos bigint, com_beneficio bigint, exclusivos bigint, cota bigint,
               criterios text[])
language sql stable as $$
  select coalesce((x.r ->> 'total')::bigint, 0),
         coalesce((x.r ->> 'materiais')::bigint, 0),
         coalesce((x.r ->> 'servicos')::bigint, 0),
         coalesce((x.r ->> 'com_beneficio')::bigint, 0),
         coalesce((x.r ->> 'exclusivos')::bigint, 0),
         coalesce((x.r ->> 'cota')::bigint, 0),
         array(select jsonb_array_elements_text(coalesce(x.r -> 'criterios', '[]'::jsonb)))
  from (select (select c.itens_resumo from public.contratacoes c where c.id = p_contratacao) as r) x
$$;

revoke execute on function public.gravar_resumo_itens(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.buscar_editais(text, text[], text, int, numeric, int[], int, int) from public, anon, authenticated;
```

- [ ] **Step 4: Escrever as consultas de conferência do controlador**

`docs/fase-3-conferencia.sql`:
```sql
-- Edital Map · Fase 3 · Brasil todo: conferências do controlador.
-- Rodar no SQL Editor do Supabase (projeto edital-map) ou com execute_sql. Uma seção por vez.

-- ── [M1-a] Logo depois da 0005 (antes do merge e da 0006) ─────────────────────────────────────────
-- A busca nos itens acha as mesmas abertas pela tabela itens e pelas palavras. Esperado: diferentes = 0
-- em todas as linhas e pela_tabela > 0 em "nitrílica" (se der 0, troque por outro termo que só aparece em itens).
with termos(t) as (values ('nitrílica'), ('botina'), ('luva'), ('capacete'), ('EPI e uniformes'), ('cadeira de rodas')),
cmp as (
  select tm.t,
         exists (select 1 from public.itens i where i.contratacao_id = c.id and i.busca @@ public.consulta(tm.t)) as antigo,
         coalesce(c.itens_palavras @@ public.consulta(tm.t), false) as novo
  from termos tm cross join public.contratacoes c
  where c.encerramento_em > now()
)
select t, count(*) filter (where antigo) as pela_tabela, count(*) filter (where novo) as pelas_palavras,
       count(*) filter (where antigo <> novo) as diferentes
from cmp group by t order by t;

-- ── [M1-b] Todo edital com itens ganhou resumo com o total certo. Esperado: 0 e 0.
select count(*) filter (where c.itens_resumo is null) as sem_resumo,
       count(*) filter (where (c.itens_resumo ->> 'total')::int <> r.total) as total_diferente
from (select contratacao_id, count(*)::int as total from public.itens group by 1) r
join public.contratacoes c on c.id = r.contratacao_id;

-- ── [M1-c] Permissões. Esperado: false, true, false.
select has_function_privilege('anon', 'public.gravar_resumo_itens(text, text, jsonb)', 'execute') as anon_grava,
       has_function_privilege('service_role', 'public.gravar_resumo_itens(text, text, jsonb)', 'execute') as servico_grava,
       has_function_privilege('anon', 'public.buscar_editais(text, text[], text, int, numeric, int[], int, int)', 'execute') as anon_busca;

-- ── [M1-d] Abertas (anotar antes e depois da 0005 e da 0006: o número não muda por causa delas).
select count(*) as abertas,
       count(*) filter (where itens_resumo is null) as abertas_sem_resumo
from public.contratacoes where encerramento_em > now();

-- ── [M2] Depois da 0006. Esperado: tabela_itens nula; fora_da_retencao = 0.
select to_regclass('public.itens') as tabela_itens,
       (select count(*) from public.contratacoes
         where encerramento_em is null or encerramento_em < now() - interval '7 days') as fora_da_retencao;
-- Esperado: sync-pncp '17 */3 * * *' e retencao-contratacoes '40 6 * * *', ativos.
select jobname, schedule, active from cron.job order by jobname;
-- No dia seguinte. Esperado: status 'succeeded'.
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'retencao-contratacoes')
 order by start_time desc limit 3;

-- ── [M3] Depois da carga do Brasil todo. Esperado: 27 linhas, todas com abertas > 0.
select uf, count(*) as abertas from public.contratacoes where encerramento_em > now() group by uf order by uf;
-- Chaves nacionais do sync. Esperado: 5 chaves (6, 8, 4, 7, 12) com status ok e ultima_data de hoje.
select chave, ultima_data, ultima_execucao, status, erro from public.sync_estado
 where chave like 'atualizacao:BR:%' order by chave;
-- Desempenho do mapa sem busca (o país inteiro). Anotar o tempo de execução.
explain (analyze, buffers) select * from public.mapa_editais(null);
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add supabase/migrations/0005_palavras_itens.sql scripts/migracoes.test.ts docs/fase-3-conferencia.sql
git commit -m "feat: migração 0005 com palavras e resumo dos itens na contratação" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

Não aplicar agora: a 0005 é aplicada pelo controlador na Task 8, logo antes do merge.

---

### Task 4: Worker grava palavras + resumo (sem linhas de itens)

**Files:**
- Modify: `worker/banco.ts`, `worker/sincronizar.ts`, `worker/resumo.ts`, `worker/reler.ts`, `worker/reler-itens.ts`, `worker/testes/fakes.ts`
- Test: `worker/banco.test.ts`, `worker/sincronizar.test.ts`, `worker/reler.test.ts`, `worker/resumo.test.ts`

**Interfaces:**
- Consumes: `palavrasDosItens`, `resumirItens`, `ResumoItensBanco` (Task 1); SQL `gravar_resumo_itens(p_id, p_palavras, p_resumo)` e `contratacoes.itens_resumo` (Task 3).
- Produces:
  - `Banco.gravarResumoItens(contratacaoId: string, palavras: string, resumo: ResumoItensBanco): Promise<void>` (rpc `gravar_resumo_itens` com `{ p_id, p_palavras, p_resumo }`).
  - `Banco.abertasSemItens(limite)` passa a ser "abertas com `itens_resumo` nulo".
  - Saem `Banco.upsertItens` e `Banco.removerItensAlem`.
  - `sincronizarItens(compras, deps): Promise<Set<string>>` grava uma vez por compra (palavras + resumo).
  - `Resumo.itensLidos` (era `itensGravados`), linha `| Itens lidos | n |`.
  - `BancoFalso.resumos: Map<string, { palavras: string; resumo: ResumoItensBanco }>` (saem `itens`, `remocoes`, `itensDe`).

- [ ] **Step 1: Testes (falhando)**

`worker/banco.test.ts`: troque o conteúdo por:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { criarBanco, emLotes } from './banco';
import type { ResumoItensBanco } from './itens';

describe('emLotes', () => {
  it('divide em lotes do tamanho pedido', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('lista vazia não gera lote', () => {
    expect(emLotes([], 500)).toEqual([]);
  });
  it('recusa tamanho inválido', () => {
    expect(() => emLotes([1], 0)).toThrow();
  });
});

/** Cliente do Supabase falso: registra cada método chamado (o contrato TS↔SQL) e responde sem erro. */
export function sbFalso(erro: { message: string } | null = null) {
  const chamadas: unknown[][] = [];
  const consulta: Record<string, unknown> = {};
  for (const metodo of ['from', 'select', 'delete', 'in', 'like']) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, ...args]);
      return consulta;
    };
  }
  consulta.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: erro }).then(ok);
  consulta.rpc = (...args: unknown[]) => {
    chamadas.push(['rpc', ...args]);
    return Promise.resolve({ data: null, error: erro });
  };
  return { sb: consulta as unknown as SupabaseClient, chamadas };
}

const RESUMO: ResumoItensBanco = { total: 2, materiais: 2, servicos: 0, com_beneficio: 1, exclusivos: 1, cota: 0, criterios: ['Menor preço'] };

describe('gravarResumoItens', () => {
  it('chama gravar_resumo_itens com p_id, p_palavras e p_resumo', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).gravarResumoItens('C1', 'Luva nitrílica', RESUMO);
    expect(chamadas).toEqual([['rpc', 'gravar_resumo_itens', { p_id: 'C1', p_palavras: 'Luva nitrílica', p_resumo: RESUMO }]]);
  });
  it('erro do banco vira exceção com contexto', async () => {
    const { sb } = sbFalso({ message: 'função não existe' });
    await expect(criarBanco(sb).gravarResumoItens('C1', 'x', RESUMO)).rejects.toThrow('gravar resumo dos itens: função não existe');
  });
});
```

`worker/sincronizar.test.ts`:
1. No teste `'itens falham numa compra alterada: …'`, troque `expect(banco.itensDe(idDe(4))).toHaveLength(1);` por:
```ts
    expect(banco.resumos.get(idDe(4))?.resumo.total).toBe(1);
```
2. No teste `'caminho feliz: grava o timestamp real e os itens'`, troque `expect(banco.itensDe(idDe(1))).toHaveLength(1);` por:
```ts
    expect(banco.resumos.get(idDe(1))?.resumo.total).toBe(1);
```
3. Troque o bloco inteiro `describe('sincronizarItens', () => { … });` **e** a função `async function itemLinha(numero: number) { … }` logo abaixo dele por:
```ts
describe('sincronizarItens', () => {
  const COMPRA = { id: 'C1', cnpj: '1', ano: 2026, sequencial: 1 };
  it('grava uma vez as palavras e o resumo dos itens, sem guardar linhas de itens', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(
      banco,
      clienteFalso({
        itens: () => [
          itemBruto(1),
          itemBruto(2, { descricao: 'Luva nitrílica tamanho M', tipoBeneficio: 1, criterioJulgamentoNome: 'Menor preço' }),
        ],
      }),
    );
    const gravadas = await sincronizarItens([COMPRA], deps);
    expect(gravadas.has('C1')).toBe(true);
    expect(banco.resumos.get('C1')).toEqual({
      palavras: 'Corda material: polietileno, tipo: trançada, diâmetro: 40, aplicação: uso geral Luva nitrílica tamanho M',
      resumo: { total: 2, materiais: 2, servicos: 0, com_beneficio: 1, exclusivos: 1, cota: 0, criterios: ['Menor preço'] },
    });
    expect(deps.resumo.itensLidos).toBe(2);
  });
  it('com item inválido, grava a partir dos válidos e avisa', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(banco, clienteFalso({ itens: () => [itemBruto(1), { numeroItem: 2 }] }));
    await sincronizarItens([COMPRA], deps);
    expect(banco.resumos.get('C1')?.resumo.total).toBe(1);
    expect(deps.resumo.avisos[0].chave).toBe('item:C1#2');
  });
  it('lista vazia mantém palavras e resumo antigos, gera aviso e conta como sucesso', async () => {
    const banco = new BancoFalso();
    const antigo = { palavras: 'antigo', resumo: { total: 9, materiais: 9, servicos: 0, com_beneficio: 0, exclusivos: 0, cota: 0, criterios: [] } };
    banco.resumos.set('C1', antigo);
    const deps = montarDeps(banco, clienteFalso({ itens: () => [] }));
    const gravadas = await sincronizarItens([COMPRA], deps);
    expect(banco.resumos.get('C1')).toEqual(antigo);
    expect(deps.resumo.avisos).toEqual([{ chave: 'itens:C1', mensagem: 'lista de itens vazia; palavras e resumo antigos mantidos' }]);
    expect(gravadas.has('C1')).toBe(true);
  });
  it('falha ao listar itens vira aviso, sem derrubar a rodada', async () => {
    const banco = new BancoFalso();
    const deps = montarDeps(
      banco,
      clienteFalso({
        itens: () => {
          throw new Error('HTTP 503');
        },
      }),
    );
    await sincronizarItens([COMPRA], deps);
    expect(deps.resumo.avisos).toEqual([{ chave: 'itens:C1', mensagem: 'HTTP 503' }]);
    expect(deps.resumo.erros).toEqual([]);
    expect(banco.resumos.has('C1')).toBe(false);
  });
});
```

`worker/reler.test.ts`: troque `expect(banco.itensDe(idDe(3))[0]).toMatchObject({ beneficio_id: 1, criterio_julgamento: 'Menor preço' });` por:
```ts
    expect(banco.resumos.get(idDe(3))?.resumo).toMatchObject({ exclusivos: 1, criterios: ['Menor preço'] });
```

`worker/resumo.test.ts`: troque `expect(t).toContain('| Itens gravados | 42 |');` por:
```ts
    expect(t).toContain('| Itens lidos | 42 |');
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/banco.test.ts worker/sincronizar.test.ts worker/reler.test.ts worker/resumo.test.ts`
Expected: FAIL — `gravarResumoItens is not a function`, `banco.resumos` indefinido, `| Itens lidos |` ausente.

- [ ] **Step 3: Banco**

`worker/banco.ts`:
1. Troque o import de `./mapear` e acrescente o de `./itens`:
```ts
import type { ResumoItensBanco } from './itens';
import type { ChaveCompra, LinhaContratacao } from './mapear';
```
2. Na interface `Banco`, troque as quatro linhas seguidas `upsertItens(…)`, `removerItensAlem(…)`, `atualizacoesConhecidas(…)` e `abertasSemItens(…)` por:
```ts
  /** Palavras de todas as descrições + resumo dos itens de uma compra (função SQL gravar_resumo_itens; o texto não é guardado). */
  gravarResumoItens(contratacaoId: string, palavras: string, resumo: ResumoItensBanco): Promise<void>;
  atualizacoesConhecidas(ids: string[]): Promise<Map<string, string>>;
  /** Abertas ainda sem resumo dos itens, prazo mais próximo primeiro (catch-up). */
  abertasSemItens(limite: number): Promise<ChaveCompra[]>;
```
3. Em `criarBanco`, troque os métodos `upsertItens` e `removerItensAlem` por:
```ts
    async gravarResumoItens(contratacaoId, palavras, resumo) {
      const { error } = await sb.rpc('gravar_resumo_itens', { p_id: contratacaoId, p_palavras: palavras, p_resumo: resumo });
      falhar('gravar resumo dos itens', error);
    },
```
4. Troque o método `abertasSemItens` por:
```ts
    async abertasSemItens(limite) {
      const { data, error } = await sb
        .from('contratacoes')
        .select('id, cnpj, ano, sequencial')
        .gt('encerramento_em', agora().toISOString())
        .is('itens_resumo', null)
        .order('encerramento_em', { ascending: true })
        .limit(limite);
      falhar('listar abertas sem itens', error);
      return (data ?? []).map((l) => ({
        id: l.id as string,
        cnpj: l.cnpj as string,
        ano: l.ano as number,
        sequencial: l.sequencial as number,
      }));
    },
```

- [ ] **Step 4: Sincronização, resumo da rodada e releitura**

`worker/sincronizar.ts`:
1. Acrescente depois do import de `./datas`:
```ts
import { palavrasDosItens, resumirItens } from './itens';
```
2. Troque a função `sincronizarItens` inteira por:
```ts
/**
 * Lê os itens de cada compra no PNCP e grava, numa chamada só, as palavras de todas as descrições e o resumo
 * (o texto dos itens não fica no banco). Devolve os ids das compras concluídas.
 */
export async function sincronizarItens(compras: ChaveCompra[], deps: Dependencias): Promise<Set<string>> {
  const gravadas = new Set<string>();
  await Promise.all(
    compras.map(async (compra) => {
      try {
        const brutos = await deps.cliente.listarItens(compra);
        const porNumero = new Map<number, LinhaItem>();
        for (const bruto of brutos) {
          const v = validarItem(bruto, compra.id);
          if (v.ok) porNumero.set(v.valor.numeroItem, itemParaLinha(v.valor, compra.id));
          else deps.resumo.registrarAviso(`item:${v.id}`, v.motivo);
        }
        const itens = [...porNumero.values()];
        if (itens.length === 0) {
          // Lista vazia pode ser resposta transitória do PNCP: não apagar o que já temos.
          deps.resumo.registrarAviso(`itens:${compra.id}`, 'lista de itens vazia; palavras e resumo antigos mantidos');
        } else {
          await deps.banco.gravarResumoItens(compra.id, palavrasDosItens(itens.map((i) => i.descricao)), resumirItens(itens));
        }
        deps.resumo.contarItens(1, itens.length);
        gravadas.add(compra.id);
      } catch (erro) {
        deps.resumo.registrarAviso(`itens:${compra.id}`, mensagemDe(erro));
      }
    }),
  );
  return gravadas;
}
```

`worker/resumo.ts`:
1. Troque `itensGravados = 0;` por `itensLidos = 0;`.
2. Em `contarItens`, troque `this.itensGravados += itens;` por `this.itensLidos += itens;`.
3. Em `texto`, troque `` `| Itens gravados | ${this.itensGravados} |`, `` por:
```ts
      `| Itens lidos | ${this.itensLidos} |`,
```

`worker/reler.ts`: troque o comentário da função por:
```ts
/**
 * Relê os itens de todas as compras abertas e regrava palavras + resumo (útil quando a regra do resumo muda).
 * Páginas de compras por id; cada lote vai para `sincronizarItens`, que respeita o paralelismo do cliente.
 */
```

`worker/reler-itens.ts`: troque `const resumo = new Resumo('Releitura dos itens das compras abertas');` por:
```ts
const resumo = new Resumo('Releitura dos itens das compras abertas (palavras e resumo)');
```

- [ ] **Step 5: Banco falso**

`worker/testes/fakes.ts`:
1. Troque os imports do topo por:
```ts
import { readFileSync } from 'node:fs';
import type { Banco, EstadoSync } from '../banco';
import type { ResumoItensBanco } from '../itens';
import type { ChaveCompra, LinhaContratacao } from '../mapear';
import type { FiltroContratacoes, PaginaContratacoes } from '../pncp/cliente';
import { Resumo } from '../resumo';
import type { Dependencias } from '../sincronizar';
```
2. Troque a classe `BancoFalso` inteira por:
```ts
export type ResumoGravado = { palavras: string; resumo: ResumoItensBanco };

export class BancoFalso implements Banco {
  contratacoes = new Map<string, LinhaContratacao>();
  /** Palavras + resumo dos itens por compra (o banco real chama gravar_resumo_itens). */
  resumos = new Map<string, ResumoGravado>();
  estados = new Map<string, EstadoSync>();

  async upsertContratacoes(linhas: LinhaContratacao[]): Promise<void> {
    for (const l of linhas) this.contratacoes.set(l.id, l);
  }
  async gravarResumoItens(contratacaoId: string, palavras: string, resumo: ResumoItensBanco): Promise<void> {
    this.resumos.set(contratacaoId, { palavras, resumo });
  }
  async atualizacoesConhecidas(ids: string[]): Promise<Map<string, string>> {
    const mapa = new Map<string, string>();
    for (const id of ids) {
      const c = this.contratacoes.get(id);
      if (c) mapa.set(id, c.atualizada_pncp_em);
    }
    return mapa;
  }
  async abertasSemItens(limite: number): Promise<ChaveCompra[]> {
    return [...this.contratacoes.values()]
      .filter((c) => c.encerramento_em !== null && Date.parse(c.encerramento_em) > AGORA.getTime())
      .filter((c) => !this.resumos.has(c.id))
      .slice(0, limite)
      .map((c) => ({ id: c.id, cnpj: c.cnpj, ano: c.ano, sequencial: c.sequencial }));
  }
  async abertas(depoisDe: string | null, limite: number): Promise<ChaveCompra[]> {
    return [...this.contratacoes.values()]
      .filter((c) => c.encerramento_em !== null && Date.parse(c.encerramento_em) > AGORA.getTime())
      .filter((c) => depoisDe === null || c.id > depoisDe)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, limite)
      .map((c) => ({ id: c.id, cnpj: c.cnpj, ano: c.ano, sequencial: c.sequencial }));
  }
  async lerEstado(chave: string): Promise<EstadoSync | null> {
    return this.estados.get(chave) ?? null;
  }
  async gravarEstado(estado: EstadoSync): Promise<void> {
    this.estados.set(estado.chave, estado);
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run worker`
Expected: PASS. Depois `npm run typecheck` sem erros (nenhum uso restante de `upsertItens`, `removerItensAlem`, `itensDe`, `itensGravados`; conferir com `grep -rn "upsertItens\|removerItensAlem\|itensDe\|itensGravados" worker` → nada).

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add worker
git commit -m "feat: worker grava palavras e resumo dos itens em vez das linhas de itens" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 5: `worker:conferir` com itens do PNCP contra o resumo

**Files:**
- Modify: `worker/conferir.ts`, `worker/conferencia/relatorio.ts`
- Test: `worker/conferencia/relatorio.test.ts`

**Interfaces:**
- Consumes: `totalDeItens(resumo: unknown): number` (Task 1); coluna `itens_resumo` (Task 3).
- Produces: `Idempotencia = { antes: { contratacoes: number; comItens: number }; depois: { contratacoes: number; comItens: number }; novas: number; inexplicadas: string[] }`. `conferir.ts` não lê mais a tabela `itens`.

- [ ] **Step 1: Teste (falhando)**

`worker/conferencia/relatorio.test.ts`:
1. Na função `dados`, troque a linha `idempotencia: …` por:
```ts
    idempotencia: { antes: { contratacoes: 10, comItens: 8 }, depois: { contratacoes: 10, comItens: 8 }, novas: 0, inexplicadas: [] },
```
2. No `describe('montarRelatorio')`, acrescente:
```ts
  it('idempotência conta contratações e as que têm palavras e resumo dos itens', () => {
    expect(montarRelatorio(dados())).toContain('Contratações 10 → 10; com palavras e resumo dos itens 8 → 8.');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/conferencia/relatorio.test.ts`
Expected: FAIL — erro de tipo/expectativa (`itens` em vez de `comItens`; texto ausente).

- [ ] **Step 3: Implementar**

`worker/conferencia/relatorio.ts`:
1. Troque o tipo `Idempotencia` por:
```ts
export type Idempotencia = {
  antes: { contratacoes: number; comItens: number };
  depois: { contratacoes: number; comItens: number };
  novas: number;
  inexplicadas: string[];
};
```
2. Em `montarRelatorio`, troque a linha `` `Contratações ${i.antes.contratacoes} → ${i.depois.contratacoes}; itens ${i.antes.itens} → ${i.depois.itens}.`, `` por:
```ts
      `Contratações ${i.antes.contratacoes} → ${i.depois.contratacoes}; com palavras e resumo dos itens ${i.antes.comItens} → ${i.depois.comItens}.`,
```

`worker/conferir.ts`:
1. Acrescente o import, depois do import de `./datas`:
```ts
import { totalDeItens } from './itens';
```
2. Troque a função `listarCandidatas` inteira por:
```ts
async function listarCandidatas(): Promise<Candidata[]> {
  const candidatas: Candidata[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb
      .from('contratacoes')
      .select('id, cnpj, ano, sequencial, uf, modalidade_id, valor_estimado, link_origem, itens_resumo')
      .gt('encerramento_em', agora.toISOString())
      .order('id')
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    for (const l of data ?? []) {
      candidatas.push({
        id: l.id,
        cnpj: l.cnpj,
        ano: l.ano,
        sequencial: l.sequencial,
        uf: l.uf,
        modalidade_id: l.modalidade_id,
        valor_estimado: l.valor_estimado === null ? null : Number(l.valor_estimado),
        link_origem: l.link_origem,
        muitos_itens: totalDeItens(l.itens_resumo) > 10,
      });
    }
    if (!data || data.length < 1000) return candidatas;
  }
}
```
3. Em `conferirAmostra`, troque o trecho de dentro do `try` por:
```ts
      const linha = await sb.from('contratacoes').select('*').eq('id', candidata.id).single();
      if (linha.error) throw new Error(linha.error.message);
      // Os itens não ficam mais no banco: compara o total do resumo com a lista do PNCP.
      const [detalhe, itensPncp] = await Promise.all([cliente.detalheCompra(candidata), cliente.listarItens(candidata)]);
      resultado = compararCompra(
        linha.data as LinhaContratacao,
        detalhe,
        totalDeItens(linha.data.itens_resumo),
        itensPncp.length,
        execucoes.get(chaveEstado(candidata.uf, candidata.modalidade_id)),
      );
```
4. Troque a função `contarTabelas` por:
```ts
async function contarTabelas() {
  const c = await sb.from('contratacoes').select('id', { count: 'exact', head: true });
  const r = await sb.from('contratacoes').select('id', { count: 'exact', head: true }).not('itens_resumo', 'is', null);
  if (c.error || r.error) throw new Error((c.error ?? r.error)?.message);
  return { contratacoes: c.count ?? 0, comItens: r.count ?? 0 };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run worker/conferencia && npm run typecheck`
Expected: PASS; typecheck sem erros. `grep -n "from('itens')" worker/conferir.ts` → nada.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add worker/conferir.ts worker/conferencia/relatorio.ts worker/conferencia/relatorio.test.ts
git commit -m "feat: conferência compara o resumo dos itens com a lista do PNCP" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 6: Itens do edital vêm do PNCP na hora

**Files:**
- Create: `lib/servidor/itensPncp.ts`, `lib/servidor/itensPncp.test.ts`
- Modify: `lib/servidor/consultas.ts`, `app/edital/[slug]/page.tsx`, `components/edital/ListaItens.tsx`
- Test: `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `BASE_PNCP`, `PAGINA_ITENS`, `MAX_PAGINAS_ITENS` de `worker/config.ts`; `itemParaLinha`, `ChaveCompra`, `LinhaItem` de `worker/mapear.ts`; `validarItem` de `worker/pncp/esquemas.ts`; `ItemEdital` de `lib/tipos.ts`.
- Produces:
  - `paraItemEdital(l: LinhaItem): ItemEdital`
  - `itensDoPncp(compra: ChaveCompra, limite: number, buscar?: typeof fetch, base?: string): Promise<ItemEdital[]>` — lança erro em rede/timeout (8 s)/HTTP de erro. `base` padrão: `process.env.PNCP_ITENS_BASE || BASE_PNCP` (a variável só existe para simular falha).
  - `itensDoEdital(compra: ChaveCompra, limite: number): Promise<ItemEdital[] | null>` em `consultas.ts` (cache de 5 min; `null` = PNCP indisponível; falha não fica no cache).
  - `ListaItens({ itens: ItemEdital[] | null; total: number; slug: string; todos: boolean })`.

- [ ] **Step 1: Testes (falhando)**

`lib/servidor/itensPncp.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { itensDoPncp } = await import('./itensPncp');

const compra = { id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982 };
const item = (numero: number, extra: Record<string, unknown> = {}) => ({
  numeroItem: numero,
  descricao: ` Luva nitrílica ${numero} `,
  quantidade: 10,
  unidadeMedida: 'Par',
  valorUnitarioEstimado: 2.5,
  valorTotal: 25,
  materialOuServico: 'M',
  orcamentoSigiloso: false,
  temResultado: false,
  ...extra,
});
const pagina = (de: number, quantos: number) => Array.from({ length: quantos }, (_, i) => item(de + i));

function fetchFalso(respostas: Array<Response | Error>) {
  const urls: string[] = [];
  const f = (async (url: string | URL | Request) => {
    urls.push(String(url));
    const proxima = respostas.shift();
    if (!proxima) throw new Error('teste sem resposta preparada');
    if (proxima instanceof Error) throw proxima;
    return proxima;
  }) as typeof fetch;
  return { f, urls };
}
const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

describe('itensDoPncp', () => {
  it('lê a base de itens do PNCP e mapeia como a lista do edital (mesma limpeza do worker)', async () => {
    const { f, urls } = fetchFalso([ok([item(1, { tipoBeneficio: 1, tipoBeneficioNome: 'Exclusiva ME/EPP', criterioJulgamentoNome: 'Menor preço' })])]);
    const itens = await itensDoPncp(compra, 50, f, 'https://pncp.gov.br/api/pncp');
    expect(urls).toEqual(['https://pncp.gov.br/api/pncp/v1/orgaos/00394452000103/compras/2026/21982/itens?pagina=1&tamanhoPagina=50']);
    expect(itens).toEqual([
      {
        numero: 1,
        descricao: 'Luva nitrílica 1',
        quantidade: 10,
        unidade: 'Par',
        valor_unitario_estimado: 2.5,
        valor_total_estimado: 25,
        sigiloso: false,
        material_ou_servico: 'M',
        beneficio_id: 1,
        beneficio_nome: 'Exclusiva ME/EPP',
        criterio_julgamento: 'Menor preço',
      },
    ]);
  });
  it('para no limite pedido sem pedir a página seguinte', async () => {
    const { f, urls } = fetchFalso([ok(pagina(1, 50))]);
    expect(await itensDoPncp(compra, 50, f)).toHaveLength(50);
    expect(urls).toHaveLength(1);
  });
  it('com limite maior, pede as páginas seguintes até vir uma incompleta', async () => {
    const { f, urls } = fetchFalso([ok(pagina(1, 50)), ok(pagina(51, 3))]);
    const itens = await itensDoPncp(compra, 2000, f);
    expect(itens.map((i) => i.numero)).toEqual(Array.from({ length: 53 }, (_, i) => i + 1));
    expect(urls[1]).toContain('pagina=2&tamanhoPagina=50');
  });
  it('204 é edital sem itens', async () => {
    const { f } = fetchFalso([new Response(null, { status: 204 })]);
    expect(await itensDoPncp(compra, 50, f)).toEqual([]);
  });
  it('ignora item inválido e mantém os outros', async () => {
    const { f } = fetchFalso([ok([item(1), { numeroItem: 2 }])]);
    expect((await itensDoPncp(compra, 50, f)).map((i) => i.numero)).toEqual([1]);
  });
  it('HTTP de erro e rede fora viram exceção', async () => {
    await expect(itensDoPncp(compra, 50, fetchFalso([new Response('x', { status: 500 })]).f)).rejects.toThrow('itens do PNCP: HTTP 500');
    await expect(itensDoPncp(compra, 50, fetchFalso([new TypeError('fetch failed')]).f)).rejects.toThrow('fetch failed');
  });
  it('a base pode ser trocada (simulação de falha)', async () => {
    const { f, urls } = fetchFalso([ok([])]);
    await itensDoPncp(compra, 50, f, 'http://127.0.0.1:9');
    expect(urls[0].startsWith('http://127.0.0.1:9/v1/orgaos/')).toBe(true);
  });
});
```

`lib/servidor/consultas.test.ts`: troque o arquivo inteiro por:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Chamadas de rpc registradas: o contrato TS↔SQL é o nome da função e as chaves dos argumentos.
const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
let respostaRpc: unknown = [];

vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    // Serve os três jeitos de consumir uma rpc: direto (await), `.range()` (mapa) e `.single()` (resumo).
    rpc: (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      const resposta = Promise.resolve({ data: respostaRpc, error: null });
      return {
        range: () => resposta,
        single: () => resposta,
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko),
      };
    },
  }),
}));

const { buscarEditais, itensDoEdital, pontosDoMapa, resumoItens } = await import('./consultas');

const compra = (id: string) => ({ id, cnpj: '00394452000103', ano: 2026, sequencial: 21982 });

describe('itensDoEdital (PNCP na hora)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devolve os itens do PNCP mapeados para a lista do edital', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ numeroItem: 1, descricao: 'Luva nitrílica', materialOuServico: 'M' }]), { status: 200 })),
    );
    expect(await itensDoEdital(compra('ok-1'), 50)).toEqual([
      expect.objectContaining({ numero: 1, descricao: 'Luva nitrílica', material_ou_servico: 'M' }),
    ]);
  });

  it('PNCP fora do ar vira null (a página mostra "Itens indisponíveis agora")', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await itensDoEdital(compra('falha-1'), 50)).toBeNull();
  });

  it('falha não fica no cache: a próxima visita tenta de novo', async () => {
    const f = vi.fn(async () => Promise.reject(new TypeError('fetch failed')));
    vi.stubGlobal('fetch', f);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await itensDoEdital(compra('falha-2'), 50);
    await itensDoEdital(compra('falha-2'), 50);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('contrato com as funções SQL (0005)', () => {
  beforeEach(() => {
    chamadas.length = 0;
    respostaRpc = [];
  });

  const chaves = (args: Record<string, unknown>) => Object.keys(args).sort();

  it('buscarEditais chama buscar_editais com os argumentos da 0005', async () => {
    await buscarEditais({ q: 'luva', uf: 'SC', ibge: '4209102', dias: 7, deslocamento: 50, valorMin: 1000, modalidades: [6, 8] });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(
      ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento'].sort(),
    );
    expect(chamadas[0].args).toMatchObject({ q: 'luva', p_ufs: ['SC'], p_valor_min: 1000, p_modalidades: [6, 8], p_limite: 50, p_deslocamento: 50 });
  });

  it('buscarEditais manda todas as chaves também sem filtros', async () => {
    await buscarEditais({ q: null, uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null });
    expect(chamadas[0].nome).toBe('buscar_editais');
    expect(chaves(chamadas[0].args)).toEqual(
      ['q', 'p_ufs', 'p_ibge', 'p_dias', 'p_valor_min', 'p_modalidades', 'p_limite', 'p_deslocamento'].sort(),
    );
    expect(chamadas[0].args).toMatchObject({ q: null, p_ufs: null, p_valor_min: null, p_modalidades: null });
  });

  it('pontosDoMapa chama mapa_editais com os argumentos da 0004', async () => {
    await pontosDoMapa({ q: 'bota', uf: 'PR', ibge: null, dias: 7, deslocamento: 0, valorMin: 5000, modalidades: [4] });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('mapa_editais');
    expect(chaves(chamadas[0].args)).toEqual(['q', 'p_ufs', 'p_dias', 'p_valor_min', 'p_modalidades'].sort());
    expect(chamadas[0].args).toMatchObject({ q: 'bota', p_ufs: ['PR'], p_valor_min: 5000, p_modalidades: [4] });
  });

  it('resumoItens chama resumo_itens e mapeia as colunas para ResumoItens', async () => {
    respostaRpc = { total: 12, materiais: 10, servicos: 2, com_beneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] };
    const r = await resumoItens('contratacao-1');
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('resumo_itens');
    expect(chaves(chamadas[0].args)).toEqual(['p_contratacao']);
    expect(chamadas[0].args.p_contratacao).toBe('contratacao-1');
    expect(r).toEqual({ total: 12, materiais: 10, servicos: 2, comBeneficio: 9, exclusivos: 6, cota: 3, criterios: ['Menor preço'] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor`
Expected: FAIL — `Failed to resolve import "./itensPncp"`; em `consultas.test.ts`, `itensDoEdital` recebe um objeto (assinatura antiga recebe `id: string`) e consulta o Supabase falso sem `from`.

- [ ] **Step 3: Implementar a leitura no PNCP**

`lib/servidor/itensPncp.ts`:
```ts
import 'server-only';
import { BASE_PNCP, MAX_PAGINAS_ITENS, PAGINA_ITENS } from '@/worker/config';
import { itemParaLinha, type ChaveCompra, type LinhaItem } from '@/worker/mapear';
import { validarItem } from '@/worker/pncp/esquemas';
import type { ItemEdital } from '../tipos';

/** Tempo máximo de cada chamada à base de itens antes de desistir (a página mostra "Itens indisponíveis agora"). */
const TIMEOUT_MS = 8_000;

export function paraItemEdital(l: LinhaItem): ItemEdital {
  return {
    numero: l.numero,
    descricao: l.descricao,
    quantidade: l.quantidade,
    unidade: l.unidade,
    valor_unitario_estimado: l.valor_unitario_estimado,
    valor_total_estimado: l.valor_total_estimado,
    sigiloso: l.sigiloso,
    material_ou_servico: l.material_ou_servico,
    beneficio_id: l.beneficio_id,
    beneficio_nome: l.beneficio_nome,
    criterio_julgamento: l.criterio_julgamento,
  };
}

/**
 * Itens do edital direto da base de itens do PNCP (sem o limite de chamadas da consulta), em ordem de número,
 * até `limite`. Mesma validação e mapeamento do worker. Rede fora, timeout ou HTTP de erro lançam exceção.
 * `base` existe para simular falha (PNCP_ITENS_BASE apontando para um endereço que não responde).
 */
export async function itensDoPncp(
  compra: ChaveCompra,
  limite: number,
  buscar: typeof fetch = fetch,
  base: string = process.env.PNCP_ITENS_BASE || BASE_PNCP,
): Promise<ItemEdital[]> {
  const porNumero = new Map<number, ItemEdital>();
  for (let pagina = 1; pagina <= MAX_PAGINAS_ITENS && porNumero.size < limite; pagina++) {
    const url = `${base}/v1/orgaos/${compra.cnpj}/compras/${compra.ano}/${compra.sequencial}/itens?pagina=${pagina}&tamanhoPagina=${PAGINA_ITENS}`;
    const resp = await buscar(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (resp.status === 204) break;
    if (!resp.ok) throw new Error(`itens do PNCP: HTTP ${resp.status}`);
    const corpo = await resp.text();
    const lote: unknown = corpo ? JSON.parse(corpo) : [];
    if (!Array.isArray(lote)) throw new Error('itens do PNCP: resposta fora do formato');
    for (const bruto of lote) {
      const v = validarItem(bruto, compra.id);
      if (v.ok) porNumero.set(v.valor.numeroItem, paraItemEdital(itemParaLinha(v.valor, compra.id)));
    }
    if (lote.length < PAGINA_ITENS) break;
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero).slice(0, limite);
}
```

`lib/servidor/consultas.ts`:
1. Troque os imports do topo por:
```ts
import 'server-only';
import type { ChaveCompra } from '@/worker/mapear';
import { criarCache } from '../cache';
import { chaveFiltros } from '../filtros';
import type { Edital, EditalResumo, FiltrosBusca, ItemEdital, PontoMapa, ResultadoBusca, ResumoItens } from '../tipos';
import { itensDoPncp } from './itensPncp';
import { supabaseServidor } from './supabase';
```
2. Troque a função `itensDoEdital` inteira (com o comentário acima dela) por:
```ts
/** Itens do edital vindos do PNCP na hora (cache de 5 min; falha não fica no cache). `null` = PNCP indisponível agora. */
export function itensDoEdital(compra: ChaveCompra, limite: number): Promise<ItemEdital[] | null> {
  return cache(`itens:${compra.id}:${limite}`, () => itensDoPncp(compra, limite)).catch((erro: unknown) => {
    console.error(erro);
    return null;
  });
}
```
3. Troque o comentário de `resumoItens` por:
```ts
/** Tipos, ME/EPP e critérios dos itens do edital (função SQL `resumo_itens`, que lê `itens_resumo`). */
```

- [ ] **Step 4: Página do edital e lista de itens**

`components/edital/ListaItens.tsx`: troque a assinatura e a primeira linha do corpo por:
```tsx
export function ListaItens({ itens, total, slug, todos }: { itens: ItemEdital[] | null; total: number; slug: string; todos: boolean }) {
  if (itens === null) {
    return (
      <p className="text-ink-muted">
        Itens indisponíveis agora. O PNCP não respondeu: veja no edital oficial ou tente de novo em alguns minutos.
      </p>
    );
  }
  if (itens.length === 0) return <p className="text-ink-muted">O PNCP ainda não trouxe os itens deste edital. Veja no edital oficial.</p>;
```
(o restante do componente fica igual).

`app/edital/[slug]/page.tsx`:
1. Troque o bloco `const [itens, resumo, atualizado] = await Promise.all([ … ]);` por:
```tsx
  const [itens, resumo, atualizado] = await Promise.all([
    itensDoEdital(e, todos ? 2000 : 50),
    resumoItens(e.id).catch(() => RESUMO_VAZIO),
    atualizadoEm(),
  ]);
  // O total vem do resumo gravado pelo worker; sem resumo ainda, do que o PNCP devolveu agora.
  const totalItens = Math.max(resumo.total, itens?.length ?? 0);
```
2. Troque `<PrincipaisInformacoes edital={e} resumo={{ ...resumo, total: resumo.total || itens.total }} agora={agora} />` por:
```tsx
        <PrincipaisInformacoes edital={e} resumo={{ ...resumo, total: totalItens }} agora={agora} />
```
3. Troque `<ListaItens itens={itens.itens} total={itens.total} slug={e.slug} todos={todos} />` por:
```tsx
              <ListaItens itens={itens} total={totalItens} slug={e.slug} todos={todos} />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run lib/servidor && npm run typecheck && npm run build`
Expected: PASS (7 + 7 testes); typecheck e build sem erros. `grep -rn "from('itens')" lib app components` → nada.

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add lib/servidor/itensPncp.ts lib/servidor/itensPncp.test.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts "app/edital/[slug]/page.tsx" components/edital/ListaItens.tsx
git commit -m "feat: itens do edital vêm do PNCP na hora, com aviso quando o PNCP não responde" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 7: Busca sem o trecho do item ("Encontrado nos itens")

**Files:**
- Modify: `lib/tipos.ts`, `lib/servidor/consultas.ts`, `components/inicio/CardCompacto.tsx`
- Test: `lib/servidor/consultas.test.ts`

**Interfaces:**
- Consumes: `buscar_editais` da 0005 (sem `item_trecho`).
- Produces: `EditalResumo` sem `item_trecho`; o card mostra "Encontrado nos itens" quando `onde === 'itens'`.

- [ ] **Step 1: Teste (falhando)**

`lib/servidor/consultas.test.ts`, no `describe('contrato com as funções SQL (0005)')`, acrescente:
```ts
  it('buscarEditais mapeia as colunas da 0005, sem item_trecho', async () => {
    respostaRpc = [
      {
        id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
        municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: '1000.50',
        encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
        onde: 'itens', total: 1,
      },
    ];
    const r = await buscarEditais({ q: 'nitrilica', uf: null, ibge: null, dias: null, deslocamento: 0, valorMin: null, modalidades: null });
    expect(r).toEqual({
      total: 1,
      editais: [
        {
          id: 'C1', slug: '00394452000103-2026-1', objeto: 'Luvas', orgao_nome: 'Município de Joinville', unidade_nome: null,
          municipio_nome: 'Joinville', uf: 'SC', codigo_ibge: '4209102', valor_estimado: 1000.5,
          encerramento_em: '2026-10-20T13:00:00+00:00', publicada_em: null, modalidade_nome: 'Pregão - Eletrônico', srp: false,
          onde: 'itens',
        },
      ],
    });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/servidor/consultas.test.ts`
Expected: FAIL — o objeto devolvido tem `item_trecho: null` a mais.

- [ ] **Step 3: Implementar**

`lib/tipos.ts`: em `EditalResumo`, apague a linha `  item_trecho: string | null;`.

`lib/servidor/consultas.ts`: em `buscarEditais`, apague a linha `        item_trecho: texto(l.item_trecho),`.

`components/inicio/CardCompacto.tsx`:
1. Troque `import { assunto, limparEspacos, nomeProprio, semGritos } from '@/lib/texto';` por:
```tsx
import { assunto, nomeProprio } from '@/lib/texto';
```
2. Troque o bloco
```tsx
      {edital.onde === 'itens' && edital.item_trecho ? (
        <span className="truncate text-xs text-rio">Encontrado nos itens: {semGritos(limparEspacos(edital.item_trecho))}</span>
      ) : null}
```
por:
```tsx
      {edital.onde === 'itens' ? <span className="text-xs text-rio">Encontrado nos itens</span> : null}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/servidor/consultas.test.ts && npm run typecheck && npm run build`
Expected: PASS; `grep -rn "item_trecho" lib components app` → nada.

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/tipos.ts lib/servidor/consultas.ts lib/servidor/consultas.test.ts components/inicio/CardCompacto.tsx
git commit -m "feat: card diz só \"Encontrado nos itens\", sem o trecho do item" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 8 (controlador): publicar o M1 e medir

**Files:**
- Create: `docs/fase-3-metricas.md`

Todos os passos são do controlador (banco, PNCP, GitHub, Vercel).

- [ ] **Step 1: Pré-condições**

`git status` limpo no `fase-3-brasil-todo`; `npm test && npm run typecheck && npm run build` passam. No SQL Editor: `select name from supabase_migrations.schema_migrations order by version;` contém `visual` (0004 aplicada) e não contém `palavras_itens`. `gh run list --workflow sync.yml --limit 1` sem rodada `in_progress`.

- [ ] **Step 2: Medir antes**

`npm run db:medir` e a seção [M1-d] de `docs/fase-3-conferencia.sql`. Anotar banco, `itens`, `contratacoes` e abertas.

- [ ] **Step 3: Aplicar a 0005**

`npm run db:aplicar -- supabase/migrations/0005_palavras_itens.sql`
Expected: `[migração] palavras_itens aplicada`.

- [ ] **Step 4: Conferir (antes de qualquer rodada do worker antigo)**

Seções [M1-a], [M1-b], [M1-c] e [M1-d] de `docs/fase-3-conferencia.sql`. Expected: `diferentes = 0` em todos os termos, `pela_tabela > 0` em "nitrílica"; `sem_resumo = 0`, `total_diferente = 0`; `false, true, false`; abertas igual ao Step 2. Site no ar continua de pé: `curl -s -o /dev/null -w "%{http_code}\n" "https://edital-map.vercel.app/api/busca?q=nitrilica"` → `200`.

Se `diferentes > 0`: parar, não fazer merge, e investigar com o termo e os ids divergentes antes de seguir.

- [ ] **Step 5: Merge no main (worker novo no GitHub)**

```bash
git checkout main
git merge --ff-only fase-3-brasil-todo
git push origin main
git checkout fase-3-brasil-todo
git push -u origin fase-3-brasil-todo
gh workflow run sync.yml
```
Acompanhar com `gh run watch`. Expected: sucesso; no resumo da rodada, "Itens lidos" > 0 e nenhum erro `gravar resumo dos itens`.

- [ ] **Step 6: Releitura (palavras + resumo de todas as abertas)**

Em segundo plano, com log: `npm run worker:reler-itens > "<scratchpad>/reler-m1.log" 2>&1` (base de itens sem limite; esperado 20–60 min). Expected: última linha `[reler] fim · N compras · … · F falhas` com F perto de 0. Depois, [M1-d]: `abertas_sem_resumo` perto de 0 (só compras cuja lista de itens o PNCP devolve vazia).

- [ ] **Step 7: Publicar o site e conferir**

`vercel deploy --prod --yes`. Conferir:
- `curl -s "https://edital-map.vercel.app/api/busca?q=nitrilica"` → 200, `total > 0`, nenhum campo `item_trecho` no JSON, ao menos um `"onde":"itens"`.
- Um edital com itens (slug de uma compra aberta com `itens_resumo->>'total' > 0`): `curl -s https://edital-map.vercel.app/edital/<slug> | grep -c "Itens da licitação"` ≥ 1 e o nome do primeiro item aparece no HTML.
- Falha simulada, local: `PNCP_ITENS_BASE=http://127.0.0.1:9 npm run dev` e `curl -s http://localhost:3000/edital/<slug> | grep -c "Itens indisponíveis agora"` → 1; o resto da página (título, "Principais informações") aparece. Encerrar o servidor.

- [ ] **Step 8: Medir depois e registrar**

`npm run db:medir`. Criar `docs/fase-3-metricas.md`:
```markdown
# Fase 3 · Brasil todo · métricas

## M1 · palavras e resumo dos itens (SC, PR, RS)

| Momento | Banco | contratacoes | itens | Abertas |
|---|---|---|---|---|
| Antes da 0005 | … | … | … | … |
| Depois da 0005 + releitura | … | … | … | … |

Conferência [M1-a]: termos e diferenças (todas 0). Releitura: N compras, F falhas, T min.
```
(preencher com os números medidos; nada de valor inventado).
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: métricas do M1 da Fase 3 (palavras e resumo dos itens)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

## M2 · Sem a tabela de itens, retenção e sync a cada 3 h

### Task 9: Migração `0006` e agenda de 3 h

**Files:**
- Create: `supabase/migrations/0006_retencao.sql`
- Modify: `.github/workflows/sync.yml`
- Test: `scripts/migracoes.test.ts`

**Interfaces:**
- Consumes: job `sync-pncp` do pg_cron (0002); `public.disparar_sync()`.
- Produces (SQL): `aplicar_retencao() returns bigint` (apaga e devolve quantas); job `retencao-contratacoes` `'40 6 * * *'` (03h40 em Brasília); `sync-pncp` em `'17 */3 * * *'`; tabela `itens` removida. Workflow com `- cron: '17 */3 * * *'`.

- [ ] **Step 1: Teste (falhando)**

`scripts/migracoes.test.ts`, acrescente no fim:
```ts
describe('migração 0006 (retenção e agenda)', () => {
  const sql = ler('supabase/migrations/0006_retencao.sql');
  it('apaga todo dia as encerradas há mais de 7 dias e as sem prazo', () => {
    expect(sql).toContain("where encerramento_em is null or encerramento_em < now() - interval '7 days'");
    expect(sql).toContain("cron.schedule('retencao-contratacoes', '40 6 * * *', $$select public.aplicar_retencao()$$)");
  });
  it('remove a tabela itens sem cascade (algo inesperado dependendo dela faz a migração falhar)', () => {
    expect(sql).toContain('drop table public.itens;');
    expect(sql).not.toContain('cascade');
  });
  it('sync a cada 3 h no pg_cron e no GitHub Actions', () => {
    expect(sql).toContain("schedule := '17 */3 * * *'");
    expect(ler('.github/workflows/sync.yml')).toContain("- cron: '17 */3 * * *'");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: FAIL — `ENOENT` em `0006_retencao.sql`.

- [ ] **Step 3: Escrever a migração e mudar o workflow**

`supabase/migrations/0006_retencao.sql`:
```sql
-- Edital Map · Fase 3 · Brasil todo · M2: sem a tabela de itens, retenção diária e sync a cada 3 h.
-- Só aplicar depois que o site em produção e o worker do main forem os do M1 (nenhum dos dois lê itens).
-- Depois desta migração: npm run db:medir -- --vacuum (VACUUM FULL não roda dentro de transação).

set local statement_timeout = 0;

-- Os itens agora ficam só como palavras + resumo na contratação (0005).
drop table public.itens;

-- Retenção: fica só o que está aberto ou encerrou há até 7 dias. Devolve quantas contratações apagou.
create function public.aplicar_retencao()
returns bigint language sql as $$
  with apagadas as (
    delete from public.contratacoes
    where encerramento_em is null or encerramento_em < now() - interval '7 days'
    returning 1
  )
  select count(*) from apagadas
$$;

revoke execute on function public.aplicar_retencao() from public, anon, authenticated;

-- Primeira limpeza agora; depois, todo dia às 06h40 UTC (03h40 em Brasília, longe das rodadas do sync).
select public.aplicar_retencao();
select cron.schedule('retencao-contratacoes', '40 6 * * *', $$select public.aplicar_retencao()$$);

-- Sync a cada 3 h (cabe nos 2.000 min/mês do GitHub Actions). Falha alto se o job não existir.
do $$
declare
  id bigint;
begin
  select jobid into id from cron.job where jobname = 'sync-pncp';
  if id is null then
    raise exception 'Job sync-pncp não encontrado no pg_cron';
  end if;
  perform cron.alter_job(id, schedule := '17 */3 * * *');
end $$;
```

`.github/workflows/sync.yml`: troque `    - cron: '17 */2 * * *'` por:
```yaml
    - cron: '17 */3 * * *'
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run scripts/migracoes.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add supabase/migrations/0006_retencao.sql .github/workflows/sync.yml scripts/migracoes.test.ts
git commit -m "feat: migração 0006 apaga a tabela de itens, retenção diária e sync a cada 3 h" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 10 (controlador): aplicar o M2, liberar espaço e medir

**Files:**
- Modify: `docs/fase-3-metricas.md`

- [ ] **Step 1: Pré-condições (perigo da tabela itens)**

- `git fetch origin` e `git grep -n "from('itens')" origin/main -- worker lib app components scripts` → nada (o worker do main é o do M1).
- A última rodada do sync no `main` depois do merge do M1 terminou com sucesso (`gh run list --workflow sync.yml --limit 3`).
- Produção é o deploy do M1: `curl -s https://edital-map.vercel.app/edital/<slug> | grep -c "Itens da licitação"` ≥ 1 e `vercel ls edital-map` mostra o deploy de produção feito na Task 8.
- Nenhuma rodada `in_progress`. Anotar as abertas ([M1-d]).

- [ ] **Step 2: Aplicar a 0006**

`npm run db:aplicar -- supabase/migrations/0006_retencao.sql`
Expected: `[migração] retencao aplicada`. Se falhar com permissão em `cron.alter_job`, a transação desfaz tudo: rodar no SQL Editor só o bloco `do $$ … $$` como dono do job e reaplicar o arquivo inteiro.

- [ ] **Step 3: Conferir**

Seção [M2] de `docs/fase-3-conferencia.sql`. Expected: `tabela_itens` nula, `fora_da_retencao = 0`; `sync-pncp '17 */3 * * *'` e `retencao-contratacoes '40 6 * * *'`, ativos; abertas igual ao Step 1.

- [ ] **Step 4: Merge no main (workflow a cada 3 h)**

```bash
git checkout main
git merge --ff-only fase-3-brasil-todo
git push origin main
git checkout fase-3-brasil-todo
```

- [ ] **Step 5: Liberar o espaço e medir**

Fora do minuto 17 das horas de sync: `npm run db:medir -- --vacuum`. Anotar antes/depois e o tempo do VACUUM. Expected: banco bem abaixo dos 321 MB de 16/10 (sem `itens` e sem as ~77 mil contratações antigas).

- [ ] **Step 6: Site de pé**

`curl -s -o /dev/null -w "%{http_code}\n"` em `https://edital-map.vercel.app/`, `/api/busca?q=nitrilica`, `/api/mapa` e `/edital/<slug>` → `200` nos quatro.

- [ ] **Step 7: No dia seguinte**

Última consulta da seção [M2] (`cron.job_run_details`): `succeeded`; `fora_da_retencao = 0` de novo.

- [ ] **Step 8: Registrar**

Acrescentar em `docs/fase-3-metricas.md`:
```markdown
## M2 · sem itens, retenção e 3 h

| Momento | Banco | contratacoes | Abertas |
|---|---|---|---|
| Antes da 0006 | … | … | … |
| Depois da 0006 + VACUUM FULL | … | … | … |

Retenção: N contratações apagadas na primeira limpeza; job diário `succeeded` em AAAA-MM-DD. VACUUM FULL: T s.
```
```bash
git add docs/fase-3-metricas.md
git commit -m "docs: métricas do M2 da Fase 3 (retenção e espaço liberado)" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

## M3 · Brasil todo

### Task 11: Consulta ao PNCP sem `uf` (`BR`) e endpoint de propostas

**Files:**
- Modify: `worker/config.ts`, `worker/pncp/cliente.ts`
- Test: `worker/config.test.ts`, `worker/pncp/cliente.test.ts`

**Interfaces:**
- Consumes: `paraPncp` de `worker/datas.ts`; `getJson` interno do cliente.
- Produces:
  - `UF_BRASIL = 'BR'` em `worker/config.ts`; `lerUfs(valor)`: vazio ou `BR` → `['BR']`; `BR` junto de UFs → erro `BR (país inteiro) não se mistura com UFs`.
  - `FiltroContratacoes.uf`: `'BR'` = sem `uf` na URL.
  - `type FiltroPropostas = { uf: string; modalidade: number; dataFinal: string }` (data `aaaa-mm-dd`).
  - `urlPropostas(filtro: FiltroPropostas, pagina: number, tamanho: number): string` — **o único lugar** com os parâmetros do `/v1/contratacoes/proposta` (manual do PNCP: obrigatórios `dataFinal` aaaammdd e `pagina`; opcionais `codigoModalidadeContratacao`, `uf`, `tamanhoPagina`). Se o PNCP pedir outro parâmetro, muda só aqui.
  - Cliente: `paginarPropostas(filtro: FiltroPropostas): AsyncGenerator<PaginaContratacoes>`, `totalPropostas(filtro: FiltroPropostas): Promise<number>`.

- [ ] **Step 1: Testes (falhando)**

`worker/config.test.ts`: troque o `describe('lerUfs', …)` inteiro por (e acrescente `UF_BRASIL` ao import de `./config`):
```ts
describe('lerUfs', () => {
  it('país inteiro (BR) quando não há valor ou quando o valor é BR', () => {
    expect(lerUfs(undefined)).toEqual([UF_BRASIL]);
    expect(lerUfs('  ')).toEqual(['BR']);
    expect(lerUfs(' br ')).toEqual(['BR']);
  });
  it('normaliza espaços, caixa e repetições', () => {
    expect(lerUfs(' sc, pr ,SC')).toEqual(['SC', 'PR']);
  });
  it('recusa UF que não existe', () => {
    expect(() => lerUfs('SC,XX')).toThrow('UF inválida: XX');
  });
  it('recusa BR misturado com UFs', () => {
    expect(() => lerUfs('BR,SC')).toThrow('BR (país inteiro) não se mistura com UFs');
  });
});
```

`worker/pncp/cliente.test.ts`:
1. Troque o import do topo por:
```ts
import { criarCliente, criarLimitador, criarRitmo, ErroPncp, urlPropostas, type OpcoesCliente } from './cliente';
```
2. Acrescente depois do `describe('paginarContratacoes', …)`:
```ts
describe('país inteiro (BR)', () => {
  it('consulta sem uf quando a UF é BR', async () => {
    const { cliente, urls } = montar([resposta(200, { data: ['a'], totalPaginas: 1, totalRegistros: 1 })]);
    const paginas = [];
    for await (const p of cliente.paginarContratacoes('atualizacao', { ...filtro, uf: 'BR' })) paginas.push(p);
    expect(paginas).toHaveLength(1);
    expect(urls[0]).toContain('codigoModalidadeContratacao=6');
    expect(urls[0]).not.toMatch(/[?&]uf=/);
  });
});

describe('propostas em aberto (/proposta)', () => {
  it('monta a URL só com dataFinal, modalidade, uf (fora BR) e paginação', () => {
    expect(urlPropostas({ uf: 'BR', modalidade: 12, dataFinal: '2027-10-16' }, 1, 50)).toBe(
      'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=20271016&codigoModalidadeContratacao=12&pagina=1&tamanhoPagina=50',
    );
    expect(urlPropostas({ uf: 'SP', modalidade: 6, dataFinal: '2026-10-16' }, 2, 10)).toBe(
      'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=20261016&codigoModalidadeContratacao=6&uf=SP&pagina=2&tamanhoPagina=10',
    );
  });
  it('pagina até a última página', async () => {
    const { cliente, urls } = montar([
      resposta(200, { data: ['a', 'b'], totalPaginas: 2, totalRegistros: 3 }),
      resposta(200, { data: ['c'], totalPaginas: 2, totalRegistros: 3 }),
    ]);
    const paginas = [];
    for await (const p of cliente.paginarPropostas({ uf: 'BR', modalidade: 12, dataFinal: '2027-10-16' })) paginas.push(p.registros);
    expect(paginas).toEqual([['a', 'b'], ['c']]);
    expect(urls[1]).toContain('pagina=2');
  });
  it('totalPropostas lê o totalRegistros de uma página pequena', async () => {
    const { cliente, urls } = montar([resposta(200, { data: ['a'], totalPaginas: 42, totalRegistros: 420 })]);
    expect(await cliente.totalPropostas({ uf: 'SP', modalidade: 6, dataFinal: '2026-10-16' })).toBe(420);
    expect(urls[0]).toContain('tamanhoPagina=10');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/config.test.ts worker/pncp/cliente.test.ts`
Expected: FAIL — `UF_BRASIL` e `urlPropostas` não exportados; `lerUfs(undefined)` devolve `['SC','PR','RS']`; URL com `uf=BR`.

- [ ] **Step 3: Implementar a configuração**

`worker/config.ts`: troque a função `lerUfs` inteira por:
```ts
/** UFS vazio ou "BR" = país inteiro numa consulta só (sem `uf` no PNCP). Chave de estado: atualizacao:BR:<modalidade>. */
export const UF_BRASIL = 'BR';

export function lerUfs(valor: string | undefined): string[] {
  const ufs = [
    ...new Set(
      (valor ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (ufs.length === 0 || (ufs.length === 1 && ufs[0] === UF_BRASIL)) return [UF_BRASIL];
  for (const uf of ufs) {
    if (uf === UF_BRASIL) throw new Error('BR (país inteiro) não se mistura com UFs');
    if (!(UFS_BRASIL as readonly string[]).includes(uf)) throw new Error(`UF inválida: ${uf}`);
  }
  return ufs;
}
```

- [ ] **Step 4: Implementar o cliente**

`worker/pncp/cliente.ts`:
1. No import de `../config`, acrescente `UF_BRASIL,` (depois de `TIMEOUT_MS,`).
2. Troque `export type FiltroContratacoes = …;` por:
```ts
/** `uf: 'BR'` = país inteiro (a consulta sai sem `uf`). Datas em aaaa-mm-dd. */
export type FiltroContratacoes = { uf: string; modalidade: number; dataInicial: string; dataFinal: string };
/** Contratações com recebimento de propostas em aberto: serve só para encontrar (aberta = encerramento_em > now()). */
export type FiltroPropostas = { uf: string; modalidade: number; dataFinal: string };
```
3. Troque a função `urlContratacoes` inteira por:
```ts
function urlContratacoes(
  endpoint: 'publicacao' | 'atualizacao',
  filtro: FiltroContratacoes,
  pagina: number,
  tamanho: number,
): string {
  const params = new URLSearchParams({
    dataInicial: paraPncp(filtro.dataInicial),
    dataFinal: paraPncp(filtro.dataFinal),
    codigoModalidadeContratacao: String(filtro.modalidade),
  });
  if (filtro.uf !== UF_BRASIL) params.set('uf', filtro.uf);
  params.set('pagina', String(pagina));
  params.set('tamanhoPagina', String(tamanho));
  return `${BASE_CONSULTA}/v1/contratacoes/${endpoint}?${params}`;
}

/**
 * Único lugar com os parâmetros do /v1/contratacoes/proposta. Manual do PNCP: obrigatórios dataFinal (aaaammdd)
 * e pagina; opcionais codigoModalidadeContratacao, uf e tamanhoPagina (sem dataInicial).
 */
export function urlPropostas(filtro: FiltroPropostas, pagina: number, tamanho: number): string {
  const params = new URLSearchParams({
    dataFinal: paraPncp(filtro.dataFinal),
    codigoModalidadeContratacao: String(filtro.modalidade),
  });
  if (filtro.uf !== UF_BRASIL) params.set('uf', filtro.uf);
  params.set('pagina', String(pagina));
  params.set('tamanhoPagina', String(tamanho));
  return `${BASE_CONSULTA}/v1/contratacoes/proposta?${params}`;
}
```
4. Dentro de `criarCliente`, troque `paginarContratacoes` e `totalRegistros` por:
```ts
  async function* paginar(montarUrl: (pagina: number) => string): AsyncGenerator<PaginaContratacoes> {
    for (let pagina = 1; ; pagina++) {
      const resp = await getJson<RespostaContratacoes>(montarUrl(pagina));
      const registros = resp?.data ?? [];
      if (registros.length === 0) return;
      const totalPaginas = resp?.totalPaginas ?? pagina;
      yield { pagina, totalPaginas, totalRegistros: resp?.totalRegistros ?? registros.length, registros };
      if (pagina >= totalPaginas) return;
    }
  }

  function paginarContratacoes(
    endpoint: 'publicacao' | 'atualizacao',
    filtro: FiltroContratacoes,
  ): AsyncGenerator<PaginaContratacoes> {
    return paginar((pagina) => urlContratacoes(endpoint, filtro, pagina, PAGINA_CONTRATACOES));
  }

  function paginarPropostas(filtro: FiltroPropostas): AsyncGenerator<PaginaContratacoes> {
    return paginar((pagina) => urlPropostas(filtro, pagina, PAGINA_CONTRATACOES));
  }

  async function totalRegistros(endpoint: 'publicacao' | 'atualizacao', filtro: FiltroContratacoes): Promise<number> {
    const resp = await getJson<RespostaContratacoes>(urlContratacoes(endpoint, filtro, 1, 10));
    return resp?.totalRegistros ?? 0;
  }

  async function totalPropostas(filtro: FiltroPropostas): Promise<number> {
    const resp = await getJson<RespostaContratacoes>(urlPropostas(filtro, 1, 10));
    return resp?.totalRegistros ?? 0;
  }
```
5. No objeto devolvido, troque por:
```ts
  return {
    getJson,
    paginarContratacoes,
    paginarPropostas,
    totalRegistros,
    totalPropostas,
    listarItens,
    detalheCompra,
    estatisticas: () => ({ ...contagem }),
  };
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run worker/config.test.ts worker/pncp/cliente.test.ts && npm run typecheck`
Expected: PASS; o teste antigo `'percorre até a última página e monta os parâmetros'` continua passando (`uf=SC` presente).

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add worker/config.ts worker/config.test.ts worker/pncp/cliente.ts worker/pncp/cliente.test.ts
git commit -m "feat: consulta do país inteiro sem uf e leitura do /proposta" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 12: Sync nacional (herança da chave BR) e retenção no worker

**Files:**
- Modify: `worker/config.ts`, `worker/mapear.ts`, `worker/banco.ts`, `worker/sincronizar.ts`, `worker/resumo.ts`, `worker/testes/fakes.ts`
- Test: `worker/mapear.test.ts`, `worker/banco.test.ts`, `worker/sincronizar.test.ts`, `worker/resumo.test.ts`

**Interfaces:**
- Consumes: `UF_BRASIL` (Task 11); `EstadoSync`, `Banco` (Task 4); `sbFalso` de `worker/banco.test.ts` (Task 4).
- Produces:
  - `RETENCAO_DIAS = 7` em `worker/config.ts`.
  - `foraDaRetencao(l: Pick<LinhaContratacao, 'encerramento_em'>, agora: Date): boolean` em `worker/mapear.ts`.
  - `Banco.removerContratacoes(ids: string[]): Promise<void>`; `Banco.estadosDaModalidade(modalidade: number): Promise<EstadoSync[]>` (chaves `atualizacao:%:<modalidade>`).
  - `dataHerdada(estados: EstadoSync[], modalidade: number): string | null` em `worker/sincronizar.ts`.
  - `sincronizarChave('BR', m, deps)` sem estado parte de `dataHerdada`.
  - `gravarPagina`: não grava o que está fora da retenção; apaga do banco o que já estava gravado e saiu dela.
  - `Resumo.foraDaRetencao` + `contarForaDaRetencao(n)`, linha `| Fora da retenção (não gravadas) | n |`.
  - `BancoFalso.removidas: string[]`, `removerContratacoes`, `estadosDaModalidade`.

- [ ] **Step 1: Testes (falhando)**

`worker/mapear.test.ts`: acrescente `foraDaRetencao` ao import de `./mapear` e, no fim do arquivo:
```ts
describe('foraDaRetencao', () => {
  const agora = new Date('2026-10-14T15:00:00Z');
  it('sem prazo está fora', () => {
    expect(foraDaRetencao({ encerramento_em: null }, agora)).toBe(true);
  });
  it('encerrada há mais de 7 dias está fora', () => {
    expect(foraDaRetencao({ encerramento_em: '2026-10-07T14:59:59.000Z' }, agora)).toBe(true);
  });
  it('encerrada há 7 dias ou menos e aberta ficam', () => {
    expect(foraDaRetencao({ encerramento_em: '2026-10-07T15:00:00.000Z' }, agora)).toBe(false);
    expect(foraDaRetencao({ encerramento_em: '2026-10-13T12:00:00.000Z' }, agora)).toBe(false);
    expect(foraDaRetencao({ encerramento_em: '2026-10-26T11:59:00.000Z' }, agora)).toBe(false);
  });
});
```

`worker/banco.test.ts`, no fim:
```ts
describe('removerContratacoes e estadosDaModalidade', () => {
  it('apaga as contratações pelo id', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).removerContratacoes(['A', 'B']);
    expect(chamadas).toEqual([['from', 'contratacoes'], ['delete'], ['in', 'id', ['A', 'B']]]);
  });
  it('sem ids não chama o banco', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).removerContratacoes([]);
    expect(chamadas).toEqual([]);
  });
  it('lê as chaves de atualização da modalidade', async () => {
    const { sb, chamadas } = sbFalso();
    await criarBanco(sb).estadosDaModalidade(6);
    expect(chamadas).toEqual([
      ['from', 'sync_estado'],
      ['select', 'chave, ultima_data, ultima_execucao, status, erro'],
      ['like', 'chave', 'atualizacao:%:6'],
    ]);
  });
});
```

`worker/resumo.test.ts`, no teste `'monta o texto com as métricas'`: depois de `r.contarItens(3, 42);` acrescente `r.contarForaDaRetencao(5);` e, depois de `expect(t).toContain('| Itens lidos | 42 |');`:
```ts
    expect(t).toContain('| Fora da retenção (não gravadas) | 5 |');
```

`worker/sincronizar.test.ts`:
1. Acrescente `dataHerdada` ao import de `./sincronizar`.
2. No teste `'busca itens só das abertas novas ou alteradas'`, troque a linha
`        linha({ sequencial: 2, encerramento: '2026-10-01T10:00:00' }), // encerrada` por:
```ts
        linha({ sequencial: 2, encerramento: '2026-10-12T10:00:00' }), // encerrada há 2 dias (dentro da retenção)
```
3. Acrescente, depois do `describe('gravarPagina · ordem de gravação', …)`:
```ts
describe('gravarPagina · retenção', () => {
  it('não grava encerrada há mais de 7 dias nem sem prazo, e conta no resumo', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso();
    const deps = montarDeps(banco, cliente);
    await gravarPagina(
      [
        linha({ sequencial: 1 }), // aberta
        linha({ sequencial: 2, encerramento: '2026-10-10T10:00:00' }), // encerrada há 4 dias: fica
        linha({ sequencial: 3, encerramento: '2026-10-01T10:00:00' }), // encerrada há 13 dias: fora
        linha({ sequencial: 4, encerramento: null }), // sem prazo: fora
      ],
      deps,
    );
    expect([...banco.contratacoes.keys()].sort()).toEqual([idDe(1), idDe(2)]);
    expect(deps.resumo.contratacoesGravadas).toBe(2);
    expect(deps.resumo.foraDaRetencao).toBe(2);
    expect(cliente.itensPedidos).toEqual([idDe(1)]);
    expect(banco.removidas).toEqual([]);
  });
  it('contratação já gravada que sai da retenção é apagada', async () => {
    const banco = new BancoFalso();
    await banco.upsertContratacoes([linha({ sequencial: 5 })]);
    const deps = montarDeps(banco, clienteFalso());
    await gravarPagina([linha({ sequencial: 5, encerramento: null, atualizacao: '2026-10-14T08:00:00' })], deps);
    expect(banco.contratacoes.has(idDe(5))).toBe(false);
    expect(banco.removidas).toEqual([idDe(5)]);
  });
});

describe('chave nacional (BR)', () => {
  const estado = (chave: string, ultima_data: string) => ({ chave, ultima_data, ultima_execucao: null, status: 'ok', erro: null });
  it('dataHerdada: a mais antiga das chaves por UF da modalidade, ignorando BR e outras modalidades', () => {
    expect(
      dataHerdada(
        [
          estado('atualizacao:SC:6', '2026-10-13'),
          estado('atualizacao:PR:6', '2026-10-11'),
          estado('atualizacao:BR:6', '2026-10-01'),
          estado('atualizacao:PR:16', '2026-09-01'),
          estado('atualizacao:RS:8', '2026-09-01'),
        ],
        6,
      ),
    ).toBe('2026-10-11');
    expect(dataHerdada([], 6)).toBeNull();
  });
  it('chave BR nova começa da data herdada e consulta sem uf', async () => {
    const banco = new BancoFalso();
    await banco.gravarEstado(estado('atualizacao:SC:6', '2026-10-13'));
    await banco.gravarEstado(estado('atualizacao:PR:6', '2026-10-11'));
    await banco.gravarEstado(estado('atualizacao:PR:8', '2026-10-01'));
    const cliente = clienteFalso();
    expect(await sincronizarChave('BR', 6, montarDeps(banco, cliente))).toBe(true);
    expect(cliente.chamadas).toEqual([
      { endpoint: 'atualizacao', filtro: { uf: 'BR', modalidade: 6, dataInicial: '2026-10-11', dataFinal: '2026-10-14' } },
    ]);
    expect(banco.estados.get('atualizacao:BR:6')).toMatchObject({ ultima_data: '2026-10-14', status: 'ok' });
  });
  it('chave BR que já existe não olha as chaves por UF', async () => {
    const banco = new BancoFalso();
    await banco.gravarEstado(estado('atualizacao:BR:6', '2026-10-14'));
    await banco.gravarEstado(estado('atualizacao:SC:6', '2026-10-01'));
    const cliente = clienteFalso();
    await sincronizarChave('BR', 6, montarDeps(banco, cliente));
    expect(cliente.chamadas[0].filtro.dataInicial).toBe('2026-10-14');
  });
  it('sem nenhuma chave, começa ontem', async () => {
    const cliente = clienteFalso();
    await sincronizarChave('BR', 6, montarDeps(new BancoFalso(), cliente));
    expect(cliente.chamadas[0].filtro.dataInicial).toBe('2026-10-13');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker`
Expected: FAIL — `foraDaRetencao`, `dataHerdada`, `removerContratacoes`, `estadosDaModalidade`, `contarForaDaRetencao` e `banco.removidas` não existem; a chave BR começa ontem.

- [ ] **Step 3: Configuração, mapeamento e resumo da rodada**

`worker/config.ts`, depois de `export const LIMITE_INVALIDOS = 0.05;`:
```ts
/** Contratação encerrada há mais que isso (ou sem prazo) não é gravada e sai do banco no job diário de retenção. */
export const RETENCAO_DIAS = 7;
```

`worker/mapear.ts`:
1. No topo, depois de `import { deBrasilia } from './datas';`:
```ts
import { RETENCAO_DIAS } from './config';
```
2. Depois de `estaAberta`:
```ts
/** Fora da retenção = sem prazo ou encerrada há mais de RETENCAO_DIAS (a mesma regra de aplicar_retencao na 0006). */
export function foraDaRetencao(l: Pick<LinhaContratacao, 'encerramento_em'>, agora: Date): boolean {
  return l.encerramento_em === null || Date.parse(l.encerramento_em) < agora.getTime() - RETENCAO_DIAS * 24 * 3600 * 1000;
}
```

`worker/resumo.ts`:
1. Depois de `itensLidos = 0;`: `  foraDaRetencao = 0;`
2. Depois do método `contarItens`:
```ts
  contarForaDaRetencao(n: number): void {
    this.foraDaRetencao += n;
  }
```
3. Em `texto`, depois da linha de `| Contratações gravadas |`:
```ts
      `| Fora da retenção (não gravadas) | ${this.foraDaRetencao} |`,
```

- [ ] **Step 4: Banco e banco falso**

`worker/banco.ts`:
1. Na interface `Banco`, depois de `upsertContratacoes`:
```ts
  /** Apaga contratações (as que saíram da retenção depois de gravadas). */
  removerContratacoes(ids: string[]): Promise<void>;
```
e depois de `lerEstado`:
```ts
  /** Estados das chaves de atualização de uma modalidade (por UF e BR), para a chave nacional herdar a data. */
  estadosDaModalidade(modalidade: number): Promise<EstadoSync[]>;
```
2. Em `criarBanco`, depois de `upsertContratacoes`:
```ts
    async removerContratacoes(ids) {
      for (const lote of emLotes(ids, 200)) {
        const { error } = await sb.from('contratacoes').delete().in('id', lote);
        falhar('remover contratacoes', error);
      }
    },
```
e depois de `lerEstado`:
```ts
    async estadosDaModalidade(modalidade) {
      const { data, error } = await sb
        .from('sync_estado')
        .select('chave, ultima_data, ultima_execucao, status, erro')
        .like('chave', `atualizacao:%:${modalidade}`);
      falhar('ler sync_estado da modalidade', error);
      return (data ?? []) as EstadoSync[];
    },
```

`worker/testes/fakes.ts`, na classe `BancoFalso`:
1. Depois de `estados = new Map<string, EstadoSync>();`: `  removidas: string[] = [];`
2. Depois de `upsertContratacoes`:
```ts
  async removerContratacoes(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.contratacoes.delete(id);
      this.resumos.delete(id);
      this.removidas.push(id);
    }
  }
```
3. Depois de `lerEstado`:
```ts
  async estadosDaModalidade(modalidade: number): Promise<EstadoSync[]> {
    return [...this.estados.values()].filter((e) => e.chave.startsWith('atualizacao:') && e.chave.endsWith(`:${modalidade}`));
  }
```

- [ ] **Step 5: Sincronização**

`worker/sincronizar.ts`:
1. Troque os imports do topo (até `import type { Resumo } from './resumo';`) por:
```ts
import type { Banco, EstadoSync } from './banco';
import { LIMITE_CATCH_UP, UF_BRASIL } from './config';
import { hojeBrasilia, somarDias } from './datas';
import { palavrasDosItens, resumirItens } from './itens';
import {
  chaveDaLinha,
  contratacaoParaLinha,
  estaAberta,
  foraDaRetencao,
  itemParaLinha,
  type ChaveCompra,
  type LinhaContratacao,
  type LinhaItem,
} from './mapear';
import type { ClientePncp, FiltroContratacoes } from './pncp/cliente';
import { validarContratacao, validarItem } from './pncp/esquemas';
import type { Resumo } from './resumo';
```
2. Troque a função `gravarPagina` inteira por:
```ts
export async function gravarPagina(recebidas: LinhaContratacao[], deps: Dependencias): Promise<void> {
  if (recebidas.length === 0) return;
  const agora = deps.agora();
  const conhecidas = await deps.banco.atualizacoesConhecidas(recebidas.map((l) => l.id));
  const fora = recebidas.filter((l) => foraDaRetencao(l, agora));
  if (fora.length > 0) {
    deps.resumo.contarForaDaRetencao(fora.length);
    // Já gravada e agora fora da retenção (prazo passou de 7 dias ou sumiu): sai do banco em vez de ficar velha.
    const remover = fora.filter((l) => conhecidas.has(l.id)).map((l) => l.id);
    if (remover.length > 0) await deps.banco.removerContratacoes(remover);
  }
  const linhas = recebidas.filter((l) => !foraDaRetencao(l, agora));
  if (linhas.length === 0) return;
  const precisamItens = new Set(linhas.filter((l) => estaAberta(l, agora) && mudou(l, conhecidas)).map((l) => l.id));
  // Ordem de gravação: quem precisa de itens entra primeiro com o timestamp anterior (ou 1970, se for nova).
  // Se o processo cair antes de os itens gravarem, a próxima rodada ainda vê a compra como alterada
  // e busca os itens de novo; o timestamp real só vale depois que os itens entram.
  await deps.banco.upsertContratacoes(
    linhas.map((l) => (precisamItens.has(l.id) ? { ...l, atualizada_pncp_em: conhecidas.get(l.id) ?? EPOCA } : l)),
  );
  deps.resumo.contarContratacoes(linhas.length);
  if (precisamItens.size === 0) return;
  const comItens = await sincronizarItens(linhas.filter((l) => precisamItens.has(l.id)).map(chaveDaLinha), deps);
  const definitivas = linhas.filter((l) => comItens.has(l.id));
  if (definitivas.length > 0) await deps.banco.upsertContratacoes(definitivas);
}
```
3. Depois da função `chaveEstado`, acrescente:
```ts
/**
 * Data de partida de uma chave nacional nova: a mais antiga entre as chaves por UF da mesma modalidade
 * (a última data boa de cada UF), para nenhuma janela se perder na troca para o país inteiro.
 */
export function dataHerdada(estados: EstadoSync[], modalidade: number): string | null {
  const padrao = new RegExp(`^atualizacao:([A-Z]{2}):${modalidade}$`);
  const datas = estados
    .filter((e) => {
      const m = padrao.exec(e.chave);
      return m !== null && m[1] !== UF_BRASIL;
    })
    .map((e) => e.ultima_data)
    .sort();
  return datas[0] ?? null;
}
```
4. Em `sincronizarChave`, troque as três linhas
```ts
    const estado = await deps.banco.lerEstado(chave);
    estadoLido = true;
    inicio = inicioDaJanela(estado?.ultima_data, deps.agora());
```
por:
```ts
    const estado = await deps.banco.lerEstado(chave);
    const ultima = estado
      ? estado.ultima_data
      : uf === UF_BRASIL
        ? dataHerdada(await deps.banco.estadosDaModalidade(modalidade), modalidade)
        : null;
    estadoLido = true;
    inicio = inicioDaJanela(ultima, deps.agora());
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run worker && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add worker
git commit -m "feat: sync do país inteiro herda a data das chaves por UF e não grava o que está fora da retenção" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 13: Carga nacional (publicações + `/proposta`) e workflow `UFS: BR`

**Files:**
- Modify: `worker/config.ts`, `worker/sincronizar.ts`, `worker/carga.ts`, `worker/backfill.ts`, `worker/testes/fakes.ts`, `.github/workflows/sync.yml`
- Test: `worker/config.test.ts`, `worker/carga.test.ts`, `scripts/migracoes.test.ts`

**Interfaces:**
- Consumes: `paginarPropostas`, `FiltroPropostas` (Task 11); `gravarPagina` com retenção (Task 12).
- Produces:
  - `PROPOSTA_DIAS_A_FRENTE = 365`; `lerPropostaAte(valor: string | undefined, hoje: string): string` (padrão hoje + 365; formato aaaa-mm-dd).
  - `processarPaginas(paginas: AsyncIterable<PaginaContratacoes>, deps: Dependencias): Promise<void>`; `Dependencias.cliente` passa a incluir `paginarPropostas`.
  - `type OpcoesBackfill = { dias: number; ufs: string[]; modalidades: readonly number[]; propostaAte?: string | null }`; `executarBackfill(deps, opcoes: OpcoesBackfill)`: depois das janelas de publicação, lê o `/proposta` quando há `propostaAte`; grava o estado da chave só se ele ainda não existe.
  - CLI: `npm run worker:backfill -- --dias 30 --ufs BR --proposta [--proposta-ate aaaa-mm-dd]`.
  - `clienteFalso({ propostas })` com `propostasPedidas: FiltroPropostas[]`.
  - Workflow com `UFS: BR`.

- [ ] **Step 1: Testes (falhando)**

`worker/config.test.ts`: acrescente `lerPropostaAte` ao import de `./config` e, no fim:
```ts
describe('lerPropostaAte', () => {
  it('padrão: hoje + 365 dias', () => {
    expect(lerPropostaAte(undefined, '2026-10-16')).toBe('2027-10-16');
  });
  it('aceita aaaa-mm-dd e recusa outro formato', () => {
    expect(lerPropostaAte(' 2026-10-16 ', '2026-10-16')).toBe('2026-10-16');
    expect(() => lerPropostaAte('16/10/2026', '2026-10-16')).toThrow('--proposta-ate inválido');
  });
});
```

`worker/carga.test.ts`: acrescente `idDe` ao import de `./testes/fakes` e, dentro do `describe('executarBackfill')`:
```ts
  it('com propostaAte, lê também o /proposta da chave e grava o que vier', async () => {
    const banco = new BancoFalso();
    const cliente = clienteFalso({ propostas: () => [[contratacaoBruta({ sequencial: 5 })]] });
    await executarBackfill(montarDeps(banco, cliente), { dias: 3, ufs: ['BR'], modalidades: [12], propostaAte: '2027-10-14' });
    expect(cliente.chamadas.map((c) => c.filtro.uf)).toEqual(['BR']);
    expect(cliente.propostasPedidas).toEqual([{ uf: 'BR', modalidade: 12, dataFinal: '2027-10-14' }]);
    expect(banco.contratacoes.has(idDe(5))).toBe(true);
    expect(banco.estados.get('atualizacao:BR:12')?.ultima_data).toBe('2026-10-14');
  });
  it('sem propostaAte não chama o /proposta', async () => {
    const cliente = clienteFalso();
    await executarBackfill(montarDeps(new BancoFalso(), cliente), { dias: 3, ufs: ['BR'], modalidades: [6] });
    expect(cliente.propostasPedidas).toEqual([]);
  });
  it('não sobrescreve o estado que o sync já gravou', async () => {
    const banco = new BancoFalso();
    const doSync = { chave: 'atualizacao:BR:6', ultima_data: '2026-10-14', ultima_execucao: '2026-10-14T14:00:00.000Z', status: 'ok', erro: null };
    await banco.gravarEstado(doSync);
    await executarBackfill(montarDeps(banco, clienteFalso()), { dias: 3, ufs: ['BR'], modalidades: [6] });
    expect(banco.estados.get('atualizacao:BR:6')).toEqual(doSync);
  });
```

`scripts/migracoes.test.ts`, no `describe('migração 0006 …')`, acrescente:
```ts
  it('o workflow sincroniza o país inteiro (UFS: BR)', () => {
    expect(ler('.github/workflows/sync.yml')).toMatch(/UFS: BR\r?\n/);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/config.test.ts worker/carga.test.ts scripts/migracoes.test.ts`
Expected: FAIL — `lerPropostaAte` não exportado; `clienteFalso` sem `propostas`/`propostasPedidas`; workflow com `UFS: SC,PR,RS`.

- [ ] **Step 3: Configuração**

`worker/config.ts`:
1. No topo do arquivo: `import { somarDias } from './datas';`
2. No fim:
```ts
/** Quantos dias à frente vai o dataFinal do /proposta na carga e na conferência (a Task 16 confere contra hoje). */
export const PROPOSTA_DIAS_A_FRENTE = 365;

export function lerPropostaAte(valor: string | undefined, hoje: string): string {
  if (!valor?.trim()) return somarDias(hoje, PROPOSTA_DIAS_A_FRENTE);
  const data = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`--proposta-ate inválido (use aaaa-mm-dd): ${valor}`);
  return data;
}
```

- [ ] **Step 4: Sincronização e carga**

`worker/sincronizar.ts`:
1. Troque `import type { ClientePncp, FiltroContratacoes } from './pncp/cliente';` por:
```ts
import type { ClientePncp, FiltroContratacoes, PaginaContratacoes } from './pncp/cliente';
```
2. Em `Dependencias`, troque a linha do cliente por:
```ts
  cliente: Pick<ClientePncp, 'paginarContratacoes' | 'paginarPropostas' | 'listarItens'>;
```
3. Troque a função `processarJanela` por:
```ts
export async function processarPaginas(paginas: AsyncIterable<PaginaContratacoes>, deps: Dependencias): Promise<void> {
  for await (const pagina of paginas) {
    deps.resumo.contarPagina();
    await gravarPagina(processarRegistros(pagina.registros, deps.resumo), deps);
  }
}

export function processarJanela(
  endpoint: 'publicacao' | 'atualizacao',
  filtro: FiltroContratacoes,
  deps: Dependencias,
): Promise<void> {
  return processarPaginas(deps.cliente.paginarContratacoes(endpoint, filtro), deps);
}
```

`worker/carga.ts`: troque o arquivo inteiro por:
```ts
import { LIMITE_CATCH_UP } from './config';
import { hojeBrasilia, somarDias } from './datas';
import {
  chaveEstado,
  medirChave,
  mensagemDe,
  processarJanela,
  processarPaginas,
  sincronizarItens,
  type Dependencias,
} from './sincronizar';

export function janelas(inicio: string, fim: string, dias: number): Array<[string, string]> {
  const resultado: Array<[string, string]> = [];
  for (let ini = inicio; ini <= fim; ini = somarDias(ini, dias)) {
    const ultimo = somarDias(ini, dias - 1);
    resultado.push([ini, ultimo < fim ? ultimo : fim]);
  }
  return resultado;
}

export type OpcoesBackfill = {
  dias: number;
  ufs: string[];
  modalidades: readonly number[];
  /** Com data (aaaa-mm-dd), também lê o /proposta até ela: acha as abertas publicadas antes da janela (prazo longo). */
  propostaAte?: string | null;
};

export async function executarBackfill(deps: Dependencias, opcoes: OpcoesBackfill): Promise<void> {
  const hoje = hojeBrasilia(deps.agora());
  const inicio = somarDias(hoje, -opcoes.dias);
  for (const uf of opcoes.ufs) {
    for (const modalidade of opcoes.modalidades) {
      const chave = chaveEstado(uf, modalidade);
      const concluir = medirChave('carga', chave, deps);
      try {
        for (const [dataInicial, dataFinal] of janelas(inicio, hoje, 7)) {
          await processarJanela('publicacao', { uf, modalidade, dataInicial, dataFinal }, deps);
        }
        if (opcoes.propostaAte) {
          await processarPaginas(deps.cliente.paginarPropostas({ uf, modalidade, dataFinal: opcoes.propostaAte }), deps);
        }
        // O estado é do sync: a carga só cria a chave que ainda não existe, com o dia em que a carga começou.
        if (!(await deps.banco.lerEstado(chave))) {
          await deps.banco.gravarEstado({
            chave,
            ultima_data: hoje,
            ultima_execucao: deps.agora().toISOString(),
            status: 'ok',
            erro: null,
          });
        }
        concluir();
      } catch (erro) {
        const mensagem = mensagemDe(erro);
        deps.resumo.registrarErro(chave, mensagem);
        concluir(mensagem);
      }
    }
  }
  try {
    await sincronizarItens(await deps.banco.abertasSemItens(LIMITE_CATCH_UP), deps);
  } catch (erro) {
    deps.resumo.registrarAviso('catch-up de itens', mensagemDe(erro));
  }
}
```

`worker/testes/fakes.ts`:
1. Troque `import type { FiltroContratacoes, PaginaContratacoes } from '../pncp/cliente';` por:
```ts
import type { FiltroContratacoes, FiltroPropostas, PaginaContratacoes } from '../pncp/cliente';
```
2. Troque a função `clienteFalso` inteira por:
```ts
export function clienteFalso(
  opcoes: {
    paginas?: (endpoint: Endpoint, filtro: FiltroContratacoes) => unknown[][];
    propostas?: (filtro: FiltroPropostas) => unknown[][];
    itens?: (compra: ChaveCompra) => unknown[];
  } = {},
) {
  const chamadas: Array<{ endpoint: Endpoint; filtro: FiltroContratacoes }> = [];
  const propostasPedidas: FiltroPropostas[] = [];
  const itensPedidos: string[] = [];
  const emPaginas = (paginas: unknown[][]): PaginaContratacoes[] =>
    paginas.map((registros, i) => ({ pagina: i + 1, totalPaginas: paginas.length, totalRegistros: paginas.flat().length, registros }));
  return {
    chamadas,
    propostasPedidas,
    itensPedidos,
    async *paginarContratacoes(endpoint: Endpoint, filtro: FiltroContratacoes): AsyncGenerator<PaginaContratacoes> {
      chamadas.push({ endpoint, filtro });
      yield* emPaginas(opcoes.paginas?.(endpoint, filtro) ?? []);
    },
    async *paginarPropostas(filtro: FiltroPropostas): AsyncGenerator<PaginaContratacoes> {
      propostasPedidas.push(filtro);
      yield* emPaginas(opcoes.propostas?.(filtro) ?? []);
    },
    async listarItens(compra: ChaveCompra): Promise<unknown[]> {
      itensPedidos.push(compra.id);
      return opcoes.itens?.(compra) ?? [itemBruto(1)];
    },
  };
}
```

- [ ] **Step 5: Linha de comando e workflow**

`worker/backfill.ts`: troque o arquivo inteiro por:
```ts
import './ambiente';
import { parseArgs } from 'node:util';
import { criarBanco, criarSupabase } from './banco';
import { executarBackfill } from './carga';
import { LIMITE_INVALIDOS, lerModalidades, lerPropostaAte, lerSupabase, lerUfs } from './config';
import { hojeBrasilia } from './datas';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';

// Uso: npm run worker:backfill -- --dias 30 --ufs BR --proposta [--proposta-ate aaaa-mm-dd]
const { values } = parseArgs({
  options: {
    dias: { type: 'string', default: '90' },
    ufs: { type: 'string' },
    modalidades: { type: 'string' },
    proposta: { type: 'boolean', default: false },
    'proposta-ate': { type: 'string' },
  },
});
const dias = Number(values.dias);
if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error('--dias precisa ser um inteiro entre 1 e 365');
const propostaAte =
  values.proposta || values['proposta-ate'] ? lerPropostaAte(values['proposta-ate'], hojeBrasilia(new Date())) : null;

const { url, chave } = lerSupabase();
const cliente = criarCliente();
const resumo = new Resumo(`Carga inicial (${dias} dias${propostaAte ? ` + propostas até ${propostaAte}` : ''})`);

await executarBackfill(
  { cliente, banco: criarBanco(criarSupabase(url, chave)), resumo, agora: () => new Date(), log: (linha) => console.log(linha) },
  {
    dias,
    ufs: lerUfs(values.ufs ?? process.env.UFS),
    modalidades: lerModalidades(values.modalidades ?? process.env.MODALIDADES),
    propostaAte,
  },
);
await resumo.publicar(cliente.estatisticas());
process.exitCode = resumo.falhou(LIMITE_INVALIDOS) ? 1 : 0;
```

`.github/workflows/sync.yml`: troque `          UFS: SC,PR,RS` por:
```yaml
          UFS: BR
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run worker scripts && npm run typecheck`
Expected: PASS (os testes antigos de `carga.test.ts` continuam passando).

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add worker .github/workflows/sync.yml scripts/migracoes.test.ts
git commit -m "feat: carga nacional com publicações e /proposta, e sync do país inteiro no workflow" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

Este commit não vai para o `main` antes da carga (Task 16, perigo M3).

---

### Task 14: `worker:conferir` nacional (abertas por UF contra o `/proposta`)

**Files:**
- Modify: `worker/conferir.ts`, `worker/conferencia/amostra.ts`, `worker/conferencia/relatorio.ts`
- Test: `worker/conferencia/amostra.test.ts`, `worker/conferencia/relatorio.test.ts`

**Interfaces:**
- Consumes: `lerUfs`, `UF_BRASIL`, `UFS_BRASIL`, `lerPropostaAte` (`worker/config.ts`); `cliente.totalPropostas` (Task 11); `totalDeItens` (Task 1).
- Produces:
  - `ufsDaConferencia(valor: string | undefined, aleatorio?: () => number, quantas?: number): string[]` em `amostra.ts`.
  - `type LinhaAbertas = { uf: string; modalidade: number; banco: number; pncp: number }`; `abertasCoerentes(l: LinhaAbertas): boolean` (banco ≥ 90% do `/proposta`, que é um teto aproximado); `DadosRelatorio.abertas: LinhaAbertas[]` no lugar de `contagens`.
  - CLI: `UFS=BR npm run worker:conferir -- --amostra 20 [--ufs-abertas SP,BA,AM] [--proposta-ate aaaa-mm-dd] [--idempotencia]` (sai `--dias-contagem`: com a retenção, o banco não guarda todas as publicações de um dia).

- [ ] **Step 1: Testes (falhando)**

`worker/conferencia/amostra.test.ts`: acrescente `ufsDaConferencia` ao import de `./amostra` e, no fim:
```ts
describe('ufsDaConferencia', () => {
  it('sem valor, sorteia 3 UFs diferentes do Brasil, em ordem', () => {
    expect(ufsDaConferencia(undefined, () => 0)).toEqual(['AC', 'AL', 'AM']);
  });
  it('usa as UFs pedidas', () => {
    expect(ufsDaConferencia(' sp,ba ')).toEqual(['SP', 'BA']);
  });
  it('recusa BR e UF inexistente', () => {
    expect(() => ufsDaConferencia('BR')).toThrow('informe UFs');
    expect(() => ufsDaConferencia('XX')).toThrow('UF inválida: XX');
  });
});
```

`worker/conferencia/relatorio.test.ts`: troque o arquivo inteiro por:
```ts
import { describe, expect, it } from 'vitest';
import { abertasCoerentes, montarRelatorio, veredito, type DadosRelatorio } from './relatorio';

function dados(extra: Partial<DadosRelatorio> = {}): DadosRelatorio {
  return {
    dia: '2026-10-20',
    amostra: [
      {
        candidata: {
          id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982, uf: 'SC', modalidade_id: 6,
          valor_estimado: 1, link_origem: null, muitos_itens: false, motivo: 'sorteio',
        },
        resultado: { id: 'C1', status: 'ok', diferencas: [] },
      },
    ],
    abertas: [{ uf: 'SP', modalidade: 6, banco: 97, pncp: 100 }],
    buscas: [{ verificacao: 'Busca acha pelos itens', status: 'ok', detalhe: '' }],
    idempotencia: { antes: { contratacoes: 10, comItens: 8 }, depois: { contratacoes: 10, comItens: 8 }, novas: 0, inexplicadas: [] },
    ...extra,
  };
}

describe('abertasCoerentes', () => {
  it('banco com 90% ou mais do /proposta é coerente; acima dele também (credenciamentos longos)', () => {
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 90, pncp: 100 })).toBe(true);
    expect(abertasCoerentes({ uf: 'SP', modalidade: 12, banco: 130, pncp: 100 })).toBe(true);
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 0, pncp: 0 })).toBe(true);
  });
  it('abaixo de 90% não é', () => {
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 80, pncp: 100 })).toBe(false);
  });
});

describe('veredito', () => {
  it('passa quando tudo bate', () => {
    expect(veredito(dados())).toEqual({ passou: true, motivos: [] });
  });
  it('reprova abertas abaixo de 90% do /proposta', () => {
    const v = veredito(dados({ abertas: [{ uf: 'SP', modalidade: 6, banco: 80, pncp: 100 }] }));
    expect(v.passou).toBe(false);
    expect(v.motivos[0]).toContain('abertas');
  });
  it('reprova sem a verificação de idempotência', () => {
    expect(veredito(dados({ idempotencia: null })).motivos).toContain('Idempotência não verificada (rode com --idempotencia)');
  });
  it('desatualizada não reprova', () => {
    const d = dados();
    d.amostra[0].resultado = { id: 'C1', status: 'desatualizada', diferencas: [] };
    expect(veredito(d).passou).toBe(true);
  });
});

describe('montarRelatorio', () => {
  it('tem veredito, link do portal e a lista da conferência manual', () => {
    const t = montarRelatorio(dados());
    expect(t).toContain('# Conferência · 2026-10-20');
    expect(t).toContain('**Passou**');
    expect(t).toContain('https://pncp.gov.br/app/editais/00394452000103/2026/21982');
    expect(t).toContain('- [ ] ');
  });
  it('mostra as abertas por UF com a porcentagem', () => {
    expect(montarRelatorio(dados())).toContain('| SP | 6 | 97 | 100 | 97% |');
  });
  it('idempotência conta contratações e as que têm palavras e resumo dos itens', () => {
    expect(montarRelatorio(dados())).toContain('Contratações 10 → 10; com palavras e resumo dos itens 8 → 8.');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run worker/conferencia`
Expected: FAIL — `ufsDaConferencia` e `abertasCoerentes` não exportados; `DadosRelatorio` sem `abertas`.

- [ ] **Step 3: Sorteio das UFs**

`worker/conferencia/amostra.ts`: no topo, `import { lerUfs, UF_BRASIL, UFS_BRASIL } from '../config';` e, no fim:
```ts
/** UFs da conferência de abertas: as pedidas (validadas) ou `quantas` sorteadas entre as 27, em ordem. */
export function ufsDaConferencia(valor: string | undefined, aleatorio: () => number = Math.random, quantas = 3): string[] {
  if (valor?.trim()) {
    const ufs = lerUfs(valor);
    if (ufs.includes(UF_BRASIL)) throw new Error('Na conferência de abertas, informe UFs (ex.: SP,BA,AM), não BR');
    return ufs;
  }
  const restantes: string[] = [...UFS_BRASIL];
  const escolhidas: string[] = [];
  while (escolhidas.length < quantas && restantes.length > 0) {
    escolhidas.push(restantes.splice(Math.floor(aleatorio() * restantes.length), 1)[0]);
  }
  return escolhidas.sort();
}
```

- [ ] **Step 4: Relatório**

`worker/conferencia/relatorio.ts`: troque o arquivo inteiro por:
```ts
import { linkDoPortal } from '../mapear';
import type { Sorteada } from './amostra';
import type { ResultadoCompra } from './comparar';

/** Abertas no banco contra o totalRegistros do /proposta (teto aproximado) numa UF × modalidade. */
export type LinhaAbertas = { uf: string; modalidade: number; banco: number; pncp: number };
export type VerificacaoBusca = { verificacao: string; status: 'ok' | 'falhou' | 'inconclusivo'; detalhe: string };
export type Idempotencia = {
  antes: { contratacoes: number; comItens: number };
  depois: { contratacoes: number; comItens: number };
  novas: number;
  inexplicadas: string[];
};
export type DadosRelatorio = {
  dia: string;
  amostra: Array<{ candidata: Sorteada; resultado: ResultadoCompra }>;
  abertas: LinhaAbertas[];
  buscas: VerificacaoBusca[];
  idempotencia: Idempotencia | null;
};

/**
 * O /proposta inclui algumas encerradas e deixa de fora credenciamentos de prazo muito longo (medido na Fase 1):
 * coerente = o banco tem ao menos 90% dele. Mais que ele é normal.
 */
export function abertasCoerentes(l: LinhaAbertas): boolean {
  return l.banco >= Math.floor(0.9 * l.pncp);
}

export function veredito(d: DadosRelatorio): { passou: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const ruins = d.amostra.filter((a) => a.resultado.status === 'divergente' || a.resultado.status === 'erro');
  if (ruins.length > 0) motivos.push(`${ruins.length} compra(s) da amostra com divergência ou erro`);
  const baixas = d.abertas.filter((l) => !abertasCoerentes(l));
  if (baixas.length > 0) motivos.push(`${baixas.length} UF × modalidade com abertas abaixo de 90% do /proposta`);
  for (const b of d.buscas) if (b.status !== 'ok') motivos.push(`Busca: ${b.verificacao} (${b.status})`);
  if (!d.idempotencia) motivos.push('Idempotência não verificada (rode com --idempotencia)');
  else if (d.idempotencia.inexplicadas.length > 0) {
    motivos.push(`${d.idempotencia.inexplicadas.length} compra(s) nova(s) na 2ª rodada sem explicação`);
  }
  return { passou: motivos.length === 0, motivos };
}

export function montarRelatorio(d: DadosRelatorio): string {
  const v = veredito(d);
  const linhas: string[] = [`# Conferência · ${d.dia}`, '', '## Veredito', ''];
  linhas.push(v.passou ? '**Passou** nas verificações automáticas.' : '**Não passou.**');
  for (const m of v.motivos) linhas.push(`- ${m}`);

  linhas.push('', `## Amostra (${d.amostra.length} compras)`, '', '| Compra | Por que entrou | Status | Diferenças | Portal |', '|---|---|---|---|---|');
  for (const { candidata, resultado } of d.amostra) {
    const difs = resultado.diferencas.map((x) => `${x.campo}: banco ${x.banco} · PNCP ${x.pncp}`).join('<br>');
    const obs = resultado.observacao ? ` (${resultado.observacao})` : '';
    linhas.push(`| ${candidata.id} | ${candidata.motivo} | ${resultado.status}${obs} | ${difs || '—'} | [abrir](${linkDoPortal(candidata)}) |`);
  }

  linhas.push('', '## Abertas por UF (amostra)', '', '| UF | Modalidade | Banco | PNCP (/proposta, teto) | % |', '|---|---|---|---|---|');
  for (const l of d.abertas) {
    const pct = l.pncp === 0 ? '—' : `${Math.round((100 * l.banco) / l.pncp)}%`;
    linhas.push(`| ${l.uf} | ${l.modalidade} | ${l.banco} | ${l.pncp} | ${pct} |`);
  }

  linhas.push('', '## Busca', '');
  for (const b of d.buscas) linhas.push(`- ${b.verificacao}: **${b.status}**. ${b.detalhe}`);

  linhas.push('', '## Idempotência', '');
  if (!d.idempotencia) linhas.push('Não verificada nesta execução.');
  else {
    const i = d.idempotencia;
    linhas.push(
      `Contratações ${i.antes.contratacoes} → ${i.depois.contratacoes}; com palavras e resumo dos itens ${i.antes.comItens} → ${i.depois.comItens}.`,
      `Compras novas na 2ª rodada: ${i.novas}; sem explicação: ${i.inexplicadas.length ? i.inexplicadas.join(', ') : 'nenhuma'}.`,
    );
  }

  linhas.push('', '## Conferência manual (dono do produto)', '', 'Abra no portal e confira prazo e valor:', '');
  for (const { candidata } of d.amostra.slice(0, 5)) linhas.push(`- [ ] [${candidata.id}](${linkDoPortal(candidata)})`);
  return `${linhas.join('\n')}\n`;
}
```

- [ ] **Step 5: Script da conferência**

`worker/conferir.ts`:
1. Troque os imports e as constantes do topo (até `const hoje = hojeBrasilia(agora);`) por:
```ts
import './ambiente';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { criarBanco, criarSupabase } from './banco';
import { lerModalidades, lerPropostaAte, lerSupabase, lerUfs, UF_BRASIL } from './config';
import { sortearAmostra, ufsDaConferencia, type Candidata } from './conferencia/amostra';
import { compararCompra, type ResultadoCompra } from './conferencia/comparar';
import { montarRelatorio, type Idempotencia, type LinhaAbertas, type VerificacaoBusca } from './conferencia/relatorio';
import { hojeBrasilia } from './datas';
import { totalDeItens } from './itens';
import type { LinhaContratacao } from './mapear';
import { criarCliente } from './pncp/cliente';
import { Resumo } from './resumo';
import { chaveEstado, executarSync, mensagemDe } from './sincronizar';

// Uso: UFS=BR npm run worker:conferir -- --amostra 20 [--ufs-abertas SP,BA,AM] [--proposta-ate aaaa-mm-dd] [--idempotencia]
const { values } = parseArgs({
  options: {
    amostra: { type: 'string', default: '20' },
    'ufs-abertas': { type: 'string' },
    'proposta-ate': { type: 'string' },
    idempotencia: { type: 'boolean', default: false },
  },
});
const tamanho = Number(values.amostra);
const ufs = lerUfs(process.env.UFS);
const modalidades = lerModalidades(process.env.MODALIDADES);
const { url, chave } = lerSupabase();
const sb = criarSupabase(url, chave);
const cliente = criarCliente();
const agora = new Date();
const hoje = hojeBrasilia(agora);
const ufsAbertas = ufsDaConferencia(values['ufs-abertas']);
const propostaAte = lerPropostaAte(values['proposta-ate'], hoje);
```
2. Em `conferirAmostra`, troque `execucoes.get(chaveEstado(candidata.uf, candidata.modalidade_id)),` por:
```ts
        execucoes.get(chaveEstado(ufs[0] === UF_BRASIL ? UF_BRASIL : candidata.uf, candidata.modalidade_id)),
```
3. Apague as funções `sortearDias` e `contarDias` e ponha no lugar delas:
```ts
/** Abertas no banco por UF × modalidade contra o totalRegistros do /proposta (teto aproximado do PNCP). */
async function contarAbertas(): Promise<LinhaAbertas[]> {
  const linhas: LinhaAbertas[] = [];
  for (const uf of ufsAbertas) {
    for (const modalidade of modalidades) {
      const { count, error } = await sb
        .from('contratacoes')
        .select('id', { count: 'exact', head: true })
        .eq('uf', uf)
        .eq('modalidade_id', modalidade)
        .gt('encerramento_em', agora.toISOString());
      if (error) throw new Error(error.message);
      const pncp = await cliente.totalPropostas({ uf, modalidade, dataFinal: propostaAte });
      linhas.push({ uf, modalidade, banco: count ?? 0, pncp });
    }
  }
  return linhas;
}
```
4. No `montarRelatorio({ … })` do fim do arquivo, troque `contagens: await contarDias(),` por:
```ts
  abertas: await contarAbertas(),
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run worker/conferencia && npm run typecheck`
Expected: PASS; typecheck sem erros (sem `inicioDoDia`, `somarDias` ou `LinhaContagem` sobrando em `conferir.ts`).

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add worker/conferir.ts worker/conferencia
git commit -m "feat: conferência nacional compara as abertas por UF com o /proposta" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 15: Site do Brasil todo (27 estados no mapa e textos)

**Files:**
- Modify: `lib/painel.ts`, `lib/filtros.ts`, `components/Mapa.tsx`, `components/inicio/LegendaMapa.tsx`, `components/inicio/Chips.tsx`, `components/inicio/BuscaPrincipal.tsx`, `components/inicio/ColunaLista.tsx`, `components/FaixaCobertura.tsx`, `components/FormAlerta.tsx`, `app/sobre/page.tsx`
- Test: `lib/painel.test.ts`, `lib/filtros.test.ts`

**Interfaces:**
- Consumes: `UFS_BRASIL` de `lib/eventos.ts`.
- Produces:
  - `coresDosEstados(porUf: Record<string, number>): unknown` — `match` com os estados que têm editais pela faixa e `CORES_FAIXA[0]` no resto (ou só `CORES_FAIXA[0]` quando nenhum tem).
  - `contornosDosEstados(porUf, ufs: readonly string[])` — contorno azul em qualquer UF sem resultado.
  - `CONTORNO_VAZIO_COR` exportado; sai `COR_SEM_COBERTURA`.
  - `UFS_ORDENADAS: readonly string[]` (27, em ordem alfabética) em `lib/filtros.ts`; sai `UFS_COBERTAS`; `lerFiltros` aceita qualquer UF.

- [ ] **Step 1: Testes (falhando)**

`lib/painel.test.ts`:
1. Troque o import de `./painel` por:
```ts
import { CONTORNO_VAZIO_COR, CORES_FAIXA, contornosDosEstados, coresDosEstados, faixaDaUf, resumirPontos } from './painel';
```
2. Troque os blocos `describe('cores dos estados', …)` e `describe('contornos dos estados', …)` por:
```ts
describe('cores dos estados', () => {
  it('faixas 1–19, 20–49, 50–199, 200+', () => {
    expect([0, 1, 19, 20, 49, 50, 199, 200].map(faixaDaUf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('expressão de cor: cada estado com editais pela faixa, os outros no tom mais claro', () => {
    expect(coresDosEstados({ SC: 5, PR: 352, RS: 0, BA: 60 })).toEqual([
      'match', ['get', 'uf'], 'BA', CORES_FAIXA[3], 'PR', CORES_FAIXA[4], 'SC', CORES_FAIXA[1], CORES_FAIXA[0],
    ]);
  });
  it('nenhum estado com editais: cor única (o match do MapLibre exige ao menos um rótulo)', () => {
    expect(coresDosEstados({})).toBe(CORES_FAIXA[0]);
  });
});

describe('contornos dos estados', () => {
  const UFS = ['SC', 'PR', 'RS', 'SP'];
  it('nenhum estado vazio: contorno branco comum', () => {
    expect(contornosDosEstados({ SC: 5, PR: 352, RS: 1, SP: 9 }, UFS)).toEqual({ cor: '#ffffff', largura: 1 });
  });
  it('qualquer UF sem resultado ganha o contorno azul mais grosso', () => {
    expect(contornosDosEstados({ PR: 352, RS: 1, SC: 4 }, UFS)).toEqual({
      cor: ['match', ['get', 'uf'], ['SP'], CONTORNO_VAZIO_COR, '#ffffff'],
      largura: ['match', ['get', 'uf'], ['SP'], 1.5, 1],
    });
  });
  it('vários vazios: uma lista só de rótulos, na ordem da lista de UFs', () => {
    expect(contornosDosEstados({ PR: 352 }, UFS)).toEqual({
      cor: ['match', ['get', 'uf'], ['SC', 'RS', 'SP'], '#9db0cc', '#ffffff'],
      largura: ['match', ['get', 'uf'], ['SC', 'RS', 'SP'], 1.5, 1],
    });
  });
});
```

`lib/filtros.test.ts`:
1. Troque o import de `./filtros` por:
```ts
import { chaveFiltros, lerFiltros, paraParametros, UFS_ORDENADAS } from './filtros';
```
2. Troque o teste `'descarta UF fora da cobertura, IBGE malformado e dias diferentes de 7'` por:
```ts
  it('descarta UF que não existe, IBGE malformado e dias diferentes de 7', () => {
    expect(ler('uf=XX&ibge=123&dias=30')).toEqual(BASE);
  });
  it('aceita qualquer UF do Brasil', () => {
    expect(ler('uf=sp').uf).toBe('SP');
    expect(ler('uf=AM').uf).toBe('AM');
  });
```
3. No fim:
```ts
describe('UFS_ORDENADAS', () => {
  it('as 27 UFs em ordem alfabética', () => {
    expect(UFS_ORDENADAS).toHaveLength(27);
    expect(UFS_ORDENADAS[0]).toBe('AC');
    expect(UFS_ORDENADAS[26]).toBe('TO');
    expect([...UFS_ORDENADAS].sort()).toEqual(UFS_ORDENADAS);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/painel.test.ts lib/filtros.test.ts`
Expected: FAIL — `CONTORNO_VAZIO_COR` e `UFS_ORDENADAS` não exportados; `uf=sp` descartado.

- [ ] **Step 3: Painel e filtros**

`lib/painel.ts`: troque tudo de `export const COR_SEM_COBERTURA = '#ebe6d9';` até o fim do arquivo por:
```ts
/** Expressão `match` do MapLibre que pinta cada estado com editais pela faixa; os sem editais ficam no tom mais claro. */
export function coresDosEstados(porUf: Record<string, number>): unknown {
  const pares = Object.keys(porUf)
    .filter((uf) => (porUf[uf] ?? 0) > 0)
    .sort()
    .flatMap((uf) => [uf, CORES_FAIXA[faixaDaUf(porUf[uf])]]);
  // `match` exige ao menos um rótulo: sem nenhum estado com editais, a cor é uma só.
  return pares.length > 0 ? ['match', ['get', 'uf'], ...pares, CORES_FAIXA[0]] : CORES_FAIXA[0];
}

/** Contorno branco comum entre os estados. */
const CONTORNO_COR = '#ffffff';
const CONTORNO_LARGURA = 1;
/** Estado sem resultado na busca: contorno azul mais grosso, para não sumir no fundo branco. */
export const CONTORNO_VAZIO_COR = CORES_FAIXA[2];
const CONTORNO_VAZIO_LARGURA = 1.5;

/**
 * Contorno dos estados: branco comum, e azul mais grosso em qualquer UF sem nenhum edital na busca atual.
 * `match` do MapLibre exige ao menos um rótulo: sem estado vazio devolve os valores simples.
 */
export function contornosDosEstados(porUf: Record<string, number>, ufs: readonly string[]): { cor: unknown; largura: unknown } {
  const vazias = ufs.filter((uf) => (porUf[uf] ?? 0) === 0);
  if (vazias.length === 0) return { cor: CONTORNO_COR, largura: CONTORNO_LARGURA };
  return {
    cor: ['match', ['get', 'uf'], vazias, CONTORNO_VAZIO_COR, CONTORNO_COR],
    largura: ['match', ['get', 'uf'], vazias, CONTORNO_VAZIO_LARGURA, CONTORNO_LARGURA],
  };
}
```

`lib/filtros.ts`:
1. Troque as duas primeiras linhas (`import type …` e `export const UFS_COBERTAS = …`) por:
```ts
import { UFS_BRASIL } from './eventos';
import type { FiltrosBusca, FiltrosTela } from './tipos';

/** As 27 UFs em ordem alfabética, para os seletores de UF. */
export const UFS_ORDENADAS: readonly string[] = [...UFS_BRASIL].sort();
```
2. Em `lerFiltros`, troque `const uf = (UFS_COBERTAS as readonly string[]).includes(ufBruta) ? ufBruta : null;` por:
```ts
  const uf = UFS_BRASIL.includes(ufBruta) ? ufBruta : null;
```

- [ ] **Step 4: Mapa, legenda e seletores**

`components/Mapa.tsx`:
1. Troque `import { UFS_COBERTAS } from '@/lib/filtros';` por `import { UFS_BRASIL } from '@/lib/eventos';`.
2. No efeito de `porUf`, troque as duas linhas que usam `UFS_COBERTAS` por:
```tsx
    const contorno = contornosDosEstados(porUf, UFS_BRASIL);
    mapa.current.setPaintProperty('estados', 'fill-color', coresDosEstados(porUf) as unknown as ExpressionSpecification);
```
3. No `m.on('load', …)`, troque `paint: { 'fill-color': coresDosEstados(porUfAtual.current, UFS_COBERTAS) as unknown as ExpressionSpecification },` por:
```tsx
          paint: { 'fill-color': coresDosEstados(porUfAtual.current) as unknown as ExpressionSpecification },
```
e `const contorno = contornosDosEstados(porUfAtual.current, UFS_COBERTAS);` por:
```tsx
        const contorno = contornosDosEstados(porUfAtual.current, UFS_BRASIL);
```
4. Na dica do estado, troque `linhas = (UFS_COBERTAS as readonly string[]).includes(uf) ? [uf, editais(porUfAtual.current[uf] ?? 0)] : [uf, 'Em breve'];` por:
```tsx
          linhas = [uf, editais(porUfAtual.current[uf] ?? 0)];
```

`components/inicio/LegendaMapa.tsx`:
1. Troque o import por `import { CONTORNO_VAZIO_COR, CORES_FAIXA } from '@/lib/painel';`.
2. Troque o parágrafo
```tsx
      <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-xs" style={{ background: COR_SEM_COBERTURA }} aria-hidden="true" />
        Estados em cinza: em breve
      </p>
```
por:
```tsx
      <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
        <span className="size-2.5 rounded-xs border-[1.5px] bg-raised" style={{ borderColor: CONTORNO_VAZIO_COR }} aria-hidden="true" />
        Contorno azul: estado sem edital nesta busca
      </p>
```

`components/inicio/Chips.tsx`: troque `import { MODALIDADES, UFS_COBERTAS, VALORES_MINIMOS } from '@/lib/filtros';` por `import { MODALIDADES, UFS_ORDENADAS, VALORES_MINIMOS } from '@/lib/filtros';` e `{UFS_COBERTAS.map((u) => (` por `{UFS_ORDENADAS.map((u) => (`.

`components/inicio/BuscaPrincipal.tsx`:
1. Troque as linhas `import { UFS_BRASIL } from '@/lib/eventos';` e `import { UFS_COBERTAS } from '@/lib/filtros';` por `import { UFS_ORDENADAS } from '@/lib/filtros';`.
2. Apague a linha `const EM_BREVE = UFS_BRASIL.filter((u) => !(UFS_COBERTAS as readonly string[]).includes(u)).sort();` (e a linha em branco depois dela).
3. Troque o bloco das opções (de `{UFS_COBERTAS.map((u) => (` até o `</optgroup>`) por:
```tsx
            {UFS_ORDENADAS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
```
4. Na classe do `<select>`, apague ` [&>optgroup]:bg-raised [&>optgroup]:text-ink`.

- [ ] **Step 5: Textos "Editais abertos de todo o Brasil"**

`components/FaixaCobertura.tsx`: troque `Hoje cobrimos <strong className="text-ink">SC, PR e RS</strong> · <span className="hidden sm:inline">fonte: </span>PNCP` por:
```tsx
      Editais abertos de <strong className="text-ink">todo o Brasil</strong> · <span className="hidden sm:inline">fonte: </span>PNCP
```

`components/inicio/ColunaLista.tsx`: troque `Hoje cobrimos SC, PR e RS · o ponto é a sede do órgão, não o local de entrega` por:
```tsx
          Editais abertos de todo o Brasil · o ponto é a sede do órgão, não o local de entrega
```

`components/FormAlerta.tsx`: troque `<p className="text-[13px] text-ink-muted">Hoje cobrimos SC, PR e RS; os outros estados entram depois.</p>` por:
```tsx
        <p className="text-[13px] text-ink-muted">Editais abertos de todo o Brasil: marque os estados onde você atende.</p>
```

`app/sobre/page.tsx`: troque as duas linhas
```tsx
            Do PNCP, o Portal Nacional de Contratações Públicas, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia esses
            dados a cada 2 horas. Hoje cobrimos Santa Catarina, Paraná e Rio Grande do Sul.
```
por:
```tsx
            Do PNCP, o Portal Nacional de Contratações Públicas, onde os órgãos publicam as contratações da Lei 14.133. O Edital Map copia esses
            dados a cada 3 horas: editais abertos de todo o Brasil.
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run lib && npm run typecheck && npm run build`
Expected: PASS; typecheck e build sem erros. Conferir:
- `grep -rn "UFS_COBERTAS\|COR_SEM_COBERTURA\|cobrimos\|SC, PR e RS\|2 horas" app components lib` → nada.
- `grep -rni "em breve" components/Mapa.tsx components/inicio/BuscaPrincipal.tsx components/inicio/LegendaMapa.tsx` → nada.

- [ ] **Step 7: Commit**

```bash
npm test && npm run typecheck
git add lib components app/sobre/page.tsx
git commit -m "feat: mapa com os 27 estados e textos de editais abertos de todo o Brasil" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 16 (controlador): carga do Brasil todo, publicação e medição

**Files:**
- Modify: `docs/fase-3-metricas.md`

- [ ] **Step 1: Pré-condições**

M2 aplicado (Task 10). Branch `fase-3-brasil-todo` com as Tasks 11–15, `npm test && npm run typecheck && npm run build` passando. `npm run db:medir` (anotar).

- [ ] **Step 2: Conferir o `dataFinal` do `/proposta` (2 chamadas ao PNCP)**

```bash
HOJE=$(date +%Y%m%d); ANO=$(date -d '+365 days' +%Y%m%d)
curl -s "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=$HOJE&codigoModalidadeContratacao=12&pagina=1&tamanhoPagina=10" | grep -o '"totalRegistros":[0-9]*'
curl -s "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=$ANO&codigoModalidadeContratacao=12&pagina=1&tamanhoPagina=10" | grep -o '"totalRegistros":[0-9]*'
```
Usar como `--proposta-ate` a data (aaaa-mm-dd) que devolveu **mais** registros (padrão do código: hoje + 365). Se as duas devolverem 0 ou erro 400, ler a mensagem do PNCP e ajustar só `urlPropostas` em `worker/pncp/cliente.ts` (com teste), antes de seguir. Registrar os dois números em `docs/fase-3-metricas.md`.

- [ ] **Step 3: Carga nacional em segundo plano (máquina do dono, código do branch)**

O sync do GitHub continua no código do `main` (M2, SC/PR/RS) durante a carga; não fazer merge ainda.
```bash
npm run worker:backfill -- --dias 30 --ufs BR --proposta --proposta-ate <data do Step 2> > "<scratchpad>/carga-br.log" 2>&1
```
Esperado: 4–6 h. Uma linha `[carga] atualizacao:BR:<m> ok · N páginas · T s` por modalidade, na ordem 6, 8, 4, 7, 12.

- [ ] **Step 4: Tamanho no meio da carga**

Quando aparecerem as linhas de `atualizacao:BR:6` e `atualizacao:BR:8` no log: `npm run db:medir`. Regra:
- até 300 MB: seguir;
- entre 300 e 400 MB: seguir, mas avisar o dono com o número;
- acima de 400 MB: parar a carga (encerrar o processo), não fazer merge, e levar os números ao dono antes de qualquer outra coisa.

- [ ] **Step 5: Fim da carga**

No resumo final do log: `Erros = 0`, registros inválidos abaixo de 5%, "Fora da retenção (não gravadas)" > 0. Seção [M3] de `docs/fase-3-conferencia.sql`: 27 UFs com abertas > 0; 5 chaves `atualizacao:BR:*` com `ultima_data` do dia em que a carga começou. Se alguma chave deu erro no log, rodar de novo só ela: `npm run worker:backfill -- --dias 30 --ufs BR --modalidades <m> --proposta --proposta-ate <data>`.

- [ ] **Step 6: Merge (sync do país inteiro no GitHub) e primeira rodada**

```bash
git checkout main
git merge --ff-only fase-3-brasil-todo
git push origin main
git checkout fase-3-brasil-todo
gh workflow run sync.yml
```
`gh run watch`: sucesso; no log, uma linha `[sync] atualizacao:BR:<m> ok` por modalidade; anotar a duração. Se uma chave BR ficar mais de 2 dias para trás (rodadas cortadas pelo prazo de 25 min), rodar `UFS=BR npm run worker:sync` na máquina do dono (sem o limite de 30 min do Actions) até ela alcançar hoje.

- [ ] **Step 7: Publicar e conferir o site**

`vercel deploy --prod --yes`. Conferir:
- `curl -s https://edital-map.vercel.app/api/mapa | node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(new Set(p.map(x=>x.uf)).size)"` → `27`. Anotar o tempo (`curl -s -o /dev/null -w "%{time_total}\n"`) da primeira chamada; a última consulta da seção [M3] (`explain analyze` do mapa) também.
- `curl -s "https://edital-map.vercel.app/api/busca?q=nitrilica&uf=SP"` → 200 com resultados.
- `curl -s https://edital-map.vercel.app/ | grep -c "todo o Brasil"` ≥ 1; `curl -s https://edital-map.vercel.app/sobre | grep -c "3 horas"` = 1.
- Edital encerrado há ≤ 7 dias (slug via SQL: `select slug from contratacoes where encerramento_em between now() - interval '7 days' and now() limit 1`) abre com 200 e a etiqueta "Encerrado".

- [ ] **Step 8: Capturas**

Edge invisível na porta 9333 e `npm run capturas -- https://edital-map.vercel.app <slug1> <slug2> <slug3>`: um edital aberto de um estado novo com itens, um sem itens (lista vazia do PNCP), um de SC/PR/RS. Olhar nas imagens: os 27 estados pintados, nenhum cinza "em breve", a faixa "Editais abertos de todo o Brasil", os itens do PNCP na página do edital.

- [ ] **Step 9: Conferência nacional**

`UFS=BR npm run worker:conferir -- --amostra 20 --proposta-ate <data do Step 2>` (as 3 UFs da amostra de abertas são sorteadas e aparecem no relatório). Expected: abertas por UF ≥ 90% do `/proposta` nas 3 UFs × 5 modalidades (credenciamento pode passar de 100%); amostra sem divergência que não seja "desatualizada". Relatório em `docs/conferencias/<hoje>.md`.

- [ ] **Step 10: Tamanho final**

`npm run db:medir` (e `npm run db:medir -- --vacuum` fora do minuto 17 se `contratacoes` tiver inchado com as remoções da retenção). Meta: banco abaixo de 300 MB.

- [ ] **Step 11: Rodadas do sync (24 h depois)**

```bash
gh run list --workflow sync.yml --limit 8 --json databaseId,event,conclusion,createdAt,updatedAt
```
Duração = `updatedAt − createdAt`. Meta: as 8 primeiras rodadas nacionais abaixo de 12 min, todas `success`. Se a média passar de 8 min, avisar o dono: 8 rodadas/dia × 30 dias × média passa dos 2.000 min/mês do GitHub em repositório privado.

- [ ] **Step 12: Registrar**

Acrescentar em `docs/fase-3-metricas.md`:
```markdown
## M3 · Brasil todo

- `/proposta` (modalidade 12): dataFinal hoje = N; hoje + 365 = N. Usado: aaaa-mm-dd.
- Carga: T h, páginas, compras gravadas, fora da retenção, itens lidos, 429, erros (do resumo do log).
- Banco: antes da carga, no meio (depois de 6 e 8), no fim (e depois do VACUUM, se houve).
- Abertas por UF (27 linhas da seção [M3]).
- Mapa sem busca: tempo da `/api/mapa` e do `explain analyze`.

| Rodada | Início | Duração | Resultado |
|---|---|---|---|
| … | … | … | … |
```
```bash
git add docs/fase-3-metricas.md docs/conferencias
git commit -m "docs: métricas da carga do Brasil todo e das primeiras rodadas nacionais" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
```

---

### Task 17: Documentação e aceite

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-10-16-fase-3-brasil-todo-design.md` (§8)

- [ ] **Step 1: `CLAUDE.md`**

1. Troque o parágrafo `Fase atual: **2 · Mapa**. Site … atualizado a cada 2 h.` por:
```markdown
Fase atual: **3 · Brasil todo** (etapa da Fase 3 antes de Planos e Alertas). Site Next.js na Vercel em https://edital-map.vercel.app (domínio próprio pendente) sobre o espelho do PNCP (27 UFs) atualizado a cada 3 h.
```
2. Apague a linha `- **Ordem da migração 0004 (enquanto não aplicada):** …` inteira.
3. Depois da linha `- Iteração visual: …`, acrescente:
```markdown
- Brasil todo: spec docs/superpowers/specs/2026-10-16-fase-3-brasil-todo-design.md, plano docs/superpowers/plans/2026-10-16-fase-3-brasil-todo.md, conferências docs/fase-3-conferencia.sql, métricas docs/fase-3-metricas.md.
```
4. Em "Stack", troque `agendado no GitHub Actions (.github/workflows/sync.yml, a cada 2 h).` por `agendado no GitHub Actions (.github/workflows/sync.yml, a cada 3 h, UFS=BR) e disparado também pelo pg_cron (sync-pncp).`
5. Em "Regras", acrescente:
```markdown
- Itens não ficam no banco: cada contratação guarda itens_palavras (tsvector sem posições, mesma configuração de texto) e itens_resumo (jsonb); a lista de itens do edital vem do PNCP na hora (lib/servidor/itensPncp.ts), com "Itens indisponíveis agora" se falhar.
- Retenção: contratação encerrada há mais de 7 dias ou sem encerramento_em é apagada todo dia (pg_cron retencao-contratacoes) e o worker não a grava.
- UFS vazio ou BR = país inteiro numa consulta só (sem uf no PNCP); chaves de estado atualizacao:BR:<modalidade>. O /proposta só serve para encontrar contratações na carga.
- Medir o banco com npm run db:medir; VACUUM FULL só com npm run db:medir -- --vacuum, fora das rodadas do sync.
```
6. Em "Comandos", troque a linha do backfill por `- npm run worker:backfill -- --dias 30 --ufs BR --proposta [--proposta-ate aaaa-mm-dd]`, a do `worker:reler-itens` por `- npm run worker:reler-itens: regrava palavras e resumo dos itens das compras abertas (depois de mudar a regra do resumo)`, a do `worker:conferir` por `- UFS=BR npm run worker:conferir -- --amostra 20 [--ufs-abertas SP,BA,AM] [--proposta-ate aaaa-mm-dd] [--idempotencia]`, e acrescente:
```markdown
- npm run db:aplicar -- supabase/migrations/NNNN_nome.sql: aplica uma migração (uma transação)
- npm run db:medir [-- --vacuum]: tamanho do banco e das tabelas
```

- [ ] **Step 2: Aceite na spec**

Na seção 8 da spec, marque `[x]` em cada critério cumprido, com o comprovante ao lado (número medido, data, link da rodada ou arquivo de métricas); o que faltar fica `[ ]` com uma frase do que falta.

- [ ] **Step 3: Verificação final**

Run: `npm test && npm run typecheck && npm run build`
Expected: tudo passa.

- [ ] **Step 4: Commit e publicação do branch**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-16-fase-3-brasil-todo-design.md
git commit -m "docs: Fase 3 · Brasil todo no ar, regras e comandos novos e aceite" -m "Co-Authored-By: <modelo> <noreply@anthropic.com>"
git checkout main && git merge --ff-only fase-3-brasil-todo && git push origin main && git checkout fase-3-brasil-todo
```

---

## Riscos conhecidos (para o revisor e o controlador)

- **Volume nacional do `atualizacao`.** A janela do sync é por dia (o PNCP não aceita hora): à noite uma rodada relê o dia inteiro do país. A meta de 12 min é medida no Step 11 da Task 16; se uma chave passar do prazo de 25 min, ela fica para a rodada seguinte e o controlador alcança rodando o sync localmente.
- **`/proposta`.** O significado exato de `dataFinal` não está no manual; o Step 2 da Task 16 escolhe a data pelo maior `totalRegistros`. O endpoint só encontra; "aberta" continua sendo `encerramento_em > now()`.
- **Site lendo o PNCP.** Se o PNCP bloquear ou demorar para a Vercel (gru1), a página mostra "Itens indisponíveis agora"; o resumo ("O que compram", ME/EPP) continua vindo do banco.
- **Mapa sem busca no país inteiro.** `abertas_unicas` passa a ordenar ~4× mais linhas; o tempo é anotado no Step 7 da Task 16 (o cache de 5 min já cobre as visitas seguintes).

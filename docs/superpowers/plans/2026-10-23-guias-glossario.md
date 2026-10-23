# Guias e glossário · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /guias (12 guias) e /glossario (cerca de 60 termos), estáticos, com JSON-LD, sitemap e links internos.

**Architecture:** conteúdo tipado em `conteudo/` (um arquivo por guia, um glossário, um arquivo de valores por decreto), validado por testes; rotas estáticas em `app/guias` e `app/glossario` com componentes em `components/guias/`; texto com links por uma marcação curta `[texto](/caminho)` convertida por função pura.

**Tech Stack:** Next.js 16 (App Router, `generateStaticParams`), React 19, Tailwind 4, vitest.

**Spec:** docs/superpowers/specs/2026-10-23-guias-glossario-design.md

## Global Constraints

- TDD: teste primeiro; `npm test` e `npm run typecheck` passam antes de cada commit.
- Fontes só `https://` de: planalto.gov.br, gov.br (e subdomínios), pncp.gov.br, tcu.gov.br, in.gov.br, caixa.gov.br, tst.jus.br, receita.fazenda.gov.br.
- Resposta direta e definição: 40 a 60 palavras. Descrição: até 160 caracteres. Guia: 3 a 6 perguntas, 2+ fontes.
- Nada de promessa ("garanta", "ganhe"); sempre "confira o edital". Português do Brasil, vocabulário "edital", "Alertas".
- Valores por decreto só em `conteudo/valores.ts`, conferidos no Planalto.
- Links para `/?…` e páginas com `prefetch={false}`. Canônico em https://www.editalmap.com.br.

---

### Task 1: Tipos, valores, links e validação

**Files:** Create `conteudo/tipos.ts`, `conteudo/valores.ts`, `lib/guias/texto.ts` (+test), `lib/guias/validar.ts` (+test)

**Interfaces (Produces):**
```ts
// conteudo/tipos.ts
export type Fonte = { nome: string; url: string };
export type Bloco = { tipo: 'paragrafo'; texto: string } | { tipo: 'lista'; itens: string[] } | { tipo: 'passos'; itens: string[] };
export type Secao = { titulo: string; blocos: Bloco[] };
export type Pergunta = { pergunta: string; resposta: string };
export type Guia = {
  slug: string; titulo: string; descricao: string; resposta: string; revisadoEm: string;
  secoes: Secao[]; editais: string[]; perguntas: Pergunta[]; fontes: Fonte[]; relacionados: string[];
};
export type Termo = { slug: string; nome: string; definicao: string; detalhe?: string; artigo?: string; relacionados: string[]; guia?: string };
// lib/guias/texto.ts
export type Pedaco = { tipo: 'texto'; texto: string } | { tipo: 'link'; texto: string; href: string; externo: boolean };
export function pedacos(texto: string): Pedaco[];          // [x](/a) e [x](https://oficial) viram link; outro domínio vira texto
export function linksDoTexto(texto: string): string[];      // hrefs internos (para validar)
export function palavras(texto: string): number;
export const DOMINIOS_OFICIAIS: readonly string[];
export function ehOficial(url: string): boolean;
// lib/guias/validar.ts
export function problemasDoGuia(g: Guia, ctx: { guias: Set<string>; termos: Set<string>; caminhoExiste: (c: string) => boolean; hoje: string }): string[];
export function problemasDoTermo(t: Termo, ctx: {...mesmo}): string[];
```
- [ ] Testes de `pedacos` (interno, oficial, não oficial, texto sem link), `palavras`, `ehOficial` (subdomínio de gov.br sim; `gov.br.exemplo.com` não), e de `problemasDoGuia`/`problemasDoTermo` com casos bons e ruins (cada regra da spec, seção 7).
- [ ] `conteudo/valores.ts`: `VALORES_2026` com `dispensaCompras`, `dispensaObras` (Decreto 12.807/2025, vigência 1º/1/2026, fonte planalto), conferidos antes.
- [ ] Commit `feat(guias): tipos, links do texto e validação do conteúdo`.

### Task 2: Rotas, componentes, JSON-LD, sitemap e links internos

**Files:** Create `conteudo/guias/index.ts` (lista `GUIAS`), `conteudo/glossario.ts` (`TERMOS`), `lib/guias/caminhos.ts` (+test: `caminhoExiste` com assunto, modalidade, UF, guia, termo, páginas fixas), `lib/guias/jsonld.ts` (+test), `components/guias/*`, `app/guias/page.tsx`, `app/guias/[slug]/page.tsx`, `app/glossario/page.tsx`, `app/glossario/[termo]/page.tsx`, `conteudo/conteudo.test.ts` (roda a validação em todos); Modify `app/sitemaps/[arquivo]/route.ts`, `lib/seo/marca.ts` (rodapé + perguntas com links), `components/licitacoes/PaginaLicitacoes.tsx` (seção "Aprenda a licitar" no índice e "Entenda como funciona" nas modalidades), `lib/seo/modalidades.ts` (`guia?: string`).
- `jsonLdGuia(g)`: Article + FAQPage + BreadcrumbList; `jsonLdTermo(t)`: DefinedTerm em DefinedTermSet + BreadcrumbList.
- Estáticas: `generateStaticParams`, `dynamicParams = false`.
- [ ] Com um guia e 3 termos de exemplo reais (pilar), testes passam, build passa; commit `feat(guias): páginas de guias e glossário`.

### Task 3: Conteúdo (12 guias e ~60 termos)

- Escritos em paralelo (agentes), cada um conferindo a lei 14.133 no Planalto e as páginas oficiais; os testes de `conteudo/conteudo.test.ts` passam em cada arquivo.
- [ ] Revisão minha de cada guia (fatos, tom, links); commit `feat(guias): primeiro lote de guias e glossário`.

### Task 4: Publicar e conferir

- [ ] `npm test`, `npm run typecheck`, `npm run build`; deploy por worktree limpo; `curl` em /guias, um guia, /glossario, um termo (200, title, canônico, JSON-LD); sitemap com os novos.
- [ ] CLAUDE.md e memória; commit `docs: guias e glossário no CLAUDE.md`.

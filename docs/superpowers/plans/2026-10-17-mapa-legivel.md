# Mapa legível Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o mapa da página inicial por um mapa legível: fundo OpenFreeMap positron, divisas estaduais marcadas, nome de cada estado e pílulas HTML com a quantidade de editais (sem pintura dos estados nem legenda).

**Architecture:** O estilo do OpenFreeMap é baixado por nós (`carregarEstilo`) e ajustado por funções puras (nomes em português, nome de estado do fundo escondido, camada própria de divisas); se falhar, entra um estilo de reserva (fundo branco + `estados.json`). As pílulas são `<button>` postos com `Marker` do MapLibre sobre os grupos e cidades da fonte agrupada `editais`, recalculadas a cada `render`. Toda a lógica que não depende do DOM (texto, rótulo, dica, estilo) fica em `lib/` com testes vitest.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, maplibre-gl 6.14 (só ESM), vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-17-mapa-legivel-design.md`

## Global Constraints

- Interface e textos em português do Brasil; código, nomes e comentários em português, como o resto do repositório.
- TDD: teste primeiro (vitest). `npm test` e `npm run typecheck` passam antes de cada commit.
- Cores só do design system: `pin` #ff5a1f, `ink` #0c2340, `ink-muted` #3e5373, `on-pin` #0c2340, `raised` #ffffff, foco `rio`.
- Estilo do fundo: `https://tiles.openfreemap.org/styles/positron`; fonte dos nomes: `Noto Sans Bold` (servidor de fontes do estilo).
- Agrupamento: `clusterRadius: 60`, `clusterMaxZoom: 8`.
- Divisas: linha `#0c2340`, opacidade 0,55, largura `interpolate linear zoom 3 → 0.8, 7 → 1.6`.
- Tempo máximo para o estilo responder antes da reserva: 8 s.
- maplibre-gl 6 é só ESM: continuar com `await import('maplibre-gl')` e `setWorkerUrl` como hoje em `components/Mapa.tsx`.
- Fim de cada mensagem de commit: linha em branco + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não mexer em migrações, `lib/eventos.ts`, rotas `/api`, cabeçalho nem `GavetaCelular.tsx` (outra sessão, `fase-3-limites-planos-celular`, trabalha neles). Em `components/Explorador.tsx`, só as linhas do mapa e da coluna da direita (Task 5).

## Ambiente de trabalho

A pasta principal está na `main` com alterações de outra pessoa ainda não commitadas (página do edital). **Não trabalhar nela.** Antes da Task 1, criar um worktree com a skill `superpowers:using-git-worktrees`, branch `mapa-legivel` a partir da `main`. Copiar o `.env` da pasta principal para o worktree (só local, ele está no `.gitignore`), rodar `npm install` no worktree e confirmar `npm test` verde antes de começar.

## Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/formato.ts` / `lib/formato.test.ts` | Modificar | `numeroCurto(n)` (texto da pílula) |
| `lib/estados.ts` / `lib/estados.test.ts` | Criar | `NOMES_UF`, `centroDoEstado`, `AJUSTES_ROTULO` |
| `scripts/gerar-estados-geojson.ts` | Modificar | também grava `public/geo/estados-rotulos.json` |
| `public/geo/estados-rotulos.json` | Criar (gerado) | um ponto por UF com `uf` e `nome` |
| `lib/geo.ts` / `lib/geo.test.ts` | Modificar | `paraGeoJSON(pontos, destaque)` marca a cidade selecionada |
| `lib/mapaRotulos.ts` / `lib/mapaRotulos.test.ts` | Criar | `pilula`, `linhasDica`, `ajustarEstilo`, `estiloReserva`, `carregarEstilo`, camadas de nomes e de espaço das pílulas |
| `components/Mapa.tsx` | Reescrever | monta o mapa com o estilo carregado, fontes, camadas e pílulas |
| `app/globals.css` | Modificar | classes `.pilula-mapa` |
| `components/Explorador.tsx` | Modificar (linhas ~15, ~209, ~219) | tira `porUf` do `<Mapa>`, tira `<LegendaMapa>`, põe a observação no canto do mapa |
| `components/inicio/LegendaMapa.tsx` | Apagar | — |
| `lib/painel.ts` / `lib/painel.test.ts` | Modificar | sai o que só servia à pintura dos estados |
| `CLAUDE.md` | Modificar | stack do mapa e links da spec/plano |

---

### Task 1: Número curto da pílula

**Files:**
- Modify: `lib/formato.ts` (logo depois de `numero`, linha ~44)
- Test: `lib/formato.test.ts`

**Interfaces:**
- Produces: `numeroCurto(n: number): string` — até 9.999 com ponto de milhar; de 10 mil, `"12 mil"` (milhares inteiros, para baixo); de 1 milhão, `"1,2 mi"` (uma casa, para baixo). Espaço inseparável como em `moedaCurta`.

- [ ] **Step 1: Write the failing test**

Em `lib/formato.test.ts`, acrescente `numeroCurto` ao import da linha 2 e este bloco no fim do arquivo:

```ts
describe('numeroCurto (pílula do mapa)', () => {
  it('até 9.999 com ponto de milhar', () => {
    expect(numeroCurto(1)).toBe('1');
    expect(numeroCurto(1443)).toBe('1.443');
    expect(numeroCurto(9999)).toBe('9.999');
  });
  it('de 10 mil em diante, milhares inteiros', () => {
    expect(numeroCurto(10000)).toBe('10 mil');
    expect(numeroCurto(12345)).toBe('12 mil');
    expect(numeroCurto(999999)).toBe('999 mil');
  });
  it('de 1 milhão, uma casa', () => {
    expect(numeroCurto(1_000_000)).toBe('1,0 mi');
    expect(numeroCurto(1_260_000)).toBe('1,2 mi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/formato.test.ts`
Expected: FAIL — `numeroCurto` não é exportado.

- [ ] **Step 3: Write minimal implementation**

Em `lib/formato.ts`, logo depois da função `numero`:

```ts
/** Quantidade curta para a pílula do mapa: "1.443", "12 mil", "1,2 mi" (para baixo, com espaço inseparável). */
export function numeroCurto(n: number): string {
  if (n >= 1e6) return `${fmtUmaCasa.format(Math.floor(n / 1e5) / 10)}${NBSP}mi`;
  if (n >= 1e4) return `${fmtInteiro.format(Math.floor(n / 1e3))}${NBSP}mil`;
  return fmtNumero.format(n);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/formato.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/formato.ts lib/formato.test.ts
git commit -m "feat: numeroCurto para as pílulas do mapa"
```

---

### Task 2: Nomes e posição dos nomes dos estados

**Files:**
- Create: `lib/estados.ts`
- Test: `lib/estados.test.ts`
- Modify: `scripts/gerar-estados-geojson.ts`
- Create (gerado): `public/geo/estados-rotulos.json`

**Interfaces:**
- Consumes: `UFS_BRASIL: readonly string[]` de `lib/eventos.ts` (só no teste).
- Produces:
  - `NOMES_UF: Readonly<Record<string, string>>` (27 UFs → nome em português).
  - `centroDoEstado(g: Polygon | MultiPolygon): [number, number]` — centro por área do maior anel externo, `[lng, lat]`.
  - `AJUSTES_ROTULO: Readonly<Record<string, [number, number]>>` — posição manual por UF (começa vazio).
  - Arquivo `public/geo/estados-rotulos.json`: `FeatureCollection` de `Point` com `properties: { uf: string; nome: string }`, 27 features.

- [ ] **Step 1: Write the failing test**

Crie `lib/estados.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { centroDoEstado, NOMES_UF } from './estados';
import { UFS_BRASIL } from './eventos';

describe('NOMES_UF', () => {
  it('tem as 27 UFs, e só elas', () => {
    expect(Object.keys(NOMES_UF).sort()).toEqual([...UFS_BRASIL].sort());
  });
  it('nomes em português, com acento', () => {
    expect(NOMES_UF.SP).toBe('São Paulo');
    expect(NOMES_UF.PA).toBe('Pará');
    expect(NOMES_UF.DF).toBe('Distrito Federal');
  });
});

describe('centroDoEstado', () => {
  it('centro por área de um polígono', () => {
    const quadrado = { type: 'Polygon' as const, coordinates: [[[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]]] };
    expect(centroDoEstado(quadrado)).toEqual([2, 1]);
  });
  it('anel no sentido horário dá o mesmo centro', () => {
    const horario = { type: 'Polygon' as const, coordinates: [[[0, 0], [0, 2], [4, 2], [4, 0], [0, 0]]] };
    expect(centroDoEstado(horario)).toEqual([2, 1]);
  });
  it('multipolígono: usa o maior pedaço (ilhas não puxam o nome)', () => {
    const g = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
        [[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]]],
      ],
    };
    expect(centroDoEstado(g)).toEqual([3, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/estados.test.ts`
Expected: FAIL — módulo `./estados` não existe.

- [ ] **Step 3: Write minimal implementation**

Crie `lib/estados.ts`:

```ts
import type { MultiPolygon, Polygon } from 'geojson';

/** Nome de cada UF, para os rótulos do mapa. */
export const NOMES_UF: Readonly<Record<string, string>> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/**
 * Posição manual do nome ([lng, lat]) para a UF cujo centro calculado fique ruim no mapa.
 * Começa vazio; só entra UF que a conferência visual (Task 7) mostrar fora do lugar.
 */
export const AJUSTES_ROTULO: Readonly<Record<string, [number, number]>> = {};

/** Centro por área ([lng, lat]) do maior anel externo: num multipolígono, as ilhas não puxam o nome. */
export function centroDoEstado(g: Polygon | MultiPolygon): [number, number] {
  const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let melhor: [number, number] = [0, 0];
  let maiorArea = 0;
  for (const [anel] of poligonos) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < anel.length - 1; i++) {
      const [x0, y0] = anel[i];
      const [x1, y1] = anel[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    if (Math.abs(a) > maiorArea) {
      maiorArea = Math.abs(a);
      melhor = [cx / (3 * a), cy / (3 * a)];
    }
  }
  return melhor;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/estados.test.ts`
Expected: PASS

- [ ] **Step 5: Gerar o arquivo dos nomes**

Em `scripts/gerar-estados-geojson.ts`:

1. No topo, junto dos imports:

```ts
import type { MultiPolygon, Polygon } from 'geojson';
import { AJUSTES_ROTULO, centroDoEstado, NOMES_UF } from '../lib/estados';
```

2. Na primeira linha de comentário, troque por:

```ts
// Gera public/geo/estados.json (contorno das 27 UFs) e public/geo/estados-rotulos.json (ponto do nome de cada UF)
// a partir da malha do IBGE (qualidade mínima).
```

3. No fim do arquivo, depois do `console.log` que já existe:

```ts
const rotulos = {
  type: 'FeatureCollection',
  features: features.map((f) => {
    const uf = f.properties.uf;
    const [lng, lat] = AJUSTES_ROTULO[uf] ?? centroDoEstado(f.geometry as Polygon | MultiPolygon);
    return { type: 'Feature', properties: { uf, nome: NOMES_UF[uf] }, geometry: { type: 'Point', coordinates: arredondar([lng, lat]) } };
  }),
};
const jsonRotulos = JSON.stringify(rotulos);
await writeFile('public/geo/estados-rotulos.json', jsonRotulos);
console.log(`public/geo/estados-rotulos.json: ${rotulos.features.length} nomes, ${Math.round(jsonRotulos.length / 1024)} KB`);
```

Run: `npm run gerar:estados`
Expected: duas linhas, `public/geo/estados.json: 27 UFs, ~86 KB` e `public/geo/estados-rotulos.json: 27 nomes, 2 KB`.
Confira com `git diff --stat public/geo/estados.json`: o contorno deve ficar igual (ou mudar pouco, se o IBGE tiver atualizado a malha). Se o IBGE estiver fora, pare e avise; não escreva o arquivo à mão.

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add lib/estados.ts lib/estados.test.ts scripts/gerar-estados-geojson.ts public/geo/estados-rotulos.json public/geo/estados.json
git commit -m "feat: nomes e posição dos nomes dos estados para o mapa"
```

---

### Task 3: Cidade selecionada nos dados do mapa

**Files:**
- Modify: `lib/geo.ts:4-16`
- Test: `lib/geo.test.ts:4-18`

**Interfaces:**
- Produces: `PropsPonto = { ibge: string; nome: string; uf: string; qtd: number; valor: number; destaque: 0 | 1 }` e `paraGeoJSON(pontos: PontoMapa[], destaque?: string | null): FeatureCollection<Point, PropsPonto>` — `destaque: 1` só no ponto cujo `codigo_ibge` é o `destaque` (default `null`).

- [ ] **Step 1: Write the failing test**

Em `lib/geo.test.ts`, no teste existente troque a expectativa de `properties` para:

```ts
      properties: { ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', qtd: 367, valor: 1000, destaque: 0 },
```

e acrescente dentro do `describe('paraGeoJSON', …)`:

```ts
  it('marca só a cidade selecionada (para a pílula e o grupo ficarem escuros)', () => {
    const pontos = [
      { codigo_ibge: '4314902', nome: 'Porto Alegre', uf: 'RS', lat: -30.03, lng: -51.2, qtd: 367, valor_total: 1000, prazo_mais_proximo: '2026-10-15T20:00:00Z' },
      { codigo_ibge: '4202404', nome: 'Blumenau', uf: 'SC', lat: -26.9, lng: -49.07, qtd: 3, valor_total: null, prazo_mais_proximo: '2026-10-16T20:00:00Z' },
    ];
    expect(paraGeoJSON(pontos, '4202404').features.map((f) => f.properties.destaque)).toEqual([0, 1]);
    expect(paraGeoJSON(pontos, null).features.map((f) => f.properties.destaque)).toEqual([0, 0]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/geo.test.ts`
Expected: FAIL — falta `destaque` nas propriedades.

- [ ] **Step 3: Write minimal implementation**

Em `lib/geo.ts`, troque o tipo e a função:

```ts
export type PropsPonto = { ibge: string; nome: string; uf: string; qtd: number; valor: number; destaque: 0 | 1 };

/** Pontos do mapa em GeoJSON; `destaque` (código IBGE da cidade do edital selecionado) marca essa cidade com 1. */
export function paraGeoJSON(pontos: PontoMapa[], destaque: string | null = null): FeatureCollection<Point, PropsPonto> {
  return {
    type: 'FeatureCollection',
    features: pontos.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { ibge: p.codigo_ibge, nome: p.nome, uf: p.uf, qtd: p.qtd, valor: p.valor_total ?? 0, destaque: p.codigo_ibge === destaque ? 1 : 0 },
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/geo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/geo.ts lib/geo.test.ts
git commit -m "feat: paraGeoJSON marca a cidade selecionada"
```

---

### Task 4: Texto das pílulas, dicas e estilo do fundo

**Files:**
- Create: `lib/mapaRotulos.ts`
- Test: `lib/mapaRotulos.test.ts`

**Interfaces:**
- Consumes: `numeroCurto`, `numero`, `moedaCurta` de `lib/formato.ts` (Task 1).
- Produces (usados pela Task 5):
  - `type PropsPilula = { cluster?: boolean; cluster_id?: number; ibge?: string; nome?: string; uf?: string; qtd: number; valor: number; destaque: number }` — o que `querySourceFeatures('editais')` devolve (cidade de `paraGeoJSON`, ou grupo com as somas de `clusterProperties`).
  - `type Pilula = { chave: string; texto: string; rotulo: string; grupo: boolean; destaque: boolean }`
  - `pilula(p: PropsPilula): Pilula` — `chave` é `g<cluster_id>` (grupo) ou `c<ibge>` (cidade).
  - `linhasDica(p: PropsPilula): string[]`
  - `URL_ESTILO: string`, `ID_DIVISAS = 'divisas-estados'`, `NOME_PT: ExpressionSpecification`
  - `ajustarEstilo(estilo: StyleSpecification): StyleSpecification`
  - `estiloReserva(): StyleSpecification`
  - `carregarEstilo(buscar?: typeof fetch, ms?: number): Promise<StyleSpecification>`
  - `CAMADA_NOMES_ESTADOS: SymbolLayerSpecification` (fonte `nomes-estados`) e `CAMADA_ESPACO_PILULAS: SymbolLayerSpecification` (fonte `editais`)

- [ ] **Step 1: Write the failing test**

Crie `lib/mapaRotulos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { ajustarEstilo, carregarEstilo, estiloReserva, ID_DIVISAS, linhasDica, NOME_PT, pilula, URL_ESTILO } from './mapaRotulos';

const cidade = { ibge: '3550308', nome: 'São Paulo', uf: 'SP', qtd: 1443, valor: 40_000_000, destaque: 0 };
const grupo = { cluster: true, cluster_id: 7, qtd: 12345, valor: 2_100_000_000, destaque: 1 };

describe('pilula', () => {
  it('cidade: número, rótulo com cidade/UF e chave pelo IBGE', () => {
    expect(pilula(cidade)).toEqual({ chave: 'c3550308', texto: '1.443', rotulo: 'São Paulo/SP: 1.443 editais abertos', grupo: false, destaque: false });
  });
  it('grupo: número curto, rótulo que convida a aproximar e chave pelo cluster', () => {
    expect(pilula(grupo)).toEqual({ chave: 'g7', texto: '12 mil', rotulo: '12.345 editais abertos nesta região. Aproximar', grupo: true, destaque: true });
  });
  it('singular', () => {
    expect(pilula({ ...cidade, qtd: 1 }).rotulo).toBe('São Paulo/SP: 1 edital aberto');
  });
});

describe('linhasDica', () => {
  it('cidade: nome, quantidade e valor', () => {
    expect(linhasDica(cidade)).toEqual(['São Paulo/SP', '1.443 editais abertos', 'R$ 40,00 mi']);
  });
  it('grupo: quantidade, valor e convite para aproximar', () => {
    expect(linhasDica(grupo)).toEqual(['12.345 editais abertos', 'R$ 2,1 bi', 'Aproxime para ver as cidades']);
  });
  it('sem valor: a linha do valor some', () => {
    expect(linhasDica({ ...cidade, valor: 0 })).toEqual(['São Paulo/SP', '1.443 editais abertos']);
  });
});

const ESTILO: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f2f3f0' } },
    { id: 'boundary_3', type: 'line', source: 'openmaptiles', 'source-layer': 'boundary' },
    { id: 'label_city', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] } },
    { id: 'label_state', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']] } },
  ],
};
const ids = (ls: LayerSpecification[]) => ls.map((l) => l.id);

describe('ajustarEstilo', () => {
  it('rótulos em português', () => {
    const e = ajustarEstilo(ESTILO);
    const cidadeLayer = e.layers.find((l) => l.id === 'label_city');
    expect(cidadeLayer?.type === 'symbol' && cidadeLayer.layout?.['text-field']).toEqual(NOME_PT);
  });
  it('esconde o nome de estado do fundo (os nossos entram por cima)', () => {
    const e = ajustarEstilo(ESTILO);
    const estado = e.layers.find((l) => l.id === 'label_state');
    expect(estado?.type === 'symbol' && estado.layout?.visibility).toBe('none');
  });
  it('põe as divisas logo depois das fronteiras do fundo', () => {
    expect(ids(ajustarEstilo(ESTILO).layers)).toEqual(['background', 'boundary_3', ID_DIVISAS, 'label_city', 'label_state']);
  });
  it('sem boundary_3: divisas antes do primeiro rótulo', () => {
    const semFronteira = { ...ESTILO, layers: ESTILO.layers.filter((l) => l.id !== 'boundary_3') };
    expect(ids(ajustarEstilo(semFronteira).layers)).toEqual(['background', ID_DIVISAS, 'label_city', 'label_state']);
  });
  it('não altera o estilo recebido', () => {
    const copia = JSON.parse(JSON.stringify(ESTILO));
    ajustarEstilo(ESTILO);
    expect(ESTILO).toEqual(copia);
  });
});

describe('estiloReserva', () => {
  it('fundo branco e contornos do nosso arquivo, sem fontes externas', () => {
    const e = estiloReserva();
    expect(e.glyphs).toBeUndefined();
    expect(e.sources.estados).toEqual({ type: 'geojson', data: '/geo/estados.json' });
    expect(ids(e.layers)).toEqual(['fundo', ID_DIVISAS]);
  });
});

describe('carregarEstilo', () => {
  it('estilo do OpenFreeMap ajustado', async () => {
    let pedida = '';
    const buscar = (async (url: string) => {
      pedida = url;
      return new Response(JSON.stringify(ESTILO), { status: 200 });
    }) as unknown as typeof fetch;
    const e = await carregarEstilo(buscar);
    expect(pedida).toBe(URL_ESTILO);
    expect(ids(e.layers)).toContain(ID_DIVISAS);
    expect(e.glyphs).toBe(ESTILO.glyphs);
  });
  it('resposta de erro: reserva', async () => {
    const buscar = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await carregarEstilo(buscar)).toEqual(estiloReserva());
  });
  it('falha de rede ou tempo esgotado: reserva', async () => {
    const buscar = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await carregarEstilo(buscar)).toEqual(estiloReserva());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/mapaRotulos.test.ts`
Expected: FAIL — módulo `./mapaRotulos` não existe.

- [ ] **Step 3: Write minimal implementation**

Crie `lib/mapaRotulos.ts`:

```ts
import type { ExpressionSpecification, LayerSpecification, LineLayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import { moedaCurta, numero, numeroCurto } from './formato';

/** Fundo do mapa: OpenFreeMap (gratuito, sem chave), estilo cinza claro. */
export const URL_ESTILO = 'https://tiles.openfreemap.org/styles/positron';
/** Sem resposta nesse tempo, o mapa monta a reserva. */
const ESPERA_ESTILO_MS = 8000;
const FONTE_NOMES = ['Noto Sans Bold'];
export const ID_DIVISAS = 'divisas-estados';
/** Nome dos lugares do fundo em português, quando houver. */
export const NOME_PT: ExpressionSpecification = ['coalesce', ['get', 'name:pt'], ['get', 'name']];

const PINTURA_DIVISAS: LineLayerSpecification['paint'] = {
  'line-color': '#0c2340',
  'line-opacity': 0.55,
  'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 7, 1.6],
};

/** Divisas estaduais dos próprios tiles (batem com o litoral do fundo, ao contrário do nosso contorno simplificado). */
const DIVISAS: LineLayerSpecification = {
  id: ID_DIVISAS,
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'boundary',
  filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
  layout: { 'line-join': 'round' },
  paint: PINTURA_DIVISAS,
};

/** O que o MapLibre entrega por pílula: cidade (de paraGeoJSON) ou grupo (cluster, com as somas de clusterProperties). */
export type PropsPilula = {
  cluster?: boolean;
  cluster_id?: number;
  ibge?: string;
  nome?: string;
  uf?: string;
  qtd: number;
  valor: number;
  destaque: number;
};
export type Pilula = { chave: string; texto: string; rotulo: string; grupo: boolean; destaque: boolean };

const editais = (n: number) => `${numero(n)} ${n === 1 ? 'edital aberto' : 'editais abertos'}`;

export function pilula(p: PropsPilula): Pilula {
  const grupo = p.cluster === true;
  const qtd = Number(p.qtd);
  return {
    chave: grupo ? `g${p.cluster_id}` : `c${p.ibge}`,
    texto: numeroCurto(qtd),
    rotulo: grupo ? `${editais(qtd)} nesta região. Aproximar` : `${p.nome}/${p.uf}: ${editais(qtd)}`,
    grupo,
    destaque: Number(p.destaque) > 0,
  };
}

/** Linhas da dica ao passar o mouse; a primeira vai em negrito. */
export function linhasDica(p: PropsPilula): string[] {
  const valor = moedaCurta(Number(p.valor ?? 0));
  const qtd = Number(p.qtd);
  if (p.cluster === true) return [editais(qtd), ...(valor ? [valor] : []), 'Aproxime para ver as cidades'];
  return [`${p.nome}/${p.uf}`, editais(qtd), ...(valor ? [valor] : [])];
}

/** Estilo do OpenFreeMap ajustado: rótulos em português, nome de estado do fundo escondido e nossas divisas por cima das fronteiras. */
export function ajustarEstilo(estilo: StyleSpecification): StyleSpecification {
  const layers: LayerSpecification[] = [];
  let comDivisas = false;
  for (const l of estilo.layers) {
    if (l.type === 'symbol' && l.layout?.['text-field'] !== undefined) {
      const esconder = l.id === 'label_state' ? { visibility: 'none' as const } : {};
      layers.push({ ...l, layout: { ...l.layout, 'text-field': NOME_PT, ...esconder } });
    } else {
      layers.push(l);
    }
    if (l.id === 'boundary_3') {
      layers.push(DIVISAS);
      comDivisas = true;
    }
  }
  if (!comDivisas) {
    const primeiroRotulo = layers.findIndex((l) => l.type === 'symbol');
    layers.splice(primeiroRotulo === -1 ? layers.length : primeiroRotulo, 0, DIVISAS);
  }
  return { ...estilo, layers };
}

/** Sem o OpenFreeMap: fundo branco e o nosso contorno dos estados (sem nomes, porque as fontes também vêm de lá). */
export function estiloReserva(): StyleSpecification {
  return {
    version: 8,
    sources: { estados: { type: 'geojson', data: '/geo/estados.json' } },
    layers: [
      { id: 'fundo', type: 'background', paint: { 'background-color': '#ffffff' } },
      { id: ID_DIVISAS, type: 'line', source: 'estados', paint: { ...PINTURA_DIVISAS, 'line-width': 1 } },
    ],
  };
}

/** Baixa e ajusta o estilo do fundo; erro, resposta ruim ou demora viram a reserva, sem aviso ao usuário. */
export async function carregarEstilo(buscar: typeof fetch = fetch, ms = ESPERA_ESTILO_MS): Promise<StyleSpecification> {
  try {
    const r = await buscar(URL_ESTILO, { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return estiloReserva();
    return ajustarEstilo((await r.json()) as StyleSpecification);
  } catch {
    return estiloReserva();
  }
}

/** Nome de cada estado (fonte `nomes-estados`, de public/geo/estados-rotulos.json). Some quando colide e volta ao aproximar. */
export const CAMADA_NOMES_ESTADOS: SymbolLayerSpecification = {
  id: 'nomes-estados',
  type: 'symbol',
  source: 'nomes-estados',
  layout: {
    'text-field': ['upcase', ['get', 'nome']],
    'text-font': FONTE_NOMES,
    'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 6, 14],
    'text-letter-spacing': 0.12,
    'text-max-width': 7,
    'text-padding': 4,
  },
  paint: { 'text-color': '#3e5373', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
};

/**
 * Texto invisível no lugar de cada pílula (fonte `editais`), acima dos nomes: as pílulas são HTML e não entram na
 * colisão do MapLibre; isto reserva o espaço delas para os nomes dos estados não ficarem por baixo.
 * Tamanho e deslocamento aproximam a pílula (12 px, acima do ponto).
 */
export const CAMADA_ESPACO_PILULAS: SymbolLayerSpecification = {
  id: 'espaco-pilulas',
  type: 'symbol',
  source: 'editais',
  layout: {
    'text-field': ['to-string', ['get', 'qtd']],
    'text-font': FONTE_NOMES,
    'text-size': 12,
    'text-anchor': 'bottom',
    'text-offset': [0, -0.6],
    'text-padding': 10,
    'text-allow-overlap': true,
    'text-ignore-placement': false,
  },
  paint: { 'text-opacity': 0 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/mapaRotulos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npm test && npm run typecheck
git add lib/mapaRotulos.ts lib/mapaRotulos.test.ts
git commit -m "feat: pílulas, dicas e estilo do fundo do mapa (OpenFreeMap com reserva)"
```

---

### Task 5: Mapa novo (fundo, nomes, pílulas) e ligação no Explorador

**Files:**
- Rewrite: `components/Mapa.tsx`
- Modify: `app/globals.css` (depois do bloco `.maplibregl-popup-content`, linha ~50)
- Modify: `components/Explorador.tsx:209` (só a prop `porUf`)

**Interfaces:**
- Consumes: `paraGeoJSON(pontos, destaque)` (Task 3); `pilula`, `linhasDica`, `carregarEstilo`, `CAMADA_NOMES_ESTADOS`, `CAMADA_ESPACO_PILULAS`, `PropsPilula` (Task 4); `public/geo/estados-rotulos.json` (Task 2); `ALTURA_GAVETA_RECOLHIDA` de `components/GavetaCelular.tsx` (sem mudança).
- Produces: `Mapa` com props `{ pontos: PontoMapa[]; destaque: string | null; aoEscolherCidade: (c: Cidade) => void; raio: Raio | null }` (sai `porUf`).

Não há teste automático de componente neste repositório (vitest roda só `lib/`, `worker/` e `scripts/`, em ambiente node). A lógica testável já está em `lib/` (Tasks 1–4). Este passo é verificado por typecheck, build e captura.

- [ ] **Step 1: Reescrever `components/Mapa.tsx`**

Substitua o arquivo inteiro por:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from 'geojson';
import type { GeoJSONSource, Map as MapaLibre, Marker } from 'maplibre-gl';
import { areaDoRaio, circulo, limitesDoCirculo, paraGeoJSON, type Raio } from '@/lib/geo';
import { CAMADA_ESPACO_PILULAS, CAMADA_NOMES_ESTADOS, carregarEstilo, linhasDica, pilula, type PropsPilula } from '@/lib/mapaRotulos';
import type { Cidade, PontoMapa } from '@/lib/tipos';
import { ALTURA_GAVETA_RECOLHIDA } from './GavetaCelular';

// Abre mostrando o Brasil inteiro.
const BRASIL: [[number, number], [number, number]] = [[-74.2, -33.9], [-34.6, 5.4]];
/** Altura da pílula acima do ponto: a dica abre logo acima dela. */
const ALTURA_PILULA = 34;

type Props = {
  pontos: PontoMapa[];
  /** Código IBGE da cidade do edital selecionado: a pílula dela (ou do grupo que a contém) fica azul-escura. */
  destaque: string | null;
  aoEscolherCidade: (c: Cidade) => void;
  /** Área do filtro de raio (centro na sede do município): círculo fino e enquadramento nela. */
  raio: Raio | null;
};

type ItemPilula = { marcador: Marker; botao: HTMLButtonElement; texto: HTMLSpanElement; props: PropsPilula };

function conteudo(linhas: string[]): HTMLElement {
  const div = document.createElement('div');
  linhas.forEach((texto, i) => {
    const linha = document.createElement('div');
    if (i === 0) linha.style.fontWeight = '700';
    linha.textContent = texto;
    div.append(linha);
  });
  return div;
}

export function Mapa({ pontos, destaque, aoEscolherCidade, raio }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const [pronto, setPronto] = useState(false);
  const pontosAtuais = useRef(pontos);
  const destaqueAtual = useRef(destaque);
  const escolher = useRef(aoEscolherCidade);
  const raioAtual = useRef(raio);

  useEffect(() => {
    escolher.current = aoEscolherCidade;
  }, [aoEscolherCidade]);

  // Pontos e cidade selecionada vão juntos para a fonte: o destaque precisa passar pelo agrupamento.
  useEffect(() => {
    pontosAtuais.current = pontos;
    destaqueAtual.current = destaque;
    if (pronto) (mapa.current?.getSource('editais') as GeoJSONSource | undefined)?.setData(paraGeoJSON(pontos, destaque));
  }, [pontos, destaque, pronto]);

  // Raio: círculo fino na área e o mapa enquadra nela. Depende só dos números: um objeto novo com os mesmos valores não reenquadra.
  useEffect(() => {
    raioAtual.current = raio;
    const m = mapa.current;
    if (!pronto || !m) return;
    (m.getSource('raio') as GeoJSONSource | undefined)?.setData(areaDoRaio(raio));
    if (!raio) return;
    // No celular a gaveta recolhida cobre a base do mapa (no máximo metade da altura, senão o fitBounds desiste).
    const celular = window.matchMedia('(max-width: 1023px)').matches;
    const baixo = celular ? Math.min(ALTURA_GAVETA_RECOLHIDA + 24, Math.floor(m.getContainer().clientHeight / 2)) : 40;
    m.fitBounds(limitesDoCirculo(circulo(raio.lng, raio.lat, raio.km)), { padding: { top: 40, right: 40, left: 40, bottom: baixo }, duration: 600 });
  }, [pronto, raio?.lng, raio?.lat, raio?.km]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      // maplibre-gl 6 é só ESM: sem export default.
      const maplibregl = await import('maplibre-gl');
      // O Turbopack reescreve import.meta.url do maplibre-gl e o worker padrão some (URL vazia):
      // aponta o worker para o arquivo do pacote, que o bundler publica como asset estático.
      maplibregl.setWorkerUrl(new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
      // Fundo do OpenFreeMap ajustado, ou a reserva (fundo branco + nosso contorno) se ele não responder.
      const estilo = await carregarEstilo();
      if (cancelado || !caixa.current) return;
      // Os nomes dos estados e o espaço das pílulas precisam das fontes do OpenFreeMap: na reserva ficam de fora.
      const comFontes = Boolean(estilo.glyphs);
      // No celular a gaveta recolhida cobre a base do mapa: reserva esse espaço no enquadramento inicial,
      // mas no máximo metade da altura, senão em tela baixa o fitBounds desiste e o mapa fica em [0,0].
      const celular = window.matchMedia('(max-width: 1023px)').matches;
      const baixo = Math.min(ALTURA_GAVETA_RECOLHIDA + 16, Math.floor(caixa.current.clientHeight / 2));
      const m = new maplibregl.Map({
        container: caixa.current,
        style: estilo,
        bounds: BRASIL,
        fitBoundsOptions: { padding: celular ? { top: 16, right: 16, left: 16, bottom: baixo } : 16 },
        // Crédito do OpenStreetMap é obrigatório com o fundo; na reserva não há fonte de terceiros.
        attributionControl: comFontes ? { compact: true } : false,
        // Textos nativos do MapLibre em português do Brasil.
        locale: {
          'Map.Title': 'Mapa de editais',
          'NavigationControl.ZoomIn': 'Aproximar',
          'NavigationControl.ZoomOut': 'Afastar',
          'AttributionControl.ToggleAttribution': 'Mostrar créditos do mapa',
        },
        // Sem bússola, o usuário não consegue voltar ao norte: nada de rotação nem inclinação.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();
      mapa.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      const dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, anchor: 'bottom', offset: ALTURA_PILULA });

      m.on('load', () => {
        m.addSource('raio', { type: 'geojson', data: areaDoRaio(raioAtual.current) });
        m.addLayer({
          id: 'raio', type: 'line', source: 'raio',
          paint: { 'line-color': '#0c2340', 'line-width': 1.5, 'line-dasharray': [2, 2] },
        });
        m.addSource('editais', {
          type: 'geojson', data: paraGeoJSON(pontosAtuais.current, destaqueAtual.current),
          cluster: true, clusterRadius: 60, clusterMaxZoom: 8,
          clusterProperties: { qtd: ['+', ['get', 'qtd']], valor: ['+', ['get', 'valor']], destaque: ['max', ['get', 'destaque']] },
        });
        if (comFontes) {
          m.addSource('nomes-estados', { type: 'geojson', data: '/geo/estados-rotulos.json' });
          m.addLayer(CAMADA_NOMES_ESTADOS);
          // Por cima dos nomes: o MapLibre posiciona de cima para baixo, então o espaço das pílulas vem primeiro.
          m.addLayer(CAMADA_ESPACO_PILULAS);
        }
        setPronto(true);
      });

      // Pílulas: um botão por grupo ou cidade visível, reaproveitado enquanto continuar na tela.
      const pilulas = new Map<string, ItemPilula>();

      const aoClicar = async (chave: string) => {
        const item = pilulas.get(chave);
        if (!item) return;
        dica.remove();
        const p = item.props;
        if (p.cluster === true) {
          const zoom = await (m.getSource('editais') as GeoJSONSource).getClusterExpansionZoom(Number(p.cluster_id));
          m.easeTo({ center: item.marcador.getLngLat(), zoom });
          return;
        }
        escolher.current({ ibge: String(p.ibge), nome: String(p.nome), uf: String(p.uf) });
      };

      const criar = (chave: string, lngLat: [number, number], props: PropsPilula): ItemPilula => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.classList.add('pilula-mapa');
        const texto = document.createElement('span');
        botao.append(texto);
        botao.addEventListener('click', () => void aoClicar(chave));
        botao.addEventListener('mouseenter', () => {
          const atual = pilulas.get(chave);
          if (atual) dica.setLngLat(atual.marcador.getLngLat()).setDOMContent(conteudo(linhasDica(atual.props))).addTo(m);
        });
        botao.addEventListener('mouseleave', () => dica.remove());
        const marcador = new maplibregl.Marker({ element: botao, anchor: 'bottom' }).setLngLat(lngLat).addTo(m);
        return { marcador, botao, texto, props };
      };

      const atualizarPilulas = () => {
        const vistas = new Set<string>();
        for (const f of m.querySourceFeatures('editais')) {
          const props = f.properties as PropsPilula;
          const p = pilula(props);
          // A mesma cidade ou grupo aparece em mais de um tile.
          if (vistas.has(p.chave)) continue;
          vistas.add(p.chave);
          const item = pilulas.get(p.chave) ?? criar(p.chave, (f.geometry as Point).coordinates as [number, number], props);
          pilulas.set(p.chave, item);
          item.props = props;
          item.texto.textContent = p.texto;
          item.botao.setAttribute('aria-label', p.rotulo);
          // classList: o Marker põe as classes dele no mesmo elemento.
          item.botao.classList.toggle('pilula-mapa-destaque', p.destaque);
          item.botao.style.zIndex = p.destaque ? '2' : '1';
        }
        for (const [chave, item] of pilulas) {
          if (vistas.has(chave)) continue;
          item.marcador.remove();
          pilulas.delete(chave);
        }
      };

      m.on('render', () => {
        if (m.getSource('editais') && m.isSourceLoaded('editais')) atualizarPilulas();
      });
    })();
    return () => {
      cancelado = true;
      setPronto(false);
      // remove() também tira as pílulas (Markers) e a dica.
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  // O MapLibre põe `position: relative` (CSS sem camada) no contêiner do mapa e vencia o `absolute` do Tailwind:
  // o mapa fica num filho que só preenche o pai.
  return (
    <div className="absolute inset-0" role="region" aria-label="Mapa de editais abertos por município">
      <div ref={caixa} className="h-full w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Estilo das pílulas**

Em `app/globals.css`, logo depois do bloco `.maplibregl-popup-content { … }`:

```css
/* Pílula do mapa: o botão tem 32 px de altura (área de toque); a pílula visível é o span, com a pontinha no ponto. */
.pilula-mapa {
  display: flex;
  min-height: 32px;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.pilula-mapa > span {
  position: relative;
  display: block;
  margin-bottom: 6px;
  padding: 4px 8px;
  border: 1.5px solid #ffffff;
  border-radius: 999px;
  background: var(--color-pin);
  color: var(--color-on-pin);
  font: 700 12px/1 var(--font-mono);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(12, 35, 64, 0.35);
}

.pilula-mapa > span::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--color-pin);
}

.pilula-mapa-destaque > span {
  background: var(--color-ink);
  color: #ffffff;
}

.pilula-mapa-destaque > span::after {
  border-top-color: var(--color-ink);
}
```

- [ ] **Step 3: Tirar `porUf` do `<Mapa>` no Explorador**

Em `components/Explorador.tsx`, linha ~209, troque:

```tsx
          <Mapa pontos={pontos} porUf={painel.porUf} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
```

por:

```tsx
          <Mapa pontos={pontos} destaque={selecionado?.codigo_ibge ?? null} aoEscolherCidade={escolherCidade} raio={raioMapa} />
```

- [ ] **Step 4: Typecheck, testes e build**

Run: `npm run typecheck && npm test && npm run build`
Expected: os três passam. (`lib/painel.ts` ainda tem as funções antigas, agora sem uso no mapa; elas saem na Task 6.)

- [ ] **Step 5: Olhar no navegador**

Run: `npm run dev` (em segundo plano). Abra `http://localhost:3000` (ou capture com `npm run capturas -- http://localhost:3000`, com o Edge invisível na porta 9333) e confira:
- fundo cinza com países e cidades em português ("Brasil", não "Brazil");
- divisas estaduais escuras;
- nomes dos estados em maiúsculas;
- pílulas laranja com número, que não se encostam no Sudeste;
- a pílula da cidade do primeiro card fica azul-escura;
- clicar num grupo aproxima o mapa e clicar numa cidade filtra a lista;
- a dica aparece ao passar o mouse;
- Tab chega às pílulas, com contorno de foco.

Se os nomes dos estados ficarem por baixo das pílulas, ajuste `text-offset`/`text-padding` de `CAMADA_ESPACO_PILULAS` em `lib/mapaRotulos.ts` (e rode `npm test` de novo).

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add components/Mapa.tsx app/globals.css components/Explorador.tsx lib/mapaRotulos.ts
git commit -m "feat: mapa com fundo OpenFreeMap, nomes dos estados e pílulas com número"
```

---

### Task 6: Fim da pintura dos estados e da legenda

**Files:**
- Delete: `components/inicio/LegendaMapa.tsx`
- Modify: `components/Explorador.tsx:15` (import), `:208-219` (observação no mapa, sai `<LegendaMapa>`)
- Modify: `lib/painel.ts:30-92` (sai tudo depois de `resumirPontos`)
- Modify: `lib/painel.test.ts` (saem os `describe` de faixas, cores e contornos, e o import)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nada novo.
- Produces: `lib/painel.ts` exporta só `MunicipioPainel`, `Painel` e `resumirPontos`.

- [ ] **Step 1: Tirar os testes do que vai sair**

Em `lib/painel.test.ts`:
- troque a linha 2 por `import { resumirPontos } from './painel';`
- apague os blocos `describe('faixas relativas', …)`, `describe('cores dos estados', …)` e `describe('contornos dos estados', …)` inteiros (da linha ~40 até o fim), com as constantes que só eles usam (por exemplo uma lista `UFS` antes do `describe('contornos…')`).

Run: `npx vitest run lib/painel.test.ts`
Expected: PASS (só os 3 testes de `resumirPontos`).

- [ ] **Step 2: Tirar as funções**

Em `lib/painel.ts`, apague tudo depois do fim de `resumirPontos` (de `export type Faixa = …` até o fim do arquivo).

Apague `components/inicio/LegendaMapa.tsx`:

```bash
git rm components/inicio/LegendaMapa.tsx
```

- [ ] **Step 3: Explorador: sai a legenda, entra a observação no canto do mapa**

Em `components/Explorador.tsx`:
- apague a linha `import { LegendaMapa } from './inicio/LegendaMapa';`
- apague a linha `          <LegendaMapa porUf={painel.porUf} />`
- dentro da `<section aria-label="Mapa" …>`, logo depois do `<Mapa … />`, acrescente:

```tsx
          {/* No celular a gaveta cobre este canto: a observação fica só no computador. */}
          <p className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-sm bg-raised/85 px-2 py-1 text-xs text-ink-muted lg:block">
            O ponto é a sede do órgão, não o local de entrega.
          </p>
```

Run: `npm run typecheck`
Expected: PASS. Se acusar algo de `faixasRelativas`, `CORES_FAIXA`, `coresDosEstados`, `CONTORNO_VAZIO_COR` ou `contornosDosEstados` em outro lugar, procure com `git grep -n "faixasRelativas\|CORES_FAIXA\|coresDosEstados\|CONTORNO_VAZIO_COR\|contornosDosEstados"` e tire o uso (só existia no Mapa, na legenda e nos testes).

- [ ] **Step 4: CLAUDE.md**

Em `CLAUDE.md`:
- na seção Stack, troque `maplibre-gl 6 (sem mapa de fundo)` por `maplibre-gl 6 com fundo OpenFreeMap positron (reserva sem fundo se ele não responder)`;
- na lista do topo, depois da linha "Brasil todo: …", acrescente:
  `- Mapa legível: spec docs/superpowers/specs/2026-10-17-mapa-legivel-design.md, plano docs/superpowers/plans/2026-10-17-mapa-legivel.md.`

- [ ] **Step 5: Testes, build e commit**

```bash
npm test && npm run typecheck && npm run build
git add -A lib/painel.ts lib/painel.test.ts components/Explorador.tsx components/inicio/LegendaMapa.tsx CLAUDE.md
git commit -m "refactor: sai a pintura dos estados e a legenda do mapa"
```

---

### Task 7: Conferência visual, reserva e peso

**Files:**
- Modify (só se a conferência pedir): `lib/estados.ts` (`AJUSTES_ROTULO`) e `public/geo/estados-rotulos.json` (regerado)
- Nenhum outro arquivo do repositório. As capturas ficam em `.capturas/`, fora do git; o script da reserva fica no scratchpad.

- [ ] **Step 1: Capturas de antes (produção, ainda com o mapa velho)**

Com o Edge invisível na porta 9333 (comando no topo de `scripts/capturas.mjs`):

```bash
CAPTURAS_INTERNO=1 npm run capturas -- https://edital-map.vercel.app
mkdir -p .capturas/antes && mv .capturas/*.png .capturas/antes/
```

Anote o tempo de `inicio computador` e `inicio celular` que o script imprime.

- [ ] **Step 2: Capturas de depois (local)**

Com `npm run dev` rodando:

```bash
CAPTURAS_INTERNO=1 npm run capturas -- http://localhost:3000
```

Abra `.capturas/inicio-computador.png` e `.capturas/inicio-celular.png` e confira os itens do Step 5 da Task 5. Depois faça as capturas dos outros casos da spec (busca com poucos resultados `/?q=luva`, zoom num estado `/?uf=SP`, cidade selecionada e raio ligado): abra cada URL no navegador, ou acrescente as rotas em `paginas` de uma cópia de `scripts/capturas.mjs` no scratchpad. O script do repositório não muda.

- [ ] **Step 3: Nomes fora do lugar**

Se algum nome de estado cair fora do próprio estado ou em cima do litoral, ponha a posição em `AJUSTES_ROTULO` em `lib/estados.ts`, por exemplo `RJ: [-42.6, -22.3]`, e rode `npm run gerar:estados`. Depois rode de novo `npm test && npm run typecheck` e faça o commit:

```bash
git add lib/estados.ts public/geo/estados-rotulos.json public/geo/estados.json
git commit -m "fix: posição manual do nome de alguns estados no mapa"
```

Se nenhum nome cair fora do lugar, pule este passo.

- [ ] **Step 4: Reserva (OpenFreeMap bloqueado)**

Crie no scratchpad um `reserva.mjs`, que bloqueia `tiles.openfreemap.org` e captura a página inicial:

```js
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const puppeteer = require('puppeteer-core');
const nav = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
const p = await nav.newPage();
await p.setViewport({ width: 1440, height: 1000 });
await p.setRequestInterception(true);
p.on('request', (r) => (r.url().includes('tiles.openfreemap.org') ? r.abort() : r.continue()));
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 });
await p.waitForSelector('.pilula-mapa', { timeout: 30000 }).catch(() => erros.push('sem pílulas'));
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: '.capturas/reserva-computador.png' });
console.log(erros.length ? `erros: ${erros.join(' | ')}` : 'reserva ok');
await p.close();
nav.disconnect();
```

Run (da raiz do worktree): `node <caminho-do-scratchpad>/reserva.mjs`
Expected: `reserva ok`. Em `.capturas/reserva-computador.png`: fundo branco, contornos dos estados, pílulas com número e nenhum aviso de erro na tela.

- [ ] **Step 5: Relatório**

Escreva para o usuário:
- caminhos das capturas de antes, depois e reserva;
- os tempos de carregamento de antes e depois;
- o que ficou diferente do esperado.

Não publicar (`vercel deploy --prod`) sem o usuário pedir.

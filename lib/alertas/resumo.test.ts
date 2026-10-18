import { describe, expect, it } from 'vitest';
import { moeda } from '../formato';
import { nomeProprio } from '../texto';
import { escapar, linkSair, linkUmClique } from './email';
import { assuntoDoResumo, montarResumo, resumoDaResposta, temNovidade, type ResumoSemanal } from './resumo';

const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id, slug: `00394452000103-2026-${id}`, objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA MUNICIPAL DE JOINVILLE', municipio_nome: 'Joinville', uf: 'SC',
  valor_estimado: 1000, encerramento_em: '2026-10-25T17:00:00+00:00', situacao_id: 1, pontuacao: 60, ...extra,
});
const JSON_BANCO = {
  total: 40, novas: 12, prazo_proximo: 5, valor_total: 1234567.89, com_valor: 30,
  novos: [item('1'), item('2', { valor_estimado: null })], encerrando: [item('3')],
  orgaos: [{ nome: 'PREFEITURA MUNICIPAL DE JOINVILLE', uf: 'SC', qtd: 6, valor: 50000 }, { nome: 'ESTADO DE SANTA CATARINA', uf: 'SC', qtd: 3, valor: 0 }],
  cidades: [{ nome: 'Joinville', uf: 'SC', qtd: 8 }],
};
const base = (): ResumoSemanal => resumoDaResposta(JSON_BANCO)!;

describe('resumo semanal', () => {
  it('resposta do banco → resumo (só o que veio)', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(r).toMatchObject({ total: 40, novas: 12, prazoProximo: 5, valorTotal: 1234567.89, comValor: 30 });
    expect(r.novos.map((e) => e.id)).toEqual(['1', '2']);
    expect(r.novos[1].valor_estimado).toBeNull();
    expect(r.orgaos[1]).toEqual({ nome: 'ESTADO DE SANTA CATARINA', uf: 'SC', qtd: 3, valor: 0 });
    expect(resumoDaResposta(null)).toBeNull();
    expect(resumoDaResposta('x')).toBeNull();
  });
  it('só manda com novidade (novas ou prazo próximo)', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(temNovidade(r)).toBe(true);
    expect(temNovidade({ ...r, novas: 0, prazoProximo: 0 })).toBe(false);
    expect(temNovidade({ ...r, novas: 0, prazoProximo: 1 })).toBe(true);
  });
  it('assunto', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    expect(assuntoDoResumo(r)).toBe('Sua semana no Edital Map: 12 editais novos no seu radar');
    expect(assuntoDoResumo({ ...r, novas: 1 })).toBe('Sua semana no Edital Map: 1 edital novo no seu radar');
    expect(assuntoDoResumo({ ...r, novas: 0, prazoProximo: 2 })).toBe('Sua semana no Edital Map: 2 editais encerram em até 7 dias');
    expect(assuntoDoResumo({ ...r, novas: 0, prazoProximo: 1 })).toBe('Sua semana no Edital Map: 1 edital encerra em até 7 dias');
  });
  it('corpo: números da semana, valor somado com a base, listas, quem mais compra e o link do radar', () => {
    const r = resumoDaResposta(JSON_BANCO)!;
    const e = montarResumo(r, 'tok-r');
    for (const parte of [
      'Editais novos na semana', '12', 'Encerram em até 7 dias', 'Abertos no seu radar', '40',
      escapar(`${moeda(1234567.89)} (soma de 30 editais com valor informado)`),
      'Editais novos da semana', 'Mais 10 no seu Meu Radar.', 'Encerram nos próximos 7 dias',
      'Quem mais compra no seu radar', escapar(nomeProprio('PREFEITURA MUNICIPAL DE JOINVILLE')), '6 editais abertos', escapar(moeda(50000)!),
      'Joinville/SC · 8 editais abertos', 'https://www.editalmap.com.br/radar', 'https://www.editalmap.com.br/edital/00394452000103-2026-1',
    ]) {
      expect(e.html, parte).toContain(parte);
    }
    expect(e.html).toContain('Valor não informado');
    expect(e.html).not.toContain(`${escapar(nomeProprio('ESTADO DE SANTA CATARINA'))} (SC) · 3 editais abertos ·`);
  });
  it('sem nenhum valor informado: não inventa soma', () => {
    const e = montarResumo({ ...resumoDaResposta(JSON_BANCO)!, valorTotal: 0, comValor: 0 }, 't');
    expect(e.html).toContain('Valor estimado: não informado nos editais abertos');
    expect(e.texto).toContain('Valor estimado: não informado nos editais abertos');
  });
  it('descadastro do resumo: link e cabeçalhos de um clique', () => {
    const e = montarResumo(resumoDaResposta(JSON_BANCO)!, 'tok-r');
    expect(e.html).toContain('Parar o resumo semanal');
    expect(e.html).toContain(escapar(linkSair('tok-r')));
    expect(e.cabecalhos['List-Unsubscribe']).toBe(`<${linkUmClique('tok-r')}>`);
    expect(e.cabecalhos['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(e.texto).toContain(`Parar o resumo semanal: ${linkSair('tok-r')}`);
  });
  it('rodapé aponta para /alertas, onde o resumo volta a ser ligado', () => {
    const e = montarResumo(base(), 'tok-r');
    expect(e.html).toContain('https://www.editalmap.com.br/alertas');
    expect(e.texto).toContain('https://www.editalmap.com.br/alertas');
  });
  it('não cria seções que os dados não têm', () => {
    const r: ResumoSemanal = { ...base(), novos: [], encerrando: [], orgaos: [], cidades: [], novas: 0, prazoProximo: 1 };
    const e = montarResumo(r, 't');
    for (const s of ['Editais novos da semana', 'Encerram nos próximos 7 dias', 'Quem mais compra no seu radar']) {
      expect(e.html).not.toContain(s);
      expect(e.texto).not.toContain(s);
    }
    expect(e.html).not.toContain('no seu Meu Radar.');
  });
  it('sem "Mais N" quando todos os novos cabem na lista', () => {
    const r: ResumoSemanal = { ...base(), novas: 2 };
    expect(montarResumo(r, 't').html).not.toContain('Mais ');
  });
});

describe('segurança do HTML e do texto', () => {
  const malicioso = '<script>alert(1)</script>"&\'';
  it('escapa órgão, cidade, título e município vindos do PNCP', () => {
    const r: ResumoSemanal = {
      ...base(),
      novos: [{ ...resumoDaResposta({ ...JSON_BANCO, novos: [item('9', { objeto: malicioso, orgao_nome: malicioso, municipio_nome: malicioso })] })!.novos[0] }],
      orgaos: [{ nome: malicioso, uf: 'SC', qtd: 2, valor: 10 }],
      cidades: [{ nome: malicioso, uf: 'SC', qtd: 2 }],
    };
    const e = montarResumo(r, 't');
    expect(e.html).not.toContain('<script');
    expect(e.html).toContain('&lt;script&gt;');
  });
  it('texto: nome com quebra de linha e controle não quebra a linha do item', () => {
    const r: ResumoSemanal = {
      ...base(),
      orgaos: [{ nome: 'Órgão\nInjetado\r\nX' + String.fromCharCode(0) + 'Y' + String.fromCharCode(0x2028) + 'Z', uf: 'SC', qtd: 2, valor: 0 }],
      cidades: [{ nome: 'Cidade\nInjetada', uf: 'SC', qtd: 1 }],
    };
    const linhas = montarResumo(r, 't').texto.split('\n');
    expect(linhas.some((l) => l.startsWith('Órgão Injetado X Y Z (SC) · 2 editais abertos'))).toBe(true);
    expect(linhas).toContain('Cidade Injetada/SC · 1 edital aberto');
    expect(linhas.some((l) => new RegExp('[' + String.fromCharCode(0) + String.fromCharCode(0x2028) + ']').test(l))).toBe(false);
  });
  it('assunto numa linha só, sem caracteres de controle', () => {
    const a = assuntoDoResumo(base());
    expect(a).not.toMatch(new RegExp('[\\x00-\\x1f\\x7f-\\x9f' + String.fromCharCode(0x2028, 0x2029) + ']'));
  });
  it('token do resumo é codificado nos links', () => {
    const e = montarResumo(base(), 'a b"<>&');
    expect(e.html).not.toContain('"<>');
    expect(e.cabecalhos['List-Unsubscribe']).toBe(`<${linkUmClique('a b"<>&')}>`);
    expect(e.cabecalhos['List-Unsubscribe']).not.toMatch(/[\s"]/);
  });
});

describe('resumoDaResposta é defensivo', () => {
  it('lixo → null, sem lançar', () => {
    for (const v of [undefined, null, 0, 1, 'x', true, [], [1], {}, { total: 'a' }, { total: 1, novas: 1 }, { total: NaN, novas: 1, prazo_proximo: 1, valor_total: 0, com_valor: 0 }]) {
      expect(() => resumoDaResposta(v), String(v)).not.toThrow();
      expect(resumoDaResposta(v), JSON.stringify(v)).toBeNull();
    }
  });
  it('contagens negativas ou infinitas → null', () => {
    expect(resumoDaResposta({ ...JSON_BANCO, novas: -1 })).toBeNull();
    expect(resumoDaResposta({ ...JSON_BANCO, total: Infinity })).toBeNull();
    expect(resumoDaResposta({ ...JSON_BANCO, valor_total: '10' })).toBeNull();
  });
  it('listas ausentes ou que não são lista viram vazias', () => {
    const { novos, encerrando, orgaos, cidades, ...resto } = JSON_BANCO;
    void novos; void encerrando; void orgaos; void cidades;
    const r = resumoDaResposta(resto)!;
    expect([r.novos, r.encerrando, r.orgaos, r.cidades]).toEqual([[], [], [], []]);
    const r2 = resumoDaResposta({ ...resto, novos: 'x', encerrando: { a: 1 }, orgaos: null, cidades: 3 })!;
    expect([r2.novos, r2.encerrando, r2.orgaos, r2.cidades]).toEqual([[], [], [], []]);
  });
  it('pula editais malformados, mantém os bons', () => {
    const ruins = [
      null, 'x', 7, [], {}, item('', {}), item('a', { slug: '' }), item('a', { slug: 5 }), item('a', { objeto: null }),
      item('a', { orgao_nome: undefined }), item('a', { uf: null }), item('a', { encerramento_em: 'não é data' }), item('a', { encerramento_em: null }),
      item('a', { encerramento_em: 123 }),
    ];
    const r = resumoDaResposta({ ...JSON_BANCO, novos: [...ruins, item('ok')], encerrando: [item('ok2'), ...ruins] })!;
    expect(r.novos.map((e) => e.id)).toEqual(['ok']);
    expect(r.encerrando.map((e) => e.id)).toEqual(['ok2']);
    expect(() => montarResumo(r, 't')).not.toThrow();
  });
  it('campos opcionais do edital malformados viram null, nunca inventados', () => {
    const r = resumoDaResposta({ ...JSON_BANCO, novos: [item('a', { valor_estimado: 'abc', municipio_nome: 7, situacao_id: 'x' }), item('b', { valor_estimado: '250.5', municipio_nome: '', situacao_id: 4 })] })!;
    expect(r.novos[0]).toMatchObject({ valor_estimado: null, municipio_nome: null, situacao_id: null });
    expect(r.novos[1]).toMatchObject({ valor_estimado: 250.5, municipio_nome: null, situacao_id: 4 });
    const e = montarResumo(r, 't');
    expect(e.html).toContain('Município não informado/SC');
  });
  it('pula órgãos e cidades malformados', () => {
    const r = resumoDaResposta({
      ...JSON_BANCO,
      orgaos: [null, 'x', { nome: '', uf: 'SC', qtd: 1 }, { nome: 'A', uf: 'SC', qtd: 0 }, { nome: 'B', uf: 'SC', qtd: 'x' }, { nome: 'C', uf: null, qtd: 2 }, { nome: 'Bom', uf: 'RS', qtd: 2, valor: 'x' }],
      cidades: [null, { nome: null, uf: 'SC', qtd: 1 }, { nome: 'Z', uf: 'SC', qtd: -1 }, { nome: 'Boa', uf: 'RS', qtd: 3 }],
    })!;
    expect(r.orgaos).toEqual([{ nome: 'Bom', uf: 'RS', qtd: 2, valor: 0 }]);
    expect(r.cidades).toEqual([{ nome: 'Boa', uf: 'RS', qtd: 3 }]);
  });
  it('limita as listas ao que o banco promete (10, 5, 5, 5)', () => {
    const muitos = (k: number, f: (i: number) => unknown) => Array.from({ length: k }, (_, i) => f(i));
    const r = resumoDaResposta({
      ...JSON_BANCO,
      novos: muitos(30, (i) => item(`n${i}`)), encerrando: muitos(30, (i) => item(`e${i}`)),
      orgaos: muitos(30, (i) => ({ nome: `O${i}`, uf: 'SC', qtd: 1, valor: 0 })), cidades: muitos(30, (i) => ({ nome: `C${i}`, uf: 'SC', qtd: 1 })),
    })!;
    expect([r.novos.length, r.encerrando.length, r.orgaos.length, r.cidades.length]).toEqual([10, 5, 5, 5]);
  });
  it('objeto hostil (getter que lança) não derruba', () => {
    const hostil = { get total(): number { throw new Error('x'); } };
    expect(() => resumoDaResposta(hostil)).not.toThrow();
    expect(resumoDaResposta(hostil)).toBeNull();
  });
});

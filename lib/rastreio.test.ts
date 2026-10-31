import { describe, expect, it } from 'vitest';
import { validarEvento } from './eventos';
import { EVENTOS_COMERCIAIS, parametrosGa, segmentoDaBusca, vaiAoBanco } from './rastreio';

describe('eventos do funil comercial', () => {
  it('os nomes pedidos (a compra sai do servidor, não do navegador)', () => {
    expect([...EVENTOS_COMERCIAIS]).toEqual([
      'search_performed', 'search_results_viewed', 'edital_detail_viewed', 'pro_offer_viewed', 'pro_cta_clicked', 'checkout_started',
      'assessoria_offer_viewed', 'assessoria_qualification_started', 'assessoria_qualification_completed', 'assessoria_whatsapp_clicked',
    ]);
  });
  it('o que o banco já grava com outro nome não é gravado de novo', () => {
    for (const e of ['search_performed', 'search_results_viewed', 'edital_detail_viewed', 'checkout_started', 'assessoria_whatsapp_clicked'] as const) {
      expect(vaiAoBanco(e), e).toBe(false);
    }
    for (const e of ['pro_offer_viewed', 'pro_cta_clicked', 'assessoria_offer_viewed', 'assessoria_qualification_started'] as const) expect(vaiAoBanco(e), e).toBe(true);
  });
});

describe('segmentoDaBusca', () => {
  it('o termo positivo, sem as exclusões e sem espaços sobrando', () => {
    expect(segmentoDaBusca('  uniformes   escolares -camisa ')).toBe('uniformes escolares');
    expect(segmentoDaBusca('')).toBeNull();
    expect(segmentoDaBusca(null)).toBeNull();
  });
  it('corta em 60 caracteres', () => {
    expect(segmentoDaBusca('a'.repeat(90))).toHaveLength(60);
  });
  it('dado pessoal digitado na busca não vira parâmetro', () => {
    expect(segmentoDaBusca('12.345.678/0001-90')).toBeNull();
    expect(segmentoDaBusca('123.456.789-09')).toBeNull();
    expect(segmentoDaBusca('joao@empresa.com.br')).toBeNull();
  });
});

describe('parametrosGa', () => {
  it('nomes do GA4 e só o que tem valor', () => {
    expect(parametrosGa({ origem: 'oferta_busca', pagina: '/', segmento: 'uniforme', resultados: 281, plano: null, uf: 'SC' })).toEqual({
      origem_cta: 'oferta_busca', pagina_origem: '/', segmento: 'uniforme', quantidade_resultados: 281, uf: 'SC',
    });
  });
  it('zero resultado continua sendo informação', () => {
    expect(parametrosGa({ resultados: 0 })).toEqual({ quantidade_resultados: 0 });
  });
  it('nada fora da lista passa', () => {
    expect(parametrosGa({ origem: 'x', email: 'a@b.com', cpf: '123' } as never)).toEqual({ origem_cta: 'x' });
  });
});

describe('eventos comerciais no /api/eventos', () => {
  it('aceita a oferta vista com origem, segmento, resultados e página', () => {
    const r = validarEvento({
      tipo: 'usou_recurso',
      detalhe: { recurso: 'pro_offer_viewed', origem: 'oferta_busca', segmento: 'uniforme', resultados: 281, pagina: '/' },
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        tipo: 'usou_recurso',
        detalhe: { recurso: 'pro_offer_viewed', origem: 'oferta_busca', segmento: 'uniforme', resultados: 281, plano: null, resultado: null, edital: null, pagina: '/' },
      },
    });
  });
  it('o resultado da triagem e o edital ligado a ela', () => {
    const r = validarEvento({
      tipo: 'usou_recurso',
      detalhe: { recurso: 'assessoria_qualification_completed', origem: 'edital', resultado: 'assessoria', edital: '00394452000103-2026-12' },
    });
    expect(r.ok && r.valor.detalhe).toMatchObject({ resultado: 'assessoria', edital: '00394452000103-2026-12' });
  });
  it('dado fora do formato é descartado, sem recusar o evento', () => {
    const r = validarEvento({
      tipo: 'usou_recurso',
      detalhe: { recurso: 'pro_cta_clicked', origem: 'Fora Do Padrão!', segmento: 'x'.repeat(200), resultados: -1, edital: 'abc', pagina: '/api/segredo', email: 'a@b.com' },
    });
    expect(r.ok && r.valor.detalhe).toEqual({
      recurso: 'pro_cta_clicked', origem: null, segmento: 'x'.repeat(60), resultados: null, plano: null, resultado: null, edital: null, pagina: null,
    });
  });
  it('e-mail ou CNPJ no segmento não chega ao banco', () => {
    const r = validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'pro_cta_clicked', segmento: 'joao@empresa.com.br' } });
    expect(r.ok && r.valor.detalhe.segmento).toBeNull();
  });
});

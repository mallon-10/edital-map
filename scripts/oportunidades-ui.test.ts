import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('salvar e descartar na interface', () => {
  it('Salvar nos cards da lista, do radar e na página do edital; Descartar no edital e no menu do card do radar', () => {
    expect(ler('components/inicio/CardLista.tsx')).toContain('<BotaoSalvar id={e.id} />');
    expect(ler('components/inicio/CardLista.tsx')).toContain("{acoes === 'radar' ? <MenuCardRadar id={e.id} /> : null}");
    expect(ler('components/inicio/CardCompacto.tsx')).toContain('<BotaoSalvar id={edital.id} />');
    const edital = ler('app/edital/[slug]/page.tsx');
    expect(edital).toContain('<BotaoSalvar id={e.id} variante="botao" />');
    expect(edital).toContain('<BotaoDescartar id={e.id} />');
    expect(ler('app/radar/page.tsx')).toContain('acoes="radar"');
  });
  it('os botões ficam fora do link do card (nada interativo dentro de <a>), por cima dele (z-10)', () => {
    for (const [arquivo, botao] of [
      ['components/inicio/CardLista.tsx', '<BotaoSalvar'],
      ['components/inicio/CardCompacto.tsx', '<BotaoSalvar'],
    ] as const) {
      const card = ler(arquivo);
      const link = card.slice(card.indexOf('<Link'), card.indexOf('</Link>'));
      expect(link, arquivo).not.toBe('');
      expect(link, arquivo).not.toContain(botao);
      expect(link, arquivo).not.toContain('MenuCardRadar');
      expect(card.indexOf(botao), arquivo).toBeGreaterThan(-1);
      const antes = card.slice(0, card.indexOf(botao));
      expect(antes.slice(antes.lastIndexOf('<span')), arquivo).toContain('relative z-10');
    }
  });
  it('descartados fora do radar (lista e cartões); cartão "Editais salvos"', () => {
    const radar = ler('app/radar/page.tsx');
    expect(radar).toContain('contagensDoRadar(radar, desde, descartados)');
    expect(radar).toContain('}, descartados),');
    expect(ler('components/radar/CartoesRadar.tsx')).toContain('Editais salvos');
  });
  it('nenhum componente fala com o banco nem lê segredos', () => {
    for (const f of [
      'components/oportunidades/BotaoSalvar.tsx',
      'components/oportunidades/BotaoDescartar.tsx',
      'components/oportunidades/MenuCardRadar.tsx',
      'components/oportunidades/AvisoPlano.tsx',
      'lib/cliente/salvos.ts',
      'lib/cliente/pedido.ts',
    ]) {
      const t = ler(f);
      expect(t, f).not.toContain('supabase');
      expect(t, f).not.toContain('process.env');
      expect(t, f).not.toContain('dangerouslySetInnerHTML');
    }
  });
  it('menu da conta leva a Minhas Oportunidades e Alertas e esquece os salvos ao sair', () => {
    const menu = ler('components/conta/MenuConta.tsx');
    expect(menu).toContain('href="/oportunidades"');
    expect(menu).toContain('href="/alertas"');
    expect(menu).toContain('esquecerSalvos();');
  });
});

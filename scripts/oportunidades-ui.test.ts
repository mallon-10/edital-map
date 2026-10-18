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

describe('Minhas Oportunidades', () => {
  const pagina = ler('app/oportunidades/page.tsx');
  const linha = ler('components/oportunidades/LinhaOportunidade.tsx');
  it('exige conta, fora do Google, texto fixo dos status', () => {
    expect(pagina).toContain('usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/oportunidades')");
    expect(pagina).toContain('robots: { index: false, follow: false }');
    expect(pagina).toContain('{TEXTO_STATUS_PESSOAL}');
  });
  it('abas com contagem, ordem por prazo e por data de salvamento', () => {
    expect(pagina).toContain('FILTROS_STATUS.map(');
    expect(pagina).toContain('contagem[f]');
    expect(pagina).toContain('Prazo');
    expect(pagina).toContain('Data em que salvei');
  });
  it('grátis sem salvos vê o convite ao Pro no lugar da lista; plano incerto pede para tentar de novo', () => {
    expect(pagina).toContain('<CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.salvosPlano} texto={MENSAGENS_LIMITE_CONTA.salvosConvite} />');
    expect(pagina).toContain('planoIncerto(plano)');
    expect(pagina).toContain(') : gratis && lista.length === 0 ? null : (');
    expect(pagina).toContain('MENSAGENS_LIMITE_CONTA.planoIndisponivel');
  });
  it('linha: status, observação que salva ao sair do campo, abrir e remover com confirmação', () => {
    expect(linha).toContain('onBlur={() => void salvarObservacao()}');
    expect(linha).toContain('Salvo ✓');
    expect(linha).toContain('maxLength={MAX_OBSERVACAO}');
    expect(linha).toContain('prefetch={false}');
    expect(linha).toContain('Abrir edital');
    expect(linha).toContain('window.confirm(CONFIRMAR_REMOVER)');
    expect(linha).toContain('situacaoOficial(');
  });
  it('mudar o status ou remover grava antes a observação pendente e para se ela não gravar', () => {
    const fonte = linha.replace(/\r\n/g, '\n');
    const corpo = (nome: string) => fonte.slice(fonte.indexOf(`async function ${nome}(`), fonte.indexOf('\n  }\n', fonte.indexOf(`async function ${nome}(`)));
    for (const [nome, pedido] of [
      ['mudarStatus', 'atualizarSalvo(s.id, { status: novo })'],
      ['remover', 'mudarSalvo(s.id, { remover: true })'],
    ] as const) {
      const f = corpo(nome);
      const iObs = f.indexOf('await salvarObservacao()');
      expect(iObs, nome).toBeGreaterThan(0);
      expect(f.indexOf(pedido), nome).toBeGreaterThan(iObs);
      expect(f, nome).toMatch(/if \(!(\(await salvarObservacao\(\)\)|salvou)\)/);
    }
    // um salvamento da observação por vez (o blur do campo e o status não mandam dois pedidos juntos)
    expect(linha).toContain('emCurso.current');
  });
  it('o seletor de status recebe o foco de volta depois do pedido (desligado durante ele)', () => {
    expect(linha).toContain('ref={refStatus}');
    expect(linha).toContain('refStatus.current?.focus()');
  });
  it('a região aria-live só anuncia "Salvando…" / "Salvo ✓", não o contador de caracteres', () => {
    const viva = linha.slice(linha.indexOf('aria-live="polite"'), linha.indexOf('</span>', linha.indexOf('aria-live="polite"')));
    expect(viva).toContain('Salvando…');
    expect(viva).toContain('Salvo ✓');
    expect(viva).not.toContain('MAX_OBSERVACAO');
    expect(viva).not.toContain('obs.length');
    expect(linha).toContain('{obs.length}/{MAX_OBSERVACAO}');
  });
  it('observação só como texto (nada de HTML vindo da conta)', () => {
    expect(linha).not.toContain('dangerouslySetInnerHTML');
    expect(pagina).not.toContain('dangerouslySetInnerHTML');
  });
});

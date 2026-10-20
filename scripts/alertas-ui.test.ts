import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const existe = (caminho: string) => existsSync(new URL(`../${caminho}`, import.meta.url));

describe('lista da conta fora do ar não derruba a página (como o /radar)', () => {
  for (const [arquivo, funcao] of [
    ['app/alertas/page.tsx', 'alertasDaConta(usuario)'],
    ['app/oportunidades/page.tsx', 'salvosDaConta(usuario)'],
  ] as const) {
    it(arquivo, () => {
      const pagina = ler(arquivo);
      // a leitura tem catch próprio (sem ele, o erro iria para o error.tsx e a página inteira sumiria)
      expect(pagina, arquivo).toMatch(new RegExp(`${funcao.replace(/[()]/g, '\\$&')}\\.catch\\(`));
      // aviso curto em role="alert", com o título e os links da página no lugar
      expect(pagina, arquivo).toMatch(/role="alert"[^>]*>\s*\{MENSAGENS_CONTA\.carregar\}/);
      expect(pagina, arquivo).toContain('<h1');
    });
  }
});

describe('/alertas com conta', () => {
  const pagina = ler('app/alertas/page.tsx');
  it('sem conta: convite para entrar (o formulário antigo saiu)', () => {
    expect(pagina).toContain('usuarioAtual()');
    expect(pagina).toContain('/entrar?voltar=/alertas');
    expect(pagina).not.toContain('FormAlerta ufsIniciais');
    expect(existe('components/FormAlerta.tsx')).toBe(false);
    expect(ler('lib/eventos.ts')).not.toContain('validarPedidoAlerta');
    expect(ler('lib/servidor/registro.ts')).not.toContain('gravarPedido');
  });
  it('com conta: criar, criar a partir do radar, aviso do plano no navegador, envio indisponível, resumo semanal', () => {
    for (const t of ['href="/alertas/novo"', 'href="/alertas/novo?de=radar"', 'Criar alerta a partir do meu radar', 'avisoPlanoNavegador(', 'envioIndisponivel(', 'AVISO_ENVIO_INDISPONIVEL', '<ResumoSemanal']) {
      expect(pagina, t).toContain(t);
    }
  });
  it('item: editar, pausar/retomar e excluir com confirmação', () => {
    const item = ler('components/alertas/ItemAlerta.tsx');
    for (const t of ['/editar', "'Pausar'", "'Retomar'", 'window.confirm(', "'DELETE'", '{ ativo: !alerta.ativo }']) expect(item, t).toContain(t);
  });
  it('formulário: nome + as mesmas seções do radar; POST ao criar, PATCH ao editar', () => {
    const form = ler('components/alertas/FormAlerta.tsx');
    for (const t of ['<CampoTermos', '<CampoLocal', '<CamposOportunidade', "pedirJson('/api/alertas', 'POST'", "'PATCH'", 'maxLength={MAX_NOME_ALERTA}']) {
      expect(form, t).toContain(t);
    }
    expect(ler('components/radar/FormRadar.tsx')).toContain('<CamposOportunidade');
  });
  it('páginas novas exigem conta e ficam fora do Google; edital leva a /alertas', () => {
    for (const f of ['app/alertas/novo/page.tsx', 'app/alertas/[id]/editar/page.tsx']) {
      expect(ler(f), f).toContain('usuarioAtual()');
      expect(ler(f), f).toContain('robots: { index: false, follow: false }');
    }
    expect(ler('app/edital/[slug]/page.tsx')).toContain('href="/alertas"');
  });

  describe('rodada de correções 1', () => {
    it('plano incerto: mensagem de plano indisponível em vez do convite ao Pro (lista, novo e resumo)', () => {
      for (const f of ['app/alertas/page.tsx', 'app/alertas/novo/page.tsx']) {
        expect(ler(f), f).toContain("incerto={acesso === 'incerto'}");
      }
      const bloqueada = ler('components/conta/PaginaBloqueada.tsx');
      expect(bloqueada).toContain('MENSAGENS_LIMITE_CONTA.planoIndisponivel');
      expect(bloqueada).toContain('role="status"');
      expect(ler('components/alertas/ResumoSemanal.tsx')).toContain('MENSAGENS_LIMITE_CONTA.planoIndisponivel');
    });
    it('resumo semanal: Pro só pela conta; navegador Pro sem conta Pro mostra o aviso, não a chave', () => {
      expect(pagina).toContain("pro={plano.daConta === 'pro'}");
      expect(pagina).not.toContain("pro={plano.plano === 'pro'}");
      expect(pagina).toContain('aviso={aviso}');
      const resumo = ler('components/alertas/ResumoSemanal.tsx');
      expect(resumo).toContain('aviso');
      expect(resumo).toContain('aria-labelledby="resumo-semanal"');
    });
    it('formulário: o convite ao Pro só aparece para plano, não no teto de 5', () => {
      const form = ler('components/alertas/FormAlerta.tsx');
      expect(form).toContain("setPlanos(r.codigo === 'plano')");
      expect(form).not.toContain("r.codigo === 'limite'");
    });
    it('item: avisa pausa/retomada por aria-live e leva o foco ao título depois de excluir', () => {
      const item = ler('components/alertas/ItemAlerta.tsx');
      for (const t of ['aria-live="polite"', 'Alerta pausado', 'Alerta retomado', 'titulo-alertas', '.focus()']) expect(item, t).toContain(t);
      expect(pagina).toContain('id="titulo-alertas"');
    });
    it('envio indisponível só dos alertas ativos (a frase do e-mail é sempre do Pro: só ele chega à lista)', () => {
      expect(pagina).toContain('alertas.filter((a) => a.ativo)');
      expect(pagina).not.toContain('podeTerAlertas');
    });
    it('edital: link "Criar alerta" sem prefetch', () => {
      const edital = ler('app/edital/[slug]/page.tsx');
      expect(edital).not.toContain('Criar alerta para editais parecidos');
      expect(edital).toMatch(/href="\/alertas"\s+prefetch=\{false\}/);
    });
  });
});

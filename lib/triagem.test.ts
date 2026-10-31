import { describe, expect, it } from 'vitest';
import { avisoDaTriagem, linkTriagem, mensagemTriagem, perguntasDaTriagem, resultadoDaTriagem, type RespostasTriagem } from './triagem';

const EDITAL = {
  slug: '00394452000103-2026-21982',
  titulo: 'Aquisição de equipamentos de informática',
  orgao: 'Prefeitura Municipal de Joinville',
  local: 'Joinville/SC',
  encerramento_em: '2026-11-12T13:00:00.000Z',
};
const R: RespostasTriagem = { cnpj: 'sim', licitacao: 'encontrei', ajuda: 'entender' };

describe('perguntasDaTriagem', () => {
  it('as três perguntas e as opções pedidas', () => {
    const p = perguntasDaTriagem(false);
    expect(p.map((x) => x.pergunta)).toEqual([
      'Sua empresa já possui CNPJ ativo?',
      'Você já encontrou uma licitação de interesse?',
      'Qual ajuda você procura?',
    ]);
    expect(p[0].opcoes.map((o) => o.rotulo)).toEqual(['Sim', 'Ainda não', 'Não tenho certeza do que preciso']);
    expect(p[1].opcoes.map((o) => o.rotulo)).toEqual(['Sim, já encontrei', 'Ainda estou procurando', 'Quero entender como começar']);
    expect(p[2].opcoes.map((o) => o.rotulo)).toEqual([
      'Entender um edital e preparar meus documentos', 'Aprender como participar de licitações', 'Contratar alguém para executar todo o processo', 'Ainda não sei exatamente',
    ]);
  });
  it('vindo de um edital, não pergunta se já encontrou', () => {
    expect(perguntasDaTriagem(true).map((x) => x.id)).toEqual(['cnpj', 'ajuda']);
  });
});

describe('resultadoDaTriagem', () => {
  it('quem já tem o edital e quer orientação é da assessoria', () => {
    expect(resultadoDaTriagem(R)).toBe('assessoria');
    expect(resultadoDaTriagem({ ...R, ajuda: 'aprender' })).toBe('assessoria');
    expect(resultadoDaTriagem({ ...R, ajuda: 'indefinido' })).toBe('assessoria');
    expect(resultadoDaTriagem({ ...R, cnpj: 'incerto' })).toBe('assessoria');
  });
  it('quem ainda não tem edital vai para a busca (a assessoria trabalha em cima de um edital)', () => {
    expect(resultadoDaTriagem({ ...R, licitacao: 'procurando' })).toBe('buscar');
    expect(resultadoDaTriagem({ ...R, licitacao: 'comecar', ajuda: 'aprender' })).toBe('buscar');
  });
  it('execução completa nunca cai na assessoria, com edital ou sem', () => {
    expect(resultadoDaTriagem({ ...R, ajuda: 'terceirizar' })).toBe('terceirizacao');
    expect(resultadoDaTriagem({ ...R, licitacao: 'procurando', ajuda: 'terceirizar' })).toBe('terceirizacao');
  });
});

describe('avisoDaTriagem', () => {
  it('sem CNPJ, avisa antes da conversa', () => {
    expect(avisoDaTriagem({ ...R, cnpj: 'nao' })).toContain('CNPJ');
    expect(avisoDaTriagem(R)).toBeNull();
  });
});

describe('mensagemTriagem', () => {
  it('serviço, respostas e o edital', () => {
    expect(mensagemTriagem(R, EDITAL)).toBe(
      [
        'Olá! Vim pelo Edital Map e quero saber sobre a Assessoria Edital Map.',
        '',
        'Empresa com CNPJ ativo: Sim',
        'Licitação: Sim, já encontrei',
        'Ajuda: Entender um edital e preparar meus documentos',
        '',
        'Aquisição de equipamentos de informática',
        'Prefeitura Municipal de Joinville · Joinville/SC',
        'Propostas até 12.11.2026 · 10h',
        'https://www.editalmap.com.br/edital/00394452000103-2026-21982',
      ].join('\n'),
    );
  });
  it('sem edital, sem o bloco do edital', () => {
    const m = mensagemTriagem(R, null);
    expect(m).not.toContain('https://');
    expect(m.endsWith('Ajuda: Entender um edital e preparar meus documentos')).toBe(true);
  });
  it('execução completa pede esclarecimento, sem soar como contratação', () => {
    const m = mensagemTriagem({ ...R, ajuda: 'terceirizar' }, null);
    expect(m).toContain('quero esclarecer se vocês atendem');
    expect(m).not.toContain('quero saber sobre a Assessoria');
  });
  it('título longo é cortado', () => {
    const m = mensagemTriagem(R, { ...EDITAL, titulo: 'a'.repeat(200) });
    expect(m).toContain(`${'a'.repeat(119)}…`);
  });
  it('nenhum dado pessoal: só as escolhas e o edital público', () => {
    expect(mensagemTriagem(R, null)).not.toMatch(/\d{11,14}|@/);
  });
});

describe('linkTriagem', () => {
  it('wa.me com a mensagem codificada', () => {
    const url = new URL(linkTriagem('5511987654321', R, EDITAL));
    expect(url.origin + url.pathname).toBe('https://wa.me/5511987654321');
    expect(url.searchParams.get('text')).toBe(mensagemTriagem(R, EDITAL));
  });
});

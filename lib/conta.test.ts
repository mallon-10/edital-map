import { describe, expect, it } from 'vitest';
import {
  destinoSeguro, lerCodigo, lerEmail, MENSAGENS_CONTA, mensagemErroAuth, OPCOES_COOKIE_SESSAO, REENVIO_SEGUNDOS,
  rotaComSessao, segundosParaReenvio, statusErroAuth, temCookieDeSessao,
} from './conta';

describe('lerEmail', () => {
  it('apara e põe em minúsculas', () => {
    expect(lerEmail('  Joao@Empresa.COM.br ')).toBe('joao@empresa.com.br');
  });
  it('recusa o que não é e-mail', () => {
    for (const v of ['', 'joao', 'joao@', '@empresa.com', 'a b@c.com', 'a@b.c', 42, null, undefined]) expect(lerEmail(v)).toBeNull();
    expect(lerEmail(`${'a'.repeat(250)}@b.com`)).toBeNull();
  });
});

describe('lerCodigo', () => {
  it('6 números, espaços ignorados', () => {
    expect(lerCodigo('123456')).toBe('123456');
    expect(lerCodigo(' 123 456 ')).toBe('123456');
  });
  it('recusa outro tamanho ou letras', () => {
    for (const v of ['12345', '1234567', '12345a', '', 123456, null]) expect(lerCodigo(v)).toBeNull();
  });
});

describe('destinoSeguro', () => {
  it('caminho interno passa', () => {
    expect(destinoSeguro('/radar')).toBe('/radar');
    expect(destinoSeguro('/radar/editar')).toBe('/radar/editar');
    expect(destinoSeguro('/edital/123?x=1')).toBe('/edital/123?x=1');
  });
  it('fora do site, /entrar, /api ou vazio → /radar', () => {
    for (const v of [null, undefined, '', 'https://mal.com', '//mal.com', '/\\mal.com', 'radar', '/entrar', '/entrar?voltar=/x', '/api/conta', '/radar\nSet-Cookie: x']) {
      expect(destinoSeguro(v)).toBe('/radar');
    }
  });
  it('controle, espaço e barra invertida (o navegador ignora TAB: "/\t/mal.com" vira "//mal.com")', () => {
    for (const v of ['/\t/mal.com', '/\n/mal.com', '/\\mal.com', ' //mal.com', '/radar x', '/a\u0000b', '/a\u007fb']) {
      expect(destinoSeguro(v)).toBe('/radar');
    }
  });
});

describe('mensagens de erro do Supabase Auth', () => {
  it('código errado ou expirado', () => {
    expect(mensagemErroAuth({ code: 'otp_expired', status: 403 })).toBe(MENSAGENS_CONTA.codigoErrado);
    expect(statusErroAuth({ code: 'otp_expired', status: 403 })).toBe(400);
  });
  it('muitas tentativas (limite do Supabase)', () => {
    for (const e of [{ code: 'over_email_send_rate_limit', status: 429 }, { code: 'over_request_rate_limit', status: 429 }, { code: null, status: 429 }]) {
      expect(mensagemErroAuth(e)).toBe(MENSAGENS_CONTA.muitas);
      expect(statusErroAuth(e)).toBe(429);
    }
  });
  it('e-mail inválido', () => {
    expect(mensagemErroAuth({ code: 'email_address_invalid', status: 400 })).toBe(MENSAGENS_CONTA.email);
    expect(mensagemErroAuth({ code: 'validation_failed', status: 400 })).toBe(MENSAGENS_CONTA.email);
    expect(statusErroAuth({ code: 'validation_failed', status: 400 })).toBe(400);
  });
  it('o resto: falha genérica 502', () => {
    expect(mensagemErroAuth({ code: 'sem_chave', status: null })).toBe(MENSAGENS_CONTA.falha);
    expect(statusErroAuth({ code: 'unexpected_failure', status: 500 })).toBe(502);
  });
  it('textos em português', () => {
    expect(MENSAGENS_CONTA).toEqual({
      email: 'Confira o e-mail.',
      codigo: 'Digite os 6 números do código.',
      codigoErrado: 'Código incorreto ou expirado. Confira os 6 números ou peça um novo código.',
      muitas: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
      falha: 'Não foi possível concluir agora. Tente de novo em instantes.',
      entrar: 'Entre para continuar.',
    });
  });
});

describe('reenvio', () => {
  it('60 s depois do envio, arredondando para cima', () => {
    expect(REENVIO_SEGUNDOS).toBe(60);
    expect(segundosParaReenvio(1_000, 1_000)).toBe(60);
    expect(segundosParaReenvio(1_000, 1_500)).toBe(60);
    expect(segundosParaReenvio(1_000, 59_000)).toBe(2);
    expect(segundosParaReenvio(1_000, 60_000)).toBe(1);
    expect(segundosParaReenvio(1_000, 61_000)).toBe(0);
    expect(segundosParaReenvio(1_000, 999_000)).toBe(0);
  });
});

describe('cookie de sessão do Supabase', () => {
  it('reconhece sb-<ref>-auth-token, inteiro ou em pedaços', () => {
    expect(temCookieDeSessao(['em_visitante', 'sb-omtwaflypzlebjoeubvp-auth-token'])).toBe(true);
    expect(temCookieDeSessao(['sb-omtwaflypzlebjoeubvp-auth-token.0', 'sb-omtwaflypzlebjoeubvp-auth-token.1'])).toBe(true);
  });
  it('outros cookies não', () => {
    expect(temCookieDeSessao([])).toBe(false);
    expect(temCookieDeSessao(['em_visitante', 'em_interno', 'sb-x-auth-token-code-verifier'])).toBe(false);
  });
  it('opções forçadas: httpOnly, lax, raiz', () => {
    expect(OPCOES_COOKIE_SESSAO).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });
});

describe('rotaComSessao (onde o proxy renova a sessão)', () => {
  it('conta, radar e as APIs da conta e do radar', () => {
    for (const p of ['/entrar', '/radar', '/radar/editar', '/api/conta', '/api/conta/codigo', '/api/radar', '/api/radar/x']) {
      expect(rotaComSessao(p)).toBe(true);
    }
  });
  it('o resto do site não', () => {
    for (const p of ['/', '/edital/1', '/planos', '/alertas', '/sobre', '/api/busca', '/api/mapa', '/radarx', '/entrarx', '/api/contabil']) {
      expect(rotaComSessao(p)).toBe(false);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { planoConhecido, publicarPlano } from './plano';

describe('plano do visitante no navegador', () => {
  it('começa desconhecido e guarda o último publicado', () => {
    expect(planoConhecido()).toBeNull();
    publicarPlano({ plano: 'gratis', dono: false });
    expect(planoConhecido()).toEqual({ plano: 'gratis', dono: false });
    publicarPlano({ plano: 'pro', dono: false });
    expect(planoConhecido()).toEqual({ plano: 'pro', dono: false });
  });
});

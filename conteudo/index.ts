import { termos as parte1 } from './glossario/parte-1';
import { termos as parte2 } from './glossario/parte-2';
import { guia as ataDeRegistroDePrecos } from './guias/ata-de-registro-de-precos';
import { guia as atestadoDeCapacidadeTecnica } from './guias/atestado-de-capacidade-tecnica';
import { guia as ceisECnep } from './guias/ceis-e-cnep';
import { guia as comoParticipar } from './guias/como-participar-de-licitacao';
import { guia as comprasGovBr } from './guias/compras-gov-br';
import { guia as contrataMaisBrasil } from './guias/contrata-mais-brasil';
import { guia as dispensa } from './guias/dispensa-de-licitacao';
import { guia as documentos } from './guias/documentos-para-licitacao';
import { guia as empenho } from './guias/empenho';
import { guia as impugnacaoERecurso } from './guias/impugnacao-e-recurso';
import { guia as inexigibilidade } from './guias/inexigibilidade-de-licitacao';
import { guia as prefeitura } from './guias/licitacao-de-prefeitura';
import { guia as meEppEMei } from './guias/me-epp-e-mei';
import { guia as modalidades } from './guias/modalidades-de-licitacao';
import { guia as novaLei } from './guias/nova-lei-de-licitacoes';
import { guia as oQueELicitacao } from './guias/o-que-e-licitacao';
import { guia as ondeEncontrar } from './guias/onde-encontrar-licitacoes';
import { guia as painelDePrecos } from './guias/painel-de-precos';
import { guia as planoDeContratacoes } from './guias/plano-de-contratacoes-anual';
import { guia as plataformas } from './guias/plataformas-de-licitacao';
import { guia as pncp } from './guias/pncp';
import { guia as precoInexequivel } from './guias/preco-inexequivel';
import { guia as pregao } from './guias/pregao-eletronico';
import { guia as proposta } from './guias/proposta-de-precos';
import { guia as sicaf } from './guias/sicaf';
import type { Guia, Termo } from './tipos';

/** Guias na ordem do índice /guias: o pilar primeiro, depois do básico ao pós-venda. */
export const GUIAS: readonly Guia[] = [
  comoParticipar, oQueELicitacao, ondeEncontrar, prefeitura, meEppEMei, contrataMaisBrasil, novaLei, modalidades, pncp, planoDeContratacoes,
  comprasGovBr, plataformas, sicaf, documentos, atestadoDeCapacidadeTecnica, proposta, painelDePrecos, precoInexequivel, pregao, dispensa,
  inexigibilidade, ataDeRegistroDePrecos, impugnacaoERecurso, ceisECnep, empenho,
];

/** Termos do glossário em ordem alfabética do nome. */
export const TERMOS: readonly Termo[] = [...parte1, ...parte2].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

const GUIA_POR_SLUG = new Map(GUIAS.map((g) => [g.slug, g]));
const TERMO_POR_SLUG = new Map(TERMOS.map((t) => [t.slug, t]));

export const guiaPorSlug = (slug: string): Guia | null => GUIA_POR_SLUG.get(slug) ?? null;
export const termoPorSlug = (slug: string): Termo | null => TERMO_POR_SLUG.get(slug) ?? null;

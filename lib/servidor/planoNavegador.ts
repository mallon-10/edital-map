import 'server-only';

/**
 * Plano do navegador (pagamento pela Cakto): a regra é a de lib/servidor/plano.ts (dono confiável = Pro, assinatura
 * ligada ao navegador ou à conta logada). Devolve gratis|basic|pro; quem usa normaliza com lerPlano (lib/limitesConta.ts).
 */
export { planoAtual as planoDoNavegador } from './plano';

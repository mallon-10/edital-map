/** Peças do checkout no visual da inicial nova e do /planos (spec 2026-10-22-checkout-design.md). */

/** Campo de 50 px com letra de 16 px: abaixo disso o iPhone dá zoom ao tocar. Borda, fundo e recuo direito vêm do estado. */
export const ENTRADA = 'h-[50px] w-full min-w-0 rounded-md border pl-3.5 text-[16px] text-ink placeholder:text-ink-muted/80';
export const ENTRADA_OK = 'border-line-strong bg-raised';
/** Erro: a borda engrossa para 2 px por dentro, sem mexer no texto. */
export const ENTRADA_ERRO = 'border-pin-strong bg-[#fffaf7] shadow-[inset_0_0_0_1px_#b33a0e]';

export const CARTAO_CHECKOUT = 'rounded-[22px] bg-raised lg:rounded-[26px]';

/** Número do passo (1 Seus dados, 2 Forma de pagamento; passos do Pix e do /obrigado); a cor vem à parte. */
export const NUMERO_PASSO =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[12.5px] font-medium lg:size-[30px] lg:text-[13px]';
export const PASSO_AZUL = `${NUMERO_PASSO} bg-ink text-surface`;

export const LINK_VOLTAR = 'inline-flex min-h-8 items-center gap-1.5 self-start text-[14px] font-semibold text-ink-muted hover:text-ink';

/** Botão principal: a pílula laranja do /planos, com a largura toda. */
export const BOTAO_PAGAR =
  'inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-pin px-6 text-[17px] font-bold text-on-pin shadow-[0_8px_20px_rgba(255,90,31,.3)] transition-[transform,box-shadow] duration-150 hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:h-[60px] lg:text-[18px]';

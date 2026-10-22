import { IconeCadeado, IconeCartao, PinoMini } from '@/components/inicio/Icones';
import {
  linhaEndereco,
  mascaraCartao,
  mascaraCep,
  mascaraCvv,
  mascaraValidade,
  type CampoCartao,
  type CartaoForm,
  type EnderecoForm,
} from '@/lib/checkout';
import { Campo } from './Campo';

/** Busca do CEP no ViaCEP: o endereço achado vira uma linha com "Alterar"; sem endereço, os campos abrem sozinhos. */
export type EstadoCep = 'vazio' | 'buscando' | 'achou' | 'falhou';

type Props = {
  cartao: CartaoForm;
  endereco: EnderecoForm;
  erros: Partial<Record<CampoCartao, string>>;
  cep: EstadoCep;
  enderecoAberto: boolean;
  aoMudarCartao: (campo: keyof CartaoForm, valor: string) => void;
  aoMudarEndereco: (campo: keyof EnderecoForm, valor: string) => void;
  aoSair: (campo: CampoCartao) => void;
  aoAbrirEndereco: () => void;
};

/** Cartão (número, nome, validade, CVV) e endereço de cobrança, que o 3D Secure exige: CEP, número e complemento. */
export function CamposCartao({ cartao, endereco, erros, cep, enderecoAberto, aoMudarCartao, aoMudarEndereco, aoSair, aoAbrirEndereco }: Props) {
  const linha = linhaEndereco(endereco);
  const camposAbertos = enderecoAberto || cep === 'falhou' || (cep === 'achou' && !endereco.rua) || Boolean(erros.rua || erros.cidade || erros.uf);
  return (
    <div className="flex flex-col gap-4 lg:gap-[18px]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:gap-x-4 lg:gap-y-[18px]">
        <Campo
          className="col-span-2"
          rotulo="Número do cartão"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={cartao.numero}
          onChange={(e) => aoMudarCartao('numero', mascaraCartao(e.target.value))}
          onBlur={() => aoSair('numero')}
          erro={erros.numero}
          depois={<IconeCartao className="size-[22px]" />}
        />
        <Campo
          className="col-span-2"
          rotulo="Nome impresso no cartão"
          autoComplete="cc-name"
          placeholder="Como está escrito no cartão"
          value={cartao.nomeCartao}
          onChange={(e) => aoMudarCartao('nomeCartao', e.target.value)}
          onBlur={() => aoSair('nomeCartao')}
          erro={erros.nomeCartao}
        />
        <Campo
          rotulo="Validade"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
          value={cartao.validade}
          onChange={(e) => aoMudarCartao('validade', mascaraValidade(e.target.value))}
          onBlur={() => aoSair('validade')}
          erro={erros.validade}
        />
        <Campo
          rotulo="CVV"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={cartao.cvv}
          onChange={(e) => aoMudarCartao('cvv', mascaraCvv(e.target.value))}
          onBlur={() => aoSair('cvv')}
          erro={erros.cvv}
          dica="3 ou 4 dígitos no verso."
        />
      </div>

      <div className="flex flex-col gap-0.5 pt-1">
        <h3 className="text-[15.5px] font-bold lg:text-[16px]">Endereço de cobrança</h3>
        <p className="text-[13.5px] text-ink-muted lg:text-[14px]">O banco usa para confirmar que o cartão é seu.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-4">
        <Campo
          rotulo="CEP"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={endereco.cep}
          onChange={(e) => aoMudarEndereco('cep', mascaraCep(e.target.value))}
          onBlur={() => aoSair('cep')}
          erro={erros.cep}
          dica={cep === 'buscando' ? 'Buscando o endereço…' : undefined}
        />
        <Campo
          rotulo="Número"
          placeholder="123"
          value={endereco.numero}
          onChange={(e) => aoMudarEndereco('numero', e.target.value)}
          onBlur={() => aoSair('enderecoNumero')}
          erro={erros.enderecoNumero}
        />
        <Campo
          className="col-span-2 sm:col-span-1"
          rotulo={
            <>
              Complemento <span className="font-normal text-ink-muted">(opcional)</span>
            </>
          }
          autoComplete="address-line2"
          placeholder="Sala 4"
          value={endereco.complemento}
          onChange={(e) => aoMudarEndereco('complemento', e.target.value)}
        />
      </div>

      {camposAbertos ? (
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 lg:gap-4">
          <Campo
            className="col-span-2"
            rotulo="Rua"
            autoComplete="address-line1"
            value={endereco.rua}
            onChange={(e) => aoMudarEndereco('rua', e.target.value)}
            onBlur={() => aoSair('rua')}
            erro={erros.rua}
          />
          <Campo
            rotulo="Cidade"
            autoComplete="address-level2"
            value={endereco.cidade}
            onChange={(e) => aoMudarEndereco('cidade', e.target.value)}
            onBlur={() => aoSair('cidade')}
            erro={erros.cidade}
          />
          <Campo
            rotulo="UF"
            autoComplete="address-level1"
            maxLength={2}
            value={endereco.uf}
            onChange={(e) => aoMudarEndereco('uf', e.target.value.toUpperCase())}
            onBlur={() => aoSair('uf')}
            erro={erros.uf}
          />
        </div>
      ) : cep === 'achou' && linha ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-surface py-2 pl-4 pr-2">
          <PinoMini className="h-5 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-[14.5px] lg:text-[15px]">{linha}</span>
          <button type="button" onClick={aoAbrirEndereco} className="min-h-10 px-2 text-[14px] font-semibold text-pin-strong hover:underline">
            Alterar
          </button>
        </div>
      ) : null}

      <p className="flex items-start gap-2.5 text-[13px] text-ink-muted lg:text-[13.5px]">
        <IconeCadeado className="mt-px size-[17px] shrink-0 text-mata" />
        Os dados do cartão vão direto do seu navegador para a Cakto. O Edital Map não vê nem guarda o número do cartão.
      </p>
    </div>
  );
}

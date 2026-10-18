'use client';

import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { adicionarTermos } from '@/lib/radar';

type Props = {
  rotulo: string;
  ajuda: string;
  termos: string[];
  max: number;
  /** Tamanho máximo de cada termo (produtos 60, palavras excluídas 40). */
  tamanho: number;
  placeholder?: string;
  /** Sugestões do catálogo (só para produtos). */
  sugerir?: (texto: string) => string[];
  aoMudar: (termos: string[]) => void;
};

/** Botões ao lado do campo não tiram o foco dele (sem isso, o blur incluiria o texto pela metade antes do clique). */
const manterFoco = (e: MouseEvent) => e.preventDefault();

/**
 * Chips removíveis com campo de texto: Enter, vírgula ou "Adicionar" acrescenta; sair do campo também (quem digitou e
 * foi direto em "Continuar" não perde o termo); Backspace com o campo vazio tira o último.
 */
export function CampoTermos({ rotulo, ajuda, termos, max, tamanho, placeholder, sugerir, aoMudar }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const sugestoes = sugerir && texto.trim().length >= 2 ? sugerir(texto) : [];
  const cheio = termos.length >= max;

  function incluir(t: string) {
    if (!t.trim()) return;
    const novos = adicionarTermos(termos, t, max, tamanho);
    if (novos.length === termos.length) {
      setAviso(`Não incluído: use uma palavra com 3 letras ou mais (ou uma sigla como EPI), com até ${tamanho} caracteres, que ainda não esteja na lista.`);
      return;
    }
    aoMudar(novos);
    setTexto('');
    setAviso(null);
  }
  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      incluir(texto);
    } else if (e.key === 'Backspace' && !texto && termos.length) {
      aoMudar(termos.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      <p id={`${id}-ajuda`} className="text-[13px] text-ink-muted">
        {ajuda}
      </p>
      {termos.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={rotulo}>
          {termos.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-sm bg-pin-soft pl-3 text-sm font-semibold text-pin-strong">
              {t}
              <button
                type="button"
                onClick={() => aoMudar(termos.filter((x) => x !== t))}
                aria-label={`Remover ${t}`}
                className="inline-flex size-11 items-center justify-center rounded-xs text-lg leading-none hover:bg-raised"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          aria-describedby={`${id}-ajuda${aviso ? ` ${id}-aviso` : ''}`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAviso(null);
          }}
          onKeyDown={tecla}
          onBlur={() => {
            if (texto.trim() && !cheio) incluir(texto);
          }}
          disabled={cheio}
          placeholder={cheio ? `Limite de ${max} atingido` : placeholder}
          autoComplete="off"
          enterKeyHint="enter"
          className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-raised px-3 text-[15px] disabled:bg-sunken"
        />
        <button
          type="button"
          onMouseDown={manterFoco}
          onClick={() => incluir(texto)}
          disabled={cheio}
          className="inline-flex h-11 shrink-0 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      {aviso ? (
        <p id={`${id}-aviso`} role="status" className="text-[13px] font-semibold text-pin-strong">
          {aviso}
        </p>
      ) : null}
      {sugestoes.length ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={manterFoco}
              onClick={() => incluir(s)}
              className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-3 text-sm hover:bg-sunken"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

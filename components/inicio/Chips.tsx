'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { EtiquetaPro } from '@/components/EtiquetaPro';
import { LinkPro } from '@/components/LinkPro';
import { useUso } from '@/lib/cliente/uso';
import { cadeadoPro } from '@/lib/limites';
import { MODALIDADES, RAIOS_KM, UFS_ORDENADAS, ufIgnoradaPeloRaio, VALORES_MINIMOS } from '@/lib/filtros';
import { haQuanto, numero } from '@/lib/formato';
import type { Cidade, FiltrosTela, PontoMapa } from '@/lib/tipos';
import { Seta } from './Icones';
import { PainelOrgao } from './PainelOrgao';
import { Popover } from './Popover';
import { chip } from './estilos';

type Props = {
  filtros: FiltrosTela;
  pontos: PontoMapa[];
  atualizadoEm: string | null;
  agora: Date;
  aoMudar: (f: FiltrosTela) => void;
  /** Na folha de Filtros do celular: os chips quebram linha e a linha da fonte some. */
  emFolha?: boolean;
};

const NBSP = ' ';
const MAX_MUNICIPIOS = 50;

/** Rótulos dos valores mínimos, no mesmo formato de `moedaCurta` (que escreveria "R$ 1,00 mi" para 1.000.000). */
const ROTULO_VALOR: Record<number, string> = {
  10_000: `R$${NBSP}10${NBSP}mil`,
  50_000: `R$${NBSP}50${NBSP}mil`,
  100_000: `R$${NBSP}100${NBSP}mil`,
  500_000: `R$${NBSP}500${NBSP}mil`,
  1_000_000: `R$${NBSP}1${NBSP}mi`,
};

function rotuloValor(v: number): string {
  return ROTULO_VALOR[v] ?? `R$${NBSP}${numero(v)}`;
}

/** Minúsculas e sem acento, para a busca de município. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Chip que é uma pílula inteira clicável: o texto é só visual e o select nativo (transparente) cobre a pílula toda.
 * O foco aparece no contorno da pílula; a lista de opções é a do sistema. `desabilitado` apaga a pílula e trava o select;
 * `pro` acrescenta a etiqueta "· Pro"; `aviso` aparece depois do valor. Desabilitado, o texto ("escolha um município") e o
 * aviso entram no nome acessível, porque o valor do select travado não diz por que ele está travado.
 */
function ChipSelect({
  rotulo,
  textoValor,
  ativo,
  valor,
  aoMudar,
  desabilitado = false,
  pro = false,
  aviso,
  grande = false,
  children,
}: {
  rotulo: string;
  textoValor: string;
  ativo: boolean;
  valor: string;
  aoMudar: (v: string) => void;
  desabilitado?: boolean;
  pro?: boolean;
  aviso?: string;
  /** Chip de 44 px (folha de Filtros do celular). */
  grande?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      title={aviso}
      className={`${chip(ativo, grande)} relative pr-8 focus-within:outline focus-within:outline-2 focus-within:outline-rio ${desabilitado ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span className="pointer-events-none max-w-[14rem] truncate">
        {rotulo}: {textoValor}
        {aviso ? ` · ${aviso}` : ''}
      </span>
      {pro ? <EtiquetaPro className="pointer-events-none" /> : null}
      <Seta className="pointer-events-none absolute right-3 size-3.5" />
      <select
        aria-label={[rotulo, desabilitado ? textoValor : null, aviso].filter(Boolean).join(', ')}
        value={valor}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed [&>option]:bg-raised [&>option]:text-ink"
      >
        {children}
      </select>
    </label>
  );
}

const ITEM_MUNICIPIO = 'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-sunken';

/** Conteúdo do painel de município: busca por nome (sem acento) e lista dos que têm mais editais primeiro. */
function PainelMunicipio({ ordenados, cidade, aoEscolher }: { ordenados: { p: PontoMapa; chave: string }[]; cidade: Cidade | null; aoEscolher: (c: Cidade | null) => void }) {
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca.trim());
  const achados = ordenados.filter((o) => !termo || o.chave.includes(termo));
  const lista = achados.slice(0, MAX_MUNICIPIOS);
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar município"
        aria-label="Buscar município"
        autoComplete="off"
        className="h-9 w-full rounded-sm border border-line-strong bg-raised px-2.5 text-sm"
      />
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        <button type="button" onClick={() => aoEscolher(null)} aria-current={cidade ? undefined : 'true'} className={`${ITEM_MUNICIPIO} font-semibold`}>
          Todos os municípios
        </button>
        {lista.map(({ p }) => (
          <button
            key={p.codigo_ibge}
            type="button"
            onClick={() => aoEscolher({ ibge: p.codigo_ibge, nome: p.nome, uf: p.uf })}
            aria-current={cidade?.ibge === p.codigo_ibge ? 'true' : undefined}
            className={`${ITEM_MUNICIPIO} ${cidade?.ibge === p.codigo_ibge ? 'bg-sunken font-semibold' : ''}`}
          >
            <span className="truncate">
              {p.nome}/{p.uf}
            </span>
            <span className="shrink-0 font-mono text-xs text-ink-muted">{numero(p.qtd)}</span>
          </button>
        ))}
        {lista.length === 0 ? <p className="px-2 py-2 text-sm text-ink-muted">Nenhum município com esse nome.</p> : null}
        {achados.length > MAX_MUNICIPIOS ? (
          <p className="px-2 py-1.5 text-xs text-ink-muted">Mostrando {MAX_MUNICIPIOS} de {numero(achados.length)}. Digite para filtrar.</p>
        ) : null}
      </div>
    </div>
  );
}

export function Chips({ filtros, pontos, atualizadoEm, agora, aoMudar, emFolha = false }: Props) {
  // Grátis e Basic com o pagamento ligado: órgão e raio viram cadeado (o servidor também barra).
  const bloqueado = cadeadoPro(useUso());
  // Mais editais primeiro, depois ordem alfabética; a chave normalizada é calculada uma vez por lista de pontos.
  const ordenados = useMemo(
    () =>
      [...pontos]
        .sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((p) => ({ p, chave: normalizar(p.nome) })),
    [pontos],
  );
  const qtdModalidades = filtros.modalidades.length;
  const cidade = filtros.cidade;
  // Com raio a busca cruza a divisa de estado: a UF escolhida fica guardada, mas não filtra (o chip avisa).
  const ufIgnorada = ufIgnoradaPeloRaio(filtros);
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          emFolha
            ? 'flex min-w-0 flex-1 flex-wrap items-center gap-2'
            : '-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:py-0'
        }
      >
        <ChipSelect
          grande={emFolha}
          rotulo="UF"
          textoValor={filtros.uf || 'todas'}
          ativo={Boolean(filtros.uf) && !ufIgnorada}
          aviso={ufIgnorada ? 'não vale com raio' : undefined}
          valor={filtros.uf}
          aoMudar={(uf) => aoMudar({ ...filtros, uf, cidade: null })}
        >
          <option value="">todas</option>
          {UFS_ORDENADAS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </ChipSelect>
        <Popover
          grande={emFolha}
          nome="Município"
          ativo={Boolean(cidade)}
          rotulo={<span className="max-w-[14rem] truncate">{cidade ? `Município: ${cidade.nome}/${cidade.uf}` : 'Município'}</span>}
        >
          {(fechar) => (
            <PainelMunicipio
              ordenados={ordenados}
              cidade={cidade}
              aoEscolher={(c) => {
                aoMudar({ ...filtros, cidade: c });
                fechar();
              }}
            />
          )}
        </Popover>
        <ChipSelect
          grande={emFolha}
          rotulo="Valor"
          textoValor={filtros.valorMin ? `acima de ${rotuloValor(filtros.valorMin)}` : 'qualquer'}
          ativo={filtros.valorMin !== null}
          valor={filtros.valorMin ? String(filtros.valorMin) : ''}
          aoMudar={(v) => aoMudar({ ...filtros, valorMin: v ? Number(v) : null })}
        >
          <option value="">qualquer</option>
          {VALORES_MINIMOS.map((v) => (
            <option key={v} value={v}>
              acima de {rotuloValor(v)}
            </option>
          ))}
        </ChipSelect>
        <Popover grande={emFolha} nome="Modalidade" ativo={qtdModalidades > 0} rotulo={qtdModalidades ? `Modalidade · ${qtdModalidades}` : 'Modalidade'}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-ink-muted">Modalidade</legend>
            {MODALIDADES.map((m) => {
              const marcada = filtros.modalidades.includes(m.id);
              return (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      aoMudar({
                        ...filtros,
                        modalidades: marcada ? filtros.modalidades.filter((id) => id !== m.id) : [...filtros.modalidades, m.id],
                      })
                    }
                    className="size-4 accent-mata"
                  />
                  {m.nome}
                </label>
              );
            })}
          </fieldset>
        </Popover>
        {bloqueado ? (
          <LinkPro rotulo="Órgão" className={`${chip(false, emFolha)} gap-1.5`} />
        ) : (
          <Popover
            grande={emFolha}
            nome="Órgão"
            ativo={Boolean(filtros.orgao)}
            rotulo={
              <>
                <span className="max-w-[14rem] truncate">{filtros.orgao ? `Órgão: ${filtros.orgao.nome}` : 'Órgão'}</span>
                <EtiquetaPro />
              </>
            }
          >
            {(fechar) => (
              <PainelOrgao
                orgao={filtros.orgao}
                aoEscolher={(o) => {
                  aoMudar({ ...filtros, orgao: o });
                  fechar();
                }}
              />
            )}
          </Popover>
        )}
        {bloqueado ? (
          <LinkPro rotulo="Raio" className={`${chip(false, emFolha)} gap-1.5`} />
        ) : (
          <ChipSelect
            grande={emFolha}
            rotulo="Raio"
            textoValor={!cidade ? 'escolha um município' : filtros.raio ? `${filtros.raio} km` : 'só o município'}
            ativo={Boolean(cidade && filtros.raio)}
            valor={cidade && filtros.raio ? String(filtros.raio) : ''}
            desabilitado={!cidade}
            pro
            aoMudar={(v) => aoMudar({ ...filtros, raio: v ? Number(v) : null })}
          >
            <option value="">só o município</option>
            {RAIOS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </ChipSelect>
        )}
      </div>
      {emFolha ? null : (
        <p className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted xl:block">
          Fonte: PNCP{atualizadoEm ? ` · atualizado ${haQuanto(atualizadoEm, agora)}` : ''}
        </p>
      )}
    </div>
  );
}

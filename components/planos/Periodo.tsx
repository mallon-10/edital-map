'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Periodo } from '@/lib/planos';

type Valor = { periodo: Periodo; escolher: (p: Periodo) => void };

const Contexto = createContext<Valor>({ periodo: 'mensal', escolher: () => undefined });

/** Período escolhido no alternador, valendo para todos os "Assinar o Pro" da página (topo, preços e final). */
export function PeriodoProvider({ inicial = 'mensal', children }: { inicial?: Periodo; children: ReactNode }) {
  const [periodo, escolher] = useState<Periodo>(inicial);
  return <Contexto.Provider value={{ periodo, escolher }}>{children}</Contexto.Provider>;
}

export const usePeriodo = () => useContext(Contexto);

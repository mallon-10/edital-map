import { IconeCalendario, IconeEmail, IconeFiltro, IconeRadar, IconeSalvar, IconeSino } from '@/components/inicio/Icones';
import type { IconePlanos as Nome } from '@/lib/paginaPlanos';

const ICONES: Record<Nome, (p: { className?: string }) => React.ReactNode> = {
  filtro: IconeFiltro,
  sino: IconeSino,
  email: IconeEmail,
  calendario: IconeCalendario,
  radar: IconeRadar,
  salvar: IconeSalvar,
};

/** Ícone pelo nome usado nos dados da página (lib/paginaPlanos.ts). */
export function IconePlanos({ nome, className }: { nome: Nome; className?: string }) {
  const Icone = ICONES[nome];
  return <Icone className={className} />;
}

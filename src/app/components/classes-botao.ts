/**
 * As classes do botão — três variantes, e só três:
 *   primario     a ação principal da tela. UMA por tela
 *   secundario   todo o resto
 *   destrutivo   só o que destrói de verdade
 */
const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-full " +
  "transition-colors motion-reduce:transition-none disabled:opacity-40 " +
  "disabled:cursor-not-allowed whitespace-nowrap";

const CHEIO = "min-h-11 px-5 text-sm";
const MIUDO = "min-h-9 px-3.5 text-xs";

const PRIMARIO = "bg-accent text-bg hover:bg-accentink";
const SECUNDARIO = "border border-linestrong text-ink hover:border-accent hover:text-accent";
const DESTRUTIVO = "border border-danger/60 text-danger hover:bg-danger/10";

export const BTN_PRIMARIO = `${BASE} ${CHEIO} ${PRIMARIO}`;
export const BTN_SECUNDARIO = `${BASE} ${CHEIO} ${SECUNDARIO}`;
export const BTN_DESTRUTIVO = `${BASE} ${CHEIO} ${DESTRUTIVO}`;

export const BTN_PRIMARIO_MIUDO = `${BASE} ${MIUDO} ${PRIMARIO}`;
export const BTN_SECUNDARIO_MIUDO = `${BASE} ${MIUDO} ${SECUNDARIO}`;
export const BTN_DESTRUTIVO_MIUDO = `${BASE} ${MIUDO} ${DESTRUTIVO}`;

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BTN_PRIMARIO, BTN_SECUNDARIO, BTN_DESTRUTIVO } from "./classes-botao";

/**
 * O diálogo do produto, no lugar da caixa cinza do sistema. Nomeia o que vai
 * acontecer — não pergunta "tem certeza?", que é a pergunta que ninguém lê.
 */
export interface PedidoDeConfirmacao {
  titulo: string;
  oQueVaiAcontecer: string;
  oQuePermanece?: string;
  confirmar: string;
  cancelar?: string;
  perigo?: boolean;
}

export function useConfirmar() {
  const [pedido, setPedido] = useState<PedidoDeConfirmacao | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirmar = useCallback((p: PedidoDeConfirmacao) => {
    setPedido(p);
    return new Promise<boolean>((ok) => {
      resolver.current = ok;
    });
  }, []);

  const responder = useCallback((ok: boolean) => {
    setPedido(null);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const dialogo = pedido ? <Dialogo pedido={pedido} responder={responder} /> : null;
  return { confirmar, dialogo };
}

function Dialogo({
  pedido,
  responder,
}: {
  pedido: PedidoDeConfirmacao;
  responder: (ok: boolean) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") responder(false);
    };
    document.addEventListener("keydown", tecla);
    caixa.current?.focus();
    return () => document.removeEventListener("keydown", tecla);
  }, [responder]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={pedido.titulo}
    >
      <button
        type="button"
        aria-label="Cancelar"
        onClick={() => responder(false)}
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
      />
      <div
        ref={caixa}
        tabIndex={-1}
        className="relative w-full sm:max-w-md bg-surface border border-linestrong rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl outline-none"
      >
        <h2 className="font-semibold text-base mb-2">{pedido.titulo}</h2>
        <p className="text-sm text-muted leading-relaxed">{pedido.oQueVaiAcontecer}</p>
        {pedido.oQuePermanece && (
          <p className="text-sm text-muted leading-relaxed mt-2">
            <b className="text-ink">Não muda:</b> {pedido.oQuePermanece}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => responder(true)}
            className={pedido.perigo ? BTN_DESTRUTIVO : BTN_PRIMARIO}
          >
            {pedido.confirmar}
          </button>
          <button onClick={() => responder(false)} className={BTN_SECUNDARIO}>
            {pedido.cancelar ?? "Cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Aviso sem pergunta — o lugar dos `alert()`. */
export function Aviso({
  children,
  tom = "erro",
}: {
  children: ReactNode;
  tom?: "erro" | "atencao" | "ok";
}) {
  const cor =
    tom === "erro"
      ? "border-danger/40 bg-danger/10 text-danger"
      : tom === "atencao"
        ? "border-warn/40 bg-warn/10 text-warn"
        : "border-ok/40 bg-ok/10 text-ok";
  return (
    <p role="alert" className={`border rounded-lg px-4 py-3 text-sm leading-relaxed ${cor}`}>
      {children}
    </p>
  );
}

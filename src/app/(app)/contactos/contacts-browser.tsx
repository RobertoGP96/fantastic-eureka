"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, Search, X } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { filterContacts } from "@/lib/contacts-core";

export interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  /** Pendientes ya formateados, uno por moneda («2 000 CUP»). */
  receivable: string[];
  payable: string[];
  openDebts: number;
  activePlans: number;
}

/** Lista de contactos con buscador (filtra en el cliente, sin ir al servidor). */
export function ContactsBrowser({ contacts }: { contacts: ContactRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => filterContacts(contacts, query),
    [contacts, query]
  );

  return (
    <>
      <label className="relative block md:max-w-sm">
        <span className="sr-only">Buscar contacto</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          autoComplete="off"
          className="px-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dense:size-7"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      {visible.length === 0 ? (
        <Card className="py-6 text-center text-sm text-muted">
          Ningún contacto coincide con «{query.trim()}».
        </Card>
      ) : (
        // UNA tarjeta con una fila por contacto.
        <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
          {visible.map((contact) => (
            <ContactRowLink key={contact.id} contact={contact} />
          ))}
        </Card>
      )}
    </>
  );
}

function ContactRowLink({ contact }: { contact: ContactRow }) {
  const hasBalance = contact.receivable.length + contact.payable.length > 0;
  // El color del avatar resume el saldo: me debe / le debo / nada pendiente.
  const tone =
    contact.receivable.length > 0
      ? "ok"
      : contact.payable.length > 0
        ? "warn"
        : "neutral";

  return (
    // En móvil, quién arriba y los saldos debajo (alineados con el nombre);
    // con sitio, todo en una fila con los saldos a la derecha.
    <Link
      href={`/contactos/${contact.id}`}
      className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-subtle/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset @2xl/main:flex-row @2xl/main:items-center @2xl/main:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <EntityAvatar name={contact.name} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-heading">
            {contact.name}
          </div>
          {contact.phone && (
            <div className="flex items-center gap-1 text-xs text-muted">
              <Phone className="size-3 flex-none" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-12 @2xl/main:max-w-[60%] @2xl/main:flex-none @2xl/main:justify-end @2xl/main:pl-0">
        {contact.receivable.map((amount) => (
          <Badge key={`r-${amount}`} variant="ok">
            Te debe {amount}
          </Badge>
        ))}
        {contact.payable.map((amount) => (
          <Badge key={`p-${amount}`} variant="warn">
            Le debes {amount}
          </Badge>
        ))}
        {contact.activePlans > 0 && (
          <Badge variant="neutral">
            {contact.activePlans} mensualidad
            {contact.activePlans === 1 ? "" : "es"}
          </Badge>
        )}
        {!hasBalance && contact.activePlans === 0 && (
          <span className="text-xs text-muted">Sin deudas abiertas</span>
        )}
      </div>
    </Link>
  );
}

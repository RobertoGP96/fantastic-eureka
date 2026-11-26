"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Phone, Search, X } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { CardGrid } from "@/components/page-body";
import { Badge } from "@/components/ui/badge";
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
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-chip hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
          Ningún contacto coincide con «{query.trim()}».
        </p>
      ) : (
        // key: al cambiar la búsqueda la rejilla vuelve a entrar escalonada.
        <CardGrid key={query.trim() ? "filtrada" : "todas"}>
          {visible.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </CardGrid>
      )}
    </>
  );
}

function ContactCard({ contact }: { contact: ContactRow }) {
  const hasBalance = contact.receivable.length + contact.payable.length > 0;
  const tone =
    contact.receivable.length > 0
      ? "ok"
      : contact.payable.length > 0
        ? "warn"
        : "brand";

  return (
    <Link
      href={`/contactos/${contact.id}`}
      className="press flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <div className="flex items-center gap-3.5">
        <EntityAvatar name={contact.name} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-heading">
            {contact.name}
          </div>
          {contact.phone && (
            <div className="flex items-center gap-1 text-xs text-muted">
              <Phone className="size-3 flex-none" />
              <span className="truncate">{contact.phone}</span>
            </div>
          )}
        </div>
        <ChevronRight className="size-4 flex-none text-muted" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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

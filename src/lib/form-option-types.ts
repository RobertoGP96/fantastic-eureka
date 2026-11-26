// Tipos de las opciones que alimentan los formularios en drawer. Sin
// `server-only`: los importan los componentes cliente.

export interface ContactOption {
  id: string;
  name: string;
}

export interface CurrencyOption {
  id: string;
  code: string;
}

export interface AccountOption {
  id: string;
  name: string;
  currencyId: string;
}

/** Lo que necesitan los formularios de deuda y de mensualidad. */
export interface DebtFormOptions {
  contacts: ContactOption[];
  currencies: CurrencyOption[];
  accounts: AccountOption[];
}

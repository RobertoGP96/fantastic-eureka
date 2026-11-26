// Nombres de los drawers de Monedas (`#panel=<nombre>`). En un módulo sin
// "use client" para que los compartan las páginas (servidor) y sus
// componentes cliente: una constante exportada desde un módulo cliente llega
// al servidor como referencia, no como texto.

/** Alta de moneda, en `/monedas`. */
export const NEW_CURRENCY_PANEL = "nueva-moneda";
/** Alta de denominación, en `/monedas/[id]`. */
export const NEW_DENOMINATION_PANEL = "nueva-denominacion";

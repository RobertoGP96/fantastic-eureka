// Nombre del drawer de alta de categoría (`/categorias#panel=nueva-categoria`).
// En un módulo sin "use client" para que lo compartan la página (servidor) y
// sus componentes cliente: una constante exportada desde un módulo cliente
// llega al servidor como referencia, no como texto.

export const NEW_CATEGORY_PANEL = "nueva-categoria";

/** Valor del parámetro `tipo` del panel (y de la query `?tipo=` en móvil). */
export const KIND_PARAM = { EXPENSE: "gastos", INCOME: "ingresos" } as const;

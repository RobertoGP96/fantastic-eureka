// Servicio de preferencias del dashboard. Lógica extraída de
// src/app/actions/dashboard-actions.ts sin cambios de comportamiento.

import {
  normalizeDashboardPrefs,
  serializeDashboardPrefs,
} from "@/lib/dashboard-prefs";
import { dashboardPrefsSchema, type ActionResult } from "@/lib/schemas";
import { unexpectedFailure, type ServiceContext } from "./context";

/**
 * Guarda las preferencias del dashboard en `User.dashboardPrefs`. Los
 * gadgets que referencian cuentas o monedas de otro usuario (o borradas)
 * se descartan en silencio: al renderizar tampoco existirían.
 */
export async function saveDashboardPrefs(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<undefined>> {
  const parsed = dashboardPrefsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Preferencias inválidas" };
  }

  try {
    const prefs = normalizeDashboardPrefs(parsed.data);

    // Propiedad: cuentas y monedas referenciadas deben ser del usuario.
    const accountIds = new Set<string>([
      ...prefs.widgets.flatMap((w) => (w.accountId ? [w.accountId] : [])),
      ...(prefs.accountIds ?? []),
    ]);
    const currencyIds = new Set<string>(
      prefs.widgets.flatMap((w) =>
        w.type === "ratePair" ? [w.fromCurrencyId!, w.toCurrencyId!] : []
      )
    );
    const [ownAccounts, ownCurrencies] = await Promise.all([
      accountIds.size > 0
        ? db.account.findMany({
            where: { id: { in: [...accountIds] }, userId },
            select: { id: true },
          })
        : Promise.resolve([]),
      currencyIds.size > 0
        ? db.currency.findMany({
            where: { id: { in: [...currencyIds] }, userId },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);
    const validAccounts = new Set(ownAccounts.map((a) => a.id));
    const validCurrencies = new Set(ownCurrencies.map((c) => c.id));

    const widgets = prefs.widgets.filter((w) => {
      if (w.accountId && !validAccounts.has(w.accountId)) return false;
      if (w.type === "ratePair") {
        return (
          validCurrencies.has(w.fromCurrencyId!) &&
          validCurrencies.has(w.toCurrencyId!)
        );
      }
      return true;
    });
    const cleaned = normalizeDashboardPrefs({
      sections: prefs.sections,
      widgets,
      accountIds:
        prefs.accountIds === null
          ? null
          : prefs.accountIds.filter((id) => validAccounts.has(id)),
    });

    await db.user.update({
      where: { id: userId },
      data: { dashboardPrefs: serializeDashboardPrefs(cleaned) },
    });
    return { success: true, data: undefined };
  } catch (error) {
    return unexpectedFailure("saveDashboardPrefs", error, "No se pudieron guardar las preferencias");
  }
}

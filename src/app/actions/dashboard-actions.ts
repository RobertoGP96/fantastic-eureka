"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeDashboardPrefs,
  serializeDashboardPrefs,
  widgetSectionKey,
} from "@/lib/dashboard-prefs";
import { dashboardPrefsSchema, type ActionResult } from "@/lib/schemas";

/**
 * Guarda las preferencias del dashboard en `User.dashboardPrefs`. Los
 * gadgets que referencian cuentas o monedas de otro usuario (o borradas)
 * se descartan en silencio: al renderizar tampoco existirían.
 */
export async function saveDashboardPrefs(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

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
        ? prisma.account.findMany({
            where: { id: { in: [...accountIds] }, userId: user.id },
            select: { id: true },
          })
        : Promise.resolve([]),
      currencyIds.size > 0
        ? prisma.currency.findMany({
            where: { id: { in: [...currencyIds] }, userId: user.id },
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
    const keptWidgetKeys = new Set(widgets.map((w) => widgetSectionKey(w.id)));
    const cleaned = normalizeDashboardPrefs({
      sections: prefs.sections.filter(
        (s) => !s.key.startsWith("widget:") || keptWidgetKeys.has(s.key)
      ),
      widgets,
      accountIds:
        prefs.accountIds === null
          ? null
          : prefs.accountIds.filter((id) => validAccounts.has(id)),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { dashboardPrefs: serializeDashboardPrefs(cleaned) },
    });
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveDashboardPrefs:", error);
    return { success: false, error: "No se pudieron guardar las preferencias" };
  }
}

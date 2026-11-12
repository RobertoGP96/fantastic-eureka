// Borra los datos de trabajo de UN usuario conservando su configuración
// (monedas, denominaciones, categorías, grupos). Útil para limpiar pruebas.
//
//   pnpm tsx prisma/reset-data.ts --user correo@ejemplo.com --yes
//   pnpm tsx prisma/reset-data.ts --all --yes        (TODOS los usuarios)
//
// OJO: `.env` apunta a la BD REAL de Neon y la app es multi-tenant. Antes
// este script borraba los datos de todos los usuarios sin preguntar; ahora
// exige decir de quién (`--user` o `--all`) y confirmarlo con `--yes`. Sin
// `--yes` solo muestra qué borraría.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function targetLabel(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname} · schema ${url.searchParams.get("schema") ?? "public"}`;
  } catch {
    return "(DATABASE_URL no válida)";
  }
}

async function main() {
  const email = arg("--user");
  const all = process.argv.includes("--all");
  const confirmed = process.argv.includes("--yes");

  if ((!email && !all) || (email && all)) {
    console.error(
      "Indica a quién limpiar: --user <correo>  o  --all (todos los usuarios)."
    );
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: email ? { email: email.trim().toLowerCase() } : {},
    select: { id: true, email: true },
  });
  if (users.length === 0) {
    console.error(`No existe ningún usuario${email ? ` con el correo ${email}` : ""}.`);
    process.exit(1);
  }

  const userIds = users.map((user) => user.id);
  const byUser = { userId: { in: userIds } };

  console.log(`Base de datos: ${targetLabel()}`);
  console.log(`Usuarios (${users.length}): ${users.map((u) => u.email).join(", ")}`);
  console.log(
    `Se borrarían: ${await prisma.transaction.count({ where: byUser })} movimientos, ` +
      `${await prisma.account.count({ where: byUser })} cuentas, ` +
      `${await prisma.debt.count({ where: byUser })} deudas y ` +
      `${await prisma.paymentPlan.count({ where: byUser })} planes ` +
      `(más arqueos, abonos, contactos y tasas).`
  );

  if (!confirmed) {
    console.log("\nNo se ha borrado nada. Repite el comando con --yes para confirmar.");
    return;
  }

  // Una sola transacción (o todo o nada) y en el orden que dictan las FK:
  // arqueos antes que sus ajustes, abonos antes que sus movimientos, etc.
  await prisma.$transaction(
    [
      prisma.cashCount.deleteMany({ where: byUser }), // líneas por Cascade
      prisma.debtPayment.deleteMany({ where: { debt: byUser } }),
      prisma.paymentPlan.deleteMany({ where: byUser }), // cuotas por Cascade
      prisma.debt.deleteMany({ where: byUser }),
      prisma.contact.deleteMany({ where: byUser }),
      prisma.exchangeRate.deleteMany({ where: byUser }),
      prisma.transaction.deleteMany({ where: byUser }), // desgloses por Cascade
      prisma.account.deleteMany({ where: byUser }), // enlaces compartidos por Cascade
      // Estado de sincronización móvil: tras un borrado masivo no hay lápidas
      // fila a fila, así que el dispositivo debe hacer un resync completo.
      prisma.syncTombstone.deleteMany({ where: byUser }),
      prisma.syncOperation.deleteMany({ where: byUser }),
    ]
  );
  console.log("Datos de trabajo eliminados (configuración intacta).");
  console.log(
    "Si ese usuario usa la app móvil, que cierre sesión y vuelva a entrar para resincronizar."
  );
}

main()
  .catch((error) => {
    console.error("Error al limpiar datos:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

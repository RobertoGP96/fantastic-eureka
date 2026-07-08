// Seed idempotente multi-tenant: cada usuario existente que aún no tenga
// monedas recibe los datos por defecto (monedas + denominaciones +
// categorías). Los usuarios NUEVOS se inicializan solos al registrarse
// (bootstrapUserDefaults en registerUser), así que en una BD vacía este
// seed no hace nada.
// Ejecutar con `pnpm db:seed` (o automático tras `prisma migrate dev`).
import { PrismaClient } from "@prisma/client";
import {
  bootstrapUserDefaults,
  userHasDefaults,
} from "../src/lib/user-defaults";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  if (users.length === 0) {
    console.log("Seed: no hay usuarios; nada que inicializar.");
    return;
  }

  for (const user of users) {
    if (await userHasDefaults(prisma, user.id)) {
      console.log(`Seed: ${user.email} ya tiene datos; se omite.`);
      continue;
    }
    await bootstrapUserDefaults(prisma, user.id);
    console.log(`Seed: datos por defecto creados para ${user.email}.`);
  }
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

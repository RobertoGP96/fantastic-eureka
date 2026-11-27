import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireSessionUser();

  return (
    <Page width="form">
      <ScreenHeader
        title="Mi perfil"
        subtitle="Edita tus datos y tu contraseña"
        backHref="/mas"
      />

      <PageBody>
        {/* asChild: la propia tarjeta es el <section> de su encabezado. */}
        <Card asChild>
          <section>
            <CardHeader>
              <CardTitle>Datos personales</CardTitle>
            </CardHeader>
            <ProfileForm initialName={user.name} initialEmail={user.email} />
          </section>
        </Card>

        <Card asChild>
          <section>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription className="mt-0.5">
                  Al cambiarla se cerrarán tus sesiones en otros dispositivos.
                </CardDescription>
              </div>
            </CardHeader>
            <PasswordForm />
          </section>
        </Card>
      </PageBody>
    </Page>
  );
}

import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { buttonVariants } from "@/components/ui/button";
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

/** Nombre del drawer de contraseña (`/perfil#panel=cambiar-contrasena`). */
const PASSWORD_PANEL = "cambiar-contrasena";

const PASSWORD_NOTICE =
  "Al cambiarla se cerrarán tus sesiones en otros dispositivos.";

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

        {/* La contraseña se cambia en un drawer: aquí solo va el acceso. */}
        <Card asChild>
          <section>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Contraseña</CardTitle>
                <CardDescription className="mt-0.5">
                  {PASSWORD_NOTICE}
                </CardDescription>
              </div>
            </CardHeader>
            <PanelButton
              panel={PASSWORD_PANEL}
              className={buttonVariants({
                variant: "outline",
                className: "w-full",
              })}
            >
              Cambiar contraseña
            </PanelButton>
          </section>
        </Card>
      </PageBody>

      <PanelDrawer
        panel={PASSWORD_PANEL}
        title="Cambiar contraseña"
        description={PASSWORD_NOTICE}
      >
        <PasswordForm />
      </PanelDrawer>
    </Page>
  );
}

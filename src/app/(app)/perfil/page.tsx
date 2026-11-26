import { KeyRound } from "lucide-react";
import { PanelDrawer } from "@/components/form-drawer";
import { PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/section";
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
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Mi perfil" backHref="/mas">
        <p className="mt-1 text-sm text-white/80">
          Edita tus datos y tu contraseña
        </p>
      </ScreenHeader>

      {/* Tope de ancho: son dos tarjetas de formulario, a todo el panel los
          campos quedarían desproporcionados. */}
      <PageBody className="md:max-w-4xl">
        <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2 @3xl:items-start">
          <Card>
            <h2 className="mb-3 text-sm font-bold text-heading">
              Datos personales
            </h2>
            <ProfileForm initialName={user.name} initialEmail={user.email} />
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                <KeyRound className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-heading">Contraseña</h2>
                <p className="mt-0.5 text-xs text-muted">{PASSWORD_NOTICE}</p>
              </div>
            </div>
            <PanelButton
              panel={PASSWORD_PANEL}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input bg-card px-5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-ink hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              Cambiar contraseña
            </PanelButton>
          </Card>
        </div>
      </PageBody>

      <PanelDrawer
        panel={PASSWORD_PANEL}
        title="Cambiar contraseña"
        description={PASSWORD_NOTICE}
      >
        <PasswordForm />
      </PanelDrawer>
    </main>
  );
}

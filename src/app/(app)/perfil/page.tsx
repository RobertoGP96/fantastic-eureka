import { ScreenHeader } from "@/components/screen-header";
import { getSessionUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Mi perfil" backHref="/mas">
        <p className="mt-1 text-[12.5px] text-white/70">
          Edita tus datos y tu contraseña
        </p>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:max-w-md md:px-0">
        {user && (
          <>
            <section className="rounded-[18px] border border-line bg-white p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-navy">
                Datos personales
              </h2>
              <ProfileForm initialName={user.name} initialEmail={user.email} />
            </section>

            <section className="rounded-[18px] border border-line bg-white p-4">
              <h2 className="mb-1 text-[13.5px] font-bold text-navy">
                Cambiar contraseña
              </h2>
              <p className="mb-3 text-[11.5px] text-muted">
                Al cambiarla se cerrarán tus sesiones en otros dispositivos.
              </p>
              <PasswordForm />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

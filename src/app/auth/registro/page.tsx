import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { RegisterForm } from "./register-form";

export default function RegistroPage() {
  const registrationDisabled = process.env.ALLOW_REGISTRATION === "false";
  return (
    <div className="anim-fade-up rounded-2xl border border-line bg-card p-6">
      <div className="mb-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-heading">
          Crea tu cuenta en {APP_NAME}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Solo necesitas un correo y una contraseña
        </p>
      </div>
      {registrationDisabled ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl bg-warn-bg px-3.5 py-3 text-center text-sm font-medium text-warn">
            El registro está deshabilitado en esta instancia.
          </p>
          <p className="text-center text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-brand-ink transition-colors hover:text-brand-mid"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      ) : (
        <RegisterForm />
      )}
    </div>
  );
}

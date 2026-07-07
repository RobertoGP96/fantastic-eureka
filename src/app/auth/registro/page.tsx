import Link from "next/link";
import { Coins } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { RegisterForm } from "./register-form";

export default function RegistroPage() {
  const registrationDisabled = process.env.ALLOW_REGISTRATION === "false";
  return (
    <div className="anim-fade-up rounded-[22px] bg-white p-6 shadow-[0_20px_60px_rgba(10,31,63,.35)]">
      <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
        <span className="grad-cta flex h-14 w-14 items-center justify-center rounded-[18px] text-white">
          <Coins className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-[19px] font-bold text-navy">
            Crea tu cuenta en {APP_NAME}
          </h1>
          <p className="text-[12.5px] text-muted">
            Solo necesitas un correo y una contraseña
          </p>
        </div>
      </div>
      {registrationDisabled ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-[13px] bg-warn-bg px-3.5 py-3 text-center text-[12.5px] font-medium text-warn">
            El registro está deshabilitado en esta instancia.
          </p>
          <p className="text-center text-[12.5px] text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-brand-mid transition-colors hover:text-brand"
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

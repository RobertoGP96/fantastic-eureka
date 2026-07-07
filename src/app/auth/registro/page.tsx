import { Coins } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { RegisterForm } from "./register-form";

export default function RegistroPage() {
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
      <RegisterForm />
    </div>
  );
}

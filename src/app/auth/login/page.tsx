import { APP_NAME } from "@/lib/config";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="anim-fade-up rounded-2xl border border-line bg-card p-6">
      <div className="mb-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-heading">
          {APP_NAME}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Inicia sesión para continuar
        </p>
      </div>
      <LoginForm />
    </div>
  );
}

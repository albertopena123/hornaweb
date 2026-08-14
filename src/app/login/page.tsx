import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/server";
import { LoginForm } from "./LoginForm";
import "./login.css";

export const metadata = {
  title: "Iniciar sesión · Simón Horna | Ahora Nación",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/usuarios");

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="login__brand-logo"
            src="/assets/images/logo/logo-an.webp"
            alt="Ahora Nación"
          />
          <div>
            <div className="login__brand-name">Ahora Nación</div>
            <div className="login__brand-sub">Simón Horna · Consola de campaña</div>
          </div>
        </div>

        <div className="login__head">
          <h1>Bienvenido</h1>
          <p>Inicia sesión con tu cuenta del equipo para continuar.</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="login__foot">
          Acceso exclusivo del equipo de campaña de Simón Horna.
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/admin/Icon";

// Clave de localStorage para "Recordarme": guarda solo el correo. La
// contraseña nunca se persiste — de eso se encarga el gestor del navegador
// (autoComplete="current-password").
const REMEMBER_KEY = "login.email";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/usuarios";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // localStorage bloqueado (modo privado estricto): se ignora.
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // localStorage bloqueado: se ignora.
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  };

  return (
    <form className="login__form" onSubmit={submit} noValidate>
      {error && (
        <div className="login__error" role="alert">
          <Icon name="info" size={16} />
          <span>{error}</span>
        </div>
      )}

      <label className="field">
        <span className="field__label">Correo electrónico</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          autoFocus
        />
      </label>

      <label className="field">
        <span className="field__label">Contraseña</span>
        <span className="field__pass">
          <input
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            className="field__eye"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
            title={showPass ? "Ocultar contraseña" : "Ver contraseña"}
          >
            <Icon name={showPass ? "eye-off" : "eye"} size={18} />
          </button>
        </span>
      </label>

      <label className="login__remember">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span>Recordarme en este dispositivo</span>
      </label>

      <button
        type="submit"
        className="login__submit"
        disabled={loading || !email || !password}
      >
        {loading ? "Verificando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}

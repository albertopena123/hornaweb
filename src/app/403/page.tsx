import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso Restringido (403) · Ahora Nación",
  description: "No tienes permisos asignados para acceder a este módulo.",
};

export default function ForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "rgba(30, 41, 59, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Ícono de Escudo / Candado */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(220, 38, 38, 0.15)",
            border: "2px solid rgba(220, 38, 38, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            color: "#ef4444",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        {/* Denominación */}
        <span
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#dc2626",
            background: "rgba(220, 38, 38, 0.12)",
            padding: "4px 10px",
            borderRadius: "20px",
            marginBottom: "12px",
          }}
        >
          Código 403 · Acceso No Autorizado
        </span>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#ffffff",
            marginBottom: "10px",
            letterSpacing: "-0.5px",
          }}
        >
          Módulo Restringido
        </h1>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "1.5",
            color: "#94a3b8",
            marginBottom: "28px",
          }}
        >
          Tu cuenta de usuario no cuenta con los permisos requeridos para ingresar a esta sección con tu rol actual.
        </p>

        {/* Botones de acción */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <Link
            href="/inicio"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#dc2626",
              color: "#ffffff",
              padding: "11px 18px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "14px",
              textDecoration: "none",
              transition: "background 0.2s ease",
            }}
          >
            Ir al Panel Principal (Inicio)
          </Link>

          <Link
            href="/personeros"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#f1f5f9",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "500",
              fontSize: "13.5px",
              textDecoration: "none",
            }}
          >
            Ir a Módulo de Personeros
          </Link>

          <form action="/api/auth/logout" method="POST" style={{ marginTop: "6px" }}>
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "12.5px",
                cursor: "pointer",
                textDecoration: "underline",
                padding: "6px",
              }}
            >
              Cerrar sesión e ingresar con otra cuenta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

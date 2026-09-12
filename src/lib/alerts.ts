import Swal, { SweetAlertIcon } from "sweetalert2";

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-theme") === "dark" ||
    document.documentElement.classList.contains("dark")
  );
}

/**
 * Muestra un diálogo de confirmación moderno con SweetAlert2.
 * Devuelve true si el usuario confirmó, false si canceló.
 */
export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
  isDanger?: boolean;
}): Promise<boolean> {
  const dark = isDarkMode();

  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? (options.isDanger ? "warning" : "question"),
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? (options.isDanger ? "Sí, desasignar" : "Confirmar"),
    cancelButtonText: options.cancelButtonText ?? "Cancelar",
    confirmButtonColor: options.isDanger ? "#ef4444" : "#2563eb",
    cancelButtonColor: dark ? "#475569" : "#94a3b8",
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: "swal2-modern-popup",
      confirmButton: "swal2-modern-confirm",
      cancelButton: "swal2-modern-cancel",
    },
  });

  return result.isConfirmed;
}

/**
 * Toast flotante de éxito
 */
export function toastSuccess(title: string, timer: number = 2500) {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon: "success",
    title,
  });
}

/**
 * Toast flotante de error
 */
export function toastError(title: string, timer: number = 3500) {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon: "error",
    title,
  });
}

/**
 * Toast flotante de información
 */
export function toastInfo(title: string, timer: number = 2500) {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
  });

  Toast.fire({
    icon: "info",
    title,
  });
}

import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export async function confirmAction(title: string, text: string, confirmText = 'Confirmar') {
  const result = await Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export function notifySuccess(title: string, text?: string) {
  return toast.fire({ icon: 'success', title, text });
}

export function notifyError(title: string, text?: string) {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
  });
}

export function notifyInfo(title: string, text?: string) {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Entendido',
  });
}

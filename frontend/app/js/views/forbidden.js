export async function mount({ target }) {
  target.innerHTML = `<div class="empty-state"><div class="icon">🚫</div><p>No tienes permiso para acceder a esta página.</p><a href="/app/dashboard" class="btn btn-primary">Volver al inicio</a></div>`;
}

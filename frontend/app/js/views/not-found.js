export async function mount({ target }) {
  target.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Esta página no existe.</p><a href="/app/dashboard" class="btn btn-primary" data-router-link>Ir al inicio</a></div>`;
}

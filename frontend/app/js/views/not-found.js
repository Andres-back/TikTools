export async function mount({ target }) {
  target.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:70vh;padding:var(--space-lg)">
      <div class="card" style="width:100%;max-width:420px;padding:var(--space-xl);text-align:center">
        <div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05));display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-lg)">
          <i class="fa-solid fa-map" style="font-size:32px;color:var(--color-warning)"></i>
        </div>
        <h1 style="font-family:var(--font-display);font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.5px">404</h1>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:var(--space-md) 0 var(--space-lg)">
          Esta página no existe o fue movida.
        </p>
        <a href="/app/dashboard" class="btn btn-primary" data-router-link>
          <i class="fa-solid fa-arrow-left"></i> Ir al inicio
        </a>
      </div>
    </div>
  `;
}

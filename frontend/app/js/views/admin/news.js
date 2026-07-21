/**
 * Admin News View — TikToolStream
 * CRUD de novedades con upload de imagen y preview
 */

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let editingId = null;
  let items = [];

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  target.innerHTML = `
    <style>
      .news-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-lg); flex-wrap:wrap; gap:var(--space-md); }
      .news-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); margin-bottom:var(--space-sm); display:grid; grid-template-columns:80px 1fr auto; gap:14px; align-items:center; }
      .news-thumb { width:80px; height:80px; border-radius:10px; background:linear-gradient(135deg, rgba(0,217,255,0.15), rgba(123,47,247,0.1)); display:flex; align-items:center; justify-content:center; font-size:2rem; overflow:hidden; }
      .news-thumb img { width:100%; height:100%; object-fit:cover; }
      .news-meta { font-size:var(--text-xs); color:var(--text-muted); margin-top:6px; }
      .news-actions { display:flex; flex-direction:column; gap:4px; }
      .news-empty { text-align:center; color:var(--text-muted); padding:var(--space-xl); }
      .upload-zone { border:2px dashed var(--border-color); border-radius:12px; padding:var(--space-md); text-align:center; cursor:pointer; transition:all 0.2s; background:rgba(255,255,255,0.02); }
      .upload-zone:hover, .upload-zone.dragover { border-color:#00d9ff; background:rgba(0,217,255,0.05); }
      .upload-zone img { max-width:100%; max-height:160px; border-radius:8px; margin-bottom:8px; }
      .upload-zone .upload-icon { font-size:2rem; margin-bottom:6px; color:var(--text-muted); }
      @media (max-width: 600px) {
        .news-card { grid-template-columns:1fr; gap:8px; }
        .news-thumb { width:100%; height:120px; }
        .news-actions { flex-direction:row; justify-content:flex-end; }
      }
    </style>

    <div class="news-head">
      <div>
        <h1 class="view-title" style="margin-bottom:0">📰 Novedades</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Publica anuncios para todos los usuarios</p>
      </div>
      <button class="btn btn-primary" id="btnNewNews">+ Nueva Novedad</button>
    </div>

    <div id="newsContainer"><div class="loading-state"><div class="spinner-sm"></div></div></div>

    <div class="modal-overlay" id="newsModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="newsModalTitle">Nueva Novedad</h3>
          <button class="modal-close" id="closeNewsModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Título</label>
            <input type="text" id="newsTitle" class="input-field" placeholder="Título de la novedad">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Contenido</label>
            <textarea id="newsContent" class="input-field" rows="4" placeholder="Describe la novedad..."></textarea>
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Imagen (opcional)</label>
            <div class="upload-zone" id="uploadZone">
              <div id="uploadPreview">
                <div class="upload-icon">🖼️</div>
                <div style="font-size:var(--text-sm);color:var(--text-muted)">Click o arrastra una imagen</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">JPG, PNG, GIF, WEBP · máx 5MB</div>
              </div>
              <input type="file" id="newsImage" accept="image/*" style="display:none">
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" id="btnSaveNews" style="flex:1">Publicar</button>
            <button class="btn btn-secondary" id="btnCancelEdit" style="display:none">Cancelar edición</button>
          </div>
          <div id="newsFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
        </div>
      </div>
    </div>
  `;

  async function loadNews() {
    try {
      const news = await api.get('/news', { signal });
      items = Array.isArray(news) ? news : [];
      renderNews();
    } catch (err) {
      console.error('Error loading news:', err);
      document.getElementById('newsContainer').innerHTML = '<div class="error-state"><p>Error al cargar</p></div>';
    }
  }

  function renderNews() {
    const container = document.getElementById('newsContainer');
    if (items.length === 0) {
      container.innerHTML = '<div class="news-empty"><div style="font-size:3rem;opacity:0.4">📰</div><p>Sin novedades publicadas</p></div>';
      return;
    }
    container.innerHTML = items.map(n => {
      const img = n.image_url || n.imageUrl;
      return `<div class="news-card">
        <div class="news-thumb">${img ? `<img src="${escapeAttr(img)}" onerror="this.outerHTML='📰'">` : '📰'}</div>
        <div>
          <div style="font-weight:700;font-size:1.05rem">${escapeHtml(n.title)}</div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px">${escapeHtml(n.content)}</div>
          <div class="news-meta">${n.author_name || 'Admin'} · ${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
        </div>
        <div class="news-actions">
          <button class="btn btn-sm btn-ghost" data-edit="${n.id}" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" data-del="${n.id}" title="Eliminar">🗑️</button>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta novedad?')) return;
        try {
          await api.del(`/news/${btn.dataset.del}`, { signal });
          showToast({ type: 'success', message: 'Novedad eliminada' });
          loadNews();
        } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
      }, { signal });
    });

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = items.find(x => String(x.id) === String(btn.dataset.edit));
        if (!n) return;
        startEdit(n);
      }, { signal });
    });
  }

  /* upload preview */
  let selectedFile = null;
  const uploadZone = document.getElementById('uploadZone');
  const newsImage = document.getElementById('newsImage');
  const uploadPreview = document.getElementById('uploadPreview');

  function showImagePreview(src) {
    if (src) {
      uploadPreview.innerHTML = `<img src="${escapeAttr(src)}" alt=""><div style="font-size:var(--text-xs);color:var(--text-muted)">Click para cambiar</div>`;
    } else {
      uploadPreview.innerHTML = `<div class="upload-icon">🖼️</div><div style="font-size:var(--text-sm);color:var(--text-muted)">Click o arrastra una imagen</div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">JPG, PNG, GIF, WEBP · máx 5MB</div>`;
    }
  }

  uploadZone?.addEventListener('click', () => newsImage.click(), { signal });
  uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); }, { signal });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'), { signal });
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      newsImage.files = e.dataTransfer.files;
      newsImage.dispatchEvent(new Event('change'));
    }
  }, { signal });

  newsImage?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) { selectedFile = null; return; }
    if (f.size > 5 * 1024 * 1024) { showToast({ type: 'error', message: 'Máx 5MB' }); return; }
    selectedFile = f;
    const reader = new FileReader();
    reader.onload = (ev) => showImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  }, { signal });

  /* modal control */
  function openModal() {
    document.getElementById('newsModal').style.display = 'flex';
    document.getElementById('newsFeedback').textContent = '';
  }
  function closeModal() {
    document.getElementById('newsModal').style.display = 'none';
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsContent').value = '';
    selectedFile = null;
    showImagePreview(null);
    editingId = null;
    document.getElementById('newsModalTitle').textContent = 'Nueva Novedad';
    document.getElementById('btnCancelEdit').style.display = 'none';
  }
  function startEdit(n) {
    editingId = n.id;
    document.getElementById('newsTitle').value = n.title || '';
    document.getElementById('newsContent').value = n.content || '';
    showImagePreview(n.image_url || n.imageUrl);
    document.getElementById('newsModalTitle').textContent = 'Editar Novedad';
    document.getElementById('btnCancelEdit').style.display = 'block';
    openModal();
  }

  document.getElementById('btnNewNews')?.addEventListener('click', openModal, { signal });
  document.getElementById('closeNewsModal')?.addEventListener('click', closeModal, { signal });
  document.getElementById('btnCancelEdit')?.addEventListener('click', closeModal, { signal });

  document.getElementById('btnSaveNews')?.addEventListener('click', async () => {
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    if (!title || !content) {
      document.getElementById('newsFeedback').innerHTML = '<span style="color:var(--color-danger)">Título y contenido son requeridos</span>';
      return;
    }
    const feedback = document.getElementById('newsFeedback');
    const btn = document.getElementById('btnSaveNews');
    btn.disabled = true;
    feedback.innerHTML = '<span style="color:var(--text-muted)">Publicando...</span>';

    try {
      let result;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('image', selectedFile);
        result = await api.upload('/news', formData, { signal });
      } else {
        result = await api.post('/news', { title, content }, { signal });
      }
      showToast({ type: 'success', message: editingId ? 'Novedad actualizada' : 'Novedad publicada' });
      closeModal();
      loadNews();
    } catch (err) {
      feedback.innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(err.message || 'Error')}</span>`;
    } finally {
      btn.disabled = false;
    }
  }, { signal });

  await loadNews();
}

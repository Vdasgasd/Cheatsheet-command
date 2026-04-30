
let CATS = ['Semua'];
let activeCat = 'Semua';
let editId = null;
let data = [];

console.log('activeCat:', activeCat);
console.log('sample cat:', data[0]?.cat);
// Fetch data dari Backend API SQLite
async function loadData() {
  try {
    await loadCategories();
    const res = await fetch('/api/commands');
    data = await res.json();
    render();
  } catch(err) {
    showToast('Gagal memuat data dari server');
    console.error(err);
  }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function filtered() {
  const q = document.getElementById('search').value.toLowerCase().trim();

  return data.filter(c => {
    const matchCat =
      activeCat === 'Semua' || !activeCat || c.cat === activeCat;

    const matchQ =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.cmd.toLowerCase().includes(q) ||
      (c.desc||'').toLowerCase().includes(q) ||
      c.cat.toLowerCase().includes(q);

    return matchCat && matchQ;
  });
}


function renderCats() {
  const counts = {};
  CATS.forEach(c => counts[c] = 0);
  data.forEach(c => { counts[c.cat] = (counts[c.cat]||0) + 1; counts['Semua']++; });

  renderCategorySelect();
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const cats = await res.json();
 console.log('categories:', cats);
    CATS = ['Semua', ...cats.sort()];
  } catch (err) {
    console.error(err);
    showToast('Gagal memuat kategori');
  }
}

function setCat(c) { activeCat = c; document.getElementById('cat-select').value = c; render(); }
function setCatFromSelect() {
  activeCat = document.getElementById('cat-select').value || 'Semua';
  render();
}
function copyCmd(id) {
  const c = data.find(x => x.id === id);
  if (!c) return;
  navigator.clipboard.writeText(c.cmd).then(() => {
    const el = document.getElementById('fb-' + id);
    if (el) {
      el.textContent = '✓ Tersalin ke clipboard'; el.className = 'copy-feedback ok';
      setTimeout(() => { el.textContent = 'klik untuk copy'; el.className = 'copy-feedback'; }, 1800);
    }
  });
}

function render() {
  renderCats();
  const list = filtered();
  document.getElementById('count').textContent = `${list.length} command`;
  document.getElementById('grid').innerHTML = list.length === 0
    ? `<div class="empty"><div class="empty-icon">⌕</div><p>Tidak ada command</p></div>`
    : list.map(c => `
<div class="card" id="card-${c.id}">
  <div class="card-header"><span class="card-name">${esc(c.name)}</span>${(() => {
  const color = stringToColor(c.cat);
  return `<span class="tag" style="
    background:${color.bg};
    color:${color.text};
    border:1px solid ${color.border};
  ">${esc(c.cat)}</span>`;
})()}</div>
  <div class="card-cmd" onclick="copyCmd(${c.id})">${esc(c.cmd)}</div>
  <div class="card-desc">${esc(c.desc)}</div>
  <div id="fb-${c.id}" class="copy-feedback">klik untuk copy</div>
  <div class="card-footer">
    <button class="btn-sm" onclick="openEdit(${c.id})">Edit</button>
    <button class="btn-sm del" onclick="del(${c.id})">Hapus</button>
  </div>
</div>`).join('');
}

function renderCategorySelect() {
  const sel = document.getElementById('cat-select');

  sel.innerHTML = CATS.map(c =>
    `<option value="${c}">${c === 'Semua' ? 'Semua kategori' : c}</option>`
  ).join('');
    sel.value = activeCat;
}

function renderFormCategory() {
  const sel = document.getElementById('f-cat');

  sel.innerHTML = CATS
    .filter(c => c !== 'Semua')
    .map(c => `<option value="${c}">${c}</option>`)
    .join('');
}

function stringToColor(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;

  return {
    bg: `hsla(${hue}, 70%, 60%, 0.12)`,
    text: `hsl(${hue}, 70%, 65%)`,
    border: `hsla(${hue}, 70%, 60%, 0.3)`
  };
}


function openAdd() {
  editId = null;
  renderFormCategory();
  document.getElementById('modal-title').textContent = 'Tambah command baru';
  document.getElementById('f-name').value = ''; document.getElementById('f-cmd').value = '';
  document.getElementById('f-desc').value = ''; document.getElementById('f-cat').value = 'Linux';
  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => document.getElementById('f-name').focus(), 50);
}

function openEdit(id) {
  const c = data.find(x => x.id === id);
  if (!c) return;
  editId = id;
  renderFormCategory();
  document.getElementById('modal-title').textContent = 'Edit command';
  document.getElementById('f-name').value = c.name; document.getElementById('f-cmd').value = c.cmd;
  document.getElementById('f-desc').value = c.desc; document.getElementById('f-cat').value = c.cat;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function onOverlayClick(e) { if (e.target === document.getElementById('modal')) closeModal(); }

// POST / PUT ke API
async function saveCard() {
  const payload = {
    name: document.getElementById('f-name').value.trim(),
    cmd: document.getElementById('f-cmd').value.trim(),
    desc: document.getElementById('f-desc').value.trim(),
    cat: document.getElementById('f-cat').value
  };

  if (!payload.name || !payload.cmd) return showToast('Nama dan command wajib diisi');

  const url = editId !== null ? `/api/commands/${editId}` : '/api/commands';
  const method = editId !== null ? 'PUT' : 'POST';

  try {
    await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showToast(editId !== null ? 'Command diperbarui' : 'Command ditambahkan');
    closeModal();
    loadData(); // Reload data dari SQLite
  } catch(err) { showToast('Gagal menyimpan data'); }
}

// DELETE via API
async function del(id) {
  if (!confirm('Hapus command ini?')) return;
  try {
    await fetch(`/api/commands/${id}`, { method: 'DELETE' });
    showToast('Command dihapus');
    loadData(); // Reload data dari SQLite
  } catch(err) { showToast('Gagal menghapus data'); }
}

// Fitur Export (optional: jika masih butuh backup manual ke JSON)
function exportData() {
  const blob = new Blob([JSON.stringify({ data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'cheatsheet-backup.json'; a.click();
}


async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const r = new FileReader();
  r.onload = async (ev) => {
    try {
      let parsed = JSON.parse(ev.target.result);
      // Mendukung format export lama maupun baru
      let imported = Array.isArray(parsed) ? parsed : (parsed.data || []);
      if (!Array.isArray(imported)) throw new Error('Bukan format array');

      let added = 0;
      showToast('Mengimpor data, mohon tunggu...');

      // Looping data dan kirim ke backend satu per satu (POST)
      for (const c of imported) {
        if (c.name && c.cmd) {
          await fetch('/api/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.name,
              cmd: c.cmd,
              desc: c.desc || '',
              cat: c.cat || 'General'
            })
          });
          added++;
        }
      }

      // Setelah semua selesai dikirim, muat ulang tabel dari SQLite
      loadData(); 
      showToast(`${added} command berhasil diimport`);
      
    } catch(err) {
      showToast('Gagal import: format tidak valid atau koneksi error');
      console.error(err);
    }
    
    // Reset input file agar bisa digunakan lagi
    e.target.value = '';
  };
  r.readAsText(file);
}


function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

document.getElementById('search').addEventListener('input', render);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Inisialisasi awal
loadData();

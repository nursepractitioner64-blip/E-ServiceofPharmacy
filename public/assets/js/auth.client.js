let currentUser = null;
let loginHandler = null;
let loginBusy = false;
let branchSelectionBusy = false;
let currentBranch = null;
let pendingBranchResolve = null;

const $ = (id) => document.getElementById(id);

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

export async function checkSession() {
  try {
    const data = await request('/api/auth/me', { cache: 'no-store' });
    currentUser = data.user || null;
    if (currentUser) {
      const branch = await chooseBranch(currentUser, { initial: true });
      if (!branch) return null;
    }
    return currentUser;
  } catch (_) {
    currentUser = null;
    return null;
  }
}

export function setLoginHandler(handler) { loginHandler = handler; }
export function getCurrentUser() { return currentUser; }

export function showLogin() {
  try { localStorage.removeItem('esp:input-history-user'); } catch (_) {}
  const screen = $('auth-screen');
  const layout = document.querySelector('.layout');
  if (layout) layout.style.display = 'none';
  if (screen) screen.hidden = false;
  const form = $('auth-login-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginBusy) return;
    loginBusy = true;
    const submit = $('auth-login-submit');
    const error = $('auth-login-error');
    if (error) { error.hidden = true; error.textContent = ''; }
    if (submit) { submit.disabled = true; submit.innerHTML = '<span class="auth-spinner"></span> กำลังเข้าสู่ระบบ...'; }
    try {
      const username = String($('auth-username')?.value || '').trim();
      const password = String($('auth-password')?.value || '');
      const result = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password })
      });
      currentUser = result.user;
      form.reset();
      const branch = await chooseBranch(currentUser, { initial: true });
      if (!branch) return;
      if (typeof loginHandler === 'function') await loginHandler(currentUser);
    } catch (err) {
      if (error) { error.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ'; error.hidden = false; }
      $('auth-password')?.focus();
    } finally {
      loginBusy = false;
      if (submit) { submit.disabled = false; submit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ'; }
    }
  });
}

export function showApp(user) {
  currentUser = user || currentUser;
  try { localStorage.setItem('esp:input-history-user', String(currentUser?.userId || currentUser?.username || 'user')); } catch (_) {}
  const screen = $('auth-screen');
  const layout = document.querySelector('.layout');
  if (screen) screen.hidden = true;
  if (layout) layout.style.display = '';
  const adminMenu = $('auth-admin-menu');
  if (adminMenu) adminMenu.hidden = currentUser?.role !== 'ADMIN';
  const branchMenu = $('auth-admin-branch-menu');
  if (branchMenu) branchMenu.hidden = currentUser?.role !== 'ADMIN';
  const panel = $('auth-user-panel');
  if (panel && currentUser) {
    const name = $('auth-current-name');
    const role = $('auth-current-role');
    if (name) name.textContent = currentUser.fullName || currentUser.username;
    if (role) role.textContent = currentUser.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่';
    panel.hidden = false;
  }
  renderCurrentBranch();
  // Notify account-link UI whenever a valid session is shown (initial load or login).
  window.dispatchEvent(new Event('esp:authenticated'));
}

function branchStorageKey(user) { return `esp:last-branch:${user?.userId || user?.username || 'user'}`; }
function renderCurrentBranch() {
  const node = $('auth-current-branch');
  if (!node) return;
  node.hidden = !currentBranch;
  node.textContent = currentBranch ? `สาขาปฏิบัติงาน: ${currentBranch.name}` : '';
}

export async function chooseBranch(user = currentUser, { initial = false } = {}) {
  if (branchSelectionBusy) return currentBranch;
  branchSelectionBusy = true;
  try {
    const data = await request('/api/branches/selection', { cache: 'no-store' });
    const branches = data.data || [];
    const saved = localStorage.getItem(branchStorageKey(user)) || '';
    const rememberedId = data.currentBranchId || saved;
    let chosen = branches.find(b => b.branchId === rememberedId) || null;
    // Staff assigned to exactly one active branch never needs to choose manually.
    if (user?.role !== 'ADMIN' && branches.length === 1) chosen = branches[0];
    if (chosen && initial) {
      const selected = await request('/api/branches/selection', { method: 'POST', body: JSON.stringify({ branchId: chosen.branchId }) });
      currentBranch = { branchId: selected.currentBranchId, name: selected.currentBranchName };
      localStorage.setItem(branchStorageKey(user), currentBranch.branchId);
      renderCurrentBranch();
      return currentBranch;
    }
    if (user?.role === 'ADMIN' && rememberedId === 'ALL') {
      const selected = await request('/api/branches/selection', { method: 'POST', body: JSON.stringify({ branchId: 'ALL' }) });
      currentBranch = { branchId: 'ALL', name: selected.currentBranchName };
      renderCurrentBranch();
      return currentBranch;
    }
    return await new Promise(resolve => {
      pendingBranchResolve = resolve;
      const screen = $('branch-select-screen');
      const options = $('branch-select-options');
      const confirm = $('branch-select-confirm');
      const cancel = $('branch-select-cancel');
      const error = $('branch-select-error');
      let selectedId = chosen?.branchId || '';
      if (user?.role === 'ADMIN' && rememberedId === 'ALL') selectedId = 'ALL';
      if (error) { error.hidden = true; error.textContent = ''; }
      if (options) {
        options.innerHTML = branches.map(b => `<button type="button" class="branch-option ${b.branchId === selectedId ? 'selected' : ''}" data-branch-id="${escapeHtml(b.branchId)}"><span class="branch-option-icon"><i class="fa-solid fa-hospital"></i></span><span class="branch-option-name">${escapeHtml(b.name)}</span><i class="fa-solid fa-circle-check branch-option-check"></i></button>`).join('');
        if (user?.role === 'ADMIN') options.insertAdjacentHTML('beforeend', `<button type="button" class="branch-option ${selectedId === 'ALL' ? 'selected' : ''}" data-branch-id="ALL"><span class="branch-option-icon"><i class="fa-solid fa-layer-group"></i></span><span class="branch-option-name">ภาพรวมทุกสาขา <small class="d-block text-muted">ดูข้อมูลได้ แต่ต้องเลือกสาขาจริงก่อนบันทึก</small></span><i class="fa-solid fa-circle-check branch-option-check"></i></button>`);
      }
      if (confirm) confirm.disabled = !selectedId;
      if (cancel) cancel.hidden = !!initial;
      if (screen) screen.hidden = false;
      const cleanup = () => { options?.removeEventListener('click', onOption); confirm?.removeEventListener('click', onConfirm); cancel?.removeEventListener('click', onCancel); if (screen) screen.hidden = true; pendingBranchResolve = null; };
      const onOption = e => { const button = e.target.closest('[data-branch-id]'); if (!button) return; selectedId = button.dataset.branchId; options.querySelectorAll('.branch-option').forEach(el => el.classList.toggle('selected', el === button)); if (confirm) confirm.disabled = false; };
      const onConfirm = async () => { if (!selectedId || !confirm) return; confirm.disabled = true; try { const result = await request('/api/branches/selection', { method: 'POST', body: JSON.stringify({ branchId: selectedId }) }); currentBranch = { branchId: result.currentBranchId, name: result.currentBranchName }; if (selectedId !== 'ALL') localStorage.setItem(branchStorageKey(user), selectedId); else localStorage.setItem(branchStorageKey(user), 'ALL'); renderCurrentBranch(); cleanup(); resolve(currentBranch); } catch (err) { if (error) { error.textContent = err.message; error.hidden = false; } confirm.disabled = false; } };
      const onCancel = () => { cleanup(); resolve(null); };
      options?.addEventListener('click', onOption); confirm?.addEventListener('click', onConfirm); cancel?.addEventListener('click', onCancel);
    });
  } catch (err) {
    console.error('BRANCH SELECTION ERROR:', err);
    const error = $('auth-login-error');
    if (error && initial) { error.textContent = `เข้าสู่ระบบได้ แต่โหลดสาขาไม่สำเร็จ: ${err.message}`; error.hidden = false; }
    return null;
  } finally { branchSelectionBusy = false; }
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

export async function logout() {
  try { await request('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }); }
  catch (err) { console.warn('Logout request failed:', err.message); }
  currentUser = null;
  try { localStorage.removeItem('esp:input-history-user'); } catch (_) {}
  window.location.hash = '';
  window.location.reload();
}

export function initUserPanel() {
  const switchButton = $('auth-switch-branch-button');
  if (switchButton && switchButton.dataset.bound !== '1') {
    switchButton.dataset.bound = '1';
    switchButton.addEventListener('click', async () => { const previous = currentBranch?.branchId || ''; const selected = await chooseBranch(currentUser, { initial: false }); if (selected && selected.branchId !== previous) { window.location.hash = '#dashboard'; window.location.reload(); } });
  }
  const button = $('auth-logout-button');
  if (button && button.dataset.bound !== '1') {
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      if (window.confirm('ต้องการออกจากระบบหรือไม่?')) await logout();
    });
  }
}

// ============================================================
// LOUIS PETER BANGURA — ADMIN DASHBOARD
// js/admin.js — auth-guarded CRUD for every dashboard section,
// wired against the real backend (see js/config.js for API_BASE_URL)
// ============================================================

let token = sessionStorage.getItem('LouisAdminToken');

function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${token}`, ...extra };
}

function logout() {
    sessionStorage.removeItem('LouisAdminToken');
    sessionStorage.removeItem('LouisAdminUsername');
    window.location.replace('admin-login.html');
}

// If the backend ever says the token is invalid/expired, boot back to login.
async function handleAuthFailure(response) {
    if (response.status === 401) {
        logout();
        return true;
    }
    return false;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => { toast.className = 'toast'; }, 3500);
}

/* ============================================================
   Image compression before upload
   Phone-camera photos are routinely 4000px+ / 5-15MB. Sending
   that straight to the backend is slow, sometimes times out on a
   weak connection, and used to be the main cause of "image won't
   upload". This downsizes anything larger than ~1600px on its
   longest side and re-encodes as JPEG, which keeps quality
   plenty high for a portfolio thumbnail while cutting most files
   down to a few hundred KB. Already-small files are left as-is.
   ============================================================ */
async function compressImageForUpload(file, { maxDimension = 1600, quality = 0.85 } = {}) {
    // Skip compression for anything already small or for formats that
    // don't benefit from canvas re-encoding (e.g. animated GIFs would
    // lose their animation).
    if (file.size <= 350 * 1024 || file.type === 'image/gif') return file;

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob || blob.size >= file.size) return file; // compression didn't help, keep original

        const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        return new File([blob], newName, { type: 'image/jpeg' });
    } catch (err) {
        // If the browser can't decode/compress it (unsupported format, etc.),
        // fall back to uploading the original file untouched.
        return file;
    }
}

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/* ============================================================
   Nav switching (sidebar + topbar profile dropdown share the
   same .nav-item[data-view] convention)
   ============================================================ */
const viewTitles = {
    'dashboard-view': 'Dashboard Overview',
    'projects-view': 'Manage Projects',
    'messages-view': 'Messages',
    'skills-view': 'Skills',
    'services-view': 'Services',
    'about-view': 'About Me',
    'cv-view': 'CV / Resume',
    'profile-view': 'Profile',
    'settings-view': 'Account Settings'
};

function switchView(viewId) {
    document.querySelectorAll('.sidebar .nav-item').forEach(l => l.classList.remove('active'));
    const sidebarLink = document.querySelector(`.sidebar .nav-item[data-view="${viewId}"]`);
    if (sidebarLink) sidebarLink.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.getElementById('topbar-title').textContent = viewTitles[viewId] || 'Dashboard';
    document.getElementById('profile-dropdown').classList.remove('open');
    document.querySelector('.main-content').scrollTop = 0;
}

document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('dropdown-logout').addEventListener('click', logout);

/* ---------------- Profile dropdown ---------------- */
const profileChip = document.getElementById('profile-chip');
const profileDropdown = document.getElementById('profile-dropdown');
profileChip.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('open');
});
document.addEventListener('click', () => profileDropdown.classList.remove('open'));
profileDropdown.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchView(btn.dataset.view);
    });
});

/* ============================================================
   PROJECTS
   ============================================================ */
let allProjects = [];

async function loadProjects() {
    try {
        const res = await fetch(`${API_BASE_URL}/projects`);
        if (!res.ok) throw new Error('Failed to load projects');
        allProjects = await res.json();
        renderProjects();
    } catch (err) {
        document.getElementById('projects-tbody').innerHTML = '';
        document.getElementById('projects-table-wrap').style.display = 'none';
        document.getElementById('projects-empty').style.display = 'block';
        document.getElementById('projects-empty').innerHTML =
            `<i class="fa-solid fa-triangle-exclamation"></i><p>Could not reach the backend at ${API_BASE_URL}. Make sure the server is running.</p>`;
    }
}

function renderProjects() {
    const tbody = document.getElementById('projects-tbody');
    const empty = document.getElementById('projects-empty');
    const wrap = document.getElementById('projects-table-wrap');

    if (!allProjects.length) {
        wrap.style.display = 'none';
        empty.style.display = 'block';
        empty.innerHTML = `<i class="fa-solid fa-folder-open"></i><p>No projects yet. Click "Add Project" to create your first one.</p>`;
        return;
    }

    wrap.style.display = 'block';
    empty.style.display = 'none';

    tbody.innerHTML = allProjects.map(p => `
        <tr>
            <td>
                <div class="proj-title-cell">
                    <img class="proj-thumb" src="${p.image || ''}" alt="${escapeHtml(p.title)}" onerror="this.style.visibility='hidden'">
                    <div>
                        <strong>${escapeHtml(p.title)}</strong>
                        <div style="font-size:0.8rem; color:var(--text-muted); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.description)}</div>
                        <div style="font-size:0.75rem; color:var(--accent); margin-top:2px;">${escapeHtml(p.category || 'Web Development')}${p.subcategory ? ' · ' + escapeHtml(p.subcategory) : ''}</div>
                    </div>
                </div>
            </td>
            <td>${(p.technologies || []).map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('') || '<span style="color:var(--text-muted);">—</span>'}</td>
            <td style="white-space:nowrap;">
                ${p.github ? `<a href="${p.github}" target="_blank" style="color:var(--accent); margin-right:10px;" title="GitHub"><i class="fa-brands fa-github"></i></a>` : ''}
                ${p.demo ? `<a href="${p.demo}" target="_blank" style="color:var(--accent);" title="Live demo"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
                ${!p.github && !p.demo ? '<span style="color:var(--text-muted);">—</span>' : ''}
            </td>
            <td>${p.featured ? '<span class="badge">Featured</span>' : '<span class="badge muted">No</span>'}</td>
            <td>
                <button class="action-btn" title="Edit" onclick="openEditModal('${p._id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" title="Delete" onclick="deleteProject('${p._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/* ---------------- Project modal handling ---------------- */
const modal = document.getElementById('project-modal');
const form = document.getElementById('project-form');
const formError = document.getElementById('form-error');
const imageInput = document.getElementById('project-image');
const imagePreview = document.getElementById('image-preview');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageUrlField = document.getElementById('project-image-url');
const saveBtn = document.getElementById('save-project-btn');

function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add Project';
    form.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-category').value = 'Web Development';
    imageUrlField.value = '';
    imagePreview.style.display = 'none';
    imagePlaceholder.style.display = 'block';
    imagePlaceholder.innerHTML = '<i class="fa-solid fa-image"></i> Click to upload an image';
    formError.style.display = 'none';
    modal.classList.add('active');
}

function openEditModal(id) {
    const p = allProjects.find(pr => pr._id === id);
    if (!p) return;

    document.getElementById('modal-title').textContent = 'Edit Project';
    document.getElementById('project-id').value = p._id;
    document.getElementById('project-title-input').value = p.title;
    document.getElementById('project-description').value = p.description;
    document.getElementById('project-github').value = p.github || '';
    document.getElementById('project-demo').value = p.demo || '';
    document.getElementById('project-technologies').value = (p.technologies || []).join(', ');
    document.getElementById('project-category').value = p.category || 'Web Development';
    document.getElementById('project-subcategory').value = p.subcategory || '';
    document.getElementById('project-featured').checked = !!p.featured;
    imageUrlField.value = p.image || '';

    if (p.image) {
        imagePreview.src = p.image;
        imagePreview.style.display = 'block';
        imagePlaceholder.style.display = 'none';
    } else {
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'block';
    }

    formError.style.display = 'none';
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

document.getElementById('open-add-modal').addEventListener('click', openAddModal);
document.getElementById('cancel-modal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/* ---------------- Image upload (Cloudinary via backend) ---------------- */
imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    if (!file) return;

    const localPreviewUrl = URL.createObjectURL(file);
    imagePreview.src = localPreviewUrl;
    imagePreview.style.display = 'block';
    imagePlaceholder.style.display = 'none';
    imagePlaceholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

    try {
        const uploadFile = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append('image', uploadFile);

        const res = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });

        if (await handleAuthFailure(res)) return;

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        imageUrlField.value = data.url;
        showToast('Image uploaded');
    } catch (err) {
        showToast(`Image upload failed: ${err.message}`, true);
        imagePlaceholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${err.message}`;
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'block';
        imageUrlField.value = '';
    }
});

/* ---------------- Save (create/update) ---------------- */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.style.display = 'none';

    const id = document.getElementById('project-id').value;
    const imageUrl = imageUrlField.value;

    if (!imageUrl) {
        formError.textContent = 'Please upload a cover image.';
        formError.style.display = 'block';
        return;
    }

    const payload = {
        title: document.getElementById('project-title-input').value.trim(),
        description: document.getElementById('project-description').value.trim(),
        image: imageUrl,
        github: document.getElementById('project-github').value.trim(),
        demo: document.getElementById('project-demo').value.trim(),
        category: document.getElementById('project-category').value,
        subcategory: document.getElementById('project-subcategory').value.trim(),
        technologies: document.getElementById('project-technologies').value
            .split(',').map(t => t.trim()).filter(Boolean),
        featured: document.getElementById('project-featured').checked
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const url = id ? `${API_BASE_URL}/projects/${id}` : `${API_BASE_URL}/projects`;
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });

        if (await handleAuthFailure(res)) return;

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');

        showToast(id ? 'Project updated' : 'Project created');
        closeModal();
        await loadProjects();
        renderDashboard();
    } catch (err) {
        formError.textContent = err.message;
        formError.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Project';
    }
});

/* ---------------- Delete ---------------- */
async function deleteProject(id) {
    const project = allProjects.find(p => p._id === id);
    if (!confirm(`Delete "${project ? project.title : 'this project'}"? This can't be undone.`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to delete project');

        showToast('Project deleted');
        await loadProjects();
        renderDashboard();
    } catch (err) {
        showToast(err.message, true);
    }
}

/* ============================================================
   MESSAGES
   ============================================================ */
let allMessages = [];
let unreadOnly = false;

async function loadMessages() {
    try {
        const res = await fetch(`${API_BASE_URL}/messages`, { headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to load messages');
        allMessages = await res.json();
        renderMessages();
        updateMessagesBadge();
    } catch (err) {
        document.getElementById('messages-tbody').innerHTML = '';
        document.getElementById('messages-empty').style.display = 'block';
        document.getElementById('messages-empty').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p>Could not load messages.</p>`;
    }
}

function updateMessagesBadge() {
    const unread = allMessages.filter(m => !m.read).length;
    const badge = document.getElementById('messages-nav-badge');
    if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function renderMessages() {
    const tbody = document.getElementById('messages-tbody');
    const empty = document.getElementById('messages-empty');
    const wrap = document.getElementById('messages-table-wrap');

    const list = unreadOnly ? allMessages.filter(m => !m.read) : allMessages;

    if (!list.length) {
        wrap.style.display = 'none';
        empty.style.display = 'block';
        empty.innerHTML = `<i class="fa-solid fa-envelope-open-text"></i><p>${unreadOnly ? 'No unread messages.' : 'No messages yet.'}</p>`;
        return;
    }

    wrap.style.display = 'block';
    empty.style.display = 'none';

    tbody.innerHTML = list.map(m => `
        <tr class="${m.read ? '' : 'unread'}">
            <td>
                <strong>${escapeHtml(m.name)}</strong>
                <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(m.email)}</div>
            </td>
            <td style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(m.message)}</td>
            <td style="white-space:nowrap; color:var(--text-muted); font-size:0.82rem;">${timeAgo(m.createdAt)}</td>
            <td>${m.read ? '<span class="badge muted">Read</span>' : '<span class="badge new">New</span>'}</td>
            <td>
                <button class="action-btn" title="Open" onclick="openMessageModal('${m._id}')"><i class="fa-solid fa-eye"></i></button>
                <button class="action-btn delete" title="Delete" onclick="deleteMessage('${m._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('toggle-unread-filter').addEventListener('click', (e) => {
    unreadOnly = !unreadOnly;
    e.currentTarget.classList.toggle('on', unreadOnly);
    renderMessages();
});

const messageModal = document.getElementById('message-modal');
let openMessageId = null;

async function openMessageModal(id) {
    const m = allMessages.find(msg => msg._id === id);
    if (!m) return;
    openMessageId = id;

    document.getElementById('msg-modal-from').textContent = `${m.name} <${m.email}>`;
    document.getElementById('msg-modal-date').textContent = formatDate(m.createdAt);
    document.getElementById('msg-modal-body').textContent = m.message;
    messageModal.classList.add('active');

    if (!m.read) {
        try {
            const res = await fetch(`${API_BASE_URL}/messages/${id}/read`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ read: true })
            });
            if (await handleAuthFailure(res)) return;
            m.read = true;
            renderMessages();
            updateMessagesBadge();
            renderDashboard();
        } catch (err) { /* non-critical */ }
    }
}

document.getElementById('close-message-modal').addEventListener('click', () => messageModal.classList.remove('active'));
messageModal.addEventListener('click', (e) => { if (e.target === messageModal) messageModal.classList.remove('active'); });

document.getElementById('msg-modal-delete').addEventListener('click', async () => {
    if (!openMessageId) return;
    await deleteMessage(openMessageId, true);
    messageModal.classList.remove('active');
});

async function deleteMessage(id, skipConfirm = false) {
    if (!skipConfirm && !confirm('Delete this message? This can\'t be undone.')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/messages/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to delete message');
        showToast('Message deleted');
        await loadMessages();
        renderDashboard();
    } catch (err) {
        showToast(err.message, true);
    }
}

/* ============================================================
   SKILLS
   ============================================================ */
let allSkills = [];

async function loadSkills() {
    try {
        const res = await fetch(`${API_BASE_URL}/skills`);
        if (!res.ok) throw new Error('Failed to load skills');
        allSkills = await res.json();
        renderSkills();
    } catch (err) {
        document.getElementById('skills-cards').innerHTML = '';
        document.getElementById('skills-empty').style.display = 'block';
        document.getElementById('skills-empty').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p>Could not load skills.</p>`;
    }
}

function renderSkills() {
    const grid = document.getElementById('skills-cards');
    const empty = document.getElementById('skills-empty');

    if (!allSkills.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.innerHTML = `<i class="fa-solid fa-layer-group"></i><p>No skills yet. Click "Add Skill" to create your first one.</p>`;
        return;
    }
    empty.style.display = 'none';

    grid.innerHTML = allSkills.map(s => `
        <div class="mini-card">
            <div class="mini-card-top">
                <div class="mini-card-icon" style="background:${escapeHtml(s.color || '#00e5ff')};">
                    ${s.icon ? `<i class="${escapeHtml(s.icon)}"></i>` : escapeHtml(s.name.slice(0, 2))}
                </div>
                <div class="mini-card-title">${escapeHtml(s.name)}</div>
                <div class="mini-card-actions">
                    <button class="action-btn" title="Edit" onclick="openSkillModal('${s._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" title="Delete" onclick="deleteSkill('${s._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${s.percent}%; background:${escapeHtml(s.color || '#00e5ff')};"></div></div>
            <p style="margin-top:6px;">${s.percent}% proficiency</p>
        </div>
    `).join('');
}

const skillModal = document.getElementById('skill-modal');
const skillForm = document.getElementById('skill-form');
const skillFormError = document.getElementById('skill-form-error');
const skillPercentInput = document.getElementById('skill-percent');
const skillPercentVal = document.getElementById('skill-percent-val');

skillPercentInput.addEventListener('input', () => { skillPercentVal.textContent = `${skillPercentInput.value}%`; });

function openAddSkillModal() {
    document.getElementById('skill-modal-title').textContent = 'Add Skill';
    skillForm.reset();
    document.getElementById('skill-id').value = '';
    document.getElementById('skill-color').value = '#00e5ff';
    skillPercentInput.value = 80;
    skillPercentVal.textContent = '80%';
    skillFormError.style.display = 'none';
    skillModal.classList.add('active');
}

function openSkillModal(id) {
    const s = allSkills.find(sk => sk._id === id);
    if (!s) return;
    document.getElementById('skill-modal-title').textContent = 'Edit Skill';
    document.getElementById('skill-id').value = s._id;
    document.getElementById('skill-name').value = s.name;
    document.getElementById('skill-icon').value = s.icon || '';
    document.getElementById('skill-color').value = s.color || '#00e5ff';
    skillPercentInput.value = s.percent;
    skillPercentVal.textContent = `${s.percent}%`;
    skillFormError.style.display = 'none';
    skillModal.classList.add('active');
}

document.getElementById('open-add-skill').addEventListener('click', openAddSkillModal);
document.getElementById('cancel-skill-modal').addEventListener('click', () => skillModal.classList.remove('active'));
skillModal.addEventListener('click', (e) => { if (e.target === skillModal) skillModal.classList.remove('active'); });

skillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    skillFormError.style.display = 'none';
    const id = document.getElementById('skill-id').value;
    const payload = {
        name: document.getElementById('skill-name').value.trim(),
        icon: document.getElementById('skill-icon').value.trim(),
        color: document.getElementById('skill-color').value,
        percent: Number(skillPercentInput.value)
    };
    const saveSkillBtn = document.getElementById('save-skill-btn');
    saveSkillBtn.disabled = true;
    saveSkillBtn.textContent = 'Saving...';
    try {
        const url = id ? `${API_BASE_URL}/skills/${id}` : `${API_BASE_URL}/skills`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) });
        if (await handleAuthFailure(res)) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');
        showToast(id ? 'Skill updated' : 'Skill created');
        skillModal.classList.remove('active');
        await loadSkills();
        renderDashboard();
    } catch (err) {
        skillFormError.textContent = err.message;
        skillFormError.style.display = 'block';
    } finally {
        saveSkillBtn.disabled = false;
        saveSkillBtn.textContent = 'Save Skill';
    }
});

async function deleteSkill(id) {
    const s = allSkills.find(sk => sk._id === id);
    if (!confirm(`Delete "${s ? s.name : 'this skill'}"? This can't be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/skills/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to delete skill');
        showToast('Skill deleted');
        await loadSkills();
        renderDashboard();
    } catch (err) {
        showToast(err.message, true);
    }
}

/* ============================================================
   SERVICES
   ============================================================ */
let allServices = [];

async function loadServices() {
    try {
        const res = await fetch(`${API_BASE_URL}/services`);
        if (!res.ok) throw new Error('Failed to load services');
        allServices = await res.json();
        renderServices();
    } catch (err) {
        document.getElementById('services-cards').innerHTML = '';
        document.getElementById('services-empty').style.display = 'block';
        document.getElementById('services-empty').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p>Could not load services.</p>`;
    }
}

function renderServices() {
    const grid = document.getElementById('services-cards');
    const empty = document.getElementById('services-empty');

    if (!allServices.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.innerHTML = `<i class="fa-solid fa-briefcase"></i><p>No services yet. Click "Add Service" to create your first one.</p>`;
        return;
    }
    empty.style.display = 'none';

    grid.innerHTML = allServices.map(s => `
        <div class="mini-card">
            <div class="mini-card-top">
                <div class="mini-card-icon" style="background:var(--accent-dim); color:var(--accent);"><i class="${escapeHtml(s.icon || 'fa-solid fa-briefcase')}"></i></div>
                <div class="mini-card-title">${escapeHtml(s.title)}</div>
                <div class="mini-card-actions">
                    <button class="action-btn" title="Edit" onclick="openServiceModal('${s._id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" title="Delete" onclick="deleteService('${s._id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p>${escapeHtml(s.description)}</p>
        </div>
    `).join('');
}

const serviceModal = document.getElementById('service-modal');
const serviceForm = document.getElementById('service-form');
const serviceFormError = document.getElementById('service-form-error');

function openAddServiceModal() {
    document.getElementById('service-modal-title').textContent = 'Add Service';
    serviceForm.reset();
    document.getElementById('service-id').value = '';
    serviceFormError.style.display = 'none';
    serviceModal.classList.add('active');
}

function openServiceModal(id) {
    const s = allServices.find(sv => sv._id === id);
    if (!s) return;
    document.getElementById('service-modal-title').textContent = 'Edit Service';
    document.getElementById('service-id').value = s._id;
    document.getElementById('service-title').value = s.title;
    document.getElementById('service-icon').value = s.icon || '';
    document.getElementById('service-description').value = s.description;
    serviceFormError.style.display = 'none';
    serviceModal.classList.add('active');
}

document.getElementById('open-add-service').addEventListener('click', openAddServiceModal);
document.getElementById('cancel-service-modal').addEventListener('click', () => serviceModal.classList.remove('active'));
serviceModal.addEventListener('click', (e) => { if (e.target === serviceModal) serviceModal.classList.remove('active'); });

serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    serviceFormError.style.display = 'none';
    const id = document.getElementById('service-id').value;
    const payload = {
        title: document.getElementById('service-title').value.trim(),
        icon: document.getElementById('service-icon').value.trim() || 'fa-solid fa-briefcase',
        description: document.getElementById('service-description').value.trim()
    };
    const saveServiceBtn = document.getElementById('save-service-btn');
    saveServiceBtn.disabled = true;
    saveServiceBtn.textContent = 'Saving...';
    try {
        const url = id ? `${API_BASE_URL}/services/${id}` : `${API_BASE_URL}/services`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(payload) });
        if (await handleAuthFailure(res)) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');
        showToast(id ? 'Service updated' : 'Service created');
        serviceModal.classList.remove('active');
        await loadServices();
    } catch (err) {
        serviceFormError.textContent = err.message;
        serviceFormError.style.display = 'block';
    } finally {
        saveServiceBtn.disabled = false;
        saveServiceBtn.textContent = 'Save Service';
    }
});

async function deleteService(id) {
    const s = allServices.find(sv => sv._id === id);
    if (!confirm(`Delete "${s ? s.title : 'this service'}"? This can't be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/services/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to delete service');
        showToast('Service deleted');
        await loadServices();
    } catch (err) {
        showToast(err.message, true);
    }
}

/* ============================================================
   ABOUT ME (site content)
   ============================================================ */
let siteContent = null;

async function loadSiteContent() {
    try {
        const res = await fetch(`${API_BASE_URL}/site-content`);
        if (!res.ok) throw new Error('Failed to load site content');
        siteContent = await res.json();
        renderAboutForm();
        renderCvView();
    } catch (err) {
        document.getElementById('about-error').textContent = 'Could not load About Me content.';
        document.getElementById('about-error').style.display = 'block';
    }
}

function renderAboutForm() {
    if (!siteContent) return;
    document.getElementById('about-tagline').value = siteContent.tagline || '';
    document.getElementById('about-bio').value = siteContent.bio || '';
    document.getElementById('about-location').value = siteContent.location || '';
    document.getElementById('about-happy-clients').value = siteContent.stats?.happyClients ?? 0;
    document.getElementById('about-certificates').value = siteContent.stats?.certificates ?? 0;
    document.getElementById('about-years-learning').value = siteContent.stats?.yearsLearning ?? 0;
    document.getElementById('about-social-github').value = siteContent.social?.github || '';
    document.getElementById('about-social-linkedin').value = siteContent.social?.linkedin || '';
    document.getElementById('about-social-twitter').value = siteContent.social?.twitter || '';
    document.getElementById('about-social-instagram').value = siteContent.social?.instagram || '';

    const rows = document.getElementById('timeline-rows');
    const timeline = siteContent.timeline && siteContent.timeline.length ? siteContent.timeline : [];
    rows.innerHTML = timeline.map((t, i) => timelineRowHtml(t, i)).join('');
}

function timelineRowHtml(t = {}, i) {
    return `
        <div class="timeline-row" data-idx="${i}">
            <button type="button" class="remove-row" onclick="this.closest('.timeline-row').remove()"><i class="fa-solid fa-xmark"></i></button>
            <div class="form-row">
                <div class="form-group">
                    <label>Period</label>
                    <input type="text" class="tl-period" value="${escapeHtml(t.period || '')}" placeholder="2021 - Present">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" class="tl-title" value="${escapeHtml(t.title || '')}" placeholder="Freelance Web Developer">
                </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Description</label>
                <textarea class="tl-description" rows="2" placeholder="What you did during this period">${escapeHtml(t.description || '')}</textarea>
            </div>
        </div>
    `;
}

document.getElementById('add-timeline-row').addEventListener('click', () => {
    const rows = document.getElementById('timeline-rows');
    rows.insertAdjacentHTML('beforeend', timelineRowHtml({}, rows.children.length));
});

document.getElementById('about-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('about-error');
    errEl.style.display = 'none';

    const timeline = Array.from(document.querySelectorAll('#timeline-rows .timeline-row')).map(row => ({
        period: row.querySelector('.tl-period').value.trim(),
        title: row.querySelector('.tl-title').value.trim(),
        description: row.querySelector('.tl-description').value.trim()
    })).filter(t => t.period || t.title || t.description);

    const payload = {
        tagline: document.getElementById('about-tagline').value.trim(),
        bio: document.getElementById('about-bio').value.trim(),
        location: document.getElementById('about-location').value.trim(),
        stats: {
            happyClients: Number(document.getElementById('about-happy-clients').value) || 0,
            certificates: Number(document.getElementById('about-certificates').value) || 0,
            yearsLearning: Number(document.getElementById('about-years-learning').value) || 0
        },
        social: {
            github: document.getElementById('about-social-github').value.trim(),
            linkedin: document.getElementById('about-social-linkedin').value.trim(),
            twitter: document.getElementById('about-social-twitter').value.trim(),
            instagram: document.getElementById('about-social-instagram').value.trim()
        },
        timeline
    };

    const btn = document.getElementById('save-about-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_BASE_URL}/site-content`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (await handleAuthFailure(res)) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');
        siteContent = data;
        showToast('About Me updated');
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});

/* ============================================================
   CV / RESUME
   ============================================================ */
function renderCvView() {
    const label = document.getElementById('cv-current-label');
    const sub = document.getElementById('cv-current-sub');
    const link = document.getElementById('cv-current-link');

    if (siteContent && siteContent.resumeUrl) {
        label.textContent = 'CV uploaded';
        sub.textContent = 'This is the file visitors download from your homepage.';
        link.href = siteContent.resumeUrl;
        link.style.display = 'inline-flex';
    } else {
        label.textContent = 'No CV uploaded yet';
        sub.textContent = 'Upload a PDF to enable the "Download CV" button on your site.';
        link.style.display = 'none';
    }
}

document.getElementById('cv-file-input').addEventListener('change', async () => {
    const file = document.getElementById('cv-file-input').files[0];
    if (!file) return;

    const uploadLabel = document.getElementById('cv-upload-label');
    uploadLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

    const formData = new FormData();
    formData.append('document', file);

    try {
        const res = await fetch(`${API_BASE_URL}/upload/document`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });
        if (await handleAuthFailure(res)) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        const putRes = await fetch(`${API_BASE_URL}/site-content`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ resumeUrl: data.url })
        });
        if (await handleAuthFailure(putRes)) return;
        siteContent = await putRes.json();
        renderCvView();
        showToast('CV uploaded successfully');
    } catch (err) {
        showToast(`CV upload failed: ${err.message}`, true);
    } finally {
        uploadLabel.textContent = 'Click to upload PDF';
    }
});

/* ============================================================
   PROFILE
   ============================================================ */
let adminProfile = null;

async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to load profile');
        adminProfile = await res.json();
        applyProfileToUI();
    } catch (err) { /* non-critical, keep defaults */ }
}

function applyProfileToUI() {
    if (!adminProfile) return;
    const name = adminProfile.displayName || adminProfile.username || 'Admin';
    const title = adminProfile.title || 'System Admin';
    const avatar = adminProfile.avatar || 'images/profile.png';

    document.getElementById('topbar-name').textContent = name;
    document.getElementById('topbar-role').textContent = title;
    document.getElementById('topbar-avatar').src = avatar;

    document.getElementById('profile-display-name').value = adminProfile.displayName || '';
    document.getElementById('profile-title').value = adminProfile.title || '';
    document.getElementById('profile-avatar-preview').src = avatar;
}

document.getElementById('profile-avatar-input').addEventListener('change', async () => {
    const file = document.getElementById('profile-avatar-input').files[0];
    if (!file) return;

    const preview = document.getElementById('profile-avatar-preview');
    preview.src = URL.createObjectURL(file);

    try {
        const uploadFile = await compressImageForUpload(file, { maxDimension: 800 });
        const formData = new FormData();
        formData.append('image', uploadFile);

        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: authHeaders(), body: formData });
        if (await handleAuthFailure(res)) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        const putRes = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ avatar: data.url })
        });
        if (await handleAuthFailure(putRes)) return;
        adminProfile = await putRes.json();
        applyProfileToUI();
        showToast('Avatar updated');
    } catch (err) {
        showToast(`Avatar upload failed: ${err.message}`, true);
    }
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('profile-error');
    errEl.style.display = 'none';

    const payload = {
        displayName: document.getElementById('profile-display-name').value.trim(),
        title: document.getElementById('profile-title').value.trim()
    };

    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (await handleAuthFailure(res)) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');
        adminProfile = data;
        applyProfileToUI();
        showToast('Profile updated');
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile';
    }
});

/* ============================================================
   ANALYTICS + DASHBOARD RENDER
   ============================================================ */
let analyticsStats = { total: 0, daily: [] };

async function loadAnalytics() {
    try {
        const res = await fetch(`${API_BASE_URL}/analytics/stats`, { headers: authHeaders() });
        if (await handleAuthFailure(res)) return;
        if (!res.ok) throw new Error('Failed to load analytics');
        analyticsStats = await res.json();
    } catch (err) {
        analyticsStats = { total: 0, daily: [] };
    }
}

function renderAnalyticsChart() {
    const wrap = document.getElementById('analytics-chart-wrap');
    const daily = analyticsStats.daily || [];

    if (!daily.length) {
        wrap.innerHTML = `<div class="empty-state" style="padding:30px 10px;"><i class="fa-solid fa-chart-line"></i><p>Not enough data yet.</p></div>`;
        return;
    }

    const W = 560, H = 200, PAD = 24;
    const max = Math.max(1, ...daily.map(d => d.count));
    const stepX = (W - PAD * 2) / (daily.length - 1 || 1);

    const points = daily.map((d, i) => {
        const x = PAD + i * stepX;
        const y = H - PAD - (d.count / max) * (H - PAD * 2);
        return [x, y];
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${H - PAD} L ${points[0][0].toFixed(1)} ${H - PAD} Z`;

    const midIdx = Math.floor(daily.length / 2);
    const labelIndices = [0, midIdx, daily.length - 1];
    const labels = labelIndices.map(i => {
        const d = new Date(daily[i].date);
        return `<text x="${points[i][0].toFixed(1)}" y="${H - 4}" font-size="10" fill="var(--text-muted)" text-anchor="middle">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`;
    }).join('');

    wrap.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:180px;">
            <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#00e5ff" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#222730" stroke-width="1"/>
            <path d="${areaPath}" fill="url(#chartFill)"/>
            <path d="${linePath}" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${labels}
        </svg>
    `;
}

function renderRecentProjects() {
    const list = document.getElementById('recent-projects-list');
    const recent = [...allProjects]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 4);

    if (!recent.length) {
        list.innerHTML = `<div class="empty-state" style="padding:30px 10px;"><i class="fa-solid fa-folder-open"></i><p>No projects yet.</p></div>`;
        return;
    }

    list.innerHTML = recent.map(p => `
        <div class="recent-item">
            <img src="${p.image || ''}" alt="${escapeHtml(p.title)}" onerror="this.style.visibility='hidden'">
            <div>
                <div class="ri-title">${escapeHtml(p.title)}</div>
                <div class="ri-sub">${escapeHtml(p.category || 'Web Development')}</div>
            </div>
            <div class="ri-date">${formatDate(p.createdAt)}</div>
        </div>
    `).join('');
}

function renderDashboard() {
    document.getElementById('stat-projects').textContent = allProjects.length;
    document.getElementById('stat-messages').textContent = allMessages.length;
    document.getElementById('stat-skills').textContent = allSkills.length;
    document.getElementById('stat-views').textContent = analyticsStats.total ?? 0;
    document.getElementById('chart-total-views').textContent = analyticsStats.total ?? 0;

    renderRecentProjects();
    renderAnalyticsChart();
    updateMessagesBadge();
}

document.getElementById('view-all-projects').addEventListener('click', () => switchView('projects-view'));
document.getElementById('qa-add-project').addEventListener('click', () => { switchView('projects-view'); openAddModal(); });
document.getElementById('qa-manage-skills').addEventListener('click', () => switchView('skills-view'));
document.getElementById('qa-update-about').addEventListener('click', () => switchView('about-view'));
document.getElementById('qa-upload-cv').addEventListener('click', () => switchView('cv-view'));

/* ============================================================
   ACCOUNT SETTINGS (username / password)
   ============================================================ */
const settingsForm = document.getElementById('settings-form');
const settingsError = document.getElementById('settings-error');
const settingsSuccess = document.getElementById('settings-success');
const saveSettingsBtn = document.getElementById('save-settings-btn');

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsError.style.display = 'none';
    settingsSuccess.style.display = 'none';

    const currentPassword = document.getElementById('current-password').value;
    const newUsername = document.getElementById('new-username').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newUsername && !newPassword) {
        settingsError.textContent = 'Enter a new username and/or a new password.';
        settingsError.style.display = 'block';
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        settingsError.textContent = 'New password and confirmation do not match.';
        settingsError.style.display = 'block';
        return;
    }

    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = 'Updating...';

    try {
        const res = await fetch(`${API_BASE_URL}/auth/update-credentials`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                currentPassword,
                newUsername: newUsername || undefined,
                newPassword: newPassword || undefined
            })
        });

        if (await handleAuthFailure(res)) return;

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Something went wrong');

        token = data.token;
        sessionStorage.setItem('LouisAdminToken', data.token);
        sessionStorage.setItem('LouisAdminUsername', data.admin.username);

        settingsSuccess.textContent = 'Credentials updated successfully.';
        settingsSuccess.style.display = 'block';
        settingsForm.reset();
        showToast('Account credentials updated');
    } catch (err) {
        settingsError.textContent = err.message;
        settingsError.style.display = 'block';
    } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = 'Update Credentials';
    }
});

/* ============================================================
   INIT — load everything the dashboard needs up front
   ============================================================ */
(async function init() {
    await Promise.all([
        loadProjects(),
        loadMessages(),
        loadSkills(),
        loadServices(),
        loadSiteContent(),
        loadProfile(),
        loadAnalytics()
    ]);
    renderDashboard();
})();

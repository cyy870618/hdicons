const API = 'https://api.github.com';
const UPSTREAM_REPO = 'xushier/HD-Icons';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

const ok = (data = null, message = '操作成功') => json({ code: 200, message, data });
const fail = (message = '操作失败', code = 400) => json({ code, message, data: null }, code);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const b64urlText = (s) => b64urlEncode(enc.encode(s));

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

async function createToken(identity, env) {
  const header = b64urlText(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64urlText(JSON.stringify({ ...identity, exp: Math.floor(Date.now() / 1000) + 7 * 86400 }));
  const secret = env.JWT_SECRET || 'hd-icons-cf-secret';
  const sig = await hmacSign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${sig}`;
}

async function verifyToken(token, env) {
  if (!token || token.split('.').length !== 3) return null;
  const [header, payload, sig] = token.split('.');
  const secret = env.JWT_SECRET || 'hd-icons-cf-secret';
  const expect = await hmacSign(`${header}.${payload}`, secret);
  if (expect !== sig) return null;
  try {
    const data = JSON.parse(dec.decode(b64urlDecode(payload)));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

async function currentUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return verifyToken(token, env);
}

async function hashPass(password, salt) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ghHeaders = (env) => ({
  Authorization: `Bearer ${env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'hdicons-cf',
  'Content-Type': 'application/json',
});

const ghReady = (env) => !!(env.GITHUB_TOKEN && env.GITHUB_REPO);

async function ghGetFile(env, path) {
  const r = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || 'main'}`, { headers: ghHeaders(env) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  const d = await r.json();
  const bin = atob((d.content || '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return { sha: d.sha, text: dec.decode(bytes) };
}

async function ghPutFile(env, path, bytes, message) {
  let sha;
  try {
    const cur = await ghGetFile(env, path);
    if (cur) sha = cur.sha;
  } catch (e) { /* new file */ }
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000));
  }
  const body = { message, content: btoa(bin), branch: env.GITHUB_BRANCH || 'main' };
  if (sha) body.sha = sha;
  const r = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT', headers: ghHeaders(env), body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${path} ${r.status} ${await r.text()}`);
  return r.json();
}

async function ghDeleteFile(env, path, message) {
  const cur = await ghGetFile(env, path);
  if (!cur) throw new Error('文件不存在');
  const r = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'DELETE', headers: ghHeaders(env),
    body: JSON.stringify({ message, sha: cur.sha, branch: env.GITHUB_BRANCH || 'main' }),
  });
  if (!r.ok) throw new Error(`DELETE ${path} ${r.status}`);
  return r.json();
}

async function ghListDir(env, path) {
  const r = await fetch(`${API}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || 'main'}`, { headers: ghHeaders(env) });
  if (r.status === 404) return [];
  if (!r.ok) return [];
  const list = await r.json();
  return Array.isArray(list) ? list.filter((x) => x.type === 'file') : [];
}

const USERS_PATH = 'data/users.json';

async function loadUsers(env) {
  try {
    const f = await ghGetFile(env, USERS_PATH);
    if (f) {
      const data = JSON.parse(f.text);
      if (data && Array.isArray(data.users)) return data;
    }
  } catch (e) { /* ignore */ }
  return { users: [] };
}

async function saveUsers(env, data) {
  await ghPutFile(env, USERS_PATH, enc.encode(JSON.stringify(data, null, 2)), 'chore: 更新用户数据');
}

function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, created_at: u.created_at };
}

async function findUser(env, username) {
  const data = await loadUsers(env);
  return { data, user: data.users.find((u) => u.username === username) || null };
}

const DEFAULT_CFG = { title: 'HD-Icons', custom_url: '' };

async function loadConfig(env) {
  const base = { ...DEFAULT_CFG, title: env.TITLE || DEFAULT_CFG.title, custom_url: env.CUSTOM_URL || '' };
  try {
    const f = await ghGetFile(env, 'data/config.json');
    if (f) return { ...base, ...JSON.parse(f.text) };
  } catch (e) { /* ignore */ }
  return base;
}

const BUILTIN_CATEGORIES = [
  { name: 'border-radius', label: '圆角' },
  { name: 'AI', label: 'AI' },
  { name: 'Docker', label: 'Docker' },
  { name: 'NAS', label: 'NAS' },
  { name: 'PT', label: 'PT' },
  { name: '云服务', label: '云服务' },
  { name: 'upload', label: '上传' },
];
const BUILTIN_NAMES = BUILTIN_CATEGORIES.map((c) => c.name);
const CATEGORIES_PATH = 'data/categories.json';
const OVERRIDES_PATH = 'data/overrides.json';

async function loadCategories(env) {
  try {
    const f = await ghGetFile(env, CATEGORIES_PATH);
    if (f) {
      const data = JSON.parse(f.text);
      if (data && Array.isArray(data.categories)) {
        return data.categories
          .filter((c) => c && c.name && !BUILTIN_NAMES.includes(c.name))
          .map((c) => ({ name: String(c.name), label: String(c.label || c.name), builtin: false }));
      }
    }
  } catch (e) { /* ignore */ }
  return [];
}

async function saveCategories(env, categories) {
  await ghPutFile(env, CATEGORIES_PATH, enc.encode(JSON.stringify({ categories }, null, 2)), 'chore: 更新自定义分类');
}

async function loadOverrides(env) {
  try {
    const f = await ghGetFile(env, OVERRIDES_PATH);
    if (f) {
      const data = JSON.parse(f.text);
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    }
  } catch (e) { /* ignore */ }
  return {};
}

async function saveOverrides(env, overrides) {
  await ghPutFile(env, OVERRIDES_PATH, enc.encode(JSON.stringify(overrides, null, 2)), 'chore: 更新图标覆盖信息');
}

let iconCache = { list: null, ts: 0 };

function parseIconsJson(data) {
  const icons = Array.isArray(data && data.icons) ? data.icons : [];
  return icons.map((item) => {
    const url = item.url || '';
    const m = url.match(/\/(border-radius|circle|svg)\/([^/]+)$/);
    if (!m) return null;
    return { name: String(item.name || m[2]).replace(/\.[^.]+$/, ''), filename: m[2], category: m[1], type: 'github' };
  }).filter(Boolean);
}

async function loadUpstreamIcons() {
  if (iconCache.list && Date.now() - iconCache.ts < 10 * 60 * 1000) return iconCache.list;
  const urls = [
    `https://raw.githubusercontent.com/${UPSTREAM_REPO}/main/icons.json`,
    `https://cdn.jsdelivr.net/gh/${UPSTREAM_REPO}@main/icons.json`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cf: { cacheTtl: 600, cacheEverything: true } });
      if (!r.ok) continue;
      const list = parseIconsJson(await r.json());
      if (list.length) {
        iconCache = { list, ts: Date.now() };
        return list;
      }
    } catch (e) { /* try next */ }
  }
  return iconCache.list || [];
}

const IMPORTED_PATH = 'data/imported-icons.json';
let importedCache = { list: null, ts: 0 };

async function loadImportedIcons(env) {
  if (importedCache.list && Date.now() - importedCache.ts < 10 * 60 * 1000) return importedCache.list;
  try {
    const f = await ghGetFile(env, IMPORTED_PATH);
    if (f) {
      const data = JSON.parse(f.text);
      const arr = Array.isArray(data && data.icons) ? data.icons : [];
      const list = arr.map((item) => {
        const url = String(item.url || '');
        const filename = decodeURIComponent(url.split('/').pop() || '');
        if (!filename) return null;
        return {
          name: String(item.name || filename).replace(/\.[^.]+$/, ''),
          filename,
          category: String(item.type || item.category || 'border-radius'),
          type: 'imported',
        };
      }).filter(Boolean);
      importedCache = { list, ts: Date.now() };
      return list;
    }
  } catch (e) { /* fall back to upstream */ }
  return null;
}

async function loadIcons(env) {
  const imported = await loadImportedIcons(env);
  const upstream = imported && imported.length ? imported : await loadUpstreamIcons();
  let uploads = [];
  if (ghReady(env)) {
    const files = await ghListDir(env, 'icons/upload');
    uploads = files.map((f) => ({
      name: f.name.replace(/\.[^.]+$/, ''), filename: f.name, category: 'upload', type: 'upload',
    }));
  }
  return upstream.concat(uploads);
}

const iconKey = (icon) => `${icon.category}/${icon.filename}`;

function applyOverrides(icons, overrides, includeHidden = false) {
  const list = [];
  for (const icon of icons) {
    const key = iconKey(icon);
    const ov = overrides[key] || {};
    if (ov.hidden && !includeHidden) continue;
    list.push({
      key,
      name: ov.name || icon.name,
      filename: icon.filename,
      type: icon.type,
      category: ov.category || icon.category,
      orig_category: icon.category,
    });
  }
  return list;
}

function iconUrls(icon, origin) {
  const category = icon.orig_category || icon.category;
  let original;
  if (icon.type === 'upload') original = `/icons/upload/${icon.filename}`;
  else if (icon.type === 'imported') original = `/icons/lib/${encodeURIComponent(category)}/${encodeURIComponent(icon.filename)}`;
  else original = `/icons/HD-Icons/${category}/${icon.filename}`;
  const thumb = icon.type === 'imported' ? original : (icon.filename.toLowerCase().endsWith('.svg') ? original : `/icons/thumbnails/${icon.type === 'upload' ? 'upload' : category}/${icon.filename}`);
  return { original_url: origin + original, thumbnail_url: origin + thumb, copy_url: origin + original };
}

const ALLOWED = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?|apng|ico)$/i;

function segments(params) {
  const p = params && params.path;
  if (Array.isArray(p)) return p.filter(Boolean);
  return String(p || '').split('/').filter(Boolean);
}

function requireAdmin(user) {
  return !!user && user.role === 'admin';
}

function slugify(label) {
  return String(label || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function allCategoryDefs(custom) {
  return BUILTIN_CATEGORIES.map((c) => ({ ...c, builtin: true })).concat(custom.map((c) => ({ ...c, builtin: false })));
}

async function handleApi(request, env, path) {
  const method = request.method;
  const origin = new URL(request.url).origin;
  const user = await currentUser(request, env);

  // auth
  if (path === 'auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return fail('用户名和密码不能为空');

    const { data, user: found } = await findUser(env, username);
    let matched = null;
    if (found && found.password_hash) {
      const hash = await hashPass(password, found.salt || '');
      if (hash === found.password_hash) matched = found;
    }
    if (!matched && !(found && found.password_hash) && username === (env.ADMIN_USER || 'admin') && password === (env.ADMIN_PASS || 'hdicons')) {
      matched = found || { id: 1, username, role: 'admin', created_at: new Date().toISOString() };
    }
    if (!matched) return fail('用户名或密码错误', 401);

    const identity = { id: matched.id, username: matched.username, role: matched.role || 'user' };
    const token = await createToken(identity, env);
    return ok({ token, user: publicUser({ ...matched, ...identity }) }, '登录成功');
  }

  if (path === 'auth/me' && method === 'GET') {
    if (!user) return fail('未登录', 401);
    return ok(user);
  }

  if (path === 'auth/change-password' && method === 'POST') {
    if (!user) return fail('未登录', 401);
    const body = await request.json().catch(() => ({}));
    const currentPwd = String(
      body.currentPassword !== undefined ? body.currentPassword
        : (body.current_password !== undefined ? body.current_password : (body.old_password !== undefined ? body.old_password : '')),
    );
    const pwd = String(
      body.newPassword !== undefined ? body.newPassword : (body.new_password !== undefined ? body.new_password : ''),
    );
    if (pwd.length < 6) return fail('密码长度至少6位');
    const data = await loadUsers(env);
    const target = data.users.find((u) => u.id === user.id) || data.users.find((u) => u.username === user.username);
    let valid = false;
    if (target && target.password_hash) {
      valid = (await hashPass(currentPwd, target.salt || '')) === target.password_hash;
    } else {
      valid = currentPwd === (env.ADMIN_PASS || 'hdicons');
    }
    if (!valid) return fail('当前密码错误', 400);
    const salt = 'cf' + Math.random().toString(36).slice(2, 10);
    const rec = { id: user.id, username: user.username, role: user.role, salt, password_hash: await hashPass(pwd, salt), created_at: new Date().toISOString() };
    if (target) Object.assign(target, rec); else data.users.push(rec);
    await saveUsers(env, data);
    return ok(null, '密码修改成功');
  }

  // categories
  if (path === 'categories' && method === 'GET') {
    const icons = applyOverrides(await loadIcons(env), await loadOverrides(env));
    const custom = await loadCategories(env);
    const counts = {};
    for (const icon of icons) counts[icon.category] = (counts[icon.category] || 0) + 1;
    const items = allCategoryDefs(custom).map((c) => ({ ...c, count: counts[c.name] || 0 }));
    return ok({ items, total: icons.length });
  }

  if (path === 'categories' && method === 'POST') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const label = String(body.label || '').trim();
    if (!label) return fail('分组名称不能为空');
    if (label.length > 40) return fail('分组名称过长');
    const custom = await loadCategories(env);
    if (custom.some((c) => c.label.toLowerCase() === label.toLowerCase())) return fail('分组名称已存在');
    let base = slugify(label);
    if (!base) {
      let n = custom.length + 1;
      while (allCategoryDefs(custom).some((c) => c.name === `group-${n}`)) n += 1;
      base = `group-${n}`;
    } else if (allCategoryDefs(custom).some((c) => c.name === base)) {
      let n = 2;
      while (allCategoryDefs(custom).some((c) => c.name === `${base}-${n}`)) n += 1;
      base = `${base}-${n}`;
    }
    custom.push({ name: base, label, builtin: false });
    await saveCategories(env, custom);
    return ok({ name: base, label, builtin: false, count: 0 }, '分组创建成功');
  }

  if (path.startsWith('categories/') && method === 'PUT') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const name = decodeURIComponent(path.slice('categories/'.length));
    const body = await request.json().catch(() => ({}));
    const label = String(body.label || '').trim();
    if (!label) return fail('分组名称不能为空');
    if (label.length > 40) return fail('分组名称过长');
    const custom = await loadCategories(env);
    const idx = custom.findIndex((c) => c.name === name);
    if (idx < 0) return fail('分组不存在或不可修改');
    if (custom.some((c) => c.name !== name && c.label.toLowerCase() === label.toLowerCase())) return fail('分组名称已存在');
    custom[idx].label = label;
    await saveCategories(env, custom);
    return ok(custom[idx], '分组已重命名');
  }

  if (path.startsWith('categories/') && method === 'DELETE') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const name = decodeURIComponent(path.slice('categories/'.length));
    const custom = await loadCategories(env);
    if (!custom.some((c) => c.name === name)) return fail('分组不存在或不可删除');
    await saveCategories(env, custom.filter((c) => c.name !== name));
    const overrides = await loadOverrides(env);
    let changed = false;
    for (const key of Object.keys(overrides)) {
      const ov = overrides[key];
      if (ov && ov.category === name) {
        delete ov.category;
        changed = true;
        if (!ov.name && !ov.hidden && !ov.category) delete overrides[key];
      }
    }
    if (changed) await saveOverrides(env, overrides);
    return ok(null, '分组已删除');
  }

  // icons
  if (path === 'icons' && method === 'GET') {
    const u = new URL(request.url);
    const category = u.searchParams.get('category') || 'all';
    const search = (u.searchParams.get('search') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(5000, Math.max(1, parseInt(u.searchParams.get('page_size') || '100', 10) || 100));

    let list = applyOverrides(await loadIcons(env), await loadOverrides(env));
    if (category !== 'all') list = list.filter((i) => i.category === category);
    if (search) list = list.filter((i) => i.filename.toLowerCase().includes(search) || i.name.toLowerCase().includes(search));
    const total = list.length;
    const items = list.slice((page - 1) * pageSize, page * pageSize).map((i) => ({
      name: i.name, filename: i.filename, type: i.type, category: i.category, orig_category: i.orig_category, key: i.key, ...iconUrls(i, origin),
    }));
    return ok({ items, total, page, page_size: pageSize, total_pages: Math.ceil(total / pageSize) });
  }

  if (path === 'icons/upload' && method === 'POST') {
    if (!user) return fail('未登录', 401);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    let form;
    try { form = await request.formData(); } catch (e) { return fail('没有文件上传'); }
    const files = form.getAll('file').filter((f) => f && typeof f !== 'string');
    if (!files.length) return fail('没有选择文件');
    const target = String(form.get('category') || '').trim();
    if (target && target !== 'upload') {
      const custom = await loadCategories(env);
      if (!allCategoryDefs(custom).some((c) => c.name === target)) return fail('目标分组不存在');
    }
    const uploaded = [];
    for (const f of files) {
      if (!ALLOWED.test(f.name)) continue;
      const buf = await f.arrayBuffer();
      await ghPutFile(env, `icons/upload/${f.name}`, new Uint8Array(buf), `feat: 上传图标 ${f.name}`);
      uploaded.push(f.name);
    }
    if (!uploaded.length) return fail('文件格式不支持');
    if (target && target !== 'upload') {
      const overrides = await loadOverrides(env);
      for (const name of uploaded) {
        const key = `upload/${name}`;
        overrides[key] = { ...(overrides[key] || {}), category: target };
      }
      await saveOverrides(env, overrides);
    }
    return ok({ uploaded }, `成功上传 ${uploaded.length} 个文件`);
  }

  if (path === 'icons/rename' && method === 'POST') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || '');
    const name = String(body.name || '').trim();
    if (!key) return fail('缺少图标标识');
    if (!name) return fail('名称不能为空');
    if (name.length > 60) return fail('名称过长');
    const icons = await loadIcons(env);
    const target = icons.find((i) => iconKey(i) === key);
    if (!target) return fail('图标不存在', 404);
    const overrides = await loadOverrides(env);
    const ov = { ...(overrides[key] || {}) };
    if (name === target.name) delete ov.name; else ov.name = name;
    if (ov.name || ov.category || ov.hidden) overrides[key] = ov; else delete overrides[key];
    await saveOverrides(env, overrides);
    return ok({ key, name }, '重命名成功');
  }

  if (path === 'icons/move' && method === 'POST') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const keys = Array.isArray(body.keys) ? body.keys.map(String) : [];
    const category = String(body.category || '').trim();
    if (!keys.length) return fail('请选择图标');
    if (!category) return fail('请选择目标分组');
    const custom = await loadCategories(env);
    if (!allCategoryDefs(custom).some((c) => c.name === category)) return fail('目标分组不存在');
    const icons = await loadIcons(env);
    const overrides = await loadOverrides(env);
    let moved = 0;
    for (const key of keys) {
      const target = icons.find((i) => iconKey(i) === key);
      if (!target) continue;
      const ov = { ...(overrides[key] || {}) };
      if (category === target.category) delete ov.category; else ov.category = category;
      if (ov.name || ov.category || ov.hidden) overrides[key] = ov; else delete overrides[key];
      moved += 1;
    }
    if (!moved) return fail('图标不存在', 404);
    await saveOverrides(env, overrides);
    return ok({ moved, category }, `已移动 ${moved} 个图标`);
  }

  if (path === 'icons/batch-delete' && method === 'POST') {
    if (!requireAdmin(user)) return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const keys = Array.isArray(body.keys) ? body.keys.map(String) : [];
    if (!keys.length) return fail('请选择图标');
    const icons = await loadIcons(env);
    const overrides = await loadOverrides(env);
    let deleted = 0;
    let hidden = 0;
    for (const key of keys) {
      const target = icons.find((i) => iconKey(i) === key);
      if (!target) continue;
      if (target.category === 'upload') {
        try {
          await ghDeleteFile(env, `icons/upload/${target.filename}`, `chore: 删除图标 ${target.filename}`);
          deleted += 1;
        } catch (e) { /* 文件可能已删除 */ }
        delete overrides[key];
      } else {
        overrides[key] = { ...(overrides[key] || {}), hidden: true };
        hidden += 1;
      }
    }
    await saveOverrides(env, overrides);
    return ok({ deleted, hidden }, `已删除 ${deleted + hidden} 个图标`);
  }

  if (path === 'icons/json' && method === 'POST') {
    if (!user) return fail('未登录', 401);
    const body = await request.json().catch(() => ({}));
    const base = body.base_url || `https://raw.githubusercontent.com/${UPSTREAM_REPO}/main`;
    const list = applyOverrides(await loadIcons(env), await loadOverrides(env));
    return ok({
      name: 'HD-Icons',
      description: 'By 小迪',
      icons: list.map((i) => ({ name: i.name, url: `${base}/${i.orig_category}/${i.filename}` })),
    });
  }

  if (path.startsWith('icons/') && method === 'DELETE') {
    if (!user) return fail('未登录', 401);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const filename = decodeURIComponent(path.slice('icons/'.length));
    if (!filename || filename.includes('/') || !ALLOWED.test(filename)) return fail('文件名不合法');
    try {
      await ghDeleteFile(env, `icons/upload/${filename}`, `chore: 删除图标 ${filename}`);
    } catch (e) {
      return fail(e.message);
    }
    return ok(null, '删除成功');
  }

  if (path === 'check-update' && method === 'GET') {
    return ok({ success: true, files_changed: 0, message: '云端模式：图标已跟随上游最新' });
  }

  if (path === 'thumbnails/retry' && method === 'POST') {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    return ok({ retried: [] }, '重试了 0 个文件');
  }

  if (path === 'thumbnails/status' && method === 'GET') {
    return ok({ failed_count: 0, failed_files: [] });
  }

  // users
  if (path === 'users' && method === 'GET') {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    const data = await loadUsers(env);
    const page = Math.max(1, parseInt(new URL(request.url).searchParams.get('page') || '1', 10) || 1);
    const pageSize = 10;
    const items = data.users.map(publicUser);
    return ok({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length, page, page_size: pageSize, total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
    });
  }

  if (path === 'users' && method === 'POST') {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = Number(body.role_id) === 1 ? 'admin' : 'user';
    if (!username || password.length < 6) return fail('用户名或密码不合法');
    const data = await loadUsers(env);
    if (data.users.some((u) => u.username === username)) return fail('用户名已存在');
    const id = data.users.reduce((m, u) => Math.max(m, u.id || 0), 0) + 1;
    const salt = 'cf' + Math.random().toString(36).slice(2, 10);
    data.users.push({ id, username, role, salt, password_hash: await hashPass(password, salt), created_at: new Date().toISOString() });
    await saveUsers(env, data);
    return ok(null, '用户创建成功');
  }

  if (path.startsWith('users/') && (method === 'PUT' || method === 'DELETE')) {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const id = parseInt(path.slice('users/'.length), 10);
    const data = await loadUsers(env);
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx < 0) return fail('用户不存在');
    if (method === 'DELETE') {
      data.users.splice(idx, 1);
      await saveUsers(env, data);
      return ok(null, '用户删除成功');
    }
    const body = await request.json().catch(() => ({}));
    if (body.role_id) data.users[idx].role = Number(body.role_id) === 1 ? 'admin' : 'user';
    if (body.password) {
      const salt = 'cf' + Math.random().toString(36).slice(2, 10);
      data.users[idx].salt = salt;
      data.users[idx].password_hash = await hashPass(String(body.password), salt);
    }
    await saveUsers(env, data);
    return ok(null, '更新成功');
  }

  // system
  if (path === 'system/config' && method === 'GET') {
    return ok(await loadConfig(env));
  }

  if (path === 'system/config/all' && method === 'GET') {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    const cfg = await loadConfig(env);
    return ok([
      { id: 1, key: 'title', value: cfg.title },
      { id: 2, key: 'custom_url', value: cfg.custom_url },
    ]);
  }

  if (path === 'system/config' && method === 'PUT') {
    if (!user || user.role !== 'admin') return fail('权限不足', 403);
    if (!ghReady(env)) return fail('未配置 GITHUB_TOKEN / GITHUB_REPO', 503);
    const body = await request.json().catch(() => ({}));
    const cfg = await loadConfig(env);
    const next = { ...cfg };
    for (const key of ['title', 'custom_url']) {
      if (typeof body[key] === 'string') next[key] = body[key];
    }
    await ghPutFile(env, 'data/config.json', enc.encode(JSON.stringify(next, null, 2)), 'chore: 更新系统配置');
    return ok(null, '配置更新成功');
  }

  if (path === 'system/info' && method === 'GET') {
    return ok({ version: '2.0.0', name: 'HD-Icons', author: '小迪同学' });
  }

  return fail('接口不存在', 404);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = segments(params).join('/');
  try {
    return await handleApi(request, env, path);
  } catch (e) {
    return fail(e && e.message ? e.message : '服务器错误', 500);
  }
}

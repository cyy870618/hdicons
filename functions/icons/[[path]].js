const UPSTREAM_REPO = 'xushier/HD-Icons';

function segments(params) {
  const p = params && params.path;
  if (Array.isArray(p)) return p.filter(Boolean);
  return String(p || '').split('/').filter(Boolean);
}

export async function onRequest(context) {
  const { env, params } = context;
  const segs = segments(params);

  let target = null;
  if (segs[0] === 'lib' && segs.length >= 3) {
    target = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/main/icons/imported/${segs.slice(1).map((s) => encodeURIComponent(decodeURIComponent(s))).join('/')}`;
  } else if (segs[0] === 'HD-Icons' && segs.length >= 3) {
    target = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/main/${segs.slice(1).join('/')}`;
  } else if (segs[0] === 'thumbnails' && segs.length >= 3) {
    if (segs[1] === 'upload') {
      target = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/main/icons/upload/${segs.slice(2).join('/')}`;
    } else {
      target = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/main/${segs.slice(1).join('/')}`;
    }
  } else if (segs[0] === 'upload' && segs.length >= 2) {
    target = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/main/icons/upload/${segs.slice(1).join('/')}`;
  }

  if (!target) return new Response('Not found', { status: 404 });

  const r = await fetch(target, { headers: { 'User-Agent': 'hdicons-cf' } });
  if (!r.ok) return new Response('Not found', { status: r.status === 404 ? 404 : 502 });

  return new Response(r.body, {
    status: 200,
    headers: {
      'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=604800',
    },
  });
}

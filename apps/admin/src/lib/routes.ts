export function adminPath(path = '') {
  const isEmbedded = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return isEmbedded ? `/admin${normalizedPath === '/' ? '' : normalizedPath}` : normalizedPath;
}

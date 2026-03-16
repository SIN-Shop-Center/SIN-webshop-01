export function isActiveHref(pathname: string, href: string, exact: boolean | undefined) {
  if (exact === false) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return pathname === href
}

export function sidebarLinkClasses(active: boolean) {
  return [
    'group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all',
    active
      ? 'border-black bg-black text-white shadow-lg'
      : 'border-brand-border bg-white/86 text-brand-text hover:border-brand-border-strong hover:bg-white',
  ].join(' ')
}

export function sidebarIconWrapClasses(active: boolean) {
  return active ? 'mt-0.5 rounded-2xl bg-white/14 p-2.5' : 'mt-0.5 rounded-2xl bg-brand-bg-muted p-2.5'
}

export function pillLinkClasses(active: boolean) {
  return [
    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
    active ? 'border-black bg-black text-white' : 'border-brand-border bg-white text-brand-text-muted hover:border-brand-border-strong hover:text-brand-text',
  ].join(' ')
}


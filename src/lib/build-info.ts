/**
 * Build-time provenance.
 *
 * Astro reads import.meta.env.* at build time. We populate these from CI / the
 * build script in scripts/inject-build-info.mjs. Falls back to graceful values
 * during local dev so the footer never renders empty.
 */

const env = import.meta.env;

export const GIT_SHA: string = (env.PUBLIC_GIT_SHA as string | undefined) ?? 'dev';
export const BUILT_AT: string = (env.PUBLIC_BUILT_AT as string | undefined) ?? new Date().toISOString();
export const REPO_URL = 'https://github.com/chidionyema/portfolio-site';

export function sourceUrl(filePath?: string): string {
  if (!filePath) return REPO_URL;
  const sha = GIT_SHA === 'dev' ? 'main' : GIT_SHA;
  return `${REPO_URL}/blob/${sha}/${filePath.replace(/^\/+/, '')}`;
}

export function formatBuiltAt(iso: string = BUILT_AT): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

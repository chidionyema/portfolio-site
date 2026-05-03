/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SIGNALR_URL: string;
  readonly PUBLIC_GIT_SHA: string;
  readonly PUBLIC_BUILT_AT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

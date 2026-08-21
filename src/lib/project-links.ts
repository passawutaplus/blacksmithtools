export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "https://github.com/passawutaplus/blacksmithtools";

export const SUPABASE_PROJECT_REF = "zkflkpbmbozrchqncpzi";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export const SUPABASE_DASHBOARD = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`;
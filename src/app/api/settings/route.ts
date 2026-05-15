import { ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  const { response } = await requireUser();

  if (response) {
    return response;
  }

  return ok({
    supabase: {
      configured: isSupabaseConfigured(),
      serverKeyConfigured: isSupabaseAdminConfigured(),
      urlHost: getUrlHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    deepseek: {
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    },
    tushare: {
      configured: Boolean(process.env.TUSHARE_TOKEN),
    },
    deployment: {
      vercel: Boolean(process.env.VERCEL),
    },
  });
}

function getUrlHost(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

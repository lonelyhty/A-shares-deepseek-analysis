function hasValue(value: string | undefined, placeholders: string[] = []) {
  const normalized = value?.trim();

  if (!normalized) {
    return false;
  }

  return !placeholders.some((placeholder) =>
    normalized.toLowerCase().includes(placeholder.toLowerCase()),
  );
}

function hasHttpUrl(value: string | undefined, placeholders: string[] = []) {
  if (!hasValue(value, placeholders)) {
    return false;
  }

  try {
    const url = new URL(value as string);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSupabaseConfigured() {
  return (
    hasHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, ["your-project"]) &&
    hasValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, [
      "your-supabase-anon-or-publishable-key",
      "your-supabase",
    ])
  );
}

export function getDeepSeekStatus() {
  return {
    configured: hasValue(process.env.DEEPSEEK_API_KEY, ["sk-your-deepseek-api-key"]),
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
  };
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}

import { NextResponse } from "next/server";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        { error: "Supabase 尚未配置，请先填写环境变量。" },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: "请先登录。" }, { status: 401 }),
    };
  }

  return { supabase, user, response: null };
}

export async function requireAdmin() {
  const result = await requireUser();

  if (result.response || !result.user) {
    return result;
  }

  if (!isAdminEmail(result.user.email)) {
    return {
      ...result,
      response: NextResponse.json({ error: "需要管理员权限。" }, { status: 403 }),
    };
  }

  return result;
}

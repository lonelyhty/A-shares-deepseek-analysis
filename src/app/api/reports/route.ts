import { fail, ok } from "@/lib/server/json";
import { requireUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const { response, user, supabase } = await requireUser();

  if (response || !user) {
    return response;
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "30"), 100);
  const { data, error } = await supabase
    .from("analysis_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return fail(error.message, 500);
  }

  return ok({ reports: data ?? [] });
}


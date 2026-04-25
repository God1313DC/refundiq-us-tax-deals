import { NextResponse } from "next/server";

import { getCurrentUserProfile, isAuthBypassed } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const profile = isAuthBypassed()
    ? await getCurrentUserProfile("preparer")
    : await (async () => {
        const supabase = await createSupabaseServerClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return null;

        const admin = createSupabaseAdminClient();
        const { data: dbProfile } = await admin
          .from("users")
          .select("id, full_name, email, role, organization_id")
          .eq("id", user.id)
          .maybeSingle();

        if (!dbProfile) return null;
        return {
          id: dbProfile.id,
          fullName: dbProfile.full_name,
          email: dbProfile.email,
          role: dbProfile.role,
          organizationId: dbProfile.organization_id
        };
      })();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (profile.role !== "preparer" && profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const body = await request.json();
  let response: Response;
  try {
    response = await fetch(`${process.env.FASTAPI_BASE_URL}/v1/research/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    return NextResponse.json(
      { error: "Research service unavailable. Check FASTAPI service connectivity." },
      { status: 503 }
    );
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Research request failed" }, { status: 500 });
  }

  const data = await response.json();
  await admin.from("research_queries").insert({
    asked_by: profile.id,
    case_id: body.case_id ?? body.caseId ?? null,
    question: body.question,
    answer: data.answer,
    citations: data.citations ?? [],
    conflict_detected: Boolean(data.conflict_detected),
    human_review_required: Boolean(data.human_review_required),
    answer_mode: data.answer_mode ?? null,
    authority_level: data.authority_level ?? null,
    ranking_explanation: data.ranking_explanation ?? null,
    source_debug: data.source_debug ?? [],
    related_change_events: data.related_change_events ?? [],
    follow_up_questions: data.follow_up_questions ?? [],
    case_rule_matches: data.case_rule_matches ?? [],
    draft_only_warning: Boolean(data.draft_only_warning),
    supporting_passages: data.supporting_passages ?? [],
    conflict_summary: data.conflict_summary ?? null,
    conflict_reasons: data.conflict_reasons ?? [],
    payload: {
      source_debug: data.source_debug ?? []
    }
  });
  return NextResponse.json(data);
}

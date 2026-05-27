import { handleOptions } from "../_shared/cors.ts";
import { badRequest, json, notFound, serverError, unauthorized } from "../_shared/respond.ts";
import { requireUser } from "../_shared/auth.ts";
import { contactCategoryDefinitions, displayNameForContact, missingInfoFor, prospectStatusFor, whyThisCategory } from "../_shared/contactPresentation.ts";

function countBy<T extends Record<string, any>>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = getKey(row) || "unknown";
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    let auth;
    try {
      auth = await requireUser(req);
    } catch (_error) {
      return unauthorized();
    }

    const url = new URL(req.url);
    const importId = url.searchParams.get("import_id");
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const requestedPageSize = Number(url.searchParams.get("page_size") || "100");
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.min(Math.floor(requestedPageSize), 500)
      : 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (!importId) return badRequest("Missing import_id");

    const { data: importRow, error: importError } = await auth.supabase
      .from("contact_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRow) return notFound("Import not found");

    const { data: contacts, error: contactsError, count } = await auth.supabase
      .from("contact_records")
      .select("*", { count: "exact" })
      .eq("import_id", importId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (contactsError) throw contactsError;

    const contactIds = (contacts || []).map((c: any) => c.id);

    const { data: assessments, error: assessmentError } = contactIds.length
      ? await auth.supabase.from("contact_ai_assessments").select("*").in("contact_id", contactIds)
      : { data: [], error: null } as any;
    if (assessmentError) throw assessmentError;

    const { data: sources, error: sourcesError } = contactIds.length
      ? await auth.supabase.from("contact_enrichment_sources").select("*").in("contact_id", contactIds).limit(1000)
      : { data: [], error: null } as any;
    if (sourcesError) throw sourcesError;

    const { data: socials, error: socialsError } = contactIds.length
      ? await auth.supabase.from("contact_social_profiles").select("*").in("contact_id", contactIds).limit(1000)
      : { data: [], error: null } as any;
    if (socialsError) throw socialsError;

    const assessmentByContact = new Map((assessments || []).map((a: any) => [a.contact_id, a]));
    const sourcesByContact = new Map<string, any[]>();
    for (const source of sources || []) {
      sourcesByContact.set(source.contact_id, [...(sourcesByContact.get(source.contact_id) || []), source]);
    }
    const socialsByContact = new Map<string, any[]>();
    for (const social of socials || []) {
      socialsByContact.set(social.contact_id, [...(socialsByContact.get(social.contact_id) || []), social]);
    }

    const rows = (contacts || []).map((contact: any) => {
      const assessment = assessmentByContact.get(contact.id) || null;
      return {
        ...contact,
        display_name: displayNameForContact(contact),
        prospect_status: prospectStatusFor(contact, assessment),
        why_this_category: whyThisCategory(assessment),
        what_to_do_next: assessment?.next_best_action || "Review this contact before outreach.",
        missing_info: missingInfoFor(contact, assessment),
        assessment,
        sources: sourcesByContact.get(contact.id) || [],
        social_profiles: socialsByContact.get(contact.id) || [],
      };
    });

    // Lightweight dashboard stats for current import. For huge imports, replace this with SQL aggregate RPC.
    const { data: allContacts, error: allContactsError } = await auth.supabase
      .from("contact_records")
      .select("id,full_name,email,phone_e164,phone,company,job_title,occupation,notes,parse_status,gender_label,research_status,assessment_status,do_not_contact")
      .eq("import_id", importId)
      .limit(10000);
    if (allContactsError) throw allContactsError;

    const { data: allAssessments, error: allAssessmentError } = await auth.supabase
      .from("contact_ai_assessments")
      .select("contact_id,captive_status,candidate_type,priority_tier,manual_review_required,missing_data")
      .eq("import_id", importId)
      .limit(10000);
    if (allAssessmentError) throw allAssessmentError;

    const allAssessmentByContact = new Map((allAssessments || []).map((a: any) => [a.contact_id, a]));
    const allProspectStatuses = (allContacts || []).map((contact: any) => prospectStatusFor(contact, allAssessmentByContact.get(contact.id) || null));
    const totalProspects = allProspectStatuses.filter((status: string) => status === "Potential prospect").length;
    const notEnoughData = allProspectStatuses.filter((status: string) => status === "Not enough data").length;

    const stats = {
      total_contacts: count || 0,
      total_potential_prospects: totalProspects,
      total_not_enough_data: notEnoughData,
      gender: countBy(allContacts || [], (r: any) => r.gender_label || "not_provided"),
      research_status: countBy(allContacts || [], (r: any) => r.research_status),
      assessment_status: countBy(allContacts || [], (r: any) => r.assessment_status),
      captive_status: countBy(allAssessments || [], (r: any) => r.captive_status),
      candidate_type: countBy(allAssessments || [], (r: any) => r.candidate_type),
      priority_tier: countBy(allAssessments || [], (r: any) => r.priority_tier),
      missing_email: (allContacts || []).filter((r: any) => !r.email).length,
      missing_phone: (allContacts || []).filter((r: any) => !r.phone && !r.phone_e164).length,
      do_not_contact: (allContacts || []).filter((r: any) => r.do_not_contact).length,
      manual_review: (allAssessments || []).filter((r: any) => r.manual_review_required).length,
    };

    return json({
      import: importRow,
      heading: "Potential Prospects From This CSV",
      prospect_note: "These contacts are potential prospects until a human reviews the evidence, compliance flags, and next action.",
      category_definitions: contactCategoryDefinitions,
      page,
      page_size: pageSize,
      total: count || 0,
      stats,
      rows,
    });
  } catch (error) {
    return serverError(error);
  }
});

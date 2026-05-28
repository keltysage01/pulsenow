export type ResearchQuery = {
  contact_id: string;
  full_name?: string | null;
  city?: string | null;
  state?: string | null;
  company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
};

export type ResearchSource = {
  provider: string;
  source_type: "manual" | "public_search" | "provider_api" | "openai_web_search";
  query: string;
  title?: string | null;
  snippet?: string | null;
  url?: string | null;
  confidence: number;
  raw_result?: Record<string, unknown>;
};

function clean(v?: string | null) {
  return v?.toString().trim() || "";
}

export function buildSearchQueries(contact: ResearchQuery): string[] {
  const name = clean(contact.full_name);
  const loc = [clean(contact.city), clean(contact.state)].filter(Boolean).join(" ");
  const company = clean(contact.company);
  const title = clean(contact.job_title);

  const base = [name, company, title, loc].filter(Boolean).join(" ");
  const queries = new Set<string>();

  if (contact.linkedin_url) queries.add(contact.linkedin_url);
  if (base) {
    queries.add(`"${name}" ${company} ${title} LinkedIn Facebook Instagram`);
    queries.add(`site:linkedin.com/in "${name}" ${company || loc}`);
    queries.add(`"${name}" ${company || loc} insurance financial educator referral partner`);
    queries.add(`"${name}" ${company || loc} business owner professional profile`);
  }
  if (name && loc) queries.add(`${name} ${loc} LinkedIn`);
  if (name && company) queries.add(`${name} ${company}`);

  return Array.from(queries).slice(0, Number(Deno.env.get("CONTACT_SEARCH_QUERIES_PER_CONTACT") || "3"));
}

export function buildManualSearchSources(contact: ResearchQuery): ResearchSource[] {
  return buildSearchQueries(contact).map((query) => ({
    provider: "manual_search_link",
    source_type: "manual",
    query,
    title: `Manual search: ${query}`,
    snippet: "No automated scraping was performed. Open this search link manually and verify the contact.",
    url: query.startsWith("http") ? query : `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    confidence: 0.2,
    raw_result: { manual_review_only: true },
  }));
}

async function genericSearch(query: string): Promise<ResearchSource[]> {
  const endpoint = Deno.env.get("SEARCH_API_ENDPOINT");
  const apiKey = Deno.env.get("SEARCH_API_KEY");
  const maxResults = Number(Deno.env.get("SEARCH_MAX_RESULTS") || "5");

  if (!endpoint || !apiKey) return [];

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, max_results: maxResults }),
  });

  if (!res.ok) {
    console.error("generic search failed", await res.text());
    return [];
  }

  const data = await res.json();
  const results = data.results || data.data || [];

  return results.slice(0, maxResults).map((r: any) => ({
    provider: "generic_search_api",
    source_type: "public_search" as const,
    query,
    title: r.title || r.name || null,
    snippet: r.snippet || r.description || r.content || null,
    url: r.url || r.link || null,
    confidence: 0.65,
    raw_result: r,
  })).filter((r: ResearchSource) => Boolean(r.url || r.snippet || r.title));
}

async function openAiWebSearch(query: string): Promise<ResearchSource[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return [];

  const model = Deno.env.get("OPENAI_SEARCH_MODEL") || Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4.1-mini";
  const timeoutMs = Number(Deno.env.get("OPENAI_SEARCH_TIMEOUT_MS") || "18000");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 18000);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
        max_output_tokens: 700,
        input: `Search public web results for this contact. Look for LinkedIn public profile pages, public Facebook/Instagram/TikTok/profile pages, Google-visible professional profiles, company pages, and public role context. Do not scrape logged-in pages or claim certainty from protected traits. Return concise sourced evidence and URLs that help categorize the contact and decide how to contact them. Query: ${query}`,
      }),
    });
  } catch (error) {
    console.error("OpenAI web search request failed", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    console.error("OpenAI web search failed", await res.text());
    return [];
  }

  const data = await res.json();
  const outputText = data.output_text || "";
  const annotations: any[] = [];
  const consultedSources: any[] = [];

  for (const item of data.output || []) {
    if (item.type === "web_search_call" && item.action?.sources) {
      consultedSources.push(...item.action.sources);
    }
    for (const content of item.content || []) {
      if (content.annotations) annotations.push(...content.annotations);
    }
  }

  const urlSources = annotations
    .filter((a) => a.type === "url_citation" && a.url)
    .map((a) => ({
      provider: "openai_web_search",
      source_type: "openai_web_search" as const,
      query,
      title: a.title || a.url,
      snippet: outputText.slice(0, 500),
      url: a.url,
      confidence: 0.7,
      raw_result: a,
    }));

  if (urlSources.length) return urlSources.slice(0, 5);

  const sourceRows = consultedSources
    .filter((source) => source.url)
    .map((source) => ({
      provider: "openai_web_search",
      source_type: "openai_web_search" as const,
      query,
      title: source.title || source.url,
      snippet: outputText.slice(0, 500),
      url: source.url,
      confidence: 0.62,
      raw_result: source,
    }));

  if (sourceRows.length) return sourceRows.slice(0, 5);

  return [{
    provider: "openai_web_search",
    source_type: "openai_web_search",
    query,
    title: "OpenAI web search summary",
    snippet: outputText.slice(0, 1000),
    url: null,
    confidence: outputText ? 0.45 : 0,
    raw_result: { output_text: outputText },
  }];
}

export async function researchContact(contact: ResearchQuery): Promise<ResearchSource[]> {
  const provider = Deno.env.get("CONTACT_SEARCH_PROVIDER") || "none";
  const queries = buildSearchQueries(contact);

  if (provider === "none") {
    return buildManualSearchSources(contact);
  }

  const all: ResearchSource[] = [];

  for (const query of queries) {
    if (provider === "openai_web_search") {
      all.push(...await openAiWebSearch(query));
    } else if (provider === "generic_search_api") {
      all.push(...await genericSearch(query));
    } else {
      all.push(...buildManualSearchSources(contact));
    }
  }

  // De duplicate by URL and protect against huge rows.
  const seen = new Set<string>();
  const deduped: ResearchSource[] = [];
  for (const source of all) {
    const key = source.url || `${source.title}|${source.snippet}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(source);
  }

  return deduped.slice(0, 10);
}

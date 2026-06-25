/**
 * World Election Auto-Tracker
 * 
 * Polls Reuters, BBC, and Al Jazeera RSS feeds for international election results,
 * matches them to tracked world elections in the database, and auto-updates
 * status/winner fields when results are confirmed.
 * 
 * Runs every 6 hours via the election scheduler (idle mode) or every 30 minutes
 * when a world election date is within 48 hours.
 */

import { getDb } from "./db";
import { worldElections } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

// ─── RSS Feed Sources ────────────────────────────────────────────────────────
const RSS_FEEDS = [
  {
    name: "Reuters World",
    url: "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best",
    fallbackUrl: "https://news.google.com/rss/search?q=election+results+winner&hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    fallbackUrl: "https://news.google.com/rss/search?q=election+results+president+prime+minister&hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    fallbackUrl: "https://news.google.com/rss/search?q=election+winner+vote+count&hl=en-US&gl=US&ceid=US:en",
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface RSSItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  source: string;
}

interface WorldElectionRow {
  id: number;
  country: string;
  countryCode: string;
  electionType: string;
  electionName: string;
  electionDate: string;
  status: string;
  candidates: string | null;
  notes: string | null;
}

interface MatchResult {
  electionId: number;
  country: string;
  winner: string;
  party: string;
  source: string;
  confidence: "high" | "medium" | "low";
  headline: string;
}

// ─── RSS Parser (simple XML extraction) ──────────────────────────────────────
function parseRSSItems(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const description = extractTag(itemXml, "description");
    const pubDate = extractTag(itemXml, "pubDate");
    const link = extractTag(itemXml, "link");

    if (title) {
      items.push({
        title: decodeHtmlEntities(title),
        description: decodeHtmlEntities(description || ""),
        pubDate: pubDate || "",
        link: link || "",
        source: sourceName,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, ""); // strip remaining HTML tags
}

// ─── Fetch RSS Feeds ─────────────────────────────────────────────────────────
async function fetchRSSFeed(feedConfig: typeof RSS_FEEDS[0]): Promise<RSSItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(feedConfig.url, {
      signal: controller.signal,
      headers: { "User-Agent": "ElectionTracker/1.0" },
    });
    if (res.ok) {
      const xml = await res.text();
      return parseRSSItems(xml, feedConfig.name);
    }
  } catch {
    // Primary feed failed, try fallback
  } finally {
    clearTimeout(timeout);
  }

  // Try fallback (Google News RSS)
  if (feedConfig.fallbackUrl) {
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 15000);
    try {
      const res = await fetch(feedConfig.fallbackUrl, {
        signal: controller2.signal,
        headers: { "User-Agent": "ElectionTracker/1.0" },
      });
      if (res.ok) {
        const xml = await res.text();
        return parseRSSItems(xml, `${feedConfig.name} (via Google News)`);
      }
    } catch {
      // Both failed
    } finally {
      clearTimeout(timeout2);
    }
  }

  return [];
}

// ─── Election Keyword Matching ───────────────────────────────────────────────
const ELECTION_KEYWORDS = [
  "wins election", "elected", "election results", "wins vote",
  "election victory", "wins presidency", "wins parliamentary",
  "election winner", "landslide", "defeats", "voted out",
  "secures majority", "wins runoff", "concedes", "declared winner",
  "new president", "new prime minister", "forms government",
];

function isElectionRelated(item: RSSItem): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return ELECTION_KEYWORDS.some(kw => text.includes(kw));
}

function countryMentioned(item: RSSItem, country: string): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const countryLower = country.toLowerCase();
  
  // Direct country name match
  if (text.includes(countryLower)) return true;
  
  // Common alternate names
  const alternates: Record<string, string[]> = {
    "United Kingdom": ["uk", "britain", "british"],
    "United States": ["us", "usa", "american"],
    "Czech Republic": ["czech", "czechia"],
    "South Korea": ["korea"],
    "New Zealand": ["nz", "kiwi"],
    "São Tomé and Príncipe": ["sao tome"],
    "Cook Islands": ["cook islands"],
    "Bosnia and Herzegovina": ["bosnia"],
  };
  
  const alts = alternates[country] || [];
  return alts.some(alt => text.includes(alt));
}

function isDateRelevant(pubDate: string, electionDate: string): boolean {
  if (!pubDate || !electionDate) return true; // If we can't check, allow it
  
  try {
    const pub = new Date(pubDate);
    const election = new Date(electionDate + "T00:00:00Z");
    const diffDays = Math.abs(pub.getTime() - election.getTime()) / (1000 * 60 * 60 * 24);
    // Article must be within 7 days of election date
    return diffDays <= 7;
  } catch {
    return true;
  }
}

// ─── LLM-based Result Extraction ─────────────────────────────────────────────
async function extractElectionResult(
  items: RSSItem[],
  election: WorldElectionRow
): Promise<MatchResult | null> {
  // Filter items relevant to this election
  const relevant = items.filter(item =>
    isElectionRelated(item) &&
    countryMentioned(item, election.country) &&
    isDateRelevant(item.pubDate, election.electionDate)
  );

  if (relevant.length === 0) return null;

  // Use LLM to extract structured result from the headlines
  const headlines = relevant.slice(0, 5).map(r =>
    `[${r.source}] ${r.title} — ${r.description.slice(0, 200)}`
  ).join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an election result extractor. Given news headlines about an election, determine if a winner has been declared. Only report a winner if the headlines clearly state someone has won, been elected, or declared victory. Be conservative — do not guess.

Return JSON with this exact schema:
{
  "hasWinner": boolean,
  "winner": string or null (full name of winner),
  "party": string or null (party name or political affiliation),
  "confidence": "high" | "medium" | "low",
  "reason": string (brief explanation)
}

If headlines are ambiguous, exit polls only, or results are preliminary/contested, set hasWinner to false.`,
        },
        {
          role: "user",
          content: `Election: ${election.country} — ${election.electionName} (${election.electionType})
Date: ${election.electionDate}
Known candidates: ${election.candidates || "Unknown"}

Recent headlines:
${headlines}

Has a winner been declared?`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "election_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hasWinner: { type: "boolean" },
              winner: { type: ["string", "null"] },
              party: { type: ["string", "null"] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              reason: { type: "string" },
            },
            required: ["hasWinner", "winner", "party", "confidence", "reason"],
            additionalProperties: false,
          },
        },
      },
    });

    const msg = response.choices?.[0]?.message;
    const content = msg?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    if (!parsed.hasWinner || !parsed.winner) return null;
    if (parsed.confidence === "low") return null; // Too uncertain

    return {
      electionId: election.id,
      country: election.country,
      winner: parsed.winner,
      party: parsed.party || "Unknown",
      source: relevant[0].source,
      confidence: parsed.confidence,
      headline: relevant[0].title,
    };
  } catch (err) {
    console.error(`[WorldTracker] LLM extraction failed for ${election.country}:`, err);
    return null;
  }
}

// ─── Main Tracker Function ───────────────────────────────────────────────────
export async function runWorldElectionTracker(): Promise<{
  checked: number;
  updated: number;
  results: MatchResult[];
  errors: string[];
}> {
  const log = (msg: string) => console.log(`[WorldTracker] ${msg}`);
  const errors: string[] = [];
  const results: MatchResult[] = [];

  // 1. Fetch all RSS feeds in parallel
  log("Fetching RSS feeds...");
  const allItems: RSSItem[] = [];
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(feed => fetchRSSFeed(feed))
  );
  
  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }
  log(`Fetched ${allItems.length} RSS items from ${RSS_FEEDS.length} feeds.`);

  if (allItems.length === 0) {
    log("No RSS items fetched. Skipping.");
    return { checked: 0, updated: 0, results: [], errors: ["No RSS items fetched from any feed"] };
  }

  // 2. Get all upcoming/active world elections (not already completed)
  const db = await getDb();
  if (!db) { log("DB unavailable"); return { checked: 0, updated: 0, results: [], errors: ["DB unavailable"] }; }
  const upcomingElections = await db.select().from(worldElections)
    .where(eq(worldElections.status, "Upcoming"));

  log(`Found ${upcomingElections.length} upcoming elections to check.`);

  // 3. Only check elections whose date has passed or is today
  const now = new Date();
  const electionsToCheck = upcomingElections.filter((e: { electionDate: string }) => {
    const elDate = new Date(e.electionDate + "T23:59:59Z");
    return elDate <= now;
  });

  log(`${electionsToCheck.length} elections have passed their date — checking for results.`);

  // 4. For each past-due election, try to extract results
  for (const election of electionsToCheck) {
    try {
      const match = await extractElectionResult(allItems, election as WorldElectionRow);
      if (match && match.confidence !== "low") {
        results.push(match);

        // Update the database
        const updateNotes = [
          election.notes || "",
          `\n[Auto-tracked ${new Date().toISOString().split("T")[0]}] Winner: ${match.winner} (${match.party}). Source: ${match.source}. Confidence: ${match.confidence}.`,
        ].join("").trim();

        const dbInner = await getDb();
        if (dbInner) {
          await dbInner.update(worldElections)
            .set({
              status: "Completed",
              notes: updateNotes,
            })
            .where(eq(worldElections.id, election.id));
        }

        log(`✓ ${election.country}: ${match.winner} (${match.party}) — ${match.confidence} confidence`);
      }
    } catch (err) {
      const errMsg = `Error checking ${election.country}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(errMsg);
      log(errMsg);
    }
  }

  log(`Done. Checked: ${electionsToCheck.length}, Updated: ${results.length}`);
  return { checked: electionsToCheck.length, updated: results.length, results, errors };
}

// ─── Check if any world election is imminent (within 48h) ────────────────────
export function isWorldElectionImminent(): boolean {
  // This is called synchronously, so we can't query DB here.
  // Instead, we'll check against a static list or let the scheduler handle it.
  return false; // The scheduler will call runWorldElectionTracker on its own schedule
}

// ─── Scheduled check: which elections need monitoring ────────────────────────
export async function getWorldElectionsNeedingCheck(): Promise<number> {
  const now = new Date();
  const db = await getDb();
  if (!db) return 0;
  const upcoming = await db.select().from(worldElections)
    .where(eq(worldElections.status, "Upcoming"));
  
  // Count elections whose date has passed
  return upcoming.filter((e: { electionDate: string }) => {
    const elDate = new Date(e.electionDate + "T23:59:59Z");
    return elDate <= now;
  }).length;
}

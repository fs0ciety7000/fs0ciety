import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ICAL_FEEDS = [
  "https://calendar.google.com/calendar/ical/1521e628a07f4ad3ba9865d0c254a339976e87cef50e289275e39aa03a527e9c%40group.calendar.google.com/private-50ef96f5e8b3c025e6f07be3d0d613f1/basic.ics",
  "https://calendar.google.com/calendar/ical/h01ci0p1t5mmubkc285036rrkhirunsk%40import.calendar.google.com/public/basic.ics",
];

interface CalEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
  location?: string;
}

function parseICalDate(val: string): string {
  const clean = val.replace(/^.*:/, "");
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  const y = clean.slice(0, 4);
  const m = clean.slice(4, 6);
  const d = clean.slice(6, 8);
  const h = clean.slice(9, 11) || "00";
  const min = clean.slice(11, 13) || "00";
  return `${y}-${m}-${d}T${h}:${min}:00`;
}

function parseICal(text: string): CalEvent[] {
  const events: CalEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const unfolded = block.replace(/\r?\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/);
    let summary = "";
    let dtstart = "";
    let dtend = "";
    let description = "";
    let location = "";

    for (const line of lines) {
      if (line.startsWith("SUMMARY")) {
        summary = line.replace(/^SUMMARY[^:]*:/, "");
      } else if (line.startsWith("DTSTART")) {
        dtstart = parseICalDate(line.replace(/^DTSTART[^:]*:/, ""));
      } else if (line.startsWith("DTEND")) {
        dtend = parseICalDate(line.replace(/^DTEND[^:]*:/, ""));
      } else if (line.startsWith("DESCRIPTION")) {
        description = line.replace(/^DESCRIPTION[^:]*:/, "").replace(/\\n/g, "\n");
      } else if (line.startsWith("LOCATION")) {
        location = line.replace(/^LOCATION[^:]*:/, "");
      }
    }

    if (summary && dtstart) {
      events.push({ summary, dtstart, dtend, description, location });
    }
  }

  return events;
}

export async function GET(_req: NextRequest) {
  try {
    const results = await Promise.allSettled(
      ICAL_FEEDS.map(async (url) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "fs0ciety-dash/1.0" },
        });
        if (!res.ok) return [];
        const text = await res.text();
        return parseICal(text);
      })
    );

    const allEvents: CalEvent[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    // Deduplicate by summary + dtstart
    const seen = new Set<string>();
    const unique = allEvents.filter((e) => {
      const key = `${e.summary}|${e.dtstart}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);

    const filtered = unique
      .filter((e) => new Date(e.dtstart) >= cutoff)
      .sort((a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime());

    return NextResponse.json({ events: filtered });
  } catch {
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}

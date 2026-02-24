import { NextRequest, NextResponse } from "next/server";

const ICAL_URL =
  "https://calendar.google.com/calendar/ical/1521e628a07f4ad3ba9865d0c254a339976e87cef50e289275e39aa03a527e9c%40group.calendar.google.com/private-50ef96f5e8b3c025e6f07be3d0d613f1/basic.ics";

interface CalEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
  location?: string;
}

function parseICalDate(val: string): string {
  // Handle YYYYMMDD and YYYYMMDDTHHMMSSZ formats
  const clean = val.replace(/^.*:/, ""); // strip TZID= params
  if (clean.length === 8) {
    // All-day: YYYYMMDD
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
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

    // Unfold lines (RFC 5545: continuation lines start with space/tab)
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
    const res = await fetch(ICAL_URL, {
      next: { revalidate: 300 }, // cache 5 min
      headers: { "User-Agent": "fs0ciety-dash/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ events: [] }, { status: 502 });
    }

    const text = await res.text();
    const events = parseICal(text);

    // Only return events from the past month onwards, sorted ascending
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);

    const filtered = events
      .filter((e) => new Date(e.dtstart) >= cutoff)
      .sort((a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime());

    return NextResponse.json({ events: filtered });
  } catch {
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}

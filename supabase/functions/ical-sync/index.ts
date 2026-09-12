import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IcalEvent {
  uid: string;
  start: string;
  end: string;
  summary: string;
}

function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  const lines = text.split(/\r?\n/);
  let current: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      current = {};
    } else if (trimmed === "END:VEVENT") {
      if (current && current.uid && current.start && current.end) {
        events.push(current as IcalEvent);
      }
      current = null;
    } else if (current) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).split(";")[0];
      const value = trimmed.slice(colonIdx + 1);
      if (key === "UID") current.uid = value;
      else if (key === "DTSTART") current.start = parseIcalDate(value);
      else if (key === "DTEND") current.end = parseIcalDate(value);
      else if (key === "SUMMARY") current.summary = value;
    }
  }
  return events;
}

function parseIcalDate(value: string): string {
  const match = value.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { roomId, icalUrl } = await req.json();
    if (!roomId || !icalUrl) {
      return new Response(
        JSON.stringify({ error: "roomId and icalUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(icalUrl, {
      headers: { "User-Agent": "RoomBooking-iCal-Sync/1.0" },
    });
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch iCal: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const icalText = await response.text();
    const events = parseIcal(icalText);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await supabase
      .from("ical_bookings")
      .select("uid")
      .eq("room_id", roomId);
    const existingUids = new Set((existing ?? []).map((r: { uid: string }) => r.uid));

    const newEvents = events.filter((e) => !existingUids.has(e.uid));
    const newUids = new Set(events.map((e) => e.uid));
    const staleUids = [...existingUids].filter((u) => !newUids.has(u));

    let inserted = 0;
    if (newEvents.length > 0) {
      const rows = newEvents.map((e) => ({
        room_id: roomId,
        uid: e.uid,
        start_date: e.start,
        end_date: e.end,
        summary: e.summary || "Booking.com",
        color: "#1b86b5",
        check_in: "",
        check_out: "",
      }));
      const { error } = await supabase.from("ical_bookings").insert(rows);
      if (error) throw error;
      inserted = newEvents.length;
    }

    let deleted = 0;
    if (staleUids.length > 0) {
      const { error } = await supabase
        .from("ical_bookings")
        .delete()
        .in("uid", staleUids)
        .eq("room_id", roomId);
      if (error) throw error;
      deleted = staleUids.length;
    }

    return new Response(
      JSON.stringify({ success: true, synced: events.length, inserted, deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

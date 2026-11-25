/**
 * Prompt you paste into any AI (ChatGPT, Claude, Gemini, an agent…) to generate a Planny trip.
 * Keep in sync with shared/trip.ts. The formal version is docs/trip.schema.json (`npm run schema`).
 */
export const AI_PROMPT = `You are an expert road-trip planner and local guide. Research and create a detailed, realistic day-by-day road trip and return it as ONE JSON object in the "Planny trip format v1" below.

OUTPUT RULES
- Return ONLY valid JSON: no explanations, no markdown fences, no comments, no trailing commas.
- Use real, currently operating places with accurate coordinates (decimal degrees).
- Dates "YYYY-MM-DD"; times 24h "HH:MM"; distances in km; drive time in decimal hours (3.5 = 3h30).
- All money is a plain number in the trip "currency", estimated for the whole group.
- Stops are listed in the order they happen during the day.
- Never invent booking numbers, phone numbers or URLs. Omit a field rather than guess it.
- Do not include "id", "done" or "doneBy" fields; the app manages them.

FORMAT (? = optional, but fill in everything you reasonably can)
{
  "version": 1,
  "title": string,                     // "Pacific Coast Highway"
  "subtitle"?: string,                 // "San Francisco → Los Angeles"
  "emoji"?: string,                    // one emoji for the trip
  "coverImage"?: string,               // direct https image URL (images.unsplash.com preferred) or omit
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "travelers"?: string[],
  "currency"?: string,                 // ISO 4217, e.g. "USD", "EUR"
  "summary"?: string,                  // 2–3 sentence overview of the trip
  "tags"?: string[],                   // ["coast", "wine", "national parks"]
  "budget"?: { "total"?: number },
  "days": [                            // exactly one per calendar day, startDate → endDate
    {
      "date": "YYYY-MM-DD",
      "title": string,                 // catchy: "Big Sur, the main event"
      "summary"?: string,              // 2–3 sentences: vibe + plan of the day
      "from"?: string,                 // "Carmel-by-the-Sea, CA"
      "to"?: string,
      "distanceKm"?: number,           // total driving that day
      "driveHours"?: number,           // pure driving time
      "stops": [
        {
          "time"?: "HH:MM",            // planned arrival
          "title": string,             // name of the place/activity
          "type": "drive" | "food" | "coffee" | "sight" | "activity" | "nature" | "beach" | "shopping" | "fuel" | "rest" | "photo" | "stay" | "other",
          "whyVisit"?: string,         // ONE persuasive sentence: why it's worth stopping
          "about"?: string,            // 1–3 sentences: what this place IS (context, history, what makes it unique)
          "description"?: string,      // 1–2 sentences: what WE will do here
          "highlights"?: string[],     // 2–5 specific things not to miss (a dish, a viewpoint, a trail…)
          "tips"?: string,             // insider advice: parking, best time, crowds, what to bring
          "location"?: { "lat": number, "lng": number, "address"?: string },
          "durationMin"?: number,
          "cost"?: number,
          "openingHours"?: string,     // "9:00–17:00, closed Mondays"
          "bookingRequired"?: boolean, // true if tickets/reservations must be booked ahead
          "bookingRef"?: string,       // only if already booked
          "url"?: string,              // official website, only if you are sure it exists
          "image"?: string,            // direct https image URL, optional
          "optional"?: boolean         // true for "only if we have time"
        }
      ],
      "stay"?: {                       // where we sleep that night
        "name": string,
        "kind"?: "hotel" | "motel" | "apartment" | "house" | "hostel" | "camping" | "cabin" | "other",
        "about"?: string,              // what it's like and why it was chosen
        "address"?: string,
        "location"?: { "lat": number, "lng": number },
        "checkIn"?: "HH:MM",
        "checkOut"?: "HH:MM",
        "confirmation"?: string,
        "phone"?: string,
        "url"?: string,
        "cost"?: number,               // for that night
        "notes"?: string               // parking, breakfast, door codes…
      }
    }
  ],
  "checklist"?: [ { "text": string, "category"?: string } ],   // "Documents", "Car", "Clothes", "Tech", "Bookings", "Health"
  "contacts"?: [ { "name": string, "phone"?: string, "note"?: string } ],
  "links"?: [ { "label": string, "url": string } ],
  "notes"?: string
}

QUALITY BAR
- Every sight, nature, activity, beach, photo and food stop has "whyVisit", "about" and "highlights". This is the most important part: we want to know what each place is and why we're going.
- 3–8 stops per day: meals, coffee, fuel before long empty stretches, scenic and photo stops.
- Realistic pacing: about 5–6 hours of driving per day at most unless I say otherwise. Account for opening hours.
- Mark anything that sells out or needs a reservation with "bookingRequired": true.
- Include a "stay" for every night (all days except the last).
- 15–30 checklist items tailored to the route, season, country and activities.
- Add useful "contacts" (roadside assistance, emergency number for the country) and "links" (road conditions, park passes).

MY TRIP
(Describe your trip here: start/end places, dates, who is going, interests, pace, budget, must-sees, what is already booked…)
`;

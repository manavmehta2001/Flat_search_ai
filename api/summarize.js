const { readData, writeData } = require("../lib/store");
const { scoreFlat, labelFor } = require("../matching");

const PEOPLE_META = [
  { id: "riya", name: "Riya" },
  { id: "meera", name: "Meera" },
  { id: "kavita", name: "Kavita" },
];

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  try {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : JSON.parse(req.body || "{}");
    const flatId = body.flatId;
    if (!flatId) return res.status(400).json({ error: "flatId is required" });

    const data = await readData();
    const flat = (data.flats || []).find((f) => f.id === flatId);
    if (!flat) return res.status(404).json({ error: "Flat not found" });

    const people = PEOPLE_META.map((p) =>
      data.people && data.people[p.id]
        ? Object.assign({ id: p.id }, data.people[p.id])
        : null
    ).filter(Boolean);

    if (!people.length) {
      return res.status(400).json({ error: "No requirements saved yet" });
    }

    const score = scoreFlat(people, flat);
    const details = people
      .map((p) => {
        const pm = score.perPerson[p.id];
        return (
          p.name +
          ": wanted [" +
          (p.niceToHaves || []).map(labelFor).join(", ") +
          "] — got [" +
          pm.matched.map(labelFor).join(", ") +
          "] — missing [" +
          pm.gap.map(labelFor).join(", ") +
          "]. Budget: max ₹" +
          p.maxRent +
          ", this flat is ₹" +
          flat.rent +
          "."
        );
      })
      .join("\n");

    const prompt =
      "Three friends (" +
      people.map((p) => p.name).join(", ") +
      ") are jointly choosing a flat to share, called \"Journey Home\". " +
      "This flat has already passed everyone’s dealbreakers (budget, lift/parking needs, minimum bathrooms, pet policy). " +
      "Here is how it matches each person’s nice-to-have preferences:\n\n" +
      "Flat: " +
      flat.area +
      ", ₹" +
      flat.rent +
      "/month, floor " +
      (flat.floor || "unknown") +
      ", " +
      (flat.bathrooms || 0) +
      " bathroom(s), lift " +
      (flat.lift ? "yes" : "no") +
      ", parking " +
      (flat.parking ? "yes" : "no") +
      ", pet policy " +
      flat.petPolicy +
      ".\n\n" +
      details +
      '\n\nWrite a short, warm, plain-English summary (3-4 sentences, second person plural "you three" is fine) for their group chat. ' +
      "Clearly say who is getting everything they wanted, and if anyone is compromising, name them and say exactly what they are giving up " +
      "(be specific about which nice-to-have is missing). Do not recommend or pick a flat, and do not use bullet points — just a short paragraph.";

    const model = "gemini-3.5-flash-lite";
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error", response.status, errText);
      return res.status(502).json({ error: "Gemini API error" });
    }

    const json = await response.json();
    const candidate = (json.candidates || [])[0];
    const text = ((candidate && candidate.content && candidate.content.parts) || [])
      .map((part) => part.text || "")
      .join("")
      .trim();
    if (!text) {
      console.error("Empty Gemini response", JSON.stringify(json));
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    flat.aiSummary = text;
    await writeData(data);

    return res.status(200).json({ summary: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

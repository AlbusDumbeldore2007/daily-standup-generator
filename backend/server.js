require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check — used to verify the deployment is alive
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * generateStandup()
 * Accepts the user's raw commit messages / task notes for the day,
 * sends them to the AI model, and returns a clean 3-line standup.
 *
 * Why this structure:
 *  - "What did I do yesterday?" maps to the Done field
 *  - "What will I do today?"   maps to the Doing field
 *  - "Any blockers?"           maps to the Blockers field
 * This mirrors the exact format used in most engineering standups,
 * so the output is copy-paste ready without editing.
 */
async function generateStandup(rawInput, blockers) {
  const prompt = `You are a senior software engineer writing a daily standup update.
Given the developer's raw notes about their day, produce a professional 3-section standup in exactly this format:

✅ Done:
[What was accomplished — be specific, mention feature names / bug fixes]

🔄 Doing Today:
[What the developer plans to work on next — infer from context if not stated]

⚠️ Blockers:
[List any blockers, or write "None" if there are no blockers]

Rules:
- Each section is 1–2 sentences maximum
- Use professional engineering language
- Do not add any extra commentary or headers outside the format above

Developer's raw notes:
${rawInput}

${blockers ? `Mentioned blockers: ${blockers}` : ""}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://standup-generator.onrender.com",
      "X-Title": "Standup Generator",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// POST /generate-standup
// Body: { rawNotes: string, blockers?: string }
app.post("/generate-standup", async (req, res) => {
  const { rawNotes, blockers } = req.body;

  if (!rawNotes || rawNotes.trim().length === 0) {
    return res.status(400).json({ error: "rawNotes is required and cannot be empty." });
  }

  if (rawNotes.trim().length > 3000) {
    return res.status(400).json({ error: "Input too long. Keep it under 3000 characters." });
  }

  try {
    const standup = await generateStandup(rawNotes.trim(), blockers?.trim() || "");
    return res.json({ standup });
  } catch (err) {
    console.error("generateStandup error:", err.message);
    return res.status(500).json({ error: "Failed to generate standup. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Standup Generator backend running on port ${PORT}`);
});

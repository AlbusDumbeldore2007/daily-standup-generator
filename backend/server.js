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
- Start immediately with "✅ Done:"
- Do NOT include any reasoning, thoughts, preambles, or explanations
- Each section must be 1–2 sentences maximum
- Use professional engineering language

Developer's raw notes:
${rawInput}

${blockers ? `Mentioned blockers: ${blockers}` : ""}`;

  // Candidate models (tries free models first, falls back smoothly)
  const models = [
    "liquid/lfm-2.5-2.6b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "cohere/north-mini-code:free",
    "openai/gpt-4o-mini"
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://standup-generator-y2me.onrender.com",
          "X-Title": "Standup Generator",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed (${response.status}): ${errText}`);
        lastError = new Error(`AI API error ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let content = data.choices[0].message.content.trim();
        // If the model included a thinking block, strip it to start at "✅ Done:" or "Done:"
        const doneIndex = content.search(/(\u2705\s*)?Done:/i);
        if (doneIndex > 0) {
          content = content.slice(doneIndex).trim();
        }
        return content;
      }
    } catch (err) {
      console.warn(`Model ${model} threw error:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate standup with available models.");
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

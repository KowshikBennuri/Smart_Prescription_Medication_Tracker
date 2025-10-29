// server.cjs
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// === OPENROUTER ===
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY missing in .env");
  process.exit(1);
}

const openRouterFetch = async (messages, opts = {}) => {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      // MODIFICATION: Changed quotes to backticks for template literal
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:8000', // You might want to change this later
      'X-Title': 'SmartRX Hackathon',          // Or this
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-3b-instruct:free', // Using the free Llama 3.2 model
      messages,
      max_tokens: opts.max_tokens ?? 500
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    // MODIFICATION: Changed quotes to backticks for template literal
    throw new Error(`OpenRouter error: ${res.status} - ${txt}`);
  }
  return res.json();
};

// === MAIN ENDPOINT: /run-safety-check ===
app.post('/run-safety-check', async (req, res) => {
  try {
    // This expects the exact structure sent by the React frontend
    const { patient, history, new_prescriptions } = req.body;

    if (!patient || !history || !new_prescriptions) {
      return res.status(400).json({ detail: "Missing patient, history, or new_prescriptions data" });
    }

    // Construct the prompt for the LLM
    const prompt = `You are a clinical pharmacist. Analyze this prescription for safety.

PATIENT:
- Age: ${patient.age}
- Gender: ${patient.gender}
- Reason: ${patient.consultation_reason}

HISTORY:
- Complications: ${history.known_complications}
- Past Meds: ${history.past_medications}

NEW PRESCRIPTION:
${new_prescriptions.map(m => `- ${m.drug_name}: ${m.dosage}, ${m.frequency}`).join('\n')}

Return ONLY valid JSON in this exact format:
{
  "overall_assessment": "Safe" or "Caution" or "High-Risk",
  "flags": [
    {
      "problematic_drug": "Drug name",
      "issue": "Short issue",
      "explanation": "Why it's a problem",
      "suggested_alternative": "Alternative or none"
    }
  ]
}
If safe, return empty flags array.`;

    // Call OpenRouter
    const result = await openRouterFetch(
      [{ role: "user", content: prompt }],
      { max_tokens: 600 } // Increased tokens slightly for potentially complex JSON
    );

    const text = result.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty AI response");

    // Extract JSON from response (robustly handles potential markdown backticks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : text;

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Invalid JSON from AI:", jsonText); // Log the cleaned JSON text
      throw new Error("AI returned invalid JSON format");
    }

    // Basic validation of the parsed structure
    if (!parsed.overall_assessment || !Array.isArray(parsed.flags)) {
      console.error("Invalid AI response structure:", parsed);
      throw new Error("AI response structure does not match expected format");
    }

    res.json(parsed); // Send the validated JSON back to the frontend

  } catch (err) {
    console.error("Safety check failed:", err);
    res.status(500).json({ detail: err.message || "AI analysis failed" });
  }
});

// === HEALTH CHECK ===
app.get('/', (req, res) => {
  res.json({ status: "SmartRX AI Backend Running", model: "Llama 3.2 (OpenRouter)" });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`✅ AI Safety Check Server Running on http://127.0.0.1:${PORT}`);
  console.log(`📍 Endpoint: POST /run-safety-check`);
});
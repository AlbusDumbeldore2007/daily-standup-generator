// Backend URL — points to the Render deployment in production.
// Never an AI API URL. Never an API key.
const BACKEND_URL = "https://standup-generator-y2me.onrender.com";

// ── Character counter ──────────────────────────────────────────────────────
const rawNotesEl = document.getElementById("rawNotes");
const charCountEl = document.getElementById("charCount");

rawNotesEl.addEventListener("input", () => {
  charCountEl.textContent = rawNotesEl.value.length;
});

// ── Main function: call our OWN backend, never the AI directly ─────────────
async function generateStandup() {
  const rawNotes = rawNotesEl.value.trim();
  const blockers = document.getElementById("blockers").value.trim();

  // Client-side validation — stops the network call before it starts.
  // Without this, every empty keystroke could trigger a backend call
  // which would cost money and clutter server logs.
  if (!rawNotes) {
    showError("Please describe what you worked on today before generating.");
    return;
  }

  setLoading(true);
  hideError();
  hideOutput();

  try {
    // All AI logic lives in our backend. This call goes to our Express server,
    // NOT to openrouter.ai — that's the security boundary that matters.
    const response = await fetch(`${BACKEND_URL}/generate-standup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes, blockers }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong. Please try again.");
    }

    showOutput(data.standup);
  } catch (err) {
    // Network failure (backend offline) vs API error both get a useful message.
    if (err.name === "TypeError") {
      showError("Could not reach the server. Check your internet connection and try again.");
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
}

// ── Copy to clipboard ──────────────────────────────────────────────────────
async function copyStandup() {
  const text = document.getElementById("standupOutput").textContent;
  try {
    await navigator.clipboard.writeText(text);
    const confirm = document.getElementById("copyConfirm");
    confirm.classList.remove("hidden");
    setTimeout(() => confirm.classList.add("hidden"), 2500);
  } catch {
    // Fallback for older browsers
    const el = document.getElementById("standupOutput");
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
  }
}

// ── Allow Ctrl+Enter / Cmd+Enter to submit ─────────────────────────────────
rawNotesEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    generateStandup();
  }
});

// ── UI state helpers ───────────────────────────────────────────────────────
function setLoading(isLoading) {
  const btn = document.getElementById("generateBtn");
  const btnText = document.getElementById("btnText");
  const loader = document.getElementById("btnLoader");

  btn.disabled = isLoading;
  btnText.textContent = isLoading ? "Generating…" : "Generate Standup ⚡";
  loader.classList.toggle("hidden", !isLoading);
}

function showOutput(standup) {
  const section = document.getElementById("outputSection");
  const output = document.getElementById("standupOutput");
  output.textContent = standup;
  section.classList.remove("hidden");
}

function hideOutput() {
  document.getElementById("outputSection").classList.add("hidden");
  document.getElementById("copyConfirm").classList.add("hidden");
}

function showError(message) {
  const section = document.getElementById("errorSection");
  document.getElementById("errorMessage").textContent = message;
  section.classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorSection").classList.add("hidden");
}

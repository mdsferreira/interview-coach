// Service worker (MV3). Bundled by esbuild into extension/background.js.
// Responsibilities:
//   1. Toolbar icon / shortcut -> inject (or toggle) the practice panel on the page.
//   2. Receive {type: "tip"} messages from the panel and ask Claude for a tip,
//      falling back to ChatGPT (OpenAI API) if Claude fails or has no key.
// The API keys never leave this extension: they live in chrome.storage.local and
// are only sent to api.anthropic.com / api.openai.com.

import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "claude-opus-5-5",
  openaiKey: "", // backup provider, used when Claude fails
  openaiModel: "gpt-5-mini",
  role: "Senior Python/Django backend engineer",
  speakQuestions: true,
  lang: "en-US", // speech recognition + read-aloud language
  teachMode: false, // panel switch: listen for questions and show model answers
};

const SYSTEM_PROMPT = `You are an interview coach helping a candidate PRACTICE out loud.
The candidate has just answered (or tried to answer) a practice question.

Reply in this exact format, nothing else:

**Key points**
- 2-3 bullets, max 12 words each, the ideas a strong answer must hit

**Say it like this**
1-2 short sentences a confident senior engineer would actually say. Plain, conversational, no buzzword stacking.

**Your answer**
One line of honest feedback on the candidate's answer: what was good, what was missing. If no answer was given, write "No answer captured - try saying it out loud first."

Be concise and natural. No preamble.`;

// Teach mode: the candidate wants to learn how to answer, not get feedback.
const TEACH_PROMPT = `You are an interview coach TEACHING a candidate how to answer an interview question.
The candidate heard the question and wants a strong answer they can learn from and say out loud.

Reply in this exact format, nothing else:

**Key points**
- 2-4 bullets, max 12 words each, the ideas a strong answer must hit

**Answer**
3-6 sentences in first person, the way a confident senior engineer would actually say it out loud. Plain, conversational, concrete (mention a real technique, trade-off or short example). No buzzword stacking.

The question comes from speech-to-text and may have errors; answer the most likely intended question. No preamble.`;

async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

// --- Panel injection --------------------------------------------------------
async function togglePanel(tab) {
  if (!tab?.id || !/^https?:/.test(tab.url ?? "")) return; // chrome:// pages can't be scripted
  // content.js guards against double-injection and toggles the panel if present.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["questions.js", "panel-css.js", "content.js"],
  });
}

chrome.action.onClicked.addListener(togglePanel);

// --- Claude call ---------------------------------------------------------------
export function buildUserMessage({ question, answer, role, mode }) {
  if (mode === "teach") {
    return [`Role being interviewed for: ${role}`, `Question: ${question}`].join("\n");
  }
  return [
    `Role being interviewed for: ${role}`,
    `Question: ${question}`,
    `Candidate's spoken answer (speech-to-text, may have errors): ${answer?.trim() || "(none)"}`,
  ].join("\n");
}

async function getTip({ question, answer, mode }) {
  const settings = await getSettings();
  if (!settings.apiKey && !settings.openaiKey) {
    return { ok: false, error: "no_key" };
  }
  const system = mode === "teach" ? TEACH_PROMPT : SYSTEM_PROMPT;
  const user = buildUserMessage({ question, answer, role: settings.role, mode });

  let claude = null;
  if (settings.apiKey) {
    claude = await askClaude(settings, system, user);
    if (claude.ok) return claude;
  }
  if (!settings.openaiKey) return claude;

  // Backup: ChatGPT.
  const gpt = await askOpenAI(settings, system, user);
  if (gpt.ok) {
    return { ...gpt, source: claude ? `ChatGPT backup (Claude: ${claude.error})` : "ChatGPT" };
  }
  return { ok: false, error: claude ? `Claude: ${claude.error} / ChatGPT: ${gpt.error}` : gpt.error };
}

async function askClaude(settings, system, user) {
  // dangerouslyAllowBrowser: the SDK refuses to run in browser-like contexts by
  // default because a key in a web page is easy to steal. Here the key is the
  // user's own, stored in extension storage and used only by this worker.
  const client = new Anthropic({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true,
    timeout: 60_000,
    maxRetries: 1,
  });

  try {
    const response = await client.beta.messages.create({
      model: settings.model,
      max_tokens: 2000,
      // Low effort keeps latency down; this is a short, simple answer.
      output_config: { effort: "low" },
      // If the model declines, the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "The model declined this question. Try rephrasing it." };
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text ? { ok: true, text } : { ok: false, error: "Empty response, try again." };
  } catch (err) {
    // Most specific first.
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Invalid API key. Check the extension options." };
    }
    if (err instanceof Anthropic.NotFoundError) {
      return { ok: false, error: `Model "${settings.model}" not found. Check the extension options.` };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited. Wait a few seconds and try again." };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: "Network error. Are you online?" };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `API error ${err.status ?? ""}: ${err.message}` };
    }
    return { ok: false, error: String(err?.message ?? err) };
  }
}

// Plain fetch to the Chat Completions API (no SDK, keeps the bundle small).
async function askOpenAI(settings, system, user) {
  const model = settings.openaiModel || DEFAULT_SETTINGS.openaiModel;
  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.openaiKey}` },
      body: JSON.stringify({
        model,
        // Includes reasoning tokens on reasoning models, so leave headroom.
        max_completion_tokens: 4000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, error: err?.name === "TimeoutError" ? "Request timed out." : "Network error. Are you online?" };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) return { ok: false, error: "Invalid OpenAI API key. Check the extension options." };
    if (res.status === 404) return { ok: false, error: `OpenAI model "${model}" not found. Check the extension options.` };
    if (res.status === 429) return { ok: false, error: "OpenAI rate limit or quota reached." };
    return { ok: false, error: `OpenAI error ${res.status}: ${data?.error?.message ?? res.statusText}` };
  }
  const choice = data?.choices?.[0];
  if (choice?.message?.refusal) return { ok: false, error: "ChatGPT declined this question." };
  const text = (choice?.message?.content ?? "").trim();
  return text ? { ok: true, text } : { ok: false, error: "Empty response from ChatGPT, try again." };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "tip") {
    getTip(msg).then(sendResponse);
    return true; // keep the channel open for the async response
  }
  if (msg?.type === "settings") {
    getSettings().then((s) => sendResponse({ speakQuestions: s.speakQuestions, hasKey: !!(s.apiKey || s.openaiKey), hasClaude: !!s.apiKey, hasOpenAI: !!s.openaiKey, lang: s.lang, teachMode: !!s.teachMode }));
    return true;
  }
  if (msg?.type === "openOptions") {
    chrome.runtime.openOptionsPage();
  }
  return false;
});

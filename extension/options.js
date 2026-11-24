// Same defaults as src/background.js (DEFAULT_SETTINGS).
const DEFAULTS = {
  apiKey: "",
  model: "claude-opus-5-5",
  openaiKey: "",
  openaiModel: "gpt-5-mini",
  role: "Senior Python/Django backend engineer",
  speakQuestions: true,
  lang: "en-US",
};
const ids = Object.keys(DEFAULTS);

chrome.storage.local.get(DEFAULTS).then((s) => {
  for (const id of ids) {
    const input = document.getElementById(id);
    if (input.type === "checkbox") input.checked = !!s[id];
    else input.value = s[id] ?? "";
  }
});

document.getElementById("save").addEventListener("click", async () => {
  const values = {};
  for (const id of ids) {
    const input = document.getElementById(id);
    values[id] = input.type === "checkbox" ? input.checked : input.value.trim() || DEFAULTS[id];
  }
  values.apiKey = document.getElementById("apiKey").value.trim(); // empty is allowed
  values.openaiKey = document.getElementById("openaiKey").value.trim();
  await chrome.storage.local.set(values);
  const status = document.getElementById("status");
  status.textContent = "Saved. Reopen the panel to apply.";
  setTimeout(() => (status.textContent = ""), 3000);
});

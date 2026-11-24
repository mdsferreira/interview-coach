// Panel styles, applied inside the panel's Shadow DOM (see content.js).
globalThis.InterviewCoachCSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.panel {
  --bg: #ffffff; --fg: #1d1d1f; --muted: #6e6e73; --line: #e5e5ea; --accent: #2f6fed; --soft: #f4f6fb;
  width: 340px; max-height: 80vh; overflow: auto; color: var(--fg); background: var(--bg);
  border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.18);
  font-size: 13px; line-height: 1.45;
}
@media (prefers-color-scheme: dark) {
  .panel { --bg: #1c1c1e; --fg: #f2f2f7; --muted: #a1a1a6; --line: #38383a; --accent: #5b8cff; --soft: #2c2c2e; }
}
.bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px;
  border-bottom: 1px solid var(--line); cursor: move; user-select: none; }
.title { font-weight: 600; } .title em { font-style: normal; font-weight: 400; color: var(--muted); font-size: 11px; margin-left: 4px; }
.body { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.collapsed .body { display: none; }
.row { display: flex; align-items: center; gap: 6px; }
.status { justify-content: flex-start; } .status button { margin-left: auto; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.dot.on { background: #e5484d; animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: .35; } }
.label { font-weight: 600; margin-top: 4px; } .hint { font-weight: 400; color: var(--muted); }
textarea, .answer { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px;
  background: var(--soft); color: var(--fg); font-size: 13px; height: 100px;}
textarea { resize: vertical; }
.answer { min-height: 48px; max-height: 120px; overflow: auto; }
.interim { color: var(--muted); }
.heard { font-size: 12px; color: var(--muted); }
button { font: inherit; font-size: 12px; padding: 5px 10px; border-radius: 7px; border: 1px solid var(--line);
  background: var(--bg); color: var(--fg); cursor: pointer; }
button:hover { border-color: var(--accent); }
button:disabled { opacity: .5; cursor: default; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.icon { border: none; background: none; font-size: 16px; padding: 0 6px; color: var(--muted); }
button.link { border: none; background: none; padding: 0; color: var(--accent); text-decoration: underline; }
.actions button { flex: 1; }
.tip { border-left: 3px solid var(--accent); background: var(--soft); border-radius: 6px; padding: 8px 10px; }
.tip p { margin: 4px 0; } .tip ul { margin: 2px 0 6px; padding-left: 18px; } .tip li { margin: 2px 0; }
.tip .source, .muted { color: var(--muted); font-size: 11px; }
.footer { color: var(--muted); font-size: 11px; }
.mode { justify-content: space-between; }
.mode-hint { color: var(--muted); font-size: 11px; }
.switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; user-select: none; }
.switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch .track { position: relative; width: 32px; height: 18px; border-radius: 9px; background: var(--line); transition: background .15s; }
.switch .track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: transform .15s; }
.switch input:checked + .track { background: var(--accent); }
.switch input:checked + .track::after { transform: translateX(14px); }
.switch input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; }
.hidden { display: none !important; }
`;

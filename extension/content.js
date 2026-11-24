// Floating practice panel. Injected on demand by the service worker when you
// click the toolbar icon (or press the shortcut). Clicking again toggles it.
//
// Flow:
//   1. Listen: speech is transcribed; when a segment looks like a question it
//      becomes the current question (or click "Ask me" for a random one,
//      read aloud by the browser).
//   2. Answer out loud: everything said after the question is your answer.
//   3. Click "Show tip": key points, a natural way to say it, and feedback.
//
// Teach mode (switch at the top): the mic only listens for questions. Each
// detected question replaces the current one, and "Show tip" shows a full
// model answer instead of feedback on yours.
(function () {
  if (window.__interviewCoach) {
    window.__interviewCoach.toggle();
    return;
  }

  const IC = globalThis.InterviewCoach;
  const SILENCE_MS = 1300; // pause length that ends a spoken segment

  // ---------------------------------------------------------------- state
  const state = {
    listening: false,
    phase: "question", // "question" -> waiting for a question, "answer" -> recording your answer
    question: "",
    answer: "",
    interim: "",
    segment: "",
    lastHeard: "",
    teach: true, // teach mode: listen for questions only, "Show tip" gives the answer
    settings: { speakQuestions: true, hasKey: false, lang: "en-US" },
  };

  // ---------------------------------------------------------------- DOM
  const host = document.createElement("div");
  host.id = "interview-coach-host";
  host.style.cssText =
    "all: initial; position: fixed; z-index: 2147483647; top: 16px; right: 16px;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <div class="panel" role="dialog" aria-label="Interview Coach">
      <header class="bar">
        <span class="title">Interview Coach <em>practice</em></span>
        <span class="bar-actions">
          <button class="icon" data-act="collapse" title="Collapse">–</button>
          <button class="icon" data-act="close" title="Close">×</button>
        </span>
      </header>
      <div class="body">
        <div class="row mode">
          <label class="switch">
            <input type="checkbox" class="mode-toggle" />
            <span class="track"></span>
            <span>Teach mode</span>
          </label>
          <span class="mode-hint"></span>
        </div>

        <div class="row status">
          <span class="dot"></span><span class="status-text">Mic off</span>
          <button data-act="mic" class="primary">Start listening</button>
        </div>

        <label class="label">Question</label>
        <textarea class="question" rows="2" placeholder="Speak, type, or click “Ask me”…"></textarea>
        <div class="heard hidden">
          Heard: “<span class="heard-text"></span>”
          <button class="link" data-act="use-heard">Use as question</button>
        </div>

        <label class="label answer-label">Your answer <span class="hint">(say it out loud)</span></label>
        <div class="answer"><span class="final"></span><span class="interim"></span></div>

        <div class="row actions">
          <button data-act="ask">🎲 Ask me</button>
          <button data-act="tip" class="primary">Show tip</button>
          <button data-act="next">Next</button>
        </div>

        <div class="tip hidden" aria-live="polite"></div>
        <div class="footer"></div>
      </div>
    </div>`;
  // Constructable stylesheet: not affected by the host page's CSS or its
  // Content-Security-Policy (a <link>/<style> tag could be blocked).
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(globalThis.InterviewCoachCSS || "");
  root.adoptedStyleSheets = [sheet];
  document.documentElement.appendChild(host);

  const $ = (sel) => root.querySelector(sel);
  const el = {
    panel: $(".panel"),
    bar: $(".bar"),
    body: $(".body"),
    dot: $(".dot"),
    statusText: $(".status-text"),
    mic: $('[data-act="mic"]'),
    question: $(".question"),
    heard: $(".heard"),
    heardText: $(".heard-text"),
    final: $(".answer .final"),
    interim: $(".answer .interim"),
    tip: $(".tip"),
    footer: $(".footer"),
    tipBtn: $('[data-act="tip"]'),
    modeToggle: $(".mode-toggle"),
    modeHint: $(".mode-hint"),
    answerLabel: $(".answer-label"),
    answer: $(".answer"),
  };

  // ---------------------------------------------------------------- rendering
  function render() {
    el.dot.className = "dot " + (state.listening ? "on" : "");
    el.statusText.textContent = !state.listening
      ? "Mic off"
      : state.teach
        ? "Listening for questions…"
        : state.phase === "question"
          ? "Listening for a question…"
          : "Recording your answer…";
    el.modeToggle.checked = state.teach;
    el.modeHint.textContent = state.teach
      ? "Tip shows the answer"
      : "Practice: you answer";
    el.answerLabel.classList.toggle("hidden", state.teach);
    el.answer.classList.toggle("hidden", state.teach);
    el.tipBtn.textContent = state.teach ? "Show answer" : "Show tip";
    el.mic.textContent = state.listening ? "Stop" : "Start listening";
    if (
      document.activeElement !== el.question &&
      el.question.value !== state.question
    ) {
      el.question.value = state.question;
    }
    el.final.textContent = state.answer;
    el.interim.textContent = state.interim ? " " + state.interim : "";
    el.heard.classList.toggle("hidden", !state.lastHeard);
    el.heardText.textContent = state.lastHeard;
    const s = state.settings;
    el.footer.innerHTML = s.hasKey
      ? s.hasClaude && s.hasOpenAI
        ? "Tips by Claude, ChatGPT as backup, then the offline bank."
        : s.hasClaude
          ? "Tips by Claude. Offline bank used as fallback."
          : "Tips by ChatGPT. Offline bank used as fallback."
      : 'Offline question bank only. <button class="link" data-act="options">Add an API key</button> for tips on any question.';
  }

  // Tiny, safe markdown: escape HTML first, then **bold** and "- " bullets.
  function renderTip(text, source) {
    const esc = (s) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    let html = "",
      inList = false;
    for (const line of text.split("\n")) {
      const l = esc(line.trim()).replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>",
      );
      if (/^[-•*] /.test(line.trim())) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${l.replace(/^[-•*] /, "")}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (l) html += `<p>${l}</p>`;
      }
    }
    if (inList) html += "</ul>";
    el.tip.innerHTML =
      html + (source ? `<p class="source">${esc(source)}</p>` : "");
    el.tip.classList.remove("hidden");
  }

  function showTipMessage(msg) {
    el.tip.innerHTML = "";
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = msg;
    el.tip.appendChild(p);
    el.tip.classList.remove("hidden");
  }

  // ---------------------------------------------------------------- question flow
  function setQuestion(q) {
    state.question = q.trim();
    state.answer = "";
    state.interim = "";
    state.lastHeard = "";
    // In teach mode keep listening for the next question instead of recording an answer.
    state.phase = state.teach ? "question" : "answer";
    el.tip.classList.add("hidden");
    render();
  }

  function setTeachMode(on) {
    state.teach = !!on;
    flushSegment();
    state.interim = "";
    state.phase = !state.teach && state.question.trim() ? "answer" : "question";
    el.tip.classList.add("hidden");
    chrome.storage?.local.set({ teachMode: state.teach }).catch(() => {});
    render();
  }

  function nextQuestion() {
    state.question = "";
    state.answer = "";
    state.interim = "";
    state.lastHeard = "";
    state.phase = "question";
    el.tip.classList.add("hidden");
    render();
  }

  function handleSegment(text) {
    text = text.trim();
    if (!text) return;
    if (state.phase === "question") {
      if (IC.looksLikeQuestion(text)) setQuestion(text);
      else {
        state.lastHeard = text;
        render();
      }
    } else {
      state.answer = (state.answer + " " + text).trim();
      render();
    }
  }

  // ---------------------------------------------------------------- speech recognition
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let silenceTimer = null;

  function flushSegment() {
    clearTimeout(silenceTimer);
    const seg = state.segment;
    state.segment = "";
    handleSegment(seg);
  }

  function startListening() {
    if (!SR) {
      showTipMessage(
        "Speech recognition isn't available in this browser. You can still type a question.",
      );
      return;
    }
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = state.settings.lang || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) state.segment += " " + r[0].transcript;
        else interim += r[0].transcript;
      }
      state.interim = interim;
      render();
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(flushSegment, SILENCE_MS);
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        state.listening = false;
        showTipMessage(
          "Microphone permission was denied for this site. Allow it in the address bar and try again.",
        );
        render();
      }
      // "no-speech" / "network" fall through to onend, which restarts.
    };
    // Chrome ends recognition after a while; restart while we still want to listen.
    recognition.onend = () => {
      if (state.listening) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    state.listening = true;
    recognition.start();
    render();
  }

  function stopListening() {
    state.listening = false;
    flushSegment();
    state.interim = "";
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
    render();
  }

  // ---------------------------------------------------------------- actions
  function askMe() {
    const item = IC.randomQuestion(state.question);
    setQuestion(item.q);
    if (!state.settings.speakQuestions || !window.speechSynthesis) return;

    // Pause the mic while the browser reads the question, so it isn't recorded as your answer.
    const wasListening = state.listening;
    if (wasListening) stopListening();
    const utter = new SpeechSynthesisUtterance(item.q);
    utter.lang = state.settings.lang || "en-US";
    utter.rate = 1.0;
    utter.onend = () => {
      if (wasListening || state.phase === "answer") startListening();
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  async function showTip() {
    flushSegment();
    const question = el.question.value.trim();
    if (!question) {
      showTipMessage(
        "No question yet. Speak one, type one, or click “Ask me”.",
      );
      return;
    }
    state.question = question;
    const bankItem = IC.findInBank(question);
    const mode = state.teach ? "teach" : "practice";

    if (!state.settings.hasKey) {
      if (bankItem)
        renderTip(
          `**Key points**\n${bankItem.tip}`,
          "From the offline question bank",
        );
      else
        showTipMessage(
          "This question isn't in the offline bank. Add an API key in the options for tips on any question.",
        );
      return;
    }

    el.tipBtn.disabled = true;
    showTipMessage("Thinking…");
    try {
      const res = await chrome.runtime.sendMessage({
        type: "tip",
        mode,
        question,
        answer: state.teach ? "" : state.answer,
      });
      if (res?.ok) renderTip(res.text, res.source);
      else if (bankItem)
        renderTip(
          `**Key points**\n${bankItem.tip}`,
          `Offline bank (Claude error: ${res?.error ?? "unknown"})`,
        );
      else
        showTipMessage(
          res?.error === "no_key"
            ? "Add an API key in the extension options."
            : (res?.error ?? "Something went wrong."),
        );
    } catch (e) {
      // Usually: the extension was reloaded and this page has a stale script.
      showTipMessage(
        "Lost connection to the extension. Reload the page and open the panel again.",
      );
    } finally {
      el.tipBtn.disabled = false;
    }
  }

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    switch (act) {
      case "mic":
        state.listening ? stopListening() : startListening();
        break;
      case "ask":
        askMe();
        break;
      case "tip":
        showTip();
        break;
      case "next":
        nextQuestion();
        break;
      case "use-heard":
        setQuestion(state.lastHeard);
        break;
      case "options":
        chrome.runtime.sendMessage({ type: "openOptions" });
        break;
      case "collapse":
        el.panel.classList.toggle("collapsed");
        break;
      case "close":
        toggle();
        break;
    }
  });

  el.modeToggle.addEventListener("change", () =>
    setTeachMode(el.modeToggle.checked),
  );

  // Typing a question manually switches to "answer" mode (practice only).
  el.question.addEventListener("input", () => {
    state.question = el.question.value;
    if (state.question.trim() && !state.teach) state.phase = "answer";
  });
  // Don't let the host page's keyboard shortcuts react while typing in the panel.
  el.question.addEventListener("keydown", (e) => e.stopPropagation());

  // ---------------------------------------------------------------- dragging
  el.bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const rect = host.getBoundingClientRect();
    const dx = e.clientX - rect.left,
      dy = e.clientY - rect.top;
    const move = (ev) => {
      const x = Math.min(
        Math.max(0, ev.clientX - dx),
        window.innerWidth - rect.width,
      );
      const y = Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - 40);
      host.style.left = x + "px";
      host.style.top = y + "px";
      host.style.right = "auto";
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  // ---------------------------------------------------------------- show / hide
  function toggle() {
    const hidden = host.style.display === "none";
    host.style.display = hidden ? "" : "none";
    if (!hidden) {
      if (state.listening) stopListening();
      window.speechSynthesis?.cancel();
    }
  }
  window.__interviewCoach = { toggle };

  chrome.runtime
    .sendMessage({ type: "settings" })
    .then((s) => {
      if (s) {
        const { teachMode, ...rest } = s;
        Object.assign(state.settings, rest);
        state.teach = !!teachMode;
      }
      render();
    })
    .catch(() => render());
  render();
})();

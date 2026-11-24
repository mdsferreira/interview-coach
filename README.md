# Interview Coach (practice)

A Chrome extension for **practicing** interview answers out loud. It opens a floating
panel on any tab, listens for a question, records your spoken answer, and on request
shows short, natural tips plus feedback on what you said.

## Install

```bash
cd ~/apps/interview-coach
npm install
npm run build        # bundles src/background.js -> extension/background.js
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder.
3. Open the extension's **Details → Extension options**. Add your Anthropic API key
   (optional, see below) and the role you're practicing for.

## Use

1. Go to any normal web page (http/https, not `chrome://` pages). Click the toolbar
   icon or press **Alt+Shift+I** to open or close the panel.
2. Get a question in one of three ways:
   - Click **🎲 Ask me**. The panel picks a question from the bank and reads it aloud.
   - Click **Start listening** and play a mock-interview video, or have a friend ask
     you. When a sentence sounds like a question, it becomes the current question.
     If detection misses one, click **Use as question** under "Heard".
   - Type or paste a question.
3. Answer out loud. Your answer is transcribed live.
4. Click **Show tip** to see key points, a natural way to say it, and one line of
   feedback on your answer. Then click **Next**.

### Teach mode

Turn on the **Teach mode** switch at the top of the panel to learn answers instead of
practicing them. The mic only listens for questions, and each one it detects replaces
the current question. Your answer isn't recorded. Click **Show answer** to get the key
points and a full sample answer. The switch setting is remembered.

Chrome will ask for microphone permission the first time on each site. Use headphones
if you don't want video audio mixed into your answer.

## With or without an API key

- **Without a key:** tips come from the built-in bank of ~27 senior Django/Python and
  behavioral questions (`extension/questions.js`). Paraphrased questions still match.
- **With a key:** tips for any question, from `claude-opus-5-5` at low effort, so
  replies come back fast. The model can be changed in the options. Refusal fallback is
  turned on (`fallbacks: "default"`): if the model declines, the API retries on a
  suitable fallback model.
- **Backup (ChatGPT):** add an OpenAI API key in the options. If Claude fails (error,
  timeout, rate limit, refusal) or has no key, the same prompt goes to ChatGPT
  (`gpt-5-mini` by default, changeable). The tip says when the backup answered. If both
  fail, the offline bank is used when it has the question.

Keys are stored in `chrome.storage.local` and only sent to `api.anthropic.com` /
`api.openai.com` from the service worker. Pages you visit never see them.

## Project layout

| File | What it does |
|---|---|
| `src/background.js` | Service worker: injects the panel, calls Claude via `@anthropic-ai/sdk` |
| `extension/content.js` | The panel: speech recognition, question flow, tip rendering |
| `extension/questions.js` | Question bank, question detection, fuzzy matching |
| `extension/panel-css.js` | Panel styles (Shadow DOM, light and dark) |
| `extension/options.*` | Settings page |
| `tests/` | `npm test` |

After editing `src/background.js`, run `npm run build` again and click reload on
`chrome://extensions`. Edits to `extension/*` only need the reload.

## Limitations

- Speech-to-text uses Chrome's built-in Web Speech API. It sends audio to Google's
  speech service and needs a network connection.
- The mic picks up everything in the room, so the panel can't tell your voice apart
  from the interviewer's. That's why it switches from "question" to "answer" mode
  after it detects a question.

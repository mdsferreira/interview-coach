// Question bank + helpers. Loaded as a classic script before content.js
// (exposed on globalThis.InterviewCoach) and also requirable from Node tests.
(function () {
  // Offline tips: used when no API key is set, or when the question matches.
  // Drawn from the django-study project's README.
  const BANK = [
    {
      q: "What is the N+1 query problem and how do you fix it in Django?",
      tip: "- One query for the list, then one extra query per row for a relation\n- select_related for FK/one-to-one (SQL JOIN), prefetch_related for reverse FK/M2M\n- Catch it in tests with assertNumQueries",
    },
    {
      q: "What is the difference between select_related and prefetch_related?",
      tip: "- select_related: single query with a JOIN, for FK and one-to-one\n- prefetch_related: separate query, joined in Python, for reverse FK and M2M\n- Prefetch() objects let you customize the inner queryset",
    },
    {
      q: "Are Django QuerySets lazy? When are they evaluated?",
      tip: "- Yes, no SQL runs until evaluation\n- Iteration, list(), len(), bool(), count(), exists(), first()\n- Evaluated results are cached on that QuerySet instance",
    },
    {
      q: "What is the difference between aggregate and annotate?",
      tip: "- aggregate returns one dict for the whole queryset\n- annotate adds a computed value to each row\n- values() then annotate() gives you GROUP BY",
    },
    {
      q: "How do you prevent race conditions when updating stock in Django?",
      tip: "- Wrap in transaction.atomic()\n- Lock rows with select_for_update(), in a consistent order to avoid deadlocks\n- Use F('stock') - qty so the database does the math",
    },
    {
      q: "What are F expressions and Q objects?",
      tip: "- F references a column value inside the database, avoids read-modify-write races\n- Q builds complex filters with OR (|), AND (&), NOT (~)",
    },
    {
      q: "What does transaction.on_commit do and when would you use it?",
      tip: "- Runs a callback only after the transaction commits\n- Use it for emails, Celery tasks, webhooks\n- Avoids side effects for data that got rolled back",
    },
    {
      q: "Explain the Django request lifecycle.",
      tip: "- WSGI/ASGI server hands the request to Django\n- Middleware request phase, URL resolver, view\n- Response goes back up through middleware to the client",
    },
    {
      q: "How does Django middleware work?",
      tip: "- Onion model: request top to bottom, response bottom to top\n- __init__ runs once, __call__ runs per request\n- Hooks: process_view, process_exception, process_template_response",
    },
    {
      q: "When should you use Django signals, and what are the downsides?",
      tip: "- Good for decoupling: caching, auditing, third-party apps reacting\n- Bad for core business logic: hidden control flow, harder to test\n- Don't fire on update(), bulk_create(), or raw SQL",
    },
    {
      q: "Why should you use a custom user model in Django?",
      tip: "- Swapping it after the first migration is very painful\n- AbstractUser to extend, AbstractBaseUser for full control\n- Reference it with settings.AUTH_USER_MODEL and get_user_model()",
    },
    {
      q: "What are the types of model inheritance in Django?",
      tip: "- Abstract base: no table, fields copied to children, most common\n- Multi-table: a table per class joined by one-to-one, costs JOINs\n- Proxy: same table, different Python behavior",
    },
    {
      q: "Where should business logic live in a Django project?",
      tip: "- Small invariants on the model, query logic on custom QuerySets\n- Multi-model workflows in a service layer\n- Thin views; services are reusable from API, admin, tasks",
    },
    {
      q: "What is the difference between a data migration and a schema migration?",
      tip: "- Schema migration changes tables; data migration changes rows with RunPython\n- Use apps.get_model for the historical model\n- Always provide a reverse function",
    },
    {
      q: "How do you run migrations safely in production?",
      tip: "- Backwards-compatible: expand, deploy, then contract\n- Split data and schema migrations; avoid long table locks\n- Inspect with sqlmigrate and --plan; add indexes concurrently on Postgres",
    },
    {
      q: "How does caching work in Django?",
      tip: "- Per-view cache_page, template fragment cache, low-level cache API\n- Redis in production\n- Invalidation is the hard part: signals or versioned keys",
    },
    {
      q: "What are the differences between class-based views and function-based views?",
      tip: "- FBVs are explicit and simple for one-off logic\n- CBVs reuse behavior through inheritance and mixins\n- Mixins go left of the base view because of MRO",
    },
    {
      q: "How do async views work in Django?",
      tip: "- async def views run on the event loop under ASGI\n- Use async ORM methods like aget, acount, or sync_to_async\n- Worth it for I/O-bound work, not CPU-bound",
    },
    {
      q: "What is the difference between WSGI and ASGI?",
      tip: "- WSGI is synchronous, one request per worker thread\n- ASGI supports async, websockets, long-lived connections\n- Django supports both; pick ASGI for async-heavy workloads",
    },
    {
      q: "How does Django protect against CSRF, XSS and SQL injection?",
      tip: "- CSRF: middleware plus the csrf_token in forms\n- XSS: templates auto-escape; avoid |safe on user input\n- SQL injection: ORM parameterizes; be careful with raw()",
    },
    {
      q: "What is the difference between has_permission and has_object_permission in DRF?",
      tip: "- has_permission runs on every request\n- has_object_permission runs only via get_object()\n- List endpoints need queryset scoping in get_queryset()",
    },
    {
      q: "How do DRF serializers validate data?",
      tip: "- Field validation, then validate_<field>(), then validate()\n- is_valid(raise_exception=True) returns a 400 with details\n- Separate input and output serializers when shapes differ",
    },
    {
      q: "What is the difference between TestCase and TransactionTestCase?",
      tip: "- TestCase wraps each test in a rolled-back transaction, fast\n- TransactionTestCase really commits, slow\n- Use captureOnCommitCallbacks to test on_commit with TestCase",
    },
    {
      q: "How would you scale a Django application?",
      tip: "- Fix queries first: indexes, select_related, pagination\n- Caching with Redis, connection pooling, read replicas\n- Move slow work to background jobs like Celery",
    },
    {
      q: "Why should you never use FloatField for money?",
      tip: "- Floats are binary approximations, rounding errors add up\n- Use DecimalField with fixed decimal places",
    },
    {
      q: "Tell me about a challenging project you worked on.",
      tip: "- Use STAR: situation, task, action, result\n- Focus on your decisions and trade-offs\n- End with a measurable result and what you learned",
    },
    {
      q: "Tell me about yourself.",
      tip: "- 60-90 seconds: present role, past highlights, why this job\n- Pick 2 achievements relevant to the role\n- End by connecting to what they need",
    },
  ];

  const QUESTION_STARTERS = [
    "what", "why", "how", "when", "where", "which", "who", "whose",
    "can you", "could you", "would you", "will you", "do you", "did you", "have you",
    "are you", "is there", "is it", "are there", "should", "explain", "describe",
    "tell me", "walk me through", "talk about", "give me an example", "share an example",
    "what's", "how's", "difference between", "compare",
  ];

  const STOPWORDS = new Set(
    "a an the is are was were do does did you your to of in on for and or what how why when which with can could would should me i it its this that be about between django".split(" ")
  );

  function normalize(text) {
    return (text || "").toLowerCase().replace(/[^a-z0-9_\s']/g, " ").replace(/\s+/g, " ").trim();
  }

  /** Heuristic: does this spoken segment look like an interview question? */
  function looksLikeQuestion(text) {
    const raw = (text || "").trim();
    if (raw.endsWith("?")) return true;
    const t = normalize(raw);
    if (t.split(" ").length < 4) return false; // too short to be a real question
    return QUESTION_STARTERS.some((s) => t.startsWith(s + " ") || t.includes(" " + s + " "));
  }

  function tokens(text) {
    return normalize(text).split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w));
  }

  /** Best bank entry for a question (Jaccard-like overlap), or null if weak. */
  function findInBank(question, minScore = 0.34) {
    const qt = new Set(tokens(question));
    if (!qt.size) return null;
    let best = null;
    for (const item of BANK) {
      const it = new Set(tokens(item.q));
      let common = 0;
      for (const w of qt) if (it.has(w)) common++;
      const score = common / Math.min(qt.size, it.size);
      if (!best || score > best.score) best = { item, score };
    }
    return best && best.score >= minScore ? best.item : null;
  }

  function randomQuestion(exclude) {
    const pool = BANK.filter((b) => b.q !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const api = { BANK, looksLikeQuestion, findInBank, randomQuestion, normalize };
  globalThis.InterviewCoach = api;
  if (typeof module !== "undefined") module.exports = api;
})();

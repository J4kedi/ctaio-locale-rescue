# CTAIO Locale Rescue

ctaio.dev's `/en/` and `/de/` pages declare French, Brazilian Portuguese and Spanish versions (hreflang) that answer **403**. This repo has two parts:

1. **`ctaio-audit.mjs`**: a zero-dependency Node 18+ script. It requests every hreflang and canonical target on a page and flags `href="#"` links. It exits 1 on a finding, so it can gate a deploy.
2. **`index.html` + `core.js`**: a rule-checked AI localization of the site's UI strings into pt-BR, es and fr. The model's reply goes through deterministic checks: every key present, brand names untouched, numbers and symbols kept, "AI" written as "IA". Failures go back to the model once, as an exact list. The model never grades itself.

```
node ctaio-audit.mjs https://ctaio.dev/en/
node ctaio-audit.mjs --self-test
node test.cjs
```

Open `index.html` to see the page. Sample replies are pre-rendered; the live "Run with Claude" button only appears inside a Claude artifact viewer.

Built with Claude Code (Opus 5.5) on 1 Oct 2026.

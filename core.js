// Shared by the page and test.cjs. The checks are deterministic: the model never grades itself.
const SOURCE = {
  meta_title: "CTAIO — The Newsletter for Technology's Next C-Suite Role",
  meta_description: "Weekly intelligence on AI strategy, enterprise infrastructure, and the convergence of CTO + CIO + AI. By a practitioner who ships code and runs the org.",
  hero_eyebrow: "TECH LEADERSHIP IN THE AI ERA",
  hero_title: "The Weekly Newsletter for Technology's Next C-Suite Role",
  cta_subscribe: "Subscribe free",
  nav_jobs: "Jobs",
  nav_ask_ai: "Ask AI",
  nav_weekly_ai_edge: "Weekly AI Edge",
  card_salary_guide: "CTO Salary Guide (2026)",
  card_strategy_brief: "Weekly AI Strategy Brief",
  card_podcast: "CTAIO Labs Podcast",
  cta_view_roles: "View all roles →",
  cta_post_role: "Post a role →",
};
// Longest first, so "CTAIO Labs" is consumed before "CTAIO".
const PROTECTED = ["Weekly AI Edge", "CTAIO Labs", "CTAIO", "CTO", "CIO"];
const LOCALES = {
  "pt-BR": { name: "Brazilian Portuguese", market: "Brazil" },
  es: { name: "Spanish", market: "Spain and Latin America" },
  fr: { name: "French", market: "France" },
};

function buildPrompt(locale) {
  const L = LOCALES[locale];
  return [
    `You are a senior localizer for ctaio.dev, a weekly newsletter for engineering leaders growing into the CTAIO role (CTO + CIO + AI). Translate the UI strings below from English into ${L.name} (${locale}).`,
    "",
    `Audience: CTOs, VPs of Engineering and tech executives in ${L.market}. Tone: direct, practitioner, no hype. Prefer the words a tech executive there actually uses over a literal translation.`,
    "",
    "Hard rules. A script checks every one and sends failures back to you:",
    "1. Return every key exactly once. Add no keys.",
    `2. Copy these names exactly, never translated or inflected: ${PROTECTED.join(", ")}.`,
    '3. Keep every number and the symbols "+" and "→" exactly as in the source.',
    '4. Outside those names, write "AI" as "IA".',
    "",
    "Soft rules:",
    "5. Keys starting with nav_ or cta_ are navigation and buttons: keep them short. If the natural label is much longer than the English, keep it and say so in notes.",
    "6. If a phrase has no natural equivalent, translate the meaning and explain the choice in notes.",
    "",
    'Reply with only this JSON: {"strings": {"<key>": "<translation>"}, "notes": ["<one choice a human editor should review>"]}',
    "",
    "Strings:",
    JSON.stringify(SOURCE, null, 2),
  ].join("\n");
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// JavaScript's \b only knows ASCII letters (accented letters count as boundaries), so use Unicode lookarounds.
const word = (w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "gu");
const count = (text, token) => text.split(token).length - 1;

function validate(out) {
  const hard = [], soft = [];
  const strings = out && typeof out === "object" && out.strings && typeof out.strings === "object" ? out.strings : null;
  if (!strings) return { hard: [{ key: "*", check: "keys", msg: 'Reply has no "strings" object.' }], soft, notes: [] };
  for (const k of Object.keys(SOURCE)) {
    if (typeof strings[k] !== "string" || !strings[k].trim()) hard.push({ key: k, check: "keys", msg: `Missing key "${k}".` });
  }
  for (const k of Object.keys(strings)) if (!(k in SOURCE)) hard.push({ key: k, check: "keys", msg: `Unexpected key "${k}".` });
  for (const [k, src] of Object.entries(SOURCE)) {
    const t = strings[k];
    if (typeof t !== "string") continue;
    let s = src, rest = t;
    for (const name of PROTECTED) {
      const need = (s.match(word(name)) || []).length;
      if ((rest.match(word(name)) || []).length < need) hard.push({ key: k, check: "protected", msg: `"${name}" must appear exactly as written.` });
      s = s.replace(word(name), " ");
      rest = rest.replace(word(name), " ");
    }
    for (const tok of new Set(src.match(/\d+|[+→]/g) || [])) {
      if (count(t, tok) < count(src, tok)) hard.push({ key: k, check: "numbers", msg: `Keep "${tok}" exactly as in the source.` });
    }
    if (word("AI").test(rest)) hard.push({ key: k, check: "glossary", msg: 'Write "AI" as "IA" outside product names.' });
    if (/^(nav|cta)_/.test(k)) {
      const limit = Math.max(Math.ceil(src.length * 1.6), src.length + 6);
      if (t.length > limit) soft.push({ key: k, check: "length", msg: `${t.length} chars vs ${src.length} in English (limit ${limit}): check the layout.` });
    }
  }
  const notes = Array.isArray(out.notes) ? out.notes.filter((n) => typeof n === "string").slice(0, 8) : [];
  return { hard, soft, notes };
}

function repairPrompt(failures) {
  return "A script rejected your reply. Fix only these problems and return the complete JSON again, same format:\n" +
    failures.map((f) => `- ${f.key}: ${f.msg}`).join("\n");
}

// The mistakes a model really makes here: brand inflected, glossary applied inside a product name,
// a number dropped, "AI" left in English, a key lost, a key invented.
function corrupt(o) {
  const s = { ...o.strings };
  s.meta_title = s.meta_title.replace("CTAIO", "CTAIA");
  s.hero_eyebrow = s.hero_eyebrow.replace(/IA$/, "AI");
  s.card_salary_guide = s.card_salary_guide.replace(" (2026)", "");
  s.nav_weekly_ai_edge = "Weekly IA Edge";
  delete s.cta_post_role;
  s.nav_home = "Home";
  return { strings: s, notes: [] };
}

// Written by Claude (Opus 5.5, in Claude Code) from buildPrompt() on 1 Oct 2026.
const SAMPLES = {
  "pt-BR": {
    strings: {
      meta_title: "CTAIO — A newsletter para o próximo cargo C-level da tecnologia",
      meta_description: "Análise semanal sobre estratégia de IA, infraestrutura corporativa e a convergência de CTO + CIO + IA. Por quem coloca código em produção e lidera a área.",
      hero_eyebrow: "LIDERANÇA EM TECNOLOGIA NA ERA DA IA",
      hero_title: "A newsletter semanal sobre o próximo cargo C-level da tecnologia",
      cta_subscribe: "Assine grátis",
      nav_jobs: "Vagas",
      nav_ask_ai: "Pergunte à IA",
      nav_weekly_ai_edge: "Weekly AI Edge",
      card_salary_guide: "Guia salarial de CTO (2026)",
      card_strategy_brief: "Briefing semanal de estratégia de IA",
      card_podcast: "Podcast CTAIO Labs",
      cta_view_roles: "Ver todas as vagas →",
      cta_post_role: "Anunciar uma vaga →",
    },
    notes: [
      "\"C-Suite\" became \"C-level\", the term Brazilian executives use.",
      "\"Ask AI\" is longer in Portuguese (13 vs 6 chars): check the nav at mobile width, or use \"IA\" alone.",
      "\"Newsletter\" kept as a loanword, standard in Brazilian tech media.",
    ],
  },
  es: {
    strings: {
      meta_title: "CTAIO — La newsletter del próximo cargo C-level en tecnología",
      meta_description: "Análisis semanal sobre estrategia de IA, infraestructura empresarial y la convergencia de CTO + CIO + IA. Escrito por alguien que lleva código a producción y dirige la organización.",
      hero_eyebrow: "LIDERAZGO TECNOLÓGICO EN LA ERA DE LA IA",
      hero_title: "La newsletter semanal del próximo cargo C-level en tecnología",
      cta_subscribe: "Suscríbete gratis",
      nav_jobs: "Empleos",
      nav_ask_ai: "Pregunta a la IA",
      nav_weekly_ai_edge: "Weekly AI Edge",
      card_salary_guide: "Guía salarial de CTO (2026)",
      card_strategy_brief: "Informe semanal de estrategia de IA",
      card_podcast: "Podcast CTAIO Labs",
      cta_view_roles: "Ver todos los puestos →",
      cta_post_role: "Publicar un puesto →",
    },
    notes: [
      "\"C-Suite\" kept as \"C-level\", understood in Spain and Latin America; \"alta dirección\" is the formal option.",
      "Used tú (\"Suscríbete\", \"Pregunta\"), the norm for newsletters; switch to usted for a formal voice.",
      "\"Ask AI\" is longer in Spanish (16 vs 6 chars): check the nav at mobile width.",
    ],
  },
  fr: {
    strings: {
      meta_title: "CTAIO — La newsletter du prochain poste C-level de la tech",
      meta_description: "Une analyse hebdomadaire de la stratégie IA, de l'infrastructure d'entreprise et de la convergence CTO + CIO + IA. Par un praticien qui livre du code et dirige l'organisation.",
      hero_eyebrow: "LE LEADERSHIP TECH À L'ÈRE DE L'IA",
      hero_title: "La newsletter hebdomadaire du prochain poste C-level de la tech",
      cta_subscribe: "S'abonner gratuitement",
      nav_jobs: "Emplois",
      nav_ask_ai: "Demander à l'IA",
      nav_weekly_ai_edge: "Weekly AI Edge",
      card_salary_guide: "Guide des salaires CTO (2026)",
      card_strategy_brief: "Brief hebdomadaire stratégie IA",
      card_podcast: "Podcast CTAIO Labs",
      cta_view_roles: "Voir tous les postes →",
      cta_post_role: "Publier une offre →",
    },
    notes: [
      "\"C-Suite\" became \"C-level\", common in the French business press; \"comité de direction\" is the formal option.",
      "Kept \"tech\": French tech media use it more than \"technologie\" in headlines.",
      "\"Ask AI\" is longer in French (15 vs 6 chars): check the nav at mobile width.",
    ],
  },
};

if (typeof module !== "undefined") module.exports = { SOURCE, PROTECTED, LOCALES, buildPrompt, validate, repairPrompt, corrupt, SAMPLES };

const assert = require("node:assert/strict");
const { validate, corrupt, buildPrompt, repairPrompt, SAMPLES } = require("./core.js");

for (const [loc, s] of Object.entries(SAMPLES)) {
  const v = validate(s);
  assert.deepEqual(v.hard, [], `${loc} sample must pass the hard checks`);
  assert.deepEqual(v.soft.map((f) => f.key), ["nav_ask_ai"], `${loc}: only "Ask AI" runs long`);
  const bad = validate(corrupt(s));
  assert.deepEqual(bad.hard.map((f) => `${f.key}:${f.check}`).sort(), [
    "card_salary_guide:numbers", "cta_post_role:keys", "hero_eyebrow:glossary",
    "meta_title:protected", "nav_home:keys", "nav_weekly_ai_edge:protected",
  ], `${loc}: corrupt() must trip exactly six hard checks`);
  assert.match(buildPrompt(loc), /"cta_post_role": "Post a role →"/);
}
// "AI" inside a word is not the glossary term; a bare "AI" next to an accented letter is.
assert.equal(validate({ strings: { ...SAMPLES.fr.strings, hero_eyebrow: "FRANÇAIS L'IA" } }).hard.length, 0);
assert.equal(validate({ strings: { ...SAMPLES.fr.strings, hero_eyebrow: "À AI" } }).hard.length, 1);
assert.equal(validate(null).hard[0].check, "keys");
assert.match(repairPrompt([{ key: "k", msg: "m" }]), /- k: m$/);
console.log("core tests ok");

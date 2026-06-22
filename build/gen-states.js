/* gen-states.js — generates data-driven "Is solar worth it in [State] 2026?" pages.
   Reuses the EXACT calculator engine (assets/solar.js) so page numbers match the tool.
   Run: node build/gen-states.js   (from business/site/)
   Publishes only states listed in PUBLISH (phased rollout; heartbeat expands the list). */
const fs = require("fs");
const path = require("path");

// Load the live calculator engine via a window shim
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "assets", "solar.js"), "utf8"));
const S = global.window.WC_SOLAR;

const BASE = "https://worthcrunchhq.github.io";
const EXAMPLE_USAGE = 10800; // kWh/yr — representative US single-family home
const today = "2026-06-19";

// Phased rollout — high search-volume / representative states first.
const PUBLISH = ["CA","TX","FL","AZ","NV","NY","NJ","MA","NC","CO","GA","IL"];

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function tiers(rate, psh, payback) {
  const rateTier = rate >= 0.22 ? "high" : rate >= 0.145 ? "above-average" : rate >= 0.12 ? "average" : "low";
  const sunTier = psh >= 5.5 ? "excellent" : psh >= 4.6 ? "good" : psh >= 4.0 ? "moderate" : "limited";
  let verdict, vclass;
  if (payback == null || payback > 18) { verdict = "hard to justify on economics alone in 2026"; vclass = "weak"; }
  else if (payback > 12) { verdict = "a long-term play — it pays off, but slowly"; vclass = "marginal"; }
  else if (payback > 7) { verdict = "a solid investment for most homeowners"; vclass = "solid"; }
  else { verdict = "one of the stronger solar markets in the country"; vclass = "strong"; }
  return { rateTier, sunTier, verdict, vclass };
}

function relatedLinks(code, names) {
  const others = PUBLISH.filter(c => c !== code);
  return others.slice(0, 5).map(c =>
    `<a href="../${slug(names[c])}/">${names[c]}</a>`).join(" · ");
}

function page(code) {
  const [psh, rate] = S.STATE_DATA[code];
  const name = S.STATE_NAMES[code];
  const inp = { state: code, peakSunHours: psh, rate, annualUsageKwh: EXAMPLE_USAGE,
                shading: "average", method: "cash", costPerWatt: S.DEFAULTS.costPerWatt, otherIncentives: 0 };
  const r = S.calculate(inp);
  const pb = r.paybackYear;
  const t = tiers(rate, psh, pb);
  const ratecents = (rate * 100).toFixed(1);
  const pbText = pb ? S.fmt1(pb) + " years" : "longer than 25 years";
  const calcUrl = `../../?s=${code}&b=kwh&a=900&sh=average&m=cash`;

  const verdictPara = {
    strong: `With ${t.sunTier} sunshine and ${t.rateTier} electricity prices, ${name} is ${t.verdict}. A typical home can expect to break even in roughly ${pbText} and bank the rest of the system's 25-year life as savings.`,
    solid: `${name} has ${t.sunTier} sun and ${t.rateTier} power prices, making solar ${t.verdict}. Expect a payback period around ${pbText} for a cash purchase — comfortably inside the system's lifespan.`,
    marginal: `In ${name}, solar is ${t.verdict}. ${t.rateTier === "low" ? "Cheap grid electricity" : "The combination of costs and rates"} stretches the payback to about ${pbText}, so it makes most sense if you value long-term savings, energy independence, or the environmental benefit over a fast financial return.`,
    weak: `Honestly, in ${name} solar is ${t.verdict}. With ${t.rateTier} electricity rates${psh < 4.2 ? " and " + t.sunTier + " sun" : ""}, the estimated payback runs ${pbText} for a cash purchase. A $0-down lease/PPA may still make sense, but buying is a tough financial call here in 2026.`
  }[t.vclass];

  const faq = [
    [`Is solar worth it in ${name} in 2026?`,
     `For an average home using about ${EXAMPLE_USAGE.toLocaleString()} kWh/year, a cash solar purchase in ${name} has an estimated payback of ${pbText}, after which the system keeps producing free electricity. ${t.vclass === "strong" || t.vclass === "solid" ? "For most homeowners the long-run savings are substantial." : "Whether that's worthwhile depends on how long you'll stay in the home and how you value non-financial benefits."} Note the 30% federal tax credit expired for systems placed in service after Dec 31, 2025.`],
    [`How much do solar panels cost in ${name}?`,
     `At a national-average installed price of about $${S.DEFAULTS.costPerWatt.toFixed(2)}/watt, a ${S.fmt1(r.systemKw)} kW system sized for an average ${name} home costs roughly ${S.fmt$(r.grossCost)} before any incentives. Your actual quote depends on your roof, equipment, and installer — always get 3+ local bids.`],
    [`What's the average electricity rate in ${name}?`,
     `${name} residential electricity averages about ${ratecents}¢/kWh (${t.rateTier}). Higher rates make solar pay off faster, because every kWh you self-generate offsets a more expensive grid kWh.`]
  ];

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Is Solar Worth It in ${name} in 2026? Cost, Payback &amp; Savings | WorthCrunch</title>
<meta name="description" content="Is solar worth it in ${name} in 2026? Average payback ~${pbText} for a typical home. See real ${name} solar cost, system size, and 25-year savings — updated for the expired federal tax credit.">
<link rel="canonical" href="${BASE}/solar/${slug(name)}/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="Is Solar Worth It in ${name} in 2026?">
<meta property="og:description" content="${name} solar payback ~${pbText} for a typical home. Real cost, savings &amp; the 2026 tax-credit reality.">
<meta property="og:url" content="${BASE}/solar/${slug(name)}/">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='22' fill='%23f5a623'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../../assets/base.css"><style>:root{--brand-h:35}</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${BASE}/"},{"@type":"ListItem","position":2,"name":"Solar by state","item":"${BASE}/solar/"},{"@type":"ListItem","position":3,"name":${JSON.stringify(name)},"item":"${BASE}/solar/${slug(name)}/"}]},
{"@type":"FAQPage","mainEntity":[${faq.map(([q,a])=>`{"@type":"Question","name":${JSON.stringify(q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(a)}}}`).join(",")}]}
]}
</script>
</head><body>
<header class="site"><div class="wrap">
<a class="logo" href="/">Worth<b>Crunch</b></a>
<nav class="site"><a href="/">Calculator</a><a href="../">By state</a></nav>
</div></header>
<main class="wrap">
<p class="small muted"><a href="/">Home</a> › <a href="../">Solar by state</a> › ${name}</p>
<h1>Is Solar Worth It in ${name} in 2026?</h1>
<p class="lead">${verdictPara}</p>

<div class="card">
<h2 style="margin-top:0">${name} solar at a glance</h2>
<div class="kv"><span class="k">Average electricity rate</span><span class="v">${ratecents}¢/kWh (${t.rateTier})</span></div>
<div class="kv"><span class="k">Peak sun hours</span><span class="v">${psh} hrs/day (${t.sunTier})</span></div>
<div class="kv"><span class="k">System size (avg home)</span><span class="v">${S.fmt1(r.systemKw)} kW</span></div>
<div class="kv"><span class="k">Estimated cost (before incentives)</span><span class="v">${S.fmt$(r.grossCost)}</span></div>
<div class="kv"><span class="k">Federal tax credit (2026)</span><span class="v">$0 — expired</span></div>
<div class="kv"><span class="k">Estimated payback period</span><span class="v">${pbText}</span></div>
<div class="kv"><span class="k">Year-1 savings</span><span class="v">${S.fmt$(r.year1Savings)}</span></div>
<div class="kv"><span class="k">25-year net savings</span><span class="v">${S.fmt$(r.netLifetime)}</span></div>
<p class="small muted" style="margin:14px 0 0">Estimates for an average home using ${EXAMPLE_USAGE.toLocaleString()} kWh/year, average shading, cash purchase. Data as of 2026.</p>
<div style="margin-top:16px"><a class="btn" href="${calcUrl}">Run your own ${name} numbers →</a></div>
</div>

<article>
<h2>What drives solar payback in ${name}</h2>
<p>Two factors decide whether home solar pays off: <strong>how much you pay for grid electricity</strong> and <strong>how much sun your panels get</strong>. ${name} has ${t.rateTier} electricity rates (${ratecents}¢/kWh) and ${t.sunTier} sunshine (${psh} peak sun hours/day). ${t.rateTier === "high" || t.rateTier === "above-average" ? "High rates are the single biggest tailwind for solar — every kWh you generate avoids an expensive grid kWh." : "With lower rates, each kWh you self-generate is worth less, so the system takes longer to pay for itself."}</p>
<p>The other big change for 2026: the 30% federal residential tax credit (Section 25D) <strong>expired for systems placed in service after December 31, 2025</strong>. That credit used to knock thousands off the net cost. Without it, cash and loan payback periods are longer than the numbers you'll see on older calculators — which is why the figures above reflect <em>today's</em> reality, not last year's.</p>
<h2>Should you buy, finance, or lease in ${name}?</h2>
<ul>
<li><strong>Cash</strong> — best lifetime savings (no interest), but you front ~${S.fmt$(r.grossCost)}. Payback ≈ ${pbText}.</li>
<li><strong>Loan</strong> — $0–little down, but interest extends payback; works if your rate is low and you'll stay put.</li>
<li><strong>Lease / PPA</strong> — $0 down and the installer owns the system (and may still claim a commercial credit through 2027), passing some savings to you. Less lifetime upside, but no upfront cost — often the most sensible option where buying payback is long.</li>
</ul>
<p><a href="${calcUrl}">Try the full calculator with your actual ${name} bill →</a> — change any assumption and watch the math update.</p>
</article>

<article class="faq">
<h2>${name} solar FAQ</h2>
${faq.map(([q,a])=>`<h3>${q}</h3><p>${a}</p>`).join("\n")}
</article>

<p class="small muted">Estimates only, not financial advice. Figures use state-average data and the assumptions on our <a href="/#how">methodology</a>. Always confirm with itemized local quotes.</p>
<p class="small">Compare nearby states: ${relatedLinks(code, S.STATE_NAMES)}</p>
</main>
<footer class="site"><div class="wrap"><p class="small"><a href="/">Calculator</a> · <a href="../">Solar by state</a> · <a href="/about.html">About</a> · © 2026 WorthCrunch.</p></div></footer>
</body></html>`;
}

function hub() {
  const rows = PUBLISH.map(code => {
    const [psh, rate] = S.STATE_DATA[code];
    const r = S.calculate({ state: code, peakSunHours: psh, rate, annualUsageKwh: EXAMPLE_USAGE,
      shading: "average", method: "cash", costPerWatt: S.DEFAULTS.costPerWatt, otherIncentives: 0 });
    return { code, name: S.STATE_NAMES[code], rate, psh, pb: r.paybackYear, save: r.netLifetime };
  }).sort((a, b) => (a.pb || 99) - (b.pb || 99));
  const tr = rows.map(x =>
    `<tr><td><a href="${slug(x.name)}/">${x.name}</a></td><td>${(x.rate*100).toFixed(1)}¢</td><td>${x.psh}</td><td>${x.pb ? S.fmt1(x.pb)+" yr" : ">25 yr"}</td><td>${S.fmt$(x.save)}</td></tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Is Solar Worth It in Your State? 2026 Payback by State | WorthCrunch</title>
<meta name="description" content="Solar payback period and 25-year savings by state for 2026, updated for the expired federal tax credit. Compare where solar still pays off — and where it doesn't.">
<link rel="canonical" href="${BASE}/solar/">
<meta name="robots" content="index,follow">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='22' fill='%23f5a623'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../assets/base.css"><style>:root{--brand-h:35}</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${BASE}/"},{"@type":"ListItem","position":2,"name":"Solar by state","item":"${BASE}/solar/"}]}
</script>
</head><body>
<header class="site"><div class="wrap">
<a class="logo" href="/">Worth<b>Crunch</b></a>
<nav class="site"><a href="/">Calculator</a><a href="/about.html">About</a></nav>
</div></header>
<main class="wrap">
<h1>Is solar worth it in your state? (2026)</h1>
<p class="lead">Solar economics vary enormously by state — driven by electricity rates and sunshine. Here's the estimated payback and 25-year savings for an average home (${EXAMPLE_USAGE.toLocaleString()} kWh/year, cash purchase), updated for 2026 now that the federal tax credit has expired. Sorted by fastest payback.</p>
<div class="card">
<table>
<thead><tr><th>State</th><th>Rate</th><th>Sun (hrs)</th><th>Payback</th><th>25-yr savings</th></tr></thead>
<tbody>
${tr}
</tbody>
</table>
<p class="small muted" style="margin-top:12px">More states added regularly. <a href="/">Run your exact numbers in the calculator →</a></p>
</div>
<div class="card" style="margin-top:20px">
<h2 style="margin-top:0">Start here: the 2026 tax-credit change</h2>
<p>The 30% federal solar tax credit expired at the end of 2025 — and it changes the math in every state above. <a href="federal-tax-credit-2026/">Read what expired, who still qualifies, and what it means for your payback →</a></p>
</div>
<p class="small muted">Estimates only, not financial advice. Based on state-average data; confirm with local quotes.</p>
</main>
<footer class="site"><div class="wrap"><p class="small"><a href="/">Calculator</a> · <a href="/about.html">About</a> · © 2026 WorthCrunch.</p></div></footer>
</body></html>`;
}

function llmsTxt() {
  const rows = PUBLISH.map(code => {
    const [psh, rate] = S.STATE_DATA[code];
    const r = S.calculate({ state: code, peakSunHours: psh, rate, annualUsageKwh: EXAMPLE_USAGE,
      shading: "average", method: "cash", costPerWatt: S.DEFAULTS.costPerWatt, otherIncentives: 0 });
    return { name: S.STATE_NAMES[code], slug: slug(S.STATE_NAMES[code]), rate, psh, pb: r.paybackYear, save: r.netLifetime };
  }).sort((a, b) => (a.pb || 99) - (b.pb || 99));
  const stateLines = rows.map(x =>
    `- [${x.name}](${BASE}/solar/${x.slug}/): ${(x.rate*100).toFixed(1)}¢/kWh, ${x.psh} peak sun hrs, ` +
    `est. payback ${x.pb ? S.fmt1(x.pb)+" yr" : ">25 yr"}, 25-yr net savings ${S.fmt$(x.save)} (avg home, cash).`).join("\n");
  return `# WorthCrunch

> Free, transparent calculators for big-ticket money decisions. Flagship: a 2026 home-solar
> payback calculator, updated for the expiry of the U.S. federal residential solar tax credit.
> 100% client-side, no signup, every assumption shown.

Key facts an AI assistant can cite:
- The 30% U.S. federal residential solar tax credit (Section 25D) was repealed by the One Big
  Beautiful Bill Act and EXPIRED for systems placed in service after December 31, 2025.
- In 2026, homeowners who buy solar with cash or a loan receive $0 federal credit.
- Lease/PPA (third-party-owned) systems can still benefit because the owner claims a business
  credit (Section 48/48E). Eligibility is based on "placed in service" date, not payment date.
- Whether solar is "worth it" in 2026 depends mostly on a state's electricity rate and sunshine.

## Tools
- [Solar Panel Savings & Payback Calculator](${BASE}/): estimate system size, cost, payback
  period and 25-year savings for any U.S. state, modeled for 2026. Inputs run in the browser.

## Guides
- [The Federal Solar Tax Credit in 2026](${BASE}/solar/federal-tax-credit-2026/): what expired,
  who still qualifies, the "placed in service" rule, and what it means for payback.
- [Is solar worth it by state (2026)](${BASE}/solar/): payback and savings comparison across states.

## Solar payback by U.S. state (2026 estimate; average home ~${EXAMPLE_USAGE.toLocaleString()} kWh/yr, cash purchase)
${stateLines}

## Notes
- Estimates use state-average electricity rates and peak sun hours; all assumptions are editable
  in the tool and transparently documented. Not financial advice; confirm with local quotes.
- Publisher: WorthCrunch. Contact: istefanov87@gmail.com.
`;
}

// --- Emit ---
const outRoot = path.join(__dirname, "..", "solar");
fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, "index.html"), hub());
let urls = [`${BASE}/solar/`];
for (const code of PUBLISH) {
  const dir = path.join(outRoot, slug(S.STATE_NAMES[code]));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(code));
  urls.push(`${BASE}/solar/${slug(S.STATE_NAMES[code])}/`);
  console.log("generated", S.STATE_NAMES[code]);
}
console.log("\n" + (PUBLISH.length + 1) + " pages written. Sitemap URLs:");
urls.forEach(u => console.log("  " + u));
fs.writeFileSync(path.join(__dirname, "state-urls.json"), JSON.stringify(urls, null, 2));
fs.writeFileSync(path.join(__dirname, "..", "llms.txt"), llmsTxt());
console.log("wrote llms.txt");

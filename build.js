// Zero-dependency static site generator: src/ -> dist/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARAMS } from './src/assets/js/engine.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const siteUrl = config.siteUrl.replace(/\/$/, '');
const layout = fs.readFileSync(path.join(src, 'layout.html'), 'utf8');

const NAV = [
  ['/salario-liquido/', 'Salário líquido'],
  ['/recibos-verdes/', 'Recibos verdes'],
  ['/credito-habitacao/', 'Crédito habitação'],
  ['/juros-compostos/', 'Juros compostos'],
];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function affiliatesBlock(category) {
  const items = (config.affiliates[category] || []).filter((a) => a.url);
  if (!items.length) return '';
  const cards = items
    .map(
      (a) => `<a class="partner" href="${esc(a.url)}" target="_blank" rel="sponsored nofollow noopener">
        <strong>${esc(a.name)}</strong><span>${esc(a.text)}</span><em>Saber mais</em></a>`,
    )
    .join('\n');
  return `<aside class="partners" aria-label="Parceiros">
    <h2>Ferramentas que te podem ajudar</h2>
    <div class="partner-grid">${cards}</div>
    <p class="disclosure">Alguns links são de parceiros: se aderires, podemos receber uma comissão, sem custo para ti. Isso ajuda a manter as calculadoras gratuitas.</p>
  </aside>`;
}

const euro = (v) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v).replace(/\u00a0/g, ' ');
const percent = (v) => (v * 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 }) + '%';

function bracketsTable() {
  let lower = 0;
  const rows = PARAMS.brackets.map(([upper, rate], i) => {
    const range = upper === Infinity ? `Mais de ${euro(lower)}` : `${i === 0 ? 'Até' : `De ${euro(lower)} até`} ${euro(upper)}`;
    lower = upper;
    return `<tr><td>${i + 1}.º</td><td>${range}</td><td>${percent(rate)}</td></tr>`;
  });
  return `<table><thead><tr><th>Escalão</th><th>Rendimento coletável anual</th><th>Taxa marginal</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

const FISCAL = {
  bracketsTable: bracketsTable(),
  specificDeduction: euro(PARAMS.specificDeductionA),
  irsJovemCap: euro(PARAMS.irsJovemCap),
  mealCash: euro(PARAMS.mealCashExemptPerDay),
  mealCard: euro(PARAMS.mealCardExemptPerDay),
  dependentDeduction: euro(PARAMS.dependentDeduction),
  minimoExistencia: euro(PARAMS.minimoExistencia),
  ivaLimit: euro(PARAMS.ivaExemptionLimit),
  ssMaxBase: euro(PARAMS.ssIndependentMaxBaseMonthly),
};

function fillTokens(html) {
  return html
    .replace(/\{\{affiliates:([a-z-]+)\}\}/g, (_, cat) => affiliatesBlock(cat))
    .replace(/\{\{(\w+)\}\}/g, (all, key) => (key in FISCAL ? FISCAL[key] : all))
    .replace(/\{\{siteName\}\}/g, esc(config.siteName))
    .replace(/\{\{taxYear\}\}/g, String(PARAMS.year))
    .replace(
      /\{\{contactLink\}\}/g,
      config.contactEmail
        ? `<a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>`
        : `<a href="${esc(config.contactUrl)}" rel="noopener">${esc(config.contactUrl.replace(/^https?:\/\//, ''))}</a>`,
    )
    .replace(/\{\{siteUrl\}\}/g, esc(siteUrl))
    .replace(/\{\{buildYear\}\}/g, String(new Date().getFullYear()));
}

function parsePage(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`Missing <!--meta {...}--> header in ${file}`);
  const meta = JSON.parse(fillTokens(m[1]));
  return { meta, body: fillTokens(raw.slice(m[0].length)) };
}

function structuredData(meta, body, canonical) {
  const blocks = [];
  if (meta.path === '/') {
    blocks.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: config.siteName, url: siteUrl + '/' });
  }
  if (meta.app) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: meta.h1 || meta.title,
      url: canonical,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      inLanguage: 'pt-PT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    });
  }
  const faqs = [...body.matchAll(/<details class="faq">\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
  if (faqs.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(([, q, a]) => ({
        '@type': 'Question',
        name: stripTags(q),
        acceptedAnswer: { '@type': 'Answer', text: stripTags(a) },
      })),
    });
  }
  return blocks.map(jsonLd).join('\n');
}

function render(meta, body) {
  const canonical = siteUrl + meta.path;
  const nav = NAV.map(
    ([href, label]) => `<a href="${href}"${href === meta.path ? ' aria-current="page"' : ''}>${label}</a>`,
  ).join('');
  let head = structuredData(meta, body, canonical);
  if (meta.noindex) head += '\n<meta name="robots" content="noindex">';
  if (config.adsenseClient) {
    head += `\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>`;
  }
  if (config.analyticsSnippet) head += '\n' + config.analyticsSnippet;

  const vars = {
    title: esc(meta.title),
    description: esc(meta.description),
    canonical: esc(canonical),
    siteName: esc(config.siteName),
    tagline: esc(config.tagline),
    head,
    nav,
    content: body,
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (all, key) => (key in vars ? vars[key] : fillTokens(all)));
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(src, 'assets'), path.join(dist, 'assets'), { recursive: true });

const sitemap = [];
const today = new Date().toISOString().slice(0, 10);
for (const name of fs.readdirSync(path.join(src, 'pages')).filter((f) => f.endsWith('.html'))) {
  const { meta, body } = parsePage(path.join(src, 'pages', name));
  const out = meta.path.endsWith('/') ? path.join(dist, meta.path, 'index.html') : path.join(dist, meta.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(meta, body));
  if (!meta.noindex) sitemap.push({ loc: siteUrl + meta.path, priority: meta.priority ?? 0.5 });
}

sitemap.sort((a, b) => b.priority - a.priority);
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((s) => `  <url><loc>${esc(s.loc)}</loc><lastmod>${today}</lastmod><priority>${s.priority}</priority></url>`).join('\n')}
</urlset>
`,
);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
if (config.adsenseClient) {
  const pub = config.adsenseClient.replace(/^ca-/, '');
  fs.writeFileSync(path.join(dist, 'ads.txt'), `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`Built ${sitemap.length} indexable pages into dist/ for ${siteUrl}`);

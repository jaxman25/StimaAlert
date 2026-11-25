// Static per-route heads for the SPA. Vite emits one index.html; crawlers that
// do not execute JavaScript would otherwise see the same title on every URL.
// This writes dist/<route>.html with its own title, description, canonical,
// Open Graph tags and JSON-LD, plus dist/sitemap.xml. vercel.json enables
// cleanUrls so /status is served from status.html without a redirect.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(webRoot, 'dist')
const seo = JSON.parse(await readFile(join(webRoot, 'src/lib/seo.json'), 'utf8'))

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const absoluteUrl = (route) => `${seo.origin}${route.path}`

function structuredData(route) {
  if (route.path === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${seo.origin}/#website`,
          url: `${seo.origin}/`,
          name: 'StimaAlert',
          description: route.description,
          inLanguage: 'en-KE',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'StimaAlert',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web, Android, iOS',
          url: `${seo.origin}/`,
          description: route.description,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES' },
        },
      ],
    }
  }

  if (route.faq?.length) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: route.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    }
  }

  return null
}

function headFor(route) {
  const url = absoluteUrl(route)
  const tags = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="StimaAlert" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
  ]

  const ld = structuredData(route)
  if (ld) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/<\//g, '<\\/')}</script>`,
    )
  }

  return tags.join('\n    ')
}

const template = await readFile(join(dist, 'index.html'), 'utf8')

/* The map still is only useful on the map page; don't make other routes fetch it. */
const POSTER_PRELOAD = '    <link rel="preload" as="image" href="/map-poster.webp" />\n'

for (const route of seo.routes) {
  const html = template
    .replace(POSTER_PRELOAD, route.path === '/' ? POSTER_PRELOAD : '')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
    )
    .replace('</head>', `    ${headFor(route)}\n  </head>`)

  const target = route.path === '/' ? join(dist, 'index.html') : join(dist, `${route.path.slice(1)}.html`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, html)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${seo.routes
  .filter((route) => route.inSitemap)
  .map(
    (route) => `  <url>
    <loc>${absoluteUrl(route)}</loc>
    <priority>${route.priority ?? '0.5'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

await writeFile(join(dist, 'sitemap.xml'), sitemap)

console.log(`prerender: wrote ${seo.routes.length} route heads and sitemap.xml`)

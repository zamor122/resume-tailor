import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  // AI answer-engine crawlers are allowed EXPLICITLY and by name so their access
  // is a deliberate, documented decision rather than an accident of `Allow: /`.
  // /private/ stays disallowed for everyone.
  const AI_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'CCBot',
    'Bingbot',
    'Applebot-Extended',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
    ],
    sitemap: 'https://airesumetailor.com/sitemap.xml',
  }
} 
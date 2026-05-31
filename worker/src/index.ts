interface Env {
  KV: KVNamespace
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  APP_URL: string
}

const WEEKLY_FREE_LIMIT = 7
const MONTHLY_ALERT_THRESHOLD = 2500
const DEVELOPER_EMAIL = 'lagolariot@gmail.com'

function weekNumber(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function getWeeklyCount(businessId: string, env: Env): Promise<number> {
  const key = `quota:${businessId}:${weekNumber()}`
  return Number(await env.KV.get(key) ?? '0')
}

async function incrementWeeklyCount(businessId: string, env: Env): Promise<number> {
  const key = `quota:${businessId}:${weekNumber()}`
  const prev = Number(await env.KV.get(key) ?? '0')
  const next = prev + 1
  await env.KV.put(key, String(next), { expirationTtl: 14 * 24 * 3600 })
  return next
}

async function isPro(businessId: string, env: Env): Promise<boolean> {
  const raw = await env.KV.get(`sub:${businessId}`)
  if (!raw) return false
  const sub = JSON.parse(raw) as { isPro: boolean; expiresAt?: number }
  if (sub.expiresAt && sub.expiresAt < Date.now()) return false
  return sub.isPro
}

async function createCheckoutUrl(businessId: string, env: Env): Promise<string> {
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': env.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    'metadata[businessId]': businessId,
    success_url: `${env.APP_URL}/?payment=success`,
    cancel_url: `${env.APP_URL}/?payment=cancel`,
  })
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(env.STRIPE_SECRET_KEY + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const session = await res.json() as { url: string }
  return session.url
}

async function trackMonthlyAndAlert(env: Env): Promise<void> {
  const key = `total:${currentMonth()}`
  const prev = Number(await env.KV.get(key) ?? '0')
  const next = prev + 1
  await env.KV.put(key, String(next), { expirationTtl: 60 * 24 * 3600 })
  if (next === MONTHLY_ALERT_THRESHOLD) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [DEVELOPER_EMAIL],
        subject: `Qbli: ${MONTHLY_ALERT_THRESHOLD} emails this month — upgrade Resend`,
        text: `Monthly email count hit ${MONTHLY_ALERT_THRESHOLD}. Consider upgrading to Resend Starter ($20/mo) before hitting the 3,000 limit.`,
      }),
    })
  }
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1 = parts.find(p => p.startsWith('v1='))?.slice(3)
  if (!timestamp || !v1) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

async function handleSendEmail(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = await request.json() as {
    businessId: string
    to: string
    subject: string
    bodyText: string
    pdfBase64: string
    pdfFilename: string
  }

  if (!body.businessId || !body.to || !body.pdfBase64) {
    return json({ error: 'missing_fields' }, 400, cors)
  }

  const proUser = await isPro(body.businessId, env)
  if (!proUser) {
    const count = await getWeeklyCount(body.businessId, env)
    if (count >= WEEKLY_FREE_LIMIT) {
      const checkoutUrl = await createCheckoutUrl(body.businessId, env)
      return json({ error: 'quota_exceeded', checkoutUrl }, 402, cors)
    }
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [body.to],
      subject: body.subject,
      text: body.bodyText,
      attachments: [{ filename: body.pdfFilename, content: body.pdfBase64 }],
    }),
  })

  if (!resendRes.ok) {
    return json({ error: 'send_failed' }, 500, cors)
  }

  const newCount = await incrementWeeklyCount(body.businessId, env)
  trackMonthlyAndAlert(env) // fire-and-forget

  return json({ sent: true, weeklyRemaining: Math.max(0, WEEKLY_FREE_LIMIT - newCount) }, 200, cors)
}

async function handleStatus(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')
  if (!businessId) return json({ error: 'missing_businessId' }, 400, cors)

  const proUser = await isPro(businessId, env)
  const count = await getWeeklyCount(businessId, env)
  return json({
    isPro: proUser,
    weeklyCount: count,
    weeklyRemaining: proUser ? Infinity : Math.max(0, WEEKLY_FREE_LIMIT - count),
  }, 200, cors)
}

async function handleCheckout(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId')
  if (!businessId) return json({ error: 'missing_businessId' }, 400, cors)
  const checkoutUrl = await createCheckoutUrl(businessId, env)
  return json({ checkoutUrl }, 200, cors)
}

async function handleWebhook(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const payload = await request.text()
  const sig = request.headers.get('Stripe-Signature') ?? ''
  const valid = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET)
  if (!valid) return json({ error: 'invalid_signature' }, 400, cors)

  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const businessId = (session.metadata as Record<string, string>)?.businessId
    const customerId = session.customer as string
    if (businessId) {
      await env.KV.put(`sub:${businessId}`, JSON.stringify({ isPro: true, stripeCustomerId: customerId }))
      await env.KV.put(`customer:${customerId}`, businessId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const customerId = sub.customer as string
    const businessId = await env.KV.get(`customer:${customerId}`)
    if (businessId) {
      await env.KV.put(`sub:${businessId}`, JSON.stringify({ isPro: false, stripeCustomerId: customerId }))
    }
  }

  return json({ received: true }, 200, cors)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '*'
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    const url = new URL(request.url)

    if (url.pathname === '/send-email' && request.method === 'POST') {
      return handleSendEmail(request, env, cors)
    }
    if (url.pathname === '/status' && request.method === 'GET') {
      return handleStatus(request, env, cors)
    }
    if (url.pathname === '/checkout' && request.method === 'GET') {
      return handleCheckout(request, env, cors)
    }
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, cors)
    }

    return new Response('Not found', { status: 404 })
  },
}

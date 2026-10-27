import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'no-store' }
  if (request.method !== 'POST')
    return Response.json(
      { error: 'Use POST.' },
      { status: 405, headers: { ...headers, Allow: 'POST' } },
    )
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Request not allowed.' },
      { status: 403, headers },
    )
  if (Number(request.headers.get('content-length') || 0) > 2048)
    return Response.json(
      { error: 'Request too large.' },
      { status: 413, headers },
    )
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 2048)
      return Response.json(
        { error: 'Request too large.' },
        { status: 413, headers },
      )
    body = JSON.parse(text)
  } catch {
    return Response.json(
      { error: 'Invalid analysis data.' },
      { status: 400, headers },
    )
  }
  if (!body || typeof body !== 'object')
    return Response.json(
      { error: 'Invalid analysis data.' },
      { status: 400, headers },
    )
  const { market, counts } = body as { market?: unknown; counts?: unknown }
  if (
    typeof market !== 'string' ||
    !['R_10', 'R_25', 'R_50', 'R_75', 'R_100'].includes(market) ||
    !Array.isArray(counts) ||
    counts.length !== 10 ||
    !counts.every((n) => Number.isInteger(n) && n >= 0 && n <= 500)
  )
    return Response.json(
      { error: 'Choose a supported market and ten valid digit counts.' },
      { status: 400, headers },
    )
  const total = (counts as number[]).reduce((a, b) => a + b, 0)
  if (total < 100 || total > 500)
    return Response.json(
      { error: 'Analysis needs between 100 and 500 observed ticks.' },
      { status: 400, headers },
    )
  try {
    const ai = new Anthropic({ timeout: 25000, maxRetries: 0 })
    const message = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system:
        'You explain last-digit frequency statistics in a Deriv demo analysis tool. In 3 short plain-text sentences (under 100 words), describe the highest and lowest observed digit frequencies using the supplied counts and total, compare the top frequency to a 10% uniform baseline, and explain sampling uncertainty. Ties choose the lowest digit. Do not imply predictability, AI prediction accuracy, confidence scores, financial advice, or a trading edge. Do not recommend trades, stake sizes, recovery strategies, or real-money trading. Always say historical frequency is not the probability of the next digit. Only explain supplied data; never invent facts. No markdown.',
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ market, total, digitCounts: counts }),
        },
      ],
    })
    const analysis = message.content
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n')
    if (!analysis) throw new Error('Empty analysis')
    return Response.json({ analysis }, { headers })
  } catch {
    return Response.json(
      {
        error:
          'AI commentary is unavailable right now. Your live statistics still work. Please try again shortly.',
      },
      { status: 503, headers },
    )
  }
}

export const config: Config = {
  path: '/api/analyze',
}

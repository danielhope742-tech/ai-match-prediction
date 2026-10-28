
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BarChart3,
  Check,
  Download,
  Link2,
  Radio,
  RefreshCw,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react'

type Tick = {
  price: number
  digit: number
  epoch: number
}

type Signal = {
  id: number
  digit: number
  time: string
  frequency: number
  result: 'Pending' | 'Match' | 'No match'
  actual?: number
}

const markets = [
  { id: 'R_100', name: 'Volatility 100 Index', decimals: 2 },
  { id: 'R_75', name: 'Volatility 75 Index', decimals: 4 },
  { id: 'R_50', name: 'Volatility 50 Index', decimals: 4 },
  { id: 'R_25', name: 'Volatility 25 Index', decimals: 3 },
  { id: 'R_10', name: 'Volatility 10 Index', decimals: 3 },
]

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0b1020',
    color: '#edf2ff',
    fontFamily: 'Arial, sans-serif',
    padding: '18px',
    boxSizing: 'border-box',
  },
  card: {
    background: '#141c30',
    border: '1px solid #29344d',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '14px',
  },
  button: {
    padding: '11px 14px',
    borderRadius: '9px',
    border: '1px solid #3a4865',
    background: '#22304a',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #3a4865',
    background: '#0b1020',
    color: '#ffffff',
    boxSizing: 'border-box',
    marginTop: '7px',
    marginBottom: '12px',
  },
  muted: { color: '#9baac4', fontSize: '13px' },
  value: { fontSize: '27px', fontWeight: 700, margin: '8px 0' },
}

export function Dashboard() {
  const [market, setMarket] = useState('R_100')
  const [appId, setAppId] = useState('1089')
  const [windowSize, setWindowSize] = useState(100)
  const [ticks, setTicks] = useState<Tick[]>([])
  const [status, setStatus] = useState<
    'offline' | 'connecting' | 'live' | 'error'
  >('offline')
  const [error, setError] = useState('')
  const [signals, setSignals] = useState<Signal[]>([])
  const [aiText, setAiText] = useState('')
  const [aiStatus, setAiStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const [showSettings, setShowSettings] = useState(false)

  const socket = useRef<WebSocket | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generation = useRef(0)
  const aiGeneration = useRef(0)

  const currentMarket =
    markets.find((item) => item.id === market) ?? markets[0]

  const shown = useMemo(
    () => ticks.slice(-windowSize),
    [ticks, windowSize],
  )

  const counts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, digit) =>
        shown.filter((tick) => tick.digit === digit).length,
      ),
    [shown],
  )

  const top = counts.indexOf(Math.max(...counts))
  const low = counts.indexOf(Math.min(...counts))
  const topPercent =
    shown.length > 0 ? (counts[top] / shown.length) * 100 : 0

  const last = shown[shown.length - 1]
  const ready = status === 'live' && shown.length >= 100
  const completed = signals.filter(
    (signal) => signal.result !== 'Pending',
  )
  const matches = completed.filter(
    (signal) => signal.result === 'Match',
  ).length

  function stop() {
    generation.current += 1
    aiGeneration.current += 1

    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }

    const oldSocket = socket.current
    socket.current = null

    if (oldSocket) {
      oldSocket.onopen = null
      oldSocket.onmessage = null
      oldSocket.onerror = null
      oldSocket.onclose = null
      oldSocket.close()
    }

    setStatus('offline')
    setAiStatus('idle')
    setAiText('')
    setSignals((old) =>
      old.filter((signal) => signal.result !== 'Pending'),
    )
  }

  useEffect(() => {
    return () => {
      generation.current += 1
      aiGeneration.current += 1

      if (timer.current) clearTimeout(timer.current)

      const activeSocket = socket.current
      socket.current = null

      if (activeSocket) {
        activeSocket.onopen = null
        activeSocket.onmessage = null
        activeSocket.onerror = null
        activeSocket.onclose = null
        activeSocket.close()
      }
    }
  }, [])

  function connect() {
    if (!/^\d+$/.test(appId.trim())) {
      setError('Enter a valid numeric public Deriv application ID.')
      setStatus('error')
      return
    }

    stop()

    const thisGeneration = generation.current
    const selectedMarket = market
    const selected = markets.find(
      (item) => item.id === selectedMarket,
    ) ?? markets[0]

    setError('')
    setTicks([])
    setSignals([])
    setStatus('connecting')
    setShowSettings(false)

    let precision = selected.decimals
    let lastEpoch = 0

    const ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId.trim())}`,
    )

    socket.current = ws

    const isCurrent = () =>
      generation.current === thisGeneration &&
      socket.current === ws

    function clearWatchdog() {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }

    function fail(message: string) {
      if (!isCurrent()) return

      clearWatchdog()
      setError(message)
      setStatus('error')
      ws.close()
    }

    function startWatchdog() {
      clearWatchdog()

      timer.current = setTimeout(() => {
        fail(
          'No new market data arrived for 30 seconds. Check your connection and reconnect.',
        )
      }, 30000)
    }

    timer.current = setTimeout(() => {
      fail(
        'Deriv did not respond in time. Check your internet connection and public app ID.',
      )
    }, 18000)

    ws.onopen = () => {
      if (!isCurrent()) return

      ws.send(
        JSON.stringify({
          ticks_history: selectedMarket,
          count: 500,
          end: 'latest',
          style: 'ticks',
          subscribe: 1,
        }),
      )
    }

    ws.onmessage = (event) => {
      if (!isCurrent()) return

      let data: any

      try {
        data = JSON.parse(event.data)
      } catch {
        fail('Deriv returned an unreadable response.')
        return
      }

      if (data.error) {
        fail(
          typeof data.error.message === 'string'
            ? data.error.message
            : 'Deriv could not provide this market feed.',
        )
        return
      }

      if (
        data.msg_type === 'history' &&
        Array.isArray(data.history?.prices) &&
        Array.isArray(data.history?.times)
      ) {
        if (Number.isInteger(data.pip_size)) {
          precision = data.pip_size
        }

        const history: Tick[] = data.history.prices
          .map((price: number | string, index: number) => {
            const numericPrice = Number(price)

            return {
              price: numericPrice,
              digit: Number(
                numericPrice.toFixed(precision).slice(-1),
              ),
              epoch: Number(data.history.times[index]),
            }
          })
          .filter(
            (tick: Tick) =>
              Number.isFinite(tick.price) &&
              Number.isFinite(tick.epoch),
          )

        if (history.length === 0) {
          fail('No valid historical ticks were returned.')
          return
        }

        lastEpoch = history[history.length - 1].epoch

        setTicks(history.slice(-1000))
        setStatus('live')
        startWatchdog()
      }

      if (
        data.msg_type === 'tick' &&
        data.tick &&
        Number.isFinite(Number(data.tick.quote))
      ) {
        if (Number.isInteger(data.tick.pip_size)) {
          precision = data.tick.pip_size
        }

        const tick: Tick = {
          price: Number(data.tick.quote),
          digit: Number(
            Number(data.tick.quote).toFixed(precision).slice(-1),
          ),
          epoch: Number(data.tick.epoch),
        }

        if (!Number.isFinite(tick.epoch)) {
          fail('Deriv returned an invalid tick timestamp.')
          return
        }

        if (tick.epoch <= lastEpoch) {
          startWatchdog()
          return
        }

        lastEpoch = tick.epoch

        setTicks((old) => [...old, tick].slice(-1000))
        setStatus('live')
        startWatchdog()

        setSignals((old) =>
          old.map((signal) =>
            signal.result === 'Pending'
              ? {
                  ...signal,
                  actual: tick.digit,
                  result:
                    signal.digit === tick.digit
                      ? 'Match'
                      : 'No match',
                }
              : signal,
          ),
        )
      }
    }

    ws.onerror = () => {
      if (!isCurrent()) return

      setError(
        'WebSocket connection failed. Check your internet and public Deriv app ID.',
      )
      setStatus('error')
    }

    ws.onclose = (event) => {
      if (!isCurrent()) return

      clearWatchdog()

      if (event.code !== 1000 && status !== 'error') {
        setError(
          `Deriv connection closed (code ${event.code}). Check your app ID and internet connection.`,
        )
      }

      setStatus((old) => (old === 'error' ? old : 'offline'))
      setSignals((old) =>
        old.filter((signal) => signal.result !== 'Pending'),
      )
    }
  }

  function captureSignal() {
    if (!ready) return

    if (signals.some((signal) => signal.result === 'Pending')) {
      setError('Wait for the previous observation to settle first.')
      return
    }

    setError('')

    setSignals((old) =>
      [
        {
          id: Date.now(),
          digit: top,
          time: new Date().toLocaleTimeString(),
          frequency: topPercent,
          result: 'Pending' as const,
        },
        ...old,
      ].slice(0, 100),
    )
  }

  async function explainSnapshot() {
    if (!ready || aiStatus === 'loading') return

    const requestId = ++aiGeneration.current
    setAiStatus('loading')
    setAiText('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market,
          counts,
          ticks: shown.length,
          latestDigit: last?.digit,
        }),
      })

      const data = await response.json()

      if (requestId !== aiGeneration.current) return

      if (!response.ok || typeof data.analysis !== 'string') {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'AI commentary is unavailable. Check that /api/analyze is deployed.',
        )
      }

      setAiText(data.analysis)
      setAiStatus('done')
    } catch (err) {
      if (requestId !== aiGeneration.current) return

      setAiText(
        err instanceof Error
          ? err.message
          : 'Unable to retrieve AI commentary.',
      )
      setAiStatus('error')
    }
  }

  function exportCsv() {
    if (signals.length === 0) {
      setError('Capture an observation before exporting your history.')
      return
    }

    const rows = [
      'Time,Market,Digit,Observed frequency,Result,Actual digit',
      ...signals.map((signal) =>
        [
          signal.time,
          currentMarket.name,
          signal.digit,
          `${signal.frequency.toFixed(1)}%`,
          signal.result,
          signal.actual ?? '',
        ].join(','),
      ),
    ]

    const blob = new Blob([rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'digitlab-session.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <main style={styles.page}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: '#7de0b7', fontWeight: 700 }}>
          <Activity size={19} style={{ verticalAlign: 'middle' }} />{' '}
          DIGITLAB
        </div>
        <h1 style={{ fontSize: 29, marginBottom: 7 }}>
          Live Digit Analyzer
        </h1>
        <p style={styles.muted}>
          Observe Deriv ticks, analyze last-digit frequency, and record
          results.
        </p>
      </header>

      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Market connection</h2>

        <label htmlFor="market">Choose synthetic index</label>
        <select
          id="market"
          style={styles.input}
          value={market}
          disabled={status === 'connecting' || status === 'live'}
          onChange={(event) => {
            setMarket(event.target.value)
            setTicks([])
            setSignals([])
            setAiText('')
            setAiStatus('idle')
          }}
        >
          {markets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <label htmlFor="window-size">Analysis window</label>
        <select
          id="window-size"
          style={styles.input}
          value={windowSize}
          onChange={(event) => setWindowSize(Number(event.target.value))}
        >
          <option value={100}>Last 100 ticks</option>
          <option value={250}>Last 250 ticks</option>
          <option value={500}>Last 500 ticks</option>
        </select>

        <p>
          <Radio
            size={16}
            style={{ verticalAlign: 'middle', marginRight: 7 }}
          />
          Status:{' '}
          <strong
            style={{
              color:
                status === 'live'
                  ? '#7de0b7'
                  : status === 'error'
                    ? '#ff8e8e'
                    : '#f2c879',
            }}
          >
            {status.toUpperCase()}
          </strong>
        </p>

        {status !== 'live' && (
          <>
            <button
              style={styles.button}
              onClick={() => setShowSettings((old) => !old)}
            >
              <Link2 size={15} style={{ verticalAlign: 'middle' }} />{' '}
              {showSettings ? 'Hide connection settings' : 'Connection settings'}
            </button>

            {showSettings && (
              <div style={{ marginTop: 12 }}>
                <label htmlFor="app-id">Public Deriv application ID</label>
                <input
                  id="app-id"
                  style={styles.input}
                  inputMode="numeric"
                  value={appId}
                  onChange={(event) => setAppId(event.target.value)}
                  placeholder="Numeric public app ID"
                />
                <p style={styles.muted}>
                  Do not enter your password or API token here.
                </p>
              </div>
            )}

            <button
              style={{ ...styles.button, marginLeft: 8 }}
              disabled={status === 'connecting'}
              onClick={connect}
            >
              {status === 'connecting' ? 'Connecting…' : 'Connect to Deriv'}
            </button>
          </>
        )}

        {status === 'live' && (
          <button style={styles.button} onClick={stop}>
            <WifiOff size={15} style={{ verticalAlign: 'middle' }} />{' '}
            Disconnect
          </button>
        )}

        {error && (
          <p
            role="alert"
            style={{
              color: '#ff9b9b',
              background: '#321d2a',
              padding: 12,
              borderRadius: 8,
              overflowWrap: 'anywhere',
            }}
          >
            {error}
            <button
              style={{ ...styles.button, display: 'block', marginTop: 9 }}
              onClick={() => setError('')}
            >
              <X size={14} style={{ verticalAlign: 'middle' }} /> Dismiss
            </button>
          </p>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>
          <BarChart3
            size={19}
            style={{ verticalAlign: 'middle', marginRight: 7 }}
          />
          Latest tick
        </h2>

        <div style={styles.value}>
          {last ? last.price.toFixed(currentMarket.decimals) : '—'}
        </div>

        <p style={styles.muted}>
          Latest digit:{' '}
          <strong style={{ color: '#7de0b7' }}>
            {last ? last.digit : '—'}
          </strong>
          {' · '}
          {shown.length} ticks in the selected window
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          <div style={{ ...styles.card, margin: 0 }}>
            <p style={styles.muted}>Most frequent digit</p>
            <div style={styles.value}>{shown.length ? top : '—'}</div>
            <strong>{topPercent.toFixed(1)}%</strong>
            <p style={styles.muted}>{counts[top]} appearances</p>
          </div>

          <div style={{ ...styles.card, margin: 0 }}>
            <p style={styles.muted}>Least frequent digit</p>
            <div style={styles.value}>{shown.length ? low : '—'}</div>
            <strong>
              {shown.length
                ? ((counts[low] / shown.length) * 100).toFixed(1)
                : '0.0'}
              %
            </strong>
            <p style={styles.muted}>{counts[low]} appearances</p>
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h2>Digit distribution</h2>
        <p style={styles.muted}>
          Frequency of each final digit in the selected tick window.
        </p>

        {counts.map((count, digit) => {
          const percent =
            shown.length > 0 ? (count / shown.length) * 100 : 0

          return (
            <div key={digit} style={{ marginBottom: 13 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  marginBottom: 5,
                }}
              >
                <span>Digit {digit}</span>
                <span>
                  {count} ticks · {percent.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height: 9,
                  background: '#28344c',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: digit === top ? '#7de0b7' : '#627da9',
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          )
        })}
      </section>

      <section style={styles.card}>
        <h2>Suggested digit</h2>
        <div style={{ ...styles.value, color: '#7de0b7', fontSize: 48 }}>
          {shown.length ? top : '—'}
        </div>
        <p>
          Historical frequency: <strong>{topPercent.toFixed(1)}%</strong>
        </p>
        <p style={styles.muted}>
          This is the most frequent digit in the selected sample, not a
          reliable prediction of the next tick.
        </p>

        <button
          style={styles.button}
          disabled={!ready}
          onClick={captureSignal}
        >
          <Check size={15} style={{ verticalAlign: 'middle' }} /> Record
          next-tick observation
        </button>

        {!ready && (
          <p style={styles.muted}>
            Connect to the live feed and collect at least 100 ticks first.
          </p>
        )}
      </section>

      <section style={styles.card}>
        <h2>
          <Sparkles
            size={18}
            style={{ verticalAlign: 'middle', marginRight: 7 }}
          />
          AI commentary
        </h2>
        <p style={styles.muted}>
          Ask the configured analysis endpoint to explain the current
          frequency statistics.
        </p>

        <button
          style={styles.button}
          disabled={!ready || aiStatus === 'loading'}
          onClick={explainSnapshot}
        >
          {aiStatus === 'loading' ? (
            'Analyzing…'
          ) : (
            <>
              <RefreshCw
                size={15}
                style={{ verticalAlign: 'middle', marginRight: 6 }}
              />
              Explain this snapshot
            </>
          )}
        </button>

        {aiText && (
          <p
            role="status"
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              overflowWrap: 'anywhere',
            }}
          >
            {aiText}
          </p>
        )}

        {aiStatus === 'error' && (
          <p style={styles.muted}>
            Check that the /api/analyze server endpoint exists and is
            configured. The AI button cannot work without it.
          </p>
        )}
      </section>

      <section style={styles.card}>
        <h2>Observation history</h2>
        <p style={styles.muted}>
          Settled observations: {completed.length} · Matches: {matches}
        </p>

        <button style={styles.button} onClick={exportCsv}>
          <Download size={15} style={{ verticalAlign: 'middle' }} /> Export CSV
        </button>

        {signals.length === 0 ? (
          <p style={styles.muted}>No observations recorded yet.</p>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              style={{
                borderTop: '1px solid #29344d',
                padding: '12px 0',
              }}
            >
              <strong>Digit {signal.digit}</strong>
              {' · '}
              {signal.frequency.toFixed(1)}%
              <div style={styles.muted}>{signal.time}</div>
              <div>
                Result: <strong>{signal.result}</strong>
                {signal.actual !== undefined
                  ? ` · Actual digit: ${signal.actual}`
                  : ''}
              </div>
            </div>
          ))
        )}
      </section>

      <footer style={{ ...styles.card, ...styles.muted }}>
        DigitLab is an analysis and observation tool. It does not place
        trades, train a predictive model, or guarantee profit. Synthetic
        market outcomes can be unpredictable.
      </footer>
    </main>
  )
}

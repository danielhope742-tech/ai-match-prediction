import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  FlaskConical,
  History,
  Layers3,
  Link2,
  Menu,
  Radio,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'

const markets = [
  { id: 'R_100', name: 'Volatility 100 Index', short: 'Vol 100', decimals: 2 },
  { id: 'R_75', name: 'Volatility 75 Index', short: 'Vol 75', decimals: 4 },
  { id: 'R_50', name: 'Volatility 50 Index', short: 'Vol 50', decimals: 4 },
  { id: 'R_25', name: 'Volatility 25 Index', short: 'Vol 25', decimals: 3 },
  { id: 'R_10', name: 'Volatility 10 Index', short: 'Vol 10', decimals: 3 },
]
type Tick = { price: number; digit: number; epoch: number }
type Signal = {
  id: number
  digit: number
  symbol: string
  time: string
  frequency: number
  result: 'Pending' | 'Match' | 'No match'
  actual?: number
}
const preview: Tick[] = Array.from({ length: 150 }, (_, i) => {
  const price = Number(
    (
      1524.7 +
      Math.sin(i * 0.19) * 1.7 +
      Math.cos(i * 0.73) * 0.32 +
      i * 0.008
    ).toFixed(2),
  )
  return {
    price,
    digit: Number(price.toFixed(2).slice(-1)),
    epoch: 1700000000 + i * 2,
  }
})

export function Dashboard() {
  const [market, setMarket] = useState('R_100')
  const [windowSize, setWindowSize] = useState(100)
  const [decimals, setDecimals] = useState(2)
  const [ticks, setTicks] = useState<Tick[]>([])
  const [status, setStatus] = useState<
    'offline' | 'connecting' | 'live' | 'error'
  >('offline')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState<'connect' | 'method' | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [active, setActive] = useState('Overview')
  const [mobile, setMobile] = useState(false)
  const [appId, setAppId] = useState('1089')
  const [aiStatus, setAiStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const [aiText, setAiText] = useState('')
  const [aiSnapshot, setAiSnapshot] = useState('')
  const aiRequest = useRef(0)
  const socket = useRef<WebSocket | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sequence = useRef(0)
  const currentMarket = markets.find((m) => m.id === market)!
  const isLive = status === 'live'
  const shown = ticks.length
    ? ticks.slice(-windowSize)
    : preview.slice(-windowSize)
  const isPreview = !ticks.length
  const counts = useMemo(
    () =>
      Array.from(
        { length: 10 },
        (_, d) => shown.filter((t) => t.digit === d).length,
      ),
    [shown],
  )
  const top = counts.indexOf(Math.max(...counts))
  const low = counts.indexOf(Math.min(...counts))
  const topPercent = ((counts[top] / shown.length) * 100).toFixed(1)
  const last = shown.at(-1)!
  const previous = shown.at(-2) ?? last
  const ready = isLive && ticks.length >= 100
  const displayDecimals = isPreview ? 2 : decimals
  const chartMax = Math.max(
    25,
    Math.ceil(((Math.max(...counts) / shown.length) * 100) / 5) * 5,
  )
  const completed = signals.filter((s) => s.result !== 'Pending')
  const matches = completed.filter((s) => s.result === 'Match').length

  function stop() {
    sequence.current++
    aiRequest.current++
    setAiStatus('idle')
    setAiText('')
    if (timer.current) clearTimeout(timer.current)
    socket.current?.close()
    socket.current = null
    setSignals((s) => s.filter((row) => row.result !== 'Pending'))
    setStatus('offline')
  }
  useEffect(
    () => () => {
      sequence.current++
      aiRequest.current++
      socket.current?.close()
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 4500)
    return () => clearTimeout(timeout)
  }, [notice])
  useEffect(() => {
    aiRequest.current++
    setAiStatus('idle')
    setAiText('')
  }, [market, windowSize])
  useEffect(() => {
    if (!dialog) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null)
    }
    const previousFocus = document.activeElement as HTMLElement | null
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = document.querySelectorAll<HTMLElement>(
        '.modal button, .modal input, .modal a',
      )
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', listener)
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', listener)
      document.removeEventListener('keydown', trap)
      previousFocus?.focus()
    }
  }, [dialog])

  function connect() {
    if (!/^\d+$/.test(appId)) {
      setError('Enter a valid public Deriv application ID.')
      return
    }
    stop()
    const generation = sequence.current
    setDialog(null)
    setError('')
    setStatus('connecting')
    setTicks([])
    setDecimals(currentMarket.decimals)
  
    
const ws = new WebSocket(
  `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`
)
socket.current = ws

  


  


  

    
                                            
    
    socket.current = ws
    let precision = currentMarket.decimals
    let lastEpoch = 0
    const valid = () => generation === sequence.current
    function watchdog() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(
        () =>
          fail(
            'The market feed stopped updating. Reconnect to continue analysis.',
          ),
        30000,
      )
    }
    function fail(message: string) {
      if (!valid()) return
      if (timer.current) clearTimeout(timer.current)
      setError(message)
      setStatus('error')
      ws.close()
    }
    timer.current = setTimeout(
      () =>
        fail(
          'Deriv is taking too long to respond. Check your connection and try again.',
        ),
      18000,
    )
    ws.onopen = () => {
      if (valid())
        ws.send(
          JSON.stringify({
            ticks_history: market,
            adjust_start_time: 1,
            count: 500,
            end: 'latest',
            start: 1,
            style: 'ticks',
            subscribe: 1,
          }),
        )
    }
    ws.onmessage = (event) => {
      if (!valid()) return
      let data: any
      try {
        data = JSON.parse(event.data)
      } catch {
        fail('An unreadable response arrived from Deriv. Please reconnect.')
        return
      }
      if (data.error) {
        fail(
          typeof data.error.message === 'string'
            ? data.error.message
            : 'Deriv could not open this feed.',
        )
        return
      }
      if (
        data.msg_type === 'history' &&
        Array.isArray(data.history?.prices) &&
        Array.isArray(data.history?.times) &&
        data.history.prices.length
      ) {
        if (timer.current) clearTimeout(timer.current)
        if (Number.isInteger(data.pip_size)) precision = data.pip_size
        const prices = data.history.prices as (number | string)[]
        const next = prices
          .map((value, i) => ({
            price: Number(value),
            digit: Number(Number(value).toFixed(precision).slice(-1)),
            epoch: Number(data.history.times[i]),
          }))
          .filter((t) => Number.isFinite(t.price) && Number.isFinite(t.epoch))
        if (!next.length) {
          fail('No ticks were available. Try a different market.')
          return
        }
        lastEpoch = next.at(-1)!.epoch
        setDecimals(precision)
        setTicks(next.slice(-1000))
        setStatus('live')
        watchdog()
      }
      if (
        data.msg_type === 'tick' &&
        data.tick &&
        Number.isFinite(Number(data.tick.quote))
      ) {
        if (timer.current) clearTimeout(timer.current)
        if (Number.isInteger(data.tick.pip_size)) precision = data.tick.pip_size
        const tick: Tick = {
          price: Number(data.tick.quote),
          digit: Number(Number(data.tick.quote).toFixed(precision).slice(-1)),
          epoch: Number(data.tick.epoch),
        }
        if (!Number.isFinite(tick.epoch) || tick.epoch <= lastEpoch) {
          watchdog()
          return
        }
        lastEpoch = tick.epoch
        setDecimals(precision)
        setTicks((old) => [...old, tick].slice(-1000))
        setStatus('live')
        watchdog()
        setSignals((old) =>
          old.map((s) =>
            s.result === 'Pending'
              ? {
                  ...s,
                  actual: tick.digit,
                  result: s.digit === tick.digit ? 'Match' : 'No match',
                }
              : s,
          ),
        )
      }
    }
    ws.onerror = () =>
      fail(
        'Unable to reach Deriv. Check your network or public application ID, then reconnect.',
      )
    ws.onclose = () => {
      if (!valid()) return
      if (timer.current) clearTimeout(timer.current)
      setStatus((s) => (s === 'error' ? s : 'offline'))
      setSignals((s) => s.filter((row) => row.result !== 'Pending'))
    }
  }

  async function explainSnapshot() {
    if (!ready || aiStatus === 'loading') return
    const id = ++aiRequest.current
    setAiStatus('loading')
    setAiText('')
    setAiSnapshot(
      `${currentMarket.short} · ${shown.length} ticks · ${new Date().toLocaleTimeString('en-GB')}`,
    )
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, counts }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await response.json()
      if (id !== aiRequest.current) return
      if (!response.ok || typeof data.analysis !== 'string')
        throw new Error(
          data.error || 'AI commentary is unavailable. Try again shortly.',
        )
      setAiText(data.analysis)
      setAiStatus('done')
    } catch (e) {
      if (id !== aiRequest.current) return
      setAiText(
        e instanceof Error && e.name !== 'TimeoutError'
          ? e.message
          : 'AI commentary timed out. Try again shortly.',
      )
      setAiStatus('error')
    }
  }

  function captureSignal() {
    if (!ready) return
    if (signals.some((s) => s.result === 'Pending')) {
      setNotice('Waiting for the next tick to settle your current signal.')
      return
    }
    setSignals((s) =>
      [
        {
          id: Date.now(),
          digit: top,
          symbol: currentMarket.short,
          time: new Date().toLocaleTimeString('en-GB'),
          frequency: Number(topPercent),
          result: 'Pending',
        },
        ...s,
      ].slice(0, 100),
    )
    setNotice(
      `Digit ${top} captured. The next live tick settles this observation.`,
    )
  }
  async function copySignal() {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(
        `Digit Matches | ${currentMarket.name} | Digit: ${top} | Duration: 1 tick | Observed frequency: ${topPercent}% over ${shown.length} ticks | Demo analysis only; not a reliable prediction.`,
      )
      setNotice('Signal copied. Enter it manually in your demo bot.')
    } catch {
      setNotice(
        'Clipboard unavailable. Use the digit and market displayed on the signal card.',
      )
    }
  }
  function exportSignals() {
    if (!signals.length) {
      setNotice('Capture a live signal first to export your session.')
      return
    }
    const csv = [
      'Time,Market,Digit,Observed frequency,Result,Actual digit',
      ...signals.map(
        (s) =>
          `${s.time},${s.symbol},${s.digit},${s.frequency}%,${s.result},${s.actual ?? ''}`,
      ),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'digitlab-session.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  function navigate(label: string) {
    setActive(label)
    setMobile(false)
    if (label === 'How it works') {
      setDialog('method')
      return
    }
    document
      .getElementById(
        label === 'Signal history'
          ? 'signal-history'
          : label === 'Market analysis'
            ? 'distribution'
            : 'overview',
      )
      ?.scrollIntoView({ behavior: 'smooth' })
  }
  const min = Math.min(...shown.map((t) => t.price))
  const max = Math.max(...shown.map((t) => t.price))
  const points = shown
    .map(
      (t, i) =>
        `${(i / Math.max(shown.length - 1, 1)) * 800},${155 - ((t.price - min) / (max - min || 1)) * 125}`,
    )
    .join(' ')

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <a className="brand" href="/" aria-label="DigitLab home">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          digitlab<span className="brand-period">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          {[
            { label: 'Overview', icon: Layers3 },
            { label: 'Market analysis', icon: BarChart3 },
            { label: 'Signal history', icon: History },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${active === label ? 'selected' : ''}`}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              {label}
              {label === 'Overview' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <FlaskConical size={21} />
            <strong>A space to test.</strong>
            <p>Explore patterns. Build your confidence. Keep it demo.</p>
            <span>
              DEMO WORKSPACE <ArrowUpRight size={13} />
            </span>
          </div>
          <button className="nav-item" onClick={() => navigate('How it works')}>
            <CircleHelp size={19} />
            How it works
            <ArrowUpRight size={15} />
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setError('')
              setDialog('connect')
            }}
          >
            <Settings2 size={19} />
            Connection settings
          </button>
          <div className="workspace-profile">
            <span className="avatar">D</span>
            <div>
              <strong>Demo workspace</strong>
              <small>Manual trading signals</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{active === 'How it works' ? 'Overview' : active}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <FlaskConical size={13} />
              Demo mode
            </span>
            <span className="top-divider" />
            <button
              className="icon-button"
              aria-label="Help and methodology"
              onClick={() => setDialog('method')}
            >
              <CircleHelp size={19} />
            </button>
            <span className="avatar small">D</span>
          </div>
        </header>
        <main id="overview">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR MARKET, A LITTLE CLEARER</div>
              <h1>
                See the digits. Find your signal<span>.</span>
              </h1>
              <p>A clearer view of Deriv Digit Matches, one tick at a time.</p>
            </div>
            <button
              className={`button connect-button ${isLive ? 'connected' : ''}`}
              onClick={() =>
                isLive ? stop() : (setError(''), setDialog('connect'))
              }
            >
              {isLive ? <Radio size={16} /> : <Link2 size={16} />}{' '}
              {isLive ? 'Disconnect feed' : 'Connect to Deriv'}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="workspace-banner">
            <div>
              <span className="banner-icon">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>Practice first. Trade thoughtfully.</strong> This
                workspace is for demo analysis. Your bot stays in your control.
              </span>
            </div>
            <button onClick={() => setDialog('method')}>
              How it works <ArrowRight size={15} />
            </button>
          </div>
          <div className="market-toolbar">
            <div className="market-control">
              <span className="market-icon">
                <Activity size={20} />
              </span>
              <div>
                <label htmlFor="market">MARKET</label>
                <div className="select-wrap">
                  <select
                    id="market"
                    value={market}
                    onChange={(e) => {
                      stop()
                      setTicks([])
                      setMarket(e.target.value)
                    }}
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
            <div className="toolbar-right">
              <span className={`feed-status ${isLive ? 'live' : ''}`}>
                <i />
                {status === 'connecting'
                  ? 'Connecting to Deriv…'
                  : isLive
                    ? 'Live market feed'
                    : ticks.length
                      ? 'Feed paused'
                      : 'Preview data'}
              </span>
              <div className="toolbar-divider" />
              <SlidersHorizontal size={15} />
              <label className="sr-only" htmlFor="window">
                Analysis window
              </label>
              <select
                id="window"
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
              >
                <option value={100}>Last 100 ticks</option>
                <option value={250}>Last 250 ticks</option>
                <option value={500}>Last 500 ticks</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button onClick={() => setDialog('connect')}>
                Connection settings <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-label">
                Latest tick <Activity size={16} />
              </div>
              <div className="metric-value">
                {last.price.toFixed(displayDecimals)}
                <span className="tick-digit">{last.digit}</span>
              </div>
              <div className="metric-foot">
                <span
                  className={
                    last.price >= previous.price ? 'positive' : 'negative'
                  }
                >
                  {last.price >= previous.price ? (
                    <ArrowUpRight size={13} />
                  ) : (
                    <ArrowDownLeft size={13} />
                  )}{' '}
                  {Math.abs(last.price - previous.price).toFixed(
                    displayDecimals,
                  )}
                </span>
                <span>from previous tick</span>
              </div>
            </div>
            <div className="metric">
              <div className="metric-label">
                Most frequent digit <TrendingUp size={16} />
              </div>
              <div className="metric-value">
                {top}
                <span className="metric-tag">{topPercent}%</span>
              </div>
              <div className="metric-foot">
                <span className="mint-dot" /> {counts[top]} appearances in{' '}
                {shown.length} ticks
              </div>
            </div>
            <div className="metric">
              <div className="metric-label">
                Least frequent digit <BarChart3 size={16} />
              </div>
              <div className="metric-value">
                {low}
                <span className="metric-tag neutral">
                  {((counts[low] / shown.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="metric-foot">
                {counts[low]} appearances in {shown.length} ticks
              </div>
            </div>
            <div className="metric">
              <div className="metric-label">
                Session observations <Target size={16} />
              </div>
              <div className="metric-value">
                {completed.length ? `${matches}/${completed.length}` : '—'}
                <span className="metric-unit">matches</span>
              </div>
              <div className="metric-foot">
                {completed.length
                  ? 'Settled against the next live tick'
                  : 'Capture a signal to start tracking'}
              </div>
            </div>
          </div>
          <div className="analysis-grid">
            <section className="panel distribution" id="distribution">
              <div className="panel-heading">
                <div>
                  <h2>
                    Digit distribution <span className="tiny-pill">0–9</span>
                  </h2>
                  <p>Every last digit, a little more context.</p>
                </div>
                <button
                  className="icon-button"
                  aria-label="About digit distribution"
                  onClick={() => setDialog('method')}
                >
                  <CircleHelp size={16} />
                </button>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-box" />
                  Digit frequency
                </span>
                <span>
                  <i className="legend-line" />
                  10% baseline
                </span>
                <span className="data-label">
                  {isPreview
                    ? 'ILLUSTRATIVE PREVIEW'
                    : `${shown.length} OBSERVED TICKS`}
                </span>
              </div>
              <div
                className="bar-chart"
                role="img"
                aria-label={`Digit frequencies over ${shown.length} ${isPreview ? 'illustrative' : 'live'} ticks. ${counts.map((n, d) => `${d}: ${((n / shown.length) * 100).toFixed(1)}%`).join(', ')}`}
              >
                <div className="y-axis">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i}>
                      {((chartMax * (5 - i)) / 5).toFixed(0)}%
                    </span>
                  ))}
                </div>
                <div className="plot">
                  <div className="grid-lines">
                    {Array.from({ length: 6 }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  <div
                    className="baseline"
                    style={{ top: `${(1 - 10 / chartMax) * 100}%` }}
                  />
                  <div className="bars">
                    {counts.map((n, d) => (
                      <div
                        className={`bar-column ${d === top ? 'top' : ''}`}
                        key={d}
                      >
                        <div className="bar-slot">
                          <span
                            className="bar-value"
                            style={{
                              top: `calc(${100 - (((n / shown.length) * 100) / chartMax) * 100}% - 17px)`,
                            }}
                          >
                            {((n / shown.length) * 100).toFixed(1)}%
                          </span>
                          <div
                            className="bar"
                            style={{
                              height: `${Math.min((((n / shown.length) * 100) / chartMax) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="bar-digit">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-footer">
                <span>
                  <span className="mint-dot" />
                  Highest frequency <strong>Digit {top}</strong>
                </span>
                <span>Sample window: {shown.length} ticks</span>
              </div>
            </section>
            <section className="panel signal-panel">
              <div className="panel-heading">
                <h2>
                  <Sparkles size={17} />
                  Signal spotlight
                </h2>
                <span className="tiny-pill mint">DIGIT MATCHES</span>
              </div>
              <p className="signal-caption">
                A statistical candidate for your next observation
              </p>
              <div className="signal-digit-wrap">
                <span className="signal-bracket left" />
                <div className="signal-digit">{top}</div>
                <span className="signal-bracket right" />
                <span className="digit-caption">SUGGESTED DIGIT</span>
              </div>
              <div className="signal-stat">
                <span>Observed frequency</span>
                <strong>
                  {topPercent}
                  <small>%</small>
                </strong>
              </div>
              <div className="frequency-track">
                <i style={{ width: `${Number(topPercent)}%` }} />
                <b />
              </div>
              <div className="signal-details">
                <span>
                  Contract<strong>Digit Matches</strong>
                </span>
                <span>
                  Duration<strong>1 tick</strong>
                </span>
              </div>
              <div className="signal-message">
                <span className="mint-dot" />
                {ready
                  ? 'Ready for a demo observation'
                  : status === 'connecting'
                    ? 'Loading market history…'
                    : isLive
                      ? 'Collecting at least 100 ticks…'
                      : 'Connect the live feed to capture signals'}
              </div>
              <div className="signal-actions">
                <button
                  className="button primary"
                  disabled={!ready}
                  onClick={captureSignal}
                >
                  <Zap size={16} />
                  Capture signal
                  <ArrowRight size={15} />
                </button>
                <button
                  className="copy-button"
                  disabled={!ready}
                  aria-label="Copy current signal"
                  onClick={copySignal}
                >
                  <Copy size={17} />
                </button>
              </div>
              <p className="signal-disclaimer">
                Frequency is historical, not a win probability.
              </p>
            </section>
          </div>
          <section className="ai-panel" aria-labelledby="ai-heading">
            <div className="ai-panel-title">
              <span className="ai-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <h2 id="ai-heading">
                  A second perspective<span>AI COMMENTARY</span>
                </h2>
                <p>
                  Turn a snapshot of live statistics into a plain-language
                  explanation.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={explainSnapshot}
                disabled={!ready || aiStatus === 'loading'}
              >
                <Sparkles size={13} />
                {aiStatus === 'loading'
                  ? 'Reading the digits…'
                  : aiStatus === 'done'
                    ? 'Refresh analysis'
                    : 'Explain this snapshot'}
                <ArrowRight size={13} />
              </button>
            </div>
            {aiStatus === 'loading' && (
              <div
                className="ai-skeleton"
                role="status"
                aria-label="Generating AI commentary"
              >
                <i />
                <i />
                <i />
              </div>
            )}
            {aiText && (
              <div
                className={`ai-response ${aiStatus === 'error' ? 'error-text' : ''}`}
                aria-live="polite"
              >
                <span>{aiSnapshot}</span>
                <p>{aiText}</p>
                <small>
                  AI explanation · A snapshot of past ticks, not a forecast.
                </small>
              </div>
            )}
          </section>
          <section className="panel tick-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Market pulse{' '}
                  <span className="tiny-pill">{currentMarket.short}</span>
                </h2>
                <p>The movement behind the numbers.</p>
              </div>
              <div className="pulse-value">
                <strong>{last.price.toFixed(displayDecimals)}</strong>
                <span className={isPreview ? '' : 'positive'}>
                  {isPreview
                    ? 'Preview chart'
                    : isLive
                      ? 'Streaming ticks'
                      : 'Paused snapshot'}
                </span>
              </div>
            </div>
            <div className="price-chart">
              <div className="price-labels">
                <span>{max.toFixed(displayDecimals)}</span>
                <span>{((max + min) / 2).toFixed(displayDecimals)}</span>
                <span>{min.toFixed(displayDecimals)}</span>
              </div>
              <svg
                viewBox="0 0 800 175"
                preserveAspectRatio="none"
                role="img"
                aria-label={`${isPreview ? 'Illustrative' : 'Observed'} market price movement over ${shown.length} ticks`}
              >
                <defs>
                  <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78dcb4" stopOpacity=".16" />
                    <stop offset="100%" stopColor="#78dcb4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,175 L${points.replaceAll(' ', ' L')} L800,175 Z`}
                  fill="url(#price-fill)"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#83dbb8"
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="tick-tape">
              <span className="tape-label">
                LAST DIGITS <ArrowRight size={13} />
              </span>
              <div className="tape-digits">
                {shown.slice(-20).map((t, i) => (
                  <span
                    className={t.digit === top ? 'highlight' : ''}
                    key={`${t.epoch}-${i}`}
                  >
                    {t.digit}
                  </span>
                ))}
              </div>
              <span className="latest-label">
                LATEST <span className="mint-dot" />
              </span>
            </div>
          </section>
          <section className="panel history-panel" id="signal-history">
            <div className="panel-heading">
              <div>
                <h2>
                  Signal history{' '}
                  <span className="count-badge">{signals.length}</span>
                </h2>
                <p>Your observations. Your decisions.</p>
              </div>
              <button className="button secondary" onClick={exportSignals}>
                <Download size={14} />
                Export CSV
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>MARKET</th>
                    <th>DIGIT</th>
                    <th>FREQUENCY</th>
                    <th>NEXT-TICK RESULT</th>
                    <th>ACTUAL DIGIT</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.time}</td>
                      <td>{s.symbol}</td>
                      <td>
                        <span className="table-digit">{s.digit}</span>
                      </td>
                      <td className="mono">{s.frequency.toFixed(1)}%</td>
                      <td>
                        <span
                          className={`result ${s.result === 'Match' ? 'positive' : ''}`}
                        >
                          {s.result === 'Match' && <Check size={12} />}{' '}
                          {s.result}
                        </span>
                      </td>
                      <td className="mono">{s.actual ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {signals.length === 0 && (
              <div className="empty-history">
                <span className="empty-icon">
                  <History size={23} />
                </span>
                <div>
                  <strong>Your first observation starts here</strong>
                  <p>
                    Connect the feed and capture a signal to track its next-tick
                    result.
                  </p>
                </div>
                <button
                  onClick={() =>
                    isLive ? captureSignal() : setDialog('connect')
                  }
                >
                  {isLive ? 'Capture signal' : 'Connect feed'}{' '}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="history-footer">
              <ShieldCheck size={13} /> Session only · Signals clear when you
              refresh. Export to keep a record.
            </div>
          </section>
          <footer className="page-footer">
            <span className="footer-brand">
              <Activity size={16} />
              digitlab.
            </span>
            <p>Built for understanding. Designed for discipline.</p>
            <span>Digits are unpredictable. No guaranteed returns.</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {dialog && (
        <div className="modal-overlay" onClick={() => setDialog(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setDialog(null)}
            >
              <X size={21} />
            </button>
            <span className="modal-icon">
              {dialog === 'connect' ? (
                <Link2 size={24} />
              ) : (
                <FlaskConical size={24} />
              )}
            </span>
            <h2 id="dialog-title">
              {dialog === 'connect'
                ? 'Connect your market feed'
                : 'A closer look at the digits'}
            </h2>
            {dialog === 'connect' ? (
              <>
                <p>
                  Stream public Deriv ticks into your demo workspace. No
                  password, API token, or account access is required.
                </p>
                <div className="connection-summary">
                  <span>
                    <Radio size={17} />
                    Live Deriv market data
                  </span>
                  <span>
                    <ShieldCheck size={17} />
                    No trades placed
                  </span>
                  <span>
                    <Copy size={17} />
                    Manual signals for your demo bot
                  </span>
                </div>
                <label className="field-label" htmlFor="app-id">
                  Public Deriv application ID
                </label>
                <input
                  id="app-id"
                  inputMode="numeric"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Public app ID"
                />
                <p className="field-help">
                  A shared public app ID is prefilled. If Deriv rejects it, use
                  your registered public application ID. Never enter a token
                  here.
                </p>
                {error && (
                  <p className="error-text" role="alert">
                    {error}
                  </p>
                )}
                <button className="button primary full-width" onClick={connect}>
                  <Link2 size={16} />
                  Start live analysis
                  <ArrowRight size={16} />
                </button>
                <p className="modal-note">
                  Account linking comes later. Enter signals manually in your
                  Deriv demo bot.
                </p>
              </>
            ) : (
              <>
                <p>
                  DigitLab measures the last digit of each quote, using the
                  market’s decimal precision, and counts its frequency in your
                  selected tick window.
                </p>
                <div className="method-step">
                  <span>01</span>
                  <div>
                    <strong>Observe the market</strong>
                    <p>
                      Connect public Deriv ticks and choose a window of 100,
                      250, or 500 ticks. Preview data is illustrative until
                      connected.
                    </p>
                  </div>
                </div>
                <div className="method-step">
                  <span>02</span>
                  <div>
                    <strong>Explore a statistical candidate</strong>
                    <p>
                      The most frequent digit becomes the suggested digit. Ties
                      use the lowest digit. The 10% line is the uniform
                      baseline, not an assured outcome.
                    </p>
                  </div>
                </div>
                <div className="method-step">
                  <span>03</span>
                  <div>
                    <strong>Test before you trade</strong>
                    <p>
                      Capture records a digit and compares it with the next
                      arriving tick. This is an observation, not an executed
                      contract or bot performance. Copy the signal to enter
                      manually.
                    </p>
                  </div>
                </div>
                <div className="method-warning">
                  Suggested digits use frequency statistics. Optional AI
                  commentary explains a frozen snapshot; it does not train a
                  predictor or change your signal. Past ticks do not establish
                  an ability to predict future digits. No account connection or
                  automated trading is enabled.
                </div>
                <button
                  className="button primary full-width"
                  onClick={() => setDialog(null)}
                >
                  Back to workspace
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

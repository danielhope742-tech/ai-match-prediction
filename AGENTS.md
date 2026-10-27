# DigitLab architecture

DigitLab is a manual Deriv Digit Matches analysis workspace built with TanStack Start and React. The user deferred account linking and bot integration until after trying live analysis. Preserve that scope: no account credentials or trading API requests.

## Directories

- `src/routes/index.tsx` mounts the workspace.
- `src/routes/__root.tsx` owns the document and site metadata.
- `src/components/Dashboard.tsx` owns the dashboard, public Deriv WebSocket lifecycle, tick windows, signal observations, CSV export, connection dialog, and AI commentary requests.
- `src/styles.css` defines the dark charcoal and muted mint interface, responsive sidebar, SVG price chart, CSS distribution chart, dialogs, and reduced-motion behavior.
- `netlify/functions/analyze.mts` validates aggregate digit counts and calls Claude Haiku via Netlify AI Gateway. The official SDK uses runtime-injected credentials; never expose or log credentials or upstream exceptions.
- `public/favicon.svg` is the product favicon.

## Data conventions

Deriv quotes must retain the market decimal precision before extracting the last digit, including trailing zeroes. History precision comes from `pip_size` where present and known market defaults otherwise; subsequent ticks use their supplied `pip_size`. Epochs prevent duplicate or out-of-order ticks from settling observations. A captured signal settles only on a newer streamed tick. Disconnecting discards pending observations and freezes existing ticks; changing markets clears ticks and invalidates asynchronous requests. A connection generation guards old callbacks, and timeouts expose disconnected or stalled feeds.

The initial deterministic chart is explicitly labeled illustrative. Signal capture, copying, and AI are disabled until a live feed has at least 100 observed ticks. Frequency is based only on the chosen trailing window. The highest frequency is the statistical candidate; ties choose the lowest digit. Never describe this as a validated AI prediction, next-digit probability, or guaranteed trading edge.

AI commentary uses a frozen count snapshot and is generated only on request. It explains data; it never determines or modifies the statistical signal. Keep the snapshot time visible, ignore stale async responses, and preserve useful statistics if the AI service fails.

State is intentionally transient and bounded (1,000 ticks and 100 observations), not persistent storage. CSV is the user's explicit export. If persistence is requested later, use Netlify Database after reading the relevant skills.

## Conventions

Use typed React state and browser APIs only in effects or event handlers. Keep root metadata aligned with the product. Use modern TypeScript Netlify Functions, enforce input validation, and return generic AI errors. Use responsive layouts, keyboard focus indicators and dialog handling, accessible chart labels, and reduced-motion styles. Route files use TanStack file routing. Avoid adding generated build outputs. The platform performs build validation; do not run local build, dev, type-check, or test commands during automated implementation runs.

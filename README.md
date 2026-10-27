# DigitLab

A Deriv Digit Matches analysis workspace for manual demo trading. It streams public Deriv ticks, charts last-digit frequencies, suggests the most frequent digit in the selected window, and records next-tick observations. Optional AI commentary explains an observed snapshot without claiming to predict future digits.

## Technology

TanStack Start, React 19, TypeScript, Vite, Lucide icons, and responsive CSS. Live data uses the Deriv WebSocket API directly in the browser. A Netlify Function sends validated aggregate digit counts to Claude Haiku through Netlify AI Gateway.

## Run locally

Use Node 22.13+ or Node 24 and pnpm:

```sh
pnpm install
netlify dev --port 8889
```

Open http://localhost:8889. Netlify CLI provides the function runtime and AI Gateway integration for the linked site. Standalone `pnpm dev` serves the frontend but does not emulate the AI function. AI requires an enabled gateway and available credits; failures appear inline and do not stop the feed.

## Using the workspace

The initial chart contains clearly labeled illustrative data. Choose a volatility index and select **Connect to Deriv**, then **Start live analysis** to request 500 historical ticks and subscribe to new ticks. The prefilled shared public Deriv application ID may be replaced with your own registered public ID. It is not an API token.

Select a 100, 250, or 500 tick window. After at least 100 live/history ticks load, capture a signal to compare its suggested digit against the next arriving tick. Copy the displayed signal for manual entry into a demo bot. Export session observations as CSV before refreshing. AI commentary is requested explicitly and includes the snapshot time and window size.

No Deriv account authorization, automated trades, real-money execution, token handling, or persistent history is included. Account linking is deferred as requested. Signal records are transient session observations, not executed contract results. Frequency does not establish a reliable future-digit prediction or a win probability.

The source was reviewed without running local builds or validation commands; deployment validation is handled by the platform.

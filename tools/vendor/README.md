# Vendored dashboard dependencies

`tools/dashboard.html` runs from the local filesystem (`file://`) and previously
loaded React / ReactDOM / Babel Standalone from unpkg.com. On unreliable or
restricted networks the page hung at "continually loading" waiting for those
scripts. We vendor them here so the dashboard loads instantly with zero network
dependency.

## Pinned versions

- React 18.2.0 — `react.production.min.js`
- ReactDOM 18.2.0 — `react-dom.production.min.js`
- Babel Standalone 7.24.0 — `babel.min.js`

Total on disk: ~3MB. Committed so the dashboard is self-contained.

## To refresh

```bash
cd tools/vendor
curl -fsSL -o react.production.min.js https://unpkg.com/react@18.2.0/umd/react.production.min.js
curl -fsSL -o react-dom.production.min.js https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js
curl -fsSL -o babel.min.js https://unpkg.com/@babel/standalone@7.24.0/babel.min.js
```

If you bump versions, also update the "Pinned versions" list above.

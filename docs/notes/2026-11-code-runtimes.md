# Code runtimes for the `code-runner` widget (spike, 2026-11)

Question: which languages can run entirely in the browser — no server, no CDN at run time — with a
download of at most 15 MB per language, a licence in {MIT, BSD, Apache, MPL, LGPL}, and a runtime
that is either maintained (release in the last two years) or small, frozen and correct?

| Language | Runtime | Version | Licence | Size | Verdict |
| --- | --- | --- | --- | --- | --- |
| JavaScript | the browser engine | — | — | 0 B | **kept** |
| Python | `pyodide` | 314.0.7 | MPL-2.0 | 6.2 MB tarball / 13.9 MB unpacked | **kept** |
| C | `@live-codes/clang-wasm` | 0.3.0 | MIT | 28 MB tarball | **dropped** — over the 15 MB limit |
| C | `clang-wasm` | 20.1.3-c | — | 97 KB package | **dropped** — a Node CLI wrapper (`bin: clang.js`), not a browser runtime |
| Pascal | none found | — | — | — | **dropped** — `fpc` on npm is an unrelated functional-patterns library; no browser Pascal runtime met the criteria |

Decision: the widget supports **Python** and **JavaScript** only. Do not write a runtime for the
dropped languages.

## How the kept runtimes load

The runner frame is a `CustomFrame`-style sandbox: `sandbox="allow-scripts"`, opaque origin, no
`allow-same-origin`. Inside it:

- The frame creates a **module Blob worker** (`new Worker(url, { type: "module" })`) and talks to it
  with `{ kind: "boot" | "run" }`. A runaway learner loop runs in the worker, so the parent can
  discard the whole frame after 5 s and recreate it. A module worker is required: Pyodide 314 throws
  `Classic web workers are not supported` when `importScripts` exists (see `pyodide.mjs`,
  `calculateDerivedFlags` / `isClassicWorker`).
- **Python**: `import(runtimeBase + "pyodide.mjs")` then `loadPyodide({ indexURL: runtimeBase })`.
  Capture output with `setStdout({ batched })` and `setStderr({ batched })`; override
  `builtins.input` with a line reader over the test input; run with `runPythonAsync`.
- **JavaScript**: `new AsyncFunction("input", "console", code)`; `console.log/info/warn` → stdout,
  `console.error` → stderr; `input()` returns the next line of the test input.
- Files copied to `public/runtimes/python/` by `scripts/copy-runtimes.mjs` (run from `predev` and
  `prebuild`; the directory is gitignored): `pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`,
  `python_stdlib.zip`, `pyodide-lock.json`. `pyodide.js` (the classic build) is not needed.

## CSP and CORS

- The runner frame needs `script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' <runtimeBase>`,
  `connect-src <runtimeBase>`, and `worker-src blob:`. `'unsafe-eval'` is only for the sandbox; never
  add it to the page CSP. The page CSP already has `frame-src 'self' blob: data:` from G2.
- The frame's origin is opaque, so its `fetch` / module `import` of `/runtimes/*` is cross-origin.
  GitHub Pages sends `access-control-allow-origin: *` (verified against `mdn.github.io`); `next dev`
  does not. Serve the static export with a CORS-enabled server for by-hand checks (for example
  `npx serve out --cors`). The portal must add `Access-Control-Allow-Origin: *` for
  `/runtimes/:path*` when H vendors the runner.

## Gotchas found while spiking

- `wrapCustomHtml` always injects the `ready`/height bootstrap. The runner frame must disable it,
  otherwise the bootstrap's `{ pg: "ready" }` arrives before Pyodide has loaded.
- Hydrate the frame client-side with `useSyncExternalStore` (server snapshot `false`), not
  `setState` in an effect: the repo's eslint config rejects `react-hooks/set-state-in-effect`.
- The first Python run downloads about 12 MB and takes seconds; the UI must say so. Mount the frame
  lazily on the first Run/Check so a lecture with several code runners does not boot Pyodide for
  every block on page load.
- Parent-side timeout: after 5 s, resolve the pending run with a timeout message and unmount the
  frame so the worker dies; the next run mounts a fresh frame.

## Still to verify by hand

Each kept language runs “hello”, a loop and a runtime error at 375 px; then the showcase blocks
(Python and JavaScript) in light and dark themes.

## Browser check of the sandbox design (2026-11-11) — and deferral

Tested in headless Chrome against a page carrying the template's own CSP:

- A `srcdoc` frame **inherits the page CSP** (policy-container inheritance for `about:srcdoc`). The page has
  no `'unsafe-eval'`, so `new Function` fails inside the frame and a blob worker fails too. The
  `wrapCustomHtml` route therefore cannot host a runtime that needs `eval`, and the page CSP must not be
  widened for it.
- A sandboxed frame loaded **from a static file** (`sandbox="allow-scripts"`, e.g. `/runtimes/runner.html`)
  does not inherit the page CSP; its own meta CSP applies, and `eval` works there.
- Inside that opaque-origin frame a **blob module worker fails**; a blob classic worker, a `data:` classic
  worker and a `data:` module worker work. Pyodide needs a module worker, so it would be a `data:` module
  worker.
- The runner page cannot know the site origin statically; it would have to write its meta CSP from
  `location.href` (still the real URL in an opaque sandboxed frame) before any other script.
- The Claude desktop browser pane does not run scripts in file-backed sandboxed frames at all; use real
  Chrome for by-hand checks.

**Decision (user, 2026-11-11):** the code-runner widget is deferred. Iteration 3 continues with hosting
(package H). If it comes back, start from the static runner page + `data:` module worker design above,
and consider MicroPython (< 1 MB, partial stdlib) against Pyodide (real CPython, ~12 MB first load).

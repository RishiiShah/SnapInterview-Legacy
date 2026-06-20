let pyodide = null;

async function loadPyodideIfNeeded() {
  if (pyodide) return pyodide;
  importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js");
  pyodide = await loadPyodide();
  return pyodide;
}

self.onmessage = async function (e) {
  const { code, input } = e.data;
  try {
    const py = await loadPyodideIfNeeded();
    py.globals.set("__input__", input);
    py.runPython(`
import sys, io
sys.stdin = io.StringIO(__input__)
__stdout__ = io.StringIO()
sys.stdout = __stdout__
`);
    const start = performance.now();
    py.runPython(code);
    const elapsed = performance.now() - start;
    const stdout = py.runPython("__stdout__.getvalue()");
    self.postMessage({ stdout, stderr: "", executionTimeMs: Math.round(elapsed) });
  } catch (err) {
    self.postMessage({ stdout: "", stderr: err.message || String(err), executionTimeMs: 0 });
  }
};

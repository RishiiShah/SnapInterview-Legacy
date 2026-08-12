importScripts("https://cdn.jsdelivr.net/npm/jscpp@2.1.2/dist/JSCPP.es5.min.js");

self.onmessage = function (e) {
  const { code, input } = e.data;
  const start = performance.now();
  try {
    const config = { stdio: { write: function (s) { this.output += s; } } };
    config.stdio.output = "";
    JSCPP.run(code, input, config);
    const elapsed = performance.now() - start;
    self.postMessage({
      stdout: config.stdio.output,
      stderr: "",
      executionTimeMs: Math.round(elapsed),
    });
  } catch (err) {
    const elapsed = performance.now() - start;
    self.postMessage({
      stdout: "",
      stderr: err.message || String(err),
      executionTimeMs: Math.round(elapsed),
    });
  }
};

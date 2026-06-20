self.onmessage = function (e) {
  const { code, input } = e.data;
  const logs = [];
  const originalLog = console.log;
  console.log = function (...args) {
    logs.push(args.map(String).join(" "));
  };

  const start = performance.now();
  try {
    const fn = new Function("input", code + "\n");
    fn(input);
    const elapsed = performance.now() - start;
    self.postMessage({
      stdout: logs.join("\n"),
      stderr: "",
      executionTimeMs: Math.round(elapsed),
    });
  } catch (err) {
    const elapsed = performance.now() - start;
    self.postMessage({
      stdout: logs.join("\n"),
      stderr: err.message || String(err),
      executionTimeMs: Math.round(elapsed),
    });
  } finally {
    console.log = originalLog;
  }
};

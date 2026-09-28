/* Headless CPU-vs-GPU parity: `node prototypes/webgpu-lab/gpu-parity-run.js`
 * Serves the repo root on localhost, opens gpu-parity.html in headless Chromium
 * with WebGPU on SwiftShader (no GPU needed) and prints the per-config result.
 * OPTIONAL: needs Playwright + a Chromium build already on the machine (it is
 * not a repo dependency). Set PLAYWRIGHT_MODULE to its path if not resolvable. */
var http = require("http"), fs = require("fs"), path = require("path");
var pw;
try { pw = require(process.env.PLAYWRIGHT_MODULE || "playwright"); }
catch (e) { console.log("skip: Playwright not found (set PLAYWRIGHT_MODULE=/path/to/playwright)"); process.exit(0); }

var ROOT = path.resolve(__dirname, "../.."), TYPES = { ".html": "text/html", ".js": "text/javascript", ".wgsl": "text/plain" };
var srv = http.createServer(function (q, s) {
  var f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); }
  s.setHeader("content-type", TYPES[path.extname(f)] || "application/octet-stream"); fs.createReadStream(f).pipe(s);
}).listen(0, "127.0.0.1", async function () {
  var code = 1, browser;
  try {
    browser = await pw.chromium.launch({ headless: true, args: ["--enable-unsafe-webgpu", "--use-webgpu-adapter=swiftshader"] });
    var page = await browser.newPage();
    page.on("pageerror", function (e) { console.log("pageerror:", e.message); });
    await page.goto("http://127.0.0.1:" + srv.address().port + "/prototypes/webgpu-lab/gpu-parity.html");
    await page.waitForFunction(function () { return window.parityResult; }, null, { timeout: 120000 });
    var r = await page.evaluate(function () { return window.parityResult; });
    if (r.error) { console.log("error:", r.error); }
    else {
      console.log("adapter: " + r.adapter + "  tolerance: " + r.tol);
      r.results.forEach(function (x) {
        console.log((x.ok ? "  ok  " : x.known ? " known" : " FAIL ") + " " + x.name + "  max|d| n=" + x.maxN.toExponential(2) + " A=" + x.maxA.toExponential(2) +
                    " B=" + x.maxB.toExponential(2) + " gateFlips=" + x.flips + (x.known ? "  (" + x.known + ")" : ""));
      });
      var counted = r.results.filter(function (x) { return !x.known; }), n = counted.filter(function (x) { return x.ok; }).length;
      console.log("\n" + n + " passed, " + (counted.length - n) + " failed (" + (r.results.length - counted.length) + " known divergences reported)");
      code = r.ok ? 0 : 1;
    }
  } catch (e) { console.log("error:", e.message); }
  if (browser) await browser.close();
  srv.close(); process.exit(code);
});

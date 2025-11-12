const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  try {
    // Output directory and file (adjust via env if needed)
    const outDir = process.env.SCREENSHOT_DIR
      ? path.resolve(process.env.SCREENSHOT_DIR)
      : path.resolve(__dirname, "..", "assets", "og");
    const outFile = process.env.SCREENSHOT_OUTPUT
      ? path.resolve(process.env.SCREENSHOT_OUTPUT)
      : path.join(outDir, "screenshot.png");

    // Ensure output directory exists
    await fs.promises.mkdir(outDir, { recursive: true });

    // URL to screenshot (can be overridden with SCREENSHOT_URL)
    const url = process.env.SCREENSHOT_URL || "http://127.0.0.1:4000/";

    // Puppeteer launch options suitable for GitHub Actions / CI environments
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1200,600",
      ],
    };

    console.log(`Starting browser to capture ${url}`);
    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 600 });

    // Navigate and wait for the network to be mostly idle
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

    // Wait for fonts to load (including Font Awesome)
    await page.evaluateHandle("document.fonts.ready");
    
    // Additional wait for Font Awesome icons to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ensure parent directory exists for the output file (in case a custom path was provided)
    await fs.promises.mkdir(path.dirname(outFile), { recursive: true });

    // Capture screenshot
    await page.screenshot({ path: outFile });
    console.log(`Screenshot saved to: ${outFile}`);

    await browser.close();
    process.exit(0);
  } catch (err) {
    // Helpful error output for debugging in CI logs
    console.error(
      "Failed to capture screenshot:",
      err && err.message ? err.message : err,
    );
    console.error(err && err.stack ? err.stack : "");
    process.exit(1);
  }
})();

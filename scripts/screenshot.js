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

    // Navigate and wait for load event
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });

    // Wait for network to be idle
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 });

    // Wait for specific fonts to be loaded
    await page.evaluate(async () => {
      const fontsToLoad = ['Poppins', 'Noto Sans TC', 'Font Awesome 7 Brands', 'Font Awesome 7 Free'];
      
      // Wait for document fonts to be ready
      await document.fonts.ready;
      
      // Check if our specific fonts loaded
      const checkFonts = () => {
        return fontsToLoad.every(fontFamily => {
          return document.fonts.check(`16px "${fontFamily}"`);
        });
      };
      
      // If not all fonts are loaded, wait a bit more
      if (!checkFonts()) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    });

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

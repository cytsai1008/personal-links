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
    
    // Set a real user agent to avoid being blocked by font services
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    await page.setViewport({ width: 1200, height: 600 });

    // Enable console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    // Navigate and wait for load event
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });

    // Wait for network to be idle
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 });

    // Diagnose font loading
    const fontInfo = await page.evaluate(async () => {
      // Wait for document fonts to be ready
      await document.fonts.ready;
      
      // Force load all fonts by rendering them
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.fontFamily = 'Poppins, "Noto Sans TC", "Font Awesome 7 Free", "Font Awesome 7 Brands"';
      tempDiv.innerHTML = 'Loading fonts... 載入字體...';
      document.body.appendChild(tempDiv);
      
      // Trigger font load by forcing layout
      tempDiv.offsetHeight;
      
      // Wait for fonts to actually load
      await Promise.all([
        document.fonts.load('400 16px Poppins'),
        document.fonts.load('400 16px "Noto Sans TC"'),
        document.fonts.load('400 16px "Font Awesome 7 Free"'),
        document.fonts.load('400 16px "Font Awesome 7 Brands"')
      ]).catch(() => {});
      
      // Remove temp div
      document.body.removeChild(tempDiv);
      
      // Get all loaded fonts
      const loadedFonts = [];
      document.fonts.forEach(font => {
        if (font.status === 'loaded') {
          loadedFonts.push({
            family: font.family,
            style: font.style,
            weight: font.weight,
            status: font.status
          });
        }
      });
      
      // Check specific fonts
      const fontsToCheck = [
        'Poppins', 
        'Noto Sans TC', 
        'Font Awesome 7 Brands', 
        'Font Awesome 7 Free',
        'Font Awesome 6 Brands', 
        'Font Awesome 6 Free'
      ];
      
      const fontChecks = {};
      fontsToCheck.forEach(fontFamily => {
        fontChecks[fontFamily] = document.fonts.check(`16px "${fontFamily}"`);
      });
      
      return {
        loadedFonts,
        fontChecks,
        fontsReady: document.fonts.status
      };
    });

    console.log('Loaded fonts count:', fontInfo.loadedFonts.length);
    console.log('Font checks:', fontInfo.fontChecks);
    
    // Wait additional time for rendering
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

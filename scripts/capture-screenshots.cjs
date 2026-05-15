const puppeteer = require('puppeteer');
const path = require('path');

const outputDir = path.resolve(__dirname, '../docs/assets/screenshots');
const BASE_URL = 'http://localhost:5173';

const pages = [
  { name: '01-login', path: '/login', waitText: 'Sign in' },
  { name: '02-dashboard', path: '/dashboard', waitText: 'Overview' },
  { name: '03-catalog', path: '/catalog', waitText: 'Service Catalog' },
  { name: '04-deployments', path: '/deployments', waitText: 'Deployments' },
  { name: '05-health', path: '/health', waitText: 'Health' },
  { name: '06-environments', path: '/environments', waitText: 'Environments' },
  { name: '07-incidents', path: '/incidents', waitText: 'Incidents' },
  { name: '08-audit', path: '/audit', waitText: 'Audit Log' },
  { name: '10-portal-full', path: '/dashboard', waitText: 'Overview', fullPage: true },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Navigate to dashboard first to set auth state
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));

  for (const config of pages) {
    try {
      process.stdout.write(`Capturing ${config.name}...`);

      await page.goto(`${BASE_URL}${config.path}`, { waitUntil: 'networkidle0', timeout: 15000 });

      // Wait for lazy load + loading states (IncidentsPage has 500ms delay)
      await new Promise((r) => setTimeout(r, 2000));

      // Wait for text content in main area
      try {
        await page.waitForFunction(
          (text) => document.body.innerText.includes(text),
          { timeout: 8000 },
          config.waitText
        );
      } catch (e) {
        process.stdout.write(' (text wait timeout, capturing anyway)');
      }

      // Extra settle time for animations
      await new Promise((r) => setTimeout(r, 500));

      const screenshotPath = path.join(outputDir, `${config.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: config.fullPage || false,
      });

      process.stdout.write(' OK\n');
    } catch (err) {
      process.stdout.write(` ERROR: ${err.message}\n`);
    }
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);

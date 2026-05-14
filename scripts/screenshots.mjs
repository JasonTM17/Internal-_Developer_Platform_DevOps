import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'docs', 'assets', 'screenshots');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:5173';

  const pages = [
    { name: '01-login', path: '/' },
    { name: '02-dashboard', path: '/dashboard' },
    { name: '03-catalog', path: '/catalog' },
    { name: '04-deployments', path: '/deployments' },
    { name: '05-health', path: '/health' },
    { name: '06-environments', path: '/environments' },
  ];

  for (const p of pages) {
    await page.goto(`${baseUrl}${p.path}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, `${p.name}.png`), fullPage: false });
    console.log(`Screenshot: ${p.name}`);
  }

  await browser.close();
  console.log('All screenshots saved to docs/assets/screenshots/');
}

main().catch(console.error);

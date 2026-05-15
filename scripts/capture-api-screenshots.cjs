const puppeteer = require('puppeteer');
const path = require('path');

const outputDir = path.resolve(__dirname, '../docs/assets/screenshots');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // Capture Swagger UI
  console.log('Capturing 13-api-docs...');
  await page.goto('http://localhost:3001/api-docs/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, '13-api-docs.png') });
  console.log('  OK');

  // Capture API health endpoint
  console.log('Capturing 09-api-health...');
  await page.goto('http://localhost:3001/health', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outputDir, '09-api-health.png') });
  console.log('  OK');

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);

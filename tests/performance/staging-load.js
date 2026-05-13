import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency', true);
const requestCount = new Counter('total_requests');

// Test configuration with realistic staging load profile
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs
    { duration: '5m', target: 50 },   // Steady state at 50 VUs
    { duration: '2m', target: 100 },  // Ramp up to 100 VUs
    { duration: '5m', target: 100 },  // Steady state at 100 VUs
    { duration: '2m', target: 200 },  // Peak load at 200 VUs
    { duration: '5m', target: 200 },  // Sustained peak
    { duration: '3m', target: 0 },    // Ramp down gracefully
  ],
  thresholds: {
    http_req_duration: [
      { threshold: 'p(50)<500', abortOnFail: false },
      { threshold: 'p(95)<2000', abortOnFail: true },
      { threshold: 'p(99)<5000', abortOnFail: true },
    ],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true }],
    error_rate: [{ threshold: 'rate<0.05', abortOnFail: false }],
    api_latency: [
      { threshold: 'p(95)<1500', abortOnFail: false },
      { threshold: 'p(99)<3000', abortOnFail: false },
    ],
  },
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0 (IDP Staging)',
  tags: {
    environment: 'staging',
    test_type: 'load',
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging-api.idp.example.com';
const API_TOKEN = __ENV.API_TOKEN || '';

const headers = {
  Authorization: `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export function setup() {
  // Verify the target is reachable before running the full test
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Target not reachable: ${BASE_URL}/health returned ${healthRes.status}`);
  }
  return { startTime: new Date().toISOString() };
}

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
    const success = check(res, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 200ms': (r) => r.timings.duration < 200,
      'health: body contains status': (r) => r.body && r.body.includes('ok'),
    });
    errorRate.add(!success);
    requestCount.add(1);
  });

  group('Service Catalog - List', () => {
    const res = http.get(`${BASE_URL}/api/v1/catalog/services?limit=20`, {
      headers,
      tags: { endpoint: 'catalog_list' },
    });
    const success = check(res, {
      'catalog list: status is 200': (r) => r.status === 200,
      'catalog list: returns array': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
      'catalog list: response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!success);
    requestCount.add(1);
  });

  group('Service Catalog - Search', () => {
    const searchTerms = ['api', 'web', 'worker', 'gateway'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const res = http.get(`${BASE_URL}/api/v1/catalog/services?search=${term}&limit=10`, {
      headers,
      tags: { endpoint: 'catalog_search' },
    });
    const success = check(res, {
      'catalog search: status is 200': (r) => r.status === 200,
      'catalog search: response time < 500ms': (r) => r.timings.duration < 500,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!success);
    requestCount.add(1);
  });

  group('Deployments - List', () => {
    const res = http.get(`${BASE_URL}/api/v1/deployments?limit=20&sortBy=createdAt&sortDirection=DESC`, {
      headers,
      tags: { endpoint: 'deployments_list' },
    });
    const success = check(res, {
      'deployments: status is 200': (r) => r.status === 200,
      'deployments: response time < 1500ms': (r) => r.timings.duration < 1500,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!success);
    requestCount.add(1);
  });

  group('Environments - List', () => {
    const res = http.get(`${BASE_URL}/api/v1/environments`, {
      headers,
      tags: { endpoint: 'environments_list' },
    });
    const success = check(res, {
      'environments: status is 200': (r) => r.status === 200,
      'environments: response time < 800ms': (r) => r.timings.duration < 800,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!success);
    requestCount.add(1);
  });

  group('Audit Log - Query', () => {
    const res = http.get(`${BASE_URL}/api/v1/audit?limit=50&since=24h`, {
      headers,
      tags: { endpoint: 'audit_query' },
    });
    const success = check(res, {
      'audit: status is 200': (r) => r.status === 200,
      'audit: response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!success);
    requestCount.add(1);
  });

  // Think time between iterations (simulates real user behavior)
  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test ended at: ${new Date().toISOString()}`);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`reports/staging-load-${timestamp}.html`]: htmlReport(data),
    [`reports/staging-load-${timestamp}.json`]: JSON.stringify(data, null, 2),
  };
}

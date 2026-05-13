import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    api_latency: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging-api.idp.example.com';

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(res.status !== 200);
  });

  group('Service Catalog - List', () => {
    const res = http.get(`${BASE_URL}/api/v1/catalog/services`, {
      headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
    });
    check(res, {
      'catalog list status is 200': (r) => r.status === 200,
      'catalog returns array': (r) => JSON.parse(r.body).length >= 0,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  group('Service Catalog - Search', () => {
    const res = http.get(`${BASE_URL}/api/v1/catalog/services?search=api&limit=10`, {
      headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
    });
    check(res, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 500ms': (r) => r.timings.duration < 500,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  group('Deployments - List', () => {
    const res = http.get(`${BASE_URL}/api/v1/deployments?limit=20`, {
      headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
    });
    check(res, {
      'deployments status is 200': (r) => r.status === 200,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  group('Audit Log - Query', () => {
    const res = http.get(`${BASE_URL}/api/v1/audit?limit=50&since=24h`, {
      headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
    });
    check(res, {
      'audit status is 200': (r) => r.status === 200,
      'audit response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, opts) {
  // k6 built-in text summary
  return '';
}

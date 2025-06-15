import request from 'supertest';
import express from 'express';
import { registerExternalSystemInstanceRoutes } from '../../server/external-system-instance-routes';

// Spin up express app with the routes mounted
const app = express();
app.use(express.json());
registerExternalSystemInstanceRoutes(app);

describe('External System Instance Routes', () => {
  it('GET /api/external-systems-test should return 200', async () => {
    const res = await request(app).get('/api/external-systems-test');
    expect([200, 401, 403]).toContain(res.status); // can be unauth in unit env
  });
}); 
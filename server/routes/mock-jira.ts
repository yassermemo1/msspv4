import { Router } from 'express';
import fs from 'fs';
import path from 'path';

// Load mock Jira tickets from sample-data directory
const ticketsFile = path.join(process.cwd(), 'sample-data', 'mock-jira-tickets.json');
let tickets: any[] = [];

try {
  const raw = fs.readFileSync(ticketsFile, 'utf-8');
  tickets = JSON.parse(raw);
  if (!Array.isArray(tickets)) {
    console.warn('⚠️  mock-jira-tickets.json does not contain an array. Initialising empty ticket list.');
    tickets = [];
  }
} catch (error) {
  console.error('Failed to load mock Jira ticket data:', error);
  tickets = [];
}

const router = Router();

/**
 * GET /api/mock-jira/tickets
 * Returns all tickets or those filtered by clientShortName.
 */
router.get('/tickets', (req, res) => {
  const { clientShortName } = req.query;

  if (clientShortName) {
    const short = String(clientShortName).toLowerCase();
    return res.json(tickets.filter(t => (t.clientShortName || '').toLowerCase() === short));
  }

  return res.json(tickets);
});

/**
 * GET /api/mock-jira/tickets/count?clientShortName=ABC
 * Returns count of tickets for the given client shortName in KPI-friendly format
 * { data: [ { value: 5, label: 'Tickets' } ], count: 5 }
 */
router.get('/tickets/count', (req, res) => {
  const { clientShortName } = req.query;
  if (!clientShortName) {
    return res.status(400).json({ message: 'clientShortName query param is required' });
  }
  const short = String(clientShortName).toLowerCase();
  const count = tickets.filter(t => (t.clientShortName || '').toLowerCase() === short).length;
  return res.json({ data: [{ value: count, label: 'Tickets' }], count });
});

export { router as mockJiraRoutes }; 
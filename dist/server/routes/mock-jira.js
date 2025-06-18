"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockJiraRoutes = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load mock Jira tickets from sample-data directory
const ticketsFile = path_1.default.join(process.cwd(), 'sample-data', 'mock-jira-tickets.json');
let tickets = [];
try {
    const raw = fs_1.default.readFileSync(ticketsFile, 'utf-8');
    tickets = JSON.parse(raw);
    if (!Array.isArray(tickets)) {
        console.warn('⚠️  mock-jira-tickets.json does not contain an array. Initialising empty ticket list.');
        tickets = [];
    }
}
catch (error) {
    console.error('Failed to load mock Jira ticket data:', error);
    tickets = [];
}
const router = (0, express_1.Router)();
exports.mockJiraRoutes = router;
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

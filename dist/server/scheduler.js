"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const email_1 = require("./email");
class Scheduler {
    constructor() {
        this.tasks = new Map();
        this.developmentRunTracker = new Map();
    }
    start() {
        console.log('Starting scheduled tasks...');
        // Skip contract reminders in development mode to avoid spam
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Development mode: Contract reminder scheduler disabled to prevent spam');
            console.log('📧 Contract reminders will only run in production mode');
            return;
        }
        // Daily contract expiry check at 9 AM
        const contractReminderTask = node_cron_1.default.schedule('0 9 * * *', async () => {
            console.log('Running daily contract expiry check...');
            try {
                await email_1.emailService.checkExpiringContracts();
                console.log('Contract expiry check completed');
            }
            catch (error) {
                console.error('Contract expiry check failed:', error);
            }
        }, {
            scheduled: false, // Don't start immediately
            timezone: 'America/New_York'
        });
        this.tasks.set('contractReminders', contractReminderTask);
        // Start the task (production only)
        contractReminderTask.start();
        console.log('✅ Contract reminder scheduler started (production mode)');
        // Run contract check once on startup ONLY in development mode and only if not already run today
        if (process.env.NODE_ENV === 'development') {
            this.handleDevelopmentContractCheck();
        }
    }
    handleDevelopmentContractCheck() {
        const today = new Date().toISOString().split('T')[0];
        const lastRun = this.developmentRunTracker.get('contract_check_last_run');
        if (lastRun !== today) {
            console.log('✅ Development mode: Scheduling contract expiry check (once per day)...');
            this.developmentRunTracker.set('contract_check_last_run', today);
            // Add a significant delay to prevent immediate execution on server restart
            const delayTimeout = setTimeout(() => {
                console.log('🔄 Running development contract expiry check...');
                email_1.emailService.checkExpiringContracts()
                    .then(() => {
                    console.log('✅ Development contract check completed');
                })
                    .catch(error => {
                    console.error('❌ Development contract check failed:', error.message);
                });
            }, 10000); // 10 second delay
            // Store timeout reference for cleanup
            this.tasks.set('developmentContractCheck', {
                start: () => { },
                stop: () => clearTimeout(delayTimeout),
                destroy: () => clearTimeout(delayTimeout)
            });
        }
        else {
            console.log('⏭️ Contract check already run today in development mode, skipping');
        }
    }
    stop() {
        console.log('Stopping scheduled tasks...');
        this.tasks.forEach((task, name) => {
            try {
                if (task.stop)
                    task.stop();
                if (task.destroy)
                    task.destroy();
                console.log(`Stopped scheduled task: ${name}`);
            }
            catch (error) {
                console.error(`Error stopping task ${name}:`, error);
            }
        });
        this.tasks.clear();
        this.developmentRunTracker.clear();
        console.log('All scheduled tasks stopped');
    }
    // Manual trigger for testing
    async triggerContractCheck() {
        console.log('🔧 Manually triggering contract expiry check...');
        try {
            await email_1.emailService.checkExpiringContracts();
            console.log('✅ Manual contract expiry check completed');
            return true;
        }
        catch (error) {
            console.error('❌ Manual contract expiry check failed:', error.message);
            return false;
        }
    }
    // Get task status
    getTaskStatus() {
        const status = {};
        this.tasks.forEach((task, name) => {
            status[name] = {
                running: task.running || false,
                scheduled: true
            };
        });
        // Add development tracker info
        if (process.env.NODE_ENV === 'development') {
            status.developmentTracker = Object.fromEntries(this.developmentRunTracker);
        }
        return status;
    }
}
exports.scheduler = new Scheduler();

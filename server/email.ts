import nodemailer from 'nodemailer';
import { storage } from './storage';
import { Client, Contract, FinancialTransaction, User } from '@shared/schema';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private sentReminders = new Set<string>();

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@mssp-platform.com';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Skip email setup if no SMTP configuration provided
    if (!process.env.SMTP_HOST) {
      console.log('No SMTP configuration found. Email notifications disabled.');
      return;
    }

    const config: EmailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        console.error('Email transporter verification failed:', error);
        this.transporter = null;
      } else {
        console.log('Email transporter ready');
      }
    });
  }

  private async getUserEmailSettings(userId: number) {
    try {
      const settings = await storage.getUserSettings(userId);
      return {
        emailNotifications: settings?.emailNotifications ?? true,
        contractReminders: settings?.contractReminders ?? true,
        financialAlerts: settings?.financialAlerts ?? true,
      };
    } catch (error) {
      console.error('Failed to get user email settings:', error);
      return {
        emailNotifications: false,
        contractReminders: false,
        financialAlerts: false,
      };
    }
  }

  private generateContractReminderTemplate(contract: Contract, client: Client, daysUntilExpiry: number): EmailTemplate {
    const subject = `Contract Renewal Reminder: ${client.name} - ${daysUntilExpiry} days remaining`;
    
    const text = `
Contract Renewal Reminder

Client: ${client.name}
Contract: ${contract.name}
Expiration Date: ${contract.endDate.toLocaleDateString()}
Days Remaining: ${daysUntilExpiry}

Please review this contract for renewal opportunities.

Best regards,
MSSP Platform Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contract Renewal Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0066cc;">Contract Renewal Reminder</h2>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Client:</strong> ${client.name}</p>
      <p><strong>Contract:</strong> ${contract.name}</p>
      <p><strong>Expiration Date:</strong> ${contract.endDate.toLocaleDateString()}</p>
      <p><strong>Days Remaining:</strong> <span style="color: ${daysUntilExpiry <= 30 ? '#dc3545' : '#28a745'};">${daysUntilExpiry}</span></p>
    </div>
    
    <p>Please review this contract for renewal opportunities.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      <p>Best regards,<br>MSSP Platform Team</p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private generateFinancialAlertTemplate(transaction: FinancialTransaction, client: Client): EmailTemplate {
    const subject = `Financial Alert: ${transaction.type === 'revenue' ? 'Payment' : 'Cost'} Update - ${client.name}`;
    
    const text = `
Financial Alert

Client: ${client.name}
Transaction Type: ${transaction.type.toUpperCase()}
Amount: $${transaction.amount}
Description: ${transaction.description}
Status: ${transaction.status.toUpperCase()}
Date: ${transaction.transactionDate.toLocaleDateString()}

Please review this financial transaction.

Best regards,
MSSP Platform Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0066cc;">Financial Alert</h2>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Client:</strong> ${client.name}</p>
      <p><strong>Transaction Type:</strong> <span style="text-transform: uppercase; color: ${transaction.type === 'revenue' ? '#28a745' : '#dc3545'};">${transaction.type}</span></p>
      <p><strong>Amount:</strong> $${transaction.amount}</p>
      <p><strong>Description:</strong> ${transaction.description}</p>
      <p><strong>Status:</strong> <span style="text-transform: uppercase;">${transaction.status}</span></p>
      <p><strong>Date:</strong> ${transaction.transactionDate.toLocaleDateString()}</p>
    </div>
    
    <p>Please review this financial transaction.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      <p>Best regards,<br>MSSP Platform Team</p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private generateGeneralNotificationTemplate(title: string, message: string, client?: Client): EmailTemplate {
    const subject = client ? `${title} - ${client.name}` : title;
    
    const text = `
${title}

${message}

Best regards,
MSSP Platform Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0066cc;">${title}</h2>
    
    ${client ? `<p><strong>Client:</strong> ${client.name}</p>` : ''}
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
      ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      <p>Best regards,<br>MSSP Platform Team</p>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, text, html };
  }

  private async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email transporter not available. Skipping email:', template.subject);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      console.log(`Email sent successfully to ${to}: ${template.subject}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // Public methods for sending specific types of notifications
  async sendContractReminderNotification(contractId: number, userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.email) {
        console.error('User email not found:', userId);
        return false;
      }

      const settings = await this.getUserEmailSettings(userId);
      if (!settings.emailNotifications || !settings.contractReminders) {
        console.log('Contract reminders disabled for user:', userId);
        return false;
      }

      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.error('Contract not found:', contractId);
        return false;
      }

      const client = await storage.getClient(contract.clientId);
      if (!client) {
        console.error('Client not found:', contract.clientId);
        return false;
      }

      // Calculate days until expiry
      const now = new Date();
      const expiryDate = new Date(contract.endDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const template = this.generateContractReminderTemplate(contract, client, daysUntilExpiry);
      return await this.sendEmail(user.email, template);
    } catch (error) {
      console.error('Error sending contract reminder:', error);
      return false;
    }
  }

  async sendFinancialAlertNotification(transactionId: number, userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.email) {
        console.error('User email not found:', userId);
        return false;
      }

      const settings = await this.getUserEmailSettings(userId);
      if (!settings.emailNotifications || !settings.financialAlerts) {
        console.log('Financial alerts disabled for user:', userId);
        return false;
      }

      const transactions = await storage.getAllFinancialTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) {
        console.error('Transaction not found:', transactionId);
        return false;
      }

      let client: Client | undefined;
      if (transaction.clientId) {
        client = await storage.getClient(transaction.clientId);
      }

      if (!client) {
        console.error('Client not found for transaction:', transactionId);
        return false;
      }

      const template = this.generateFinancialAlertTemplate(transaction, client);
      return await this.sendEmail(user.email, template);
    } catch (error) {
      console.error('Error sending financial alert:', error);
      return false;
    }
  }

  async sendGeneralNotification(userId: number, title: string, message: string, clientId?: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.email) {
        console.error('User email not found:', userId);
        return false;
      }

      const settings = await this.getUserEmailSettings(userId);
      if (!settings.emailNotifications) {
        console.log('Email notifications disabled for user:', userId);
        return false;
      }

      let client: Client | undefined;
      if (clientId) {
        client = await storage.getClient(clientId);
      }

      const template = this.generateGeneralNotificationTemplate(title, message, client);
      return await this.sendEmail(user.email, template);
    } catch (error) {
      console.error('Error sending general notification:', error);
      return false;
    }
  }

  // Method to check for contracts expiring soon (can be called by a cron job)
  async checkExpiringContracts(): Promise<void> {
    try {
      const contracts = await storage.getAllContracts();
      const users = await storage.getAllUsers();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      console.log(`📋 Contract expiry check started - ${contracts.length} contracts to review...`);

      // Clear sent reminders at the start of each new day
      const currentDay = today;
      const oldKeys = Array.from(this.sentReminders).filter(key => !key.startsWith(currentDay));
      if (oldKeys.length > 0) {
        oldKeys.forEach(key => this.sentReminders.delete(key));
        console.log(`🗑️ Cleared ${oldKeys.length} old reminder keys`);
      }

      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let activeContractsCount = 0;

      for (const contract of contracts) {
        if (contract.status !== 'active') continue;
        
        activeContractsCount++;
        const expiryDate = new Date(contract.endDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminders at 90, 60, 30, 14, 7, and 1 days before expiry
        const reminderDays = [90, 60, 30, 14, 7, 1];
        
        if (reminderDays.includes(daysUntilExpiry)) {
          // Track sent reminders to prevent duplicates (contract-date-days key)
          const reminderKey = `${currentDay}-${contract.id}-${daysUntilExpiry}`;
          
          if (this.sentReminders.has(reminderKey)) {
            skippedCount++;
            continue;
          }
          
          console.log(`⏰ Contract "${contract.name}" expires in ${daysUntilExpiry} days - processing reminders`);
          
          // Mark as sent before attempting to send to prevent duplicates
          this.sentReminders.add(reminderKey);
          
          let sentCount = 0;
          
          // Get team members assigned to this client
          try {
            const teamAssignments = await storage.getClientTeamAssignments(contract.clientId);
            
            for (const assignment of teamAssignments) {
              if (assignment.isActive) {
                const success = await this.sendContractReminderNotification(contract.id, assignment.userId);
                if (success) sentCount++;
              }
            }

            // Also notify all admin users
            const adminUsers = users.filter(user => user.role === 'admin');
            for (const admin of adminUsers) {
              const success = await this.sendContractReminderNotification(contract.id, admin.id);
              if (success) sentCount++;
            }
            
            console.log(`📧 Sent ${sentCount} reminders for contract "${contract.name}" (${daysUntilExpiry} days remaining)`);
            processedCount++;
          } catch (error) {
            console.error(`❌ Error processing reminders for contract ${contract.id}:`, error.message);
            errorCount++;
            // Remove from sent set if there was an error, so it can be retried
            this.sentReminders.delete(reminderKey);
          }
        }
      }
      
      console.log(`✅ Contract expiry check completed:`);
      console.log(`   📊 Total contracts: ${contracts.length}`);
      console.log(`   🟢 Active contracts: ${activeContractsCount}`);
      console.log(`   ✉️ Reminders sent: ${processedCount}`);
      console.log(`   ⏭️ Skipped (already sent): ${skippedCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);
      console.log(`   🧠 Cached reminder keys: ${this.sentReminders.size}`);
    } catch (error) {
      console.error('💥 Error checking expiring contracts:', error.message);
    }
  }
}

// Export singleton instance
export const emailService = new EmailService(); 
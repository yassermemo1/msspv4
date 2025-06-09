import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { storage } from './storage';

interface TwoFASetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface TwoFAVerificationResult {
  verified: boolean;
  window?: number;
}

class TwoFAService {
  private serviceName = 'MSSP Platform';

  async generateSecret(userId: number): Promise<TwoFASetupData> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${user.email})`,
        issuer: this.serviceName,
        length: 20,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      return {
        secret: secret.base32!,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  async enableTwoFA(userId: number, secret: string, token: string, backupCodes: string[]): Promise<boolean> {
    try {
      // Verify the token before enabling 2FA
      const verified = this.verifyToken(secret, token);
      if (!verified.verified) {
        throw new Error('Invalid verification token');
      }

      // Save the secret and backup codes to the user
      await storage.updateUser(userId, {
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      });

      // Enable 2FA in user settings
      await storage.updateUserSettings(userId, { twoFactorAuth: true });

      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  async disableTwoFA(userId: number, token: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.twoFactorSecret) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify the token before disabling 2FA
      const verified = this.verifyToken(user.twoFactorSecret, token);
      if (!verified.verified) {
        throw new Error('Invalid verification token');
      }

      // Remove 2FA data from user
      await storage.updateUser(userId, {
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });

      // Disable 2FA in user settings
      await storage.updateUserSettings(userId, { twoFactorAuth: false });

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  verifyToken(secret: string, token: string): TwoFAVerificationResult {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Allow 30-second window for time drift
      });

      return {
        verified: !!verified,
        window: verified ? 1 : undefined,
      };
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return { verified: false };
    }
  }

  async verifyUserToken(userId: number, token: string): Promise<TwoFAVerificationResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.twoFactorSecret) {
        throw new Error('2FA is not enabled for this user');
      }

      // Try to verify with TOTP token first
      const totpResult = this.verifyToken(user.twoFactorSecret, token);
      if (totpResult.verified) {
        return totpResult;
      }

      // If TOTP fails, check backup codes
      if (user.twoFactorBackupCodes) {
        const backupCodes = JSON.parse(user.twoFactorBackupCodes);
        const codeIndex = backupCodes.indexOf(token);
        
        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await storage.updateUser(userId, {
            twoFactorBackupCodes: JSON.stringify(backupCodes),
          });

          return { verified: true };
        }
      }

      return { verified: false };
    } catch (error) {
      console.error('Error verifying user token:', error);
      return { verified: false };
    }
  }

  async isUserTwoFAEnabled(userId: number): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings(userId);
      return settings?.twoFactorAuth ?? false;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  async getUserBackupCodes(userId: number): Promise<string[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.twoFactorBackupCodes) {
        return [];
      }

      return JSON.parse(user.twoFactorBackupCodes);
    } catch (error) {
      console.error('Error getting backup codes:', error);
      return [];
    }
  }

  async regenerateBackupCodes(userId: number, verificationToken: string): Promise<string[]> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.twoFactorSecret) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify token before regenerating
      const verified = this.verifyToken(user.twoFactorSecret, verificationToken);
      if (!verified.verified) {
        throw new Error('Invalid verification token');
      }

      const newBackupCodes = this.generateBackupCodes();
      
      await storage.updateUser(userId, {
        twoFactorBackupCodes: JSON.stringify(newBackupCodes),
      });

      return newBackupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character backup codes with letters and numbers
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  generateRecoveryCodes(): string[] {
    return this.generateBackupCodes();
  }
}

export const twoFAService = new TwoFAService(); 
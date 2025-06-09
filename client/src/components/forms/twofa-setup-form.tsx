import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  QrCode, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Download,
  RefreshCw
} from "lucide-react";

interface TwoFASetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

const tokenSchema = z.object({
  token: z.string().min(6, "Token must be at least 6 characters").max(8, "Token must be at most 8 characters"),
});

type TokenFormData = z.infer<typeof tokenSchema>;

interface TwoFASetupFormProps {
  children: React.ReactNode;
}

export function TwoFASetupForm({ children }: TwoFASetupFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'backup' | 'disable'>('status');
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);

  const form = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: "",
    },
  });

  // Get 2FA status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/user/2fa/status'],
    enabled: open,
  });

  // Get backup codes
  const { data: backupCodesData, refetch: refetchBackupCodes } = useQuery({
    queryKey: ['/api/user/2fa/backup-codes'],
    enabled: open && statusData?.enabled,
  });

  // Setup 2FA
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/user/2fa/setup');
      return res.json();
    },
    onSuccess: (data: TwoFASetupData) => {
      setSetupData(data);
      setStep('verify');
    },
    onError: (error: Error) => {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enable 2FA
  const enableMutation = useMutation({
    mutationFn: async (data: TokenFormData) => {
      const res = await apiRequest('POST', '/api/user/2fa/enable', {
        secret: setupData!.secret,
        token: data.token,
        backupCodes: setupData!.backupCodes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA enabled successfully",
        description: "Your account is now protected with two-factor authentication.",
      });
      setStep('backup');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (data: TokenFormData) => {
      const res = await apiRequest('POST', '/api/user/2fa/disable', {
        token: data.token,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
      setStep('status');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Disable failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Regenerate backup codes
  const regenerateCodesMutation = useMutation({
    mutationFn: async (data: TokenFormData) => {
      const res = await apiRequest('POST', '/api/user/2fa/regenerate-backup-codes', {
        token: data.token,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup codes regenerated",
        description: "New backup codes have been generated. Please save them securely.",
      });
      refetchBackupCodes();
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetup = () => {
    setStep('setup');
    setupMutation.mutate();
  };

  const handleEnable = (data: TokenFormData) => {
    enableMutation.mutate(data);
  };

  const handleDisable = (data: TokenFormData) => {
    disableMutation.mutate(data);
  };

  const handleRegenerateCodes = (data: TokenFormData) => {
    regenerateCodesMutation.mutate(data);
    form.reset();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied to your clipboard.",
    });
  };

  const downloadBackupCodes = (codes: string[]) => {
    const content = `MSSP Platform - Two-Factor Authentication Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.join('\n')}\n\nKeep these codes safe and secure. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mssp-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setOpen(false);
    setStep('status');
    setSetupData(null);
    form.reset();
  };

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      if (statusData?.enabled) {
        setStep('status');
      } else {
        setStep('status');
      }
    }
  }, [open, statusData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account with 2FA.
          </DialogDescription>
        </DialogHeader>

        {/* Status Step */}
        {step === 'status' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className={`h-6 w-6 ${statusData?.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    {statusData?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <Badge variant={statusData?.enabled ? 'default' : 'secondary'}>
                {statusData?.enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {statusData?.enabled ? (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your account is protected with two-factor authentication.
                  </AlertDescription>
                </Alert>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('disable')}
                    className="flex-1"
                  >
                    Disable 2FA
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('backup')}
                    className="flex-1"
                  >
                    View Backup Codes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your account is not protected with 2FA. Enable it for better security.
                  </AlertDescription>
                </Alert>
                
                <Button onClick={handleSetup} className="w-full">
                  Enable Two-Factor Authentication
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Setup Step */}
        {step === 'setup' && setupMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Setting up 2FA...</p>
            </div>
          </div>
        )}

        {/* Verify Step */}
        {step === 'verify' && setupData && (
          <div className="space-y-4">
            <div className="text-center">
              <QrCode className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Scan QR Code</p>
              <p className="text-sm text-muted-foreground">
                Use your authenticator app to scan this QR code
              </p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Or enter this code manually:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                  {setupData.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEnable)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter 6-digit code"
                          maxLength={8}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('status')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={enableMutation.isPending}
                    className="flex-1"
                  >
                    {enableMutation.isPending ? "Verifying..." : "Enable 2FA"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">Backup Codes</p>
              <p className="text-sm text-muted-foreground">
                Save these codes in a secure location. Each can only be used once.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
              {(setupData?.backupCodes || backupCodesData?.backupCodes || []).map((code, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <code className="text-sm font-mono">{code}</code>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => downloadBackupCodes(setupData?.backupCodes || backupCodesData?.backupCodes || [])}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard((setupData?.backupCodes || backupCodesData?.backupCodes || []).join('\n'))}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>

            {statusData?.enabled && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRegenerateCodes)} className="space-y-4">
                  <Separator />
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enter 2FA code to regenerate backup codes</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter 6-digit code"
                            maxLength={8}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={regenerateCodesMutation.isPending}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {regenerateCodesMutation.isPending ? "Regenerating..." : "Regenerate Codes"}
                  </Button>
                </form>
              </Form>
            )}

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {/* Disable Step */}
        {step === 'disable' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure. Are you sure you want to continue?
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDisable)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter 6-digit code or backup code"
                          maxLength={8}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('status')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={disableMutation.isPending}
                    className="flex-1"
                  >
                    {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 
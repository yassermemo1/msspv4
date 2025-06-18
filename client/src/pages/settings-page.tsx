import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/theme-context";
import { useCurrency } from "@/contexts/currency-context";
import { PasswordChangeForm } from "@/components/forms/password-change-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { UserSettings } from "@shared/schema.ts";
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  Key,
  Mail,
  Smartphone,
  Save,
  Edit,
  Loader2,
  DollarSign,
  Upload,
  Image,
  X,
  Server,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Settings
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { VersionInfo } from "@/components/version-info";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, getSupportedCurrencies } = useCurrency();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get available currencies
  const availableCurrencies = getSupportedCurrencies();
  
  // State for form data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    username: user?.username || ""
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [companyName, setCompanyName] = useState("MSSP Platform");

  // LDAP Configuration state
  const [ldapSettings, setLdapSettings] = useState({
    ldapEnabled: false,
    ldapUrl: "",
    ldapBindDn: "",
    ldapBindPassword: "",
    ldapSearchBase: "",
    ldapSearchFilter: "(uid={{username}})",
    ldapUsernameAttribute: "uid",
    ldapEmailAttribute: "mail",
    ldapFirstNameAttribute: "givenName",
    ldapLastNameAttribute: "sn",
    ldapDefaultRole: "user",
    ldapGroupSearchBase: "",
    ldapGroupSearchFilter: "",
    ldapAdminGroup: "",
    ldapManagerGroup: "",
    ldapEngineerGroup: "",
    ldapConnectionTimeout: 5000,
    ldapSearchTimeout: 10000,
    ldapCertificateVerification: true
  });

  // Fetch user settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
    enabled: !!user,
  });

  // Fetch current logo and company settings
  const { data: companySettings, refetch: refetchCompanySettings } = useQuery({
    queryKey: ['/api/company/settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/company/settings');
      return res.json();
    },
  });

  // State for settings toggles
  const [settingsData, setSettingsData] = useState<Partial<UserSettings>>({});

  // Update local settings when data is loaded
  useEffect(() => {
    if (settings) {
      setSettingsData(settings);
    }
  }, [settings]);

  // Update company settings when loaded
  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.companyName || "MSSP Platform");
      if (companySettings.logoUrl) {
        setLogoPreview(companySettings.logoUrl);
      }
      
      // Update LDAP settings
      setLdapSettings({
        ldapEnabled: companySettings.ldapEnabled || false,
        ldapUrl: companySettings.ldapUrl || "",
        ldapBindDn: companySettings.ldapBindDn || "",
        ldapBindPassword: companySettings.ldapBindPassword || "",
        ldapSearchBase: companySettings.ldapSearchBase || "",
        ldapSearchFilter: companySettings.ldapSearchFilter || "(uid={{username}})",
        ldapUsernameAttribute: companySettings.ldapUsernameAttribute || "uid",
        ldapEmailAttribute: companySettings.ldapEmailAttribute || "mail",
        ldapFirstNameAttribute: companySettings.ldapFirstNameAttribute || "givenName",
        ldapLastNameAttribute: companySettings.ldapLastNameAttribute || "sn",
        ldapDefaultRole: companySettings.ldapDefaultRole || "user",
        ldapGroupSearchBase: companySettings.ldapGroupSearchBase || "",
        ldapGroupSearchFilter: companySettings.ldapGroupSearchFilter || "",
        ldapAdminGroup: companySettings.ldapAdminGroup || "",
        ldapManagerGroup: companySettings.ldapManagerGroup || "",
        ldapEngineerGroup: companySettings.ldapEngineerGroup || "",
        ldapConnectionTimeout: companySettings.ldapConnectionTimeout || 5000,
        ldapSearchTimeout: companySettings.ldapSearchTimeout || 10000,
        ldapCertificateVerification: companySettings.ldapCertificateVerification !== false
      });
    }
  }, [companySettings]);

  // Mutation for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const res = await apiRequest("PUT", "/api/user/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating company settings
  const updateCompanySettingsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/company/settings', {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to update company settings');
      }
      return responseData;
    },
    onSuccess: (data) => {
      refetchCompanySettings();
      toast({
        title: "Company Settings Updated",
        description: "Logo and company name have been updated successfully.",
      });
      // Clear the file input
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Update the company name in the local state
      if (data.settings?.companyName) {
        setCompanyName(data.settings.companyName);
      }
      
      // Update the logo preview if new logo was uploaded
      if (data.settings?.logoUrl) {
        setLogoPreview(data.settings.logoUrl);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating LDAP settings
  const updateLdapSettingsMutation = useMutation({
    mutationFn: async (ldapData: any) => {
      const res = await apiRequest('PUT', '/api/company/settings', ldapData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings'] });
      toast({
        title: "LDAP Settings Updated",
        description: "LDAP configuration has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "LDAP Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for testing LDAP connection
  const testLdapConnectionMutation = useMutation({
    mutationFn: async (ldapData: any) => {
      const res = await apiRequest('POST', '/api/company/settings/ldap/test', ldapData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "LDAP Test Successful" : "LDAP Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "LDAP Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle toggle changes
  const handleToggleChange = (key: keyof UserSettings | keyof typeof ldapSettings, value: boolean) => {
    if (key in ldapSettings) {
      const newLdapSettings = { ...ldapSettings, [key]: value };
      setLdapSettings(newLdapSettings);
      // Auto-save LDAP settings
      updateLdapSettingsMutation.mutate(newLdapSettings);
    } else {
    const newSettings = { ...settingsData, [key]: value };
    setSettingsData(newSettings);
    // Auto-save on toggle change
    updateSettingsMutation.mutate(newSettings);
    }
  };

  // Handle dropdown changes
  const handleSelectChange = (key: keyof UserSettings | keyof typeof ldapSettings, value: string) => {
    if (key in ldapSettings) {
      const newLdapSettings = { 
        ...ldapSettings, 
        [key]: ['ldapConnectionTimeout', 'ldapSearchTimeout'].includes(key) ? parseInt(value) || 0 : value 
      };
      setLdapSettings(newLdapSettings);
      // Don't auto-save LDAP settings on every keystroke, wait for explicit save
    } else {
    const newSettings = { ...settingsData, [key]: value };
    setSettingsData(newSettings);
    // Auto-save on select change
    updateSettingsMutation.mutate(newSettings);
    }
  };

  // Handle dark mode toggle with theme context
  const handleDarkModeToggle = (checked: boolean) => {
    handleToggleChange('darkMode', checked);
    toggleTheme();
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency: string) => {
    handleSelectChange('currency', newCurrency);
    setCurrency(newCurrency);
  };

  const handleSaveAllSettings = () => {
    updateSettingsMutation.mutate(settingsData);
  };

  // Logo handling
  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid image file (PNG, JPG, SVG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (!logoFile && !companyName) {
      toast({
        title: "No Changes",
        description: "Please select a logo or enter a company name",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    formData.append('companyName', companyName);

    updateCompanySettingsMutation.mutate(formData);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save profile changes handler
  const handleSaveProfile = () => {
    // Collect form data from inputs
    const formData = {
      firstName: (document.getElementById('firstName') as HTMLInputElement)?.value || '',
      lastName: (document.getElementById('lastName') as HTMLInputElement)?.value || '',
      email: (document.getElementById('email') as HTMLInputElement)?.value || '',
      username: (document.getElementById('username') as HTMLInputElement)?.value || '',
    };

    // Validate required fields
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Make API call to update profile
    updateSettingsMutation.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "Profile Updated",
          description: "Your profile changes have been saved successfully."
        });
      },
      onError: (error) => {
        toast({
          title: "Update Failed",
          description: error instanceof Error ? error.message : "Failed to update profile",
          variant: "destructive"
        });
      }
    });
  };

  // Handle LDAP settings save
  const handleSaveLdapSettings = () => {
    updateLdapSettingsMutation.mutate(ldapSettings);
  };

  // Handle LDAP connection test
  const handleTestLdapConnection = () => {
    testLdapConnectionMutation.mutate({
      ldapUrl: ldapSettings.ldapUrl,
      ldapBindDn: ldapSettings.ldapBindDn,
      ldapBindPassword: ldapSettings.ldapBindPassword,
      ldapSearchBase: ldapSettings.ldapSearchBase
    });
  };

  if (settingsLoading) {
    return (
      <AppLayout title="Settings" subtitle="Loading your preferences...">
        <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Settings" 
      subtitle="Manage your account and application preferences"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={user?.firstName || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={user?.lastName || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={user?.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue={user?.username || ""} />
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={user?.isActive ? "default" : "secondary"}>
                  {user?.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{user?.role}</Badge>
              </div>
              <Button className="w-fit" onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                Save Profile Changes
              </Button>
            </CardContent>
          </Card>

          {/* Company Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2" />
                Company Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                />
                <p className="text-sm text-muted-foreground">
                  This name will appear in the sidebar header
                </p>
              </div>
              
              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-start space-x-4">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-xs text-gray-500 mt-1">No logo</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={updateCompanySettingsMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Select Logo
                      </Button>
                      {logoPreview && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={updateCompanySettingsMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Upload a PNG, JPG, or SVG file (max 2MB). The logo will appear in the top-left corner of the sidebar.
                    </p>
                    {logoFile && (
                      <p className="text-sm text-green-600">
                        Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogoUpload}
                  disabled={updateCompanySettingsMutation.isPending}
                  className="w-fit"
                >
                  {updateCompanySettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Branding Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after 24 hours of inactivity
                  </p>
                </div>
                <Switch 
                  checked={settingsData.sessionTimeout || false}
                  onCheckedChange={(checked) => handleToggleChange('sessionTimeout', checked)}
                />
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Password Management</h4>
                <PasswordChangeForm>
                  <Button variant="outline" className="w-fit">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </PasswordChangeForm>
              </div>
            </CardContent>
          </Card>

          {/* LDAP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                LDAP Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">LDAP Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable LDAP authentication
                  </p>
                </div>
                <Switch 
                  checked={ldapSettings.ldapEnabled}
                  onCheckedChange={(checked) => handleToggleChange('ldapEnabled', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapUrl">LDAP URL</Label>
                <Input 
                  id="ldapUrl" 
                  value={ldapSettings.ldapUrl}
                  onChange={(e) => handleSelectChange('ldapUrl', e.target.value)}
                  placeholder="Enter LDAP server URL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapBindDn">LDAP Bind DN</Label>
                <Input 
                  id="ldapBindDn" 
                  value={ldapSettings.ldapBindDn}
                  onChange={(e) => handleSelectChange('ldapBindDn', e.target.value)}
                  placeholder="Enter LDAP bind DN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapBindPassword">LDAP Bind Password</Label>
                <Input 
                  id="ldapBindPassword" 
                  value={ldapSettings.ldapBindPassword}
                  onChange={(e) => handleSelectChange('ldapBindPassword', e.target.value)}
                  placeholder="Enter LDAP bind password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapSearchBase">LDAP Search Base</Label>
                <Input 
                  id="ldapSearchBase" 
                  value={ldapSettings.ldapSearchBase}
                  onChange={(e) => handleSelectChange('ldapSearchBase', e.target.value)}
                  placeholder="Enter LDAP search base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapSearchFilter">LDAP Search Filter</Label>
                <Input 
                  id="ldapSearchFilter" 
                  value={ldapSettings.ldapSearchFilter}
                  onChange={(e) => handleSelectChange('ldapSearchFilter', e.target.value)}
                  placeholder="Enter LDAP search filter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapUsernameAttribute">LDAP Username Attribute</Label>
                <Input 
                  id="ldapUsernameAttribute" 
                  value={ldapSettings.ldapUsernameAttribute}
                  onChange={(e) => handleSelectChange('ldapUsernameAttribute', e.target.value)}
                  placeholder="Enter LDAP username attribute"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapEmailAttribute">LDAP Email Attribute</Label>
                <Input 
                  id="ldapEmailAttribute" 
                  value={ldapSettings.ldapEmailAttribute}
                  onChange={(e) => handleSelectChange('ldapEmailAttribute', e.target.value)}
                  placeholder="Enter LDAP email attribute"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapFirstNameAttribute">LDAP First Name Attribute</Label>
                <Input 
                  id="ldapFirstNameAttribute" 
                  value={ldapSettings.ldapFirstNameAttribute}
                  onChange={(e) => handleSelectChange('ldapFirstNameAttribute', e.target.value)}
                  placeholder="Enter LDAP first name attribute"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapLastNameAttribute">LDAP Last Name Attribute</Label>
                <Input 
                  id="ldapLastNameAttribute" 
                  value={ldapSettings.ldapLastNameAttribute}
                  onChange={(e) => handleSelectChange('ldapLastNameAttribute', e.target.value)}
                  placeholder="Enter LDAP last name attribute"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapDefaultRole">LDAP Default Role</Label>
                <Input 
                  id="ldapDefaultRole" 
                  value={ldapSettings.ldapDefaultRole}
                  onChange={(e) => handleSelectChange('ldapDefaultRole', e.target.value)}
                  placeholder="Enter LDAP default role"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapGroupSearchBase">LDAP Group Search Base</Label>
                <Input 
                  id="ldapGroupSearchBase" 
                  value={ldapSettings.ldapGroupSearchBase}
                  onChange={(e) => handleSelectChange('ldapGroupSearchBase', e.target.value)}
                  placeholder="Enter LDAP group search base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapGroupSearchFilter">LDAP Group Search Filter</Label>
                <Input 
                  id="ldapGroupSearchFilter" 
                  value={ldapSettings.ldapGroupSearchFilter}
                  onChange={(e) => handleSelectChange('ldapGroupSearchFilter', e.target.value)}
                  placeholder="Enter LDAP group search filter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapAdminGroup">LDAP Admin Group</Label>
                <Input 
                  id="ldapAdminGroup" 
                  value={ldapSettings.ldapAdminGroup}
                  onChange={(e) => handleSelectChange('ldapAdminGroup', e.target.value)}
                  placeholder="Enter LDAP admin group"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapManagerGroup">LDAP Manager Group</Label>
                <Input 
                  id="ldapManagerGroup" 
                  value={ldapSettings.ldapManagerGroup}
                  onChange={(e) => handleSelectChange('ldapManagerGroup', e.target.value)}
                  placeholder="Enter LDAP manager group"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapEngineerGroup">LDAP Engineer Group</Label>
                <Input 
                  id="ldapEngineerGroup" 
                  value={ldapSettings.ldapEngineerGroup}
                  onChange={(e) => handleSelectChange('ldapEngineerGroup', e.target.value)}
                  placeholder="Enter LDAP engineer group"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapConnectionTimeout">LDAP Connection Timeout</Label>
                <Input 
                  id="ldapConnectionTimeout" 
                  value={ldapSettings.ldapConnectionTimeout.toString()}
                  onChange={(e) => handleSelectChange('ldapConnectionTimeout', e.target.value)}
                  placeholder="Enter LDAP connection timeout in milliseconds"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapSearchTimeout">LDAP Search Timeout</Label>
                <Input 
                  id="ldapSearchTimeout" 
                  value={ldapSettings.ldapSearchTimeout.toString()}
                  onChange={(e) => handleSelectChange('ldapSearchTimeout', e.target.value)}
                  placeholder="Enter LDAP search timeout in milliseconds"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ldapCertificateVerification">LDAP Certificate Verification</Label>
                <Switch 
                  checked={ldapSettings.ldapCertificateVerification}
                  onCheckedChange={(checked) => handleToggleChange('ldapCertificateVerification', checked)}
                />
                <p className="text-sm text-muted-foreground">
                  Verify SSL/TLS certificates when connecting to LDAP server
                </p>
              </div>

              {ldapSettings.ldapEnabled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    LDAP authentication is enabled. Users will be able to log in using their LDAP credentials.
                    Make sure to test the connection before enabling in production.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-4 pt-4">
                <Button 
                  onClick={handleSaveLdapSettings}
                  disabled={updateLdapSettingsMutation.isPending}
                  className="w-fit"
                >
                  {updateLdapSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save LDAP Settings
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleTestLdapConnection}
                  disabled={testLdapConnectionMutation.isPending || !ldapSettings.ldapUrl || !ldapSettings.ldapSearchBase}
                  className="w-fit"
                >
                  {testLdapConnectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Note:</strong> LDAP settings require manager or admin privileges to modify.</p>
                <p>Changes to LDAP configuration will take effect after the next server restart.</p>
                <p>Test the connection before enabling LDAP authentication to ensure proper configuration.</p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about client activities and system alerts
                  </p>
                </div>
                <Switch 
                  checked={settingsData.emailNotifications || false}
                  onCheckedChange={(checked) => handleToggleChange('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get real-time notifications for urgent matters
                  </p>
                </div>
                <Switch 
                  checked={settingsData.pushNotifications || false}
                  onCheckedChange={(checked) => handleToggleChange('pushNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Contract Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about contract renewals and expirations
                  </p>
                </div>
                <Switch 
                  checked={settingsData.contractReminders || false}
                  onCheckedChange={(checked) => handleToggleChange('contractReminders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Financial Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for payment due dates and invoice updates
                  </p>
                </div>
                <Switch 
                  checked={settingsData.financialAlerts || false}
                  onCheckedChange={(checked) => handleToggleChange('financialAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                System Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark theme
                  </p>
                </div>
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select 
                  id="timezone" 
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                  value={settingsData.timezone || "America/New_York"}
                  onChange={(e) => handleSelectChange('timezone', e.target.value)}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select 
                  id="language" 
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                  value={settingsData.language || "en"}
                  onChange={(e) => handleSelectChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Currency
                </Label>
                <select 
                  id="currency" 
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {availableCurrencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Changes how monetary values are displayed throughout the application
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-save Forms</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save form data as you type
                  </p>
                </div>
                <Switch 
                  checked={settingsData.autoSaveForms || false}
                  onCheckedChange={(checked) => handleToggleChange('autoSaveForms', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Database & Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data & Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Export</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow automatic data exports for compliance
                  </p>
                </div>
                <Switch 
                  checked={settingsData.dataExport || false}
                  onCheckedChange={(checked) => handleToggleChange('dataExport', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">API Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable third-party integrations via API
                  </p>
                </div>
                <Switch 
                  checked={settingsData.apiAccess || false}
                  onCheckedChange={(checked) => handleToggleChange('apiAccess', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention Period</Label>
                <select 
                  id="dataRetention" 
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                  value={settingsData.dataRetentionPeriod || "5years"}
                  onChange={(e) => handleSelectChange('dataRetentionPeriod', e.target.value)}
                >
                  <option value="1year">1 Year</option>
                  <option value="3years">3 Years</option>
                  <option value="5years">5 Years</option>
                  <option value="7years">7 Years</option>
                  <option value="forever">Indefinite</option>
                </select>
              </div>
              <Button className="w-fit" variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Backup Data
              </Button>
            </CardContent>
          </Card>

          {/* Version Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Application Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <VersionInfo />
            </CardContent>
          </Card>

          {/* Save All Changes */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline">Cancel Changes</Button>
            <Button onClick={handleSaveAllSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
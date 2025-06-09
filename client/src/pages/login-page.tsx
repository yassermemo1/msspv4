import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2, Building2, User } from "lucide-react";

export default function LoginPage() {
  const { user, loginMutation, ldapLoginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [localCredentials, setLocalCredentials] = useState({ email: "", password: "" });
  const [ldapCredentials, setLdapCredentials] = useState({ username: "", password: "" });
  const [activeTab, setActiveTab] = useState<"local" | "ldap">("local");

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';

  // Redirect if already logged in or after successful login
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Also redirect when login mutation succeeds
  useEffect(() => {
    if (loginMutation.isSuccess && loginMutation.data) {
      setLocation("/");
    }
  }, [loginMutation.isSuccess, loginMutation.data, setLocation]);

  // Also redirect when LDAP login mutation succeeds
  useEffect(() => {
    if (ldapLoginMutation.isSuccess && ldapLoginMutation.data) {
      setLocation("/");
    }
  }, [ldapLoginMutation.isSuccess, ldapLoginMutation.data, setLocation]);

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(localCredentials);
  };

  const handleLdapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ldapLoginMutation.mutate(ldapCredentials);
  };

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleLdapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLdapCredentials(prev => ({ ...prev, [name]: value }));
  };

  const isLoading = loginMutation.isPending || ldapLoginMutation.isPending;
  const currentError = activeTab === "local" ? loginMutation.error : ldapLoginMutation.error;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">MSSP Platform</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "local" | "ldap")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Local Account</span>
              </TabsTrigger>
              <TabsTrigger value="ldap" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Company Account</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="mt-6">
              <form onSubmit={handleLocalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={localCredentials.email}
                    onChange={handleLocalInputChange}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={localCredentials.password}
                    onChange={handleLocalInputChange}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && activeTab === "local" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                
                {/* Quick Login Buttons for Development */}
                {isDevelopment && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium text-center">Quick Login (Dev Mode)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                          setLocalCredentials({
                            email: "admin@mssp.local",
                            password: "SecureTestPass123!"
                          });
                        }}
                      >
                        👑 Admin
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                          setLocalCredentials({
                            email: "manager@mssp.local",
                            password: "SecureTestPass123!"
                          });
                        }}
                      >
                        🏢 Manager
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                          setLocalCredentials({
                            email: "engineer@mssp.local",
                            password: "SecureTestPass123!"
                          });
                        }}
                      >
                        🔧 Engineer
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                          setLocalCredentials({
                            email: "user@mssp.local",
                            password: "SecureTestPass123!"
                          });
                        }}
                      >
                        👤 User
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="ldap" className="mt-6">
              <form onSubmit={handleLdapSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ldap-username">LDAP Username</Label>
                  <Input
                    id="ldap-username"
                    name="username"
                    type="text"
                    value={ldapCredentials.username}
                    onChange={handleLdapInputChange}
                    placeholder="Enter your LDAP username"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ldap-password">Password</Label>
                  <Input
                    id="ldap-password"
                    name="password"
                    type="password"
                    value={ldapCredentials.password}
                    onChange={handleLdapInputChange}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && activeTab === "ldap" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in with Company Account"
                  )}
                </Button>
                
                {/* Quick Login Button for LDAP Development */}
                {isDevelopment && (
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full" 
                    disabled={isLoading}
                    onClick={() => {
                      setLdapCredentials({
                        username: "einstein",
                        password: "password"
                      });
                    }}
                  >
                    🚀 Quick LDAP Login (Dev)
                  </Button>
                )}
              </form>
            </TabsContent>
          </Tabs>

          {currentError && (
            <p className="text-sm text-red-600 text-center mt-4">
              {currentError.message}
            </p>
          )}
          
          <div className="mt-6 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Test Accounts:</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Admin:</strong> admin@mssp.local</p>
                <p><strong>Manager:</strong> manager@mssp.local</p>
                <p><strong>Engineer:</strong> engineer@mssp.local</p>
                <p><strong>User:</strong> user@mssp.local</p>
                <p className="text-gray-400">Password: SecureTestPass123!</p>
              </div>
              <p className="text-xs text-gray-500 pt-2">
                <strong>Test LDAP Account:</strong> einstein / password
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  onClick={() => setLocation("/register")}
                >
                  Sign up here
                </Button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
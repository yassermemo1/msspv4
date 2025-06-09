import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { InsertUser, User } from "@shared/schema";
import { getQueryFn, postQueryFn } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Define user roles as constants for type safety
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  ENGINEER: 'engineer',
  USER: 'user'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  ldapLoginMutation: UseMutationResult<User, Error, LdapLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  
  // Role checking functions
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isEngineer: () => boolean;
  isUser: () => boolean;
  
  // Permission level checks
  canManageUsers: () => boolean;
  canAccessFinancials: () => boolean;
  canManageClients: () => boolean;
  canManageTechnical: () => boolean;
  canViewAuditLogs: () => boolean;
  canManageSystem: () => boolean;
};

type LoginData = {
  email: string;
  password: string;
};

type LdapLoginData = {
  username: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: postQueryFn("/api/login"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const ldapLoginMutation = useMutation({
    mutationFn: postQueryFn("/api/auth/ldap/login"),
    onSuccess: (data: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "LDAP Login successful",
        description: `Welcome back, ${data.firstName || data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "LDAP Login failed",
        description: error.message || "Invalid LDAP credentials or server unavailable",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: postQueryFn("/api/logout"),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to login page
      window.location.href = '/login';
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: postQueryFn("/api/register"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Registration successful",
        description: "Welcome! You can now log in.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Basic role checking functions
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role as UserRole) : false;
  };

  const hasAllRoles = (roles: UserRole[]): boolean => {
    return user?.role ? roles.every(role => user.role === role) : false;
  };

  // Individual role checks
  const isAdmin = (): boolean => hasRole(USER_ROLES.ADMIN);
  const isManager = (): boolean => hasRole(USER_ROLES.MANAGER);
  const isEngineer = (): boolean => hasRole(USER_ROLES.ENGINEER);
  const isUser = (): boolean => hasRole(USER_ROLES.USER);

  // Permission-based checks (business logic)
  const canManageUsers = (): boolean => {
    return hasRole(USER_ROLES.ADMIN);
  };

  const canAccessFinancials = (): boolean => {
    return hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]);
  };

  const canManageClients = (): boolean => {
    return hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]);
  };

  const canManageTechnical = (): boolean => {
    return hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.ENGINEER]);
  };

  const canViewAuditLogs = (): boolean => {
    return hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]);
  };

  const canManageSystem = (): boolean => {
    return hasRole(USER_ROLES.ADMIN);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        ldapLoginMutation,
        logoutMutation,
        registerMutation,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        isAdmin,
        isManager,
        isEngineer,
        isUser,
        canManageUsers,
        canAccessFinancials,
        canManageClients,
        canManageTechnical,
        canViewAuditLogs,
        canManageSystem
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
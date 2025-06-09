import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not authenticated and not already on login page, redirect
  if (!user && location !== "/login") {
    // Use window.location to avoid React state updates during render
    window.location.href = "/login";
    return null;
  }

  // If not authenticated but on login page, show login page
  if (!user && location === "/login") {
    return <>{children}</>;
  }

  // User is authenticated, render children
  return <>{children}</>;
} 
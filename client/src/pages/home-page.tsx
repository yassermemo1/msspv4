import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to main dashboard - the enhanced dashboard is the primary dashboard
    setLocation("/");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Redirecting to Dashboard...</h2>
        <p className="text-gray-600">Please wait while we take you to your main dashboard.</p>
      </div>
    </div>
  );
}
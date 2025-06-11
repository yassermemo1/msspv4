import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

interface JiraTicketsKpiProps {
  clientShortName: string;
  className?: string;
}

export const JiraTicketsKpi: React.FC<JiraTicketsKpiProps> = ({ clientShortName, className = '' }) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`/api/mock-jira/tickets/count?clientShortName=${encodeURIComponent(clientShortName)}`, {
        credentials: 'include'
      });
      if (!resp.ok) {
        throw new Error(`Request failed: ${resp.status}`);
      }
      const json = await resp.json();
      setCount(json.count ?? json.data?.[0]?.value ?? 0);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientShortName) {
      fetchCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientShortName]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Jira Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <div className="text-4xl font-bold text-primary text-center py-4">
            {count}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
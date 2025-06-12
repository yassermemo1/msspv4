import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug } from "lucide-react";
import { ExternalSystem } from "@shared/schema";

export default function PluginsPage() {
  const { data: systems = [], isLoading, refetch } = useQuery<ExternalSystem[]>({
    queryKey: ["/api/external-systems"],
    queryFn: async () => {
      const res = await fetch("/api/external-systems", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch systems");
      return res.json();
    },
  });

  const [activeSystem, setActiveSystem] = useState<ExternalSystem | null>(null);
  const [queryText, setQueryText] = useState("");
  const [result, setResult] = useState<any>(null);

  const { mutate: runQuery, isLoading: querying } = useMutation({
    mutationFn: async () => {
      if (!activeSystem) return;
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ systemName: activeSystem.systemName, query: queryText }),
      });
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <AppLayout title="Plugins">
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Plug className="w-6 h-6"/>Plugins</h1>
        {isLoading ? (
          <div className="flex items-center gap-2"><Loader2 className="animate-spin"/> Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systems.map((sys) => (
              <Card key={sys.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {sys.displayName || sys.systemName}
                    {sys.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{sys.description || "No description"}</p>
                  <Button size="sm" onClick={() => { setActiveSystem(sys); setResult(null); }}>
                    Test Query
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!activeSystem} onOpenChange={(open) => { if (!open) { setActiveSystem(null); setQueryText(""); setResult(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test {activeSystem?.displayName || activeSystem?.systemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Enter query…" rows={4} />
            <Button disabled={!queryText || querying} onClick={() => runQuery()}>
              {querying ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
              Run
            </Button>
            {result && (
              <pre className="bg-muted max-h-64 overflow-auto p-2 text-xs rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
} 
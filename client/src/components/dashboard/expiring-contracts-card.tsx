import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Eye, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

interface ExpiringContract {
  id: number;
  clientId: number;
  clientName: string;
  name: string;
  endDate: string;
  totalValue: string | null;
  status: string;
  daysUntilExpiry: number;
}

interface ExpiringContractsCardProps {
  card: {
    title: string;
    config: {
      icon?: string;
      color?: string;
      filters?: {
        expiring_in_months?: number;
      };
    };
  };
  onClick?: () => void;
}

export function ExpiringContractsCard({ card, onClick }: ExpiringContractsCardProps) {
  const [selectedMonths, setSelectedMonths] = useState(
    card.config.filters?.expiring_in_months || 3
  );
  const [showDetails, setShowDetails] = useState(false);
  const [, setLocation] = useLocation();

  const { data: expiringContracts = [], isLoading, refetch } = useQuery<ExpiringContract[]>({
    queryKey: ["/api/contracts/expiring", selectedMonths],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/expiring?months=${selectedMonths}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch expiring contracts");
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleMonthsChange = (value: string) => {
    const months = parseInt(value);
    setSelectedMonths(months);
  };

  const getUrgencyBadge = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-orange-500 text-white">Urgent</Badge>;
    } else if (daysUntilExpiry <= 60) {
      return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
    } else {
      return <Badge variant="secondary">Notice</Badge>;
    }
  };

  const navigateToContract = (contractId: number) => {
    setLocation(`/contracts/${contractId}`);
    setShowDetails(false);
  };

  const navigateToClient = (clientId: number) => {
    setLocation(`/clients/${clientId}`);
    setShowDetails(false);
  };

  const totalValue = expiringContracts.reduce((sum, contract) => {
    return sum + (parseFloat(contract.totalValue || "0"));
  }, 0);

  return (
    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          {card.title}
        </CardTitle>
        <Select value={selectedMonths.toString()} onValueChange={handleMonthsChange}>
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1M</SelectItem>
            <SelectItem value="2">2M</SelectItem>
            <SelectItem value="3">3M</SelectItem>
            <SelectItem value="6">6M</SelectItem>
            <SelectItem value="12">12M</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? "..." : expiringContracts.length}
            </div>
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="h-8">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>
                    Contracts Expiring in {selectedMonths} Month{selectedMonths > 1 ? 's' : ''}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="font-semibold text-orange-600">{expiringContracts.length}</div>
                      <div className="text-gray-600">Total Contracts</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-600">
                        {new Set(expiringContracts.map(c => c.clientId)).size}
                      </div>
                      <div className="text-gray-600">Affected Clients</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-semibold text-green-600">
                        ${totalValue.toLocaleString()}
                      </div>
                      <div className="text-gray-600">Total Value</div>
                    </div>
                  </div>
                  
                  {expiringContracts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Contract</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Days Left</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiringContracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <button
                                className="text-blue-600 hover:underline"
                                onClick={() => navigateToClient(contract.clientId)}
                              >
                                {contract.clientName}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">{contract.name}</TableCell>
                            <TableCell>{formatDate(contract.endDate)}</TableCell>
                            <TableCell>{contract.daysUntilExpiry} days</TableCell>
                            <TableCell>
                              {contract.totalValue ? `$${parseFloat(contract.totalValue).toLocaleString()}` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {getUrgencyBadge(contract.daysUntilExpiry)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateToContract(contract.id)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No contracts expiring in the next {selectedMonths} month{selectedMonths > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Expiring in {selectedMonths} month{selectedMonths > 1 ? 's' : ''}
          </p>
          {expiringContracts.length > 0 && (
            <div className="text-xs text-gray-600">
              {new Set(expiringContracts.map(c => c.clientId)).size} clients affected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceAuthorizationFormSchema, type ServiceAuthorizationForm, type InsertServiceAuthorizationForm } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { formatClientName } from "@/lib/utils";

interface SAFFormProps {
  saf?: ServiceAuthorizationForm;
  onSubmit: (data: InsertServiceAuthorizationForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
  clientId?: number;
  contractId?: number;
}

export function SAFForm({ saf, onSubmit, onCancel, isLoading = false, clientId, contractId }: SAFFormProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(
    saf?.clientId || clientId
  );

  // Fetch clients for selection
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  // Fetch contracts for the selected client
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`/api/contracts?clientId=${selectedClientId}`, { 
        credentials: "include" 
      });
      if (!response.ok) throw new Error("Failed to fetch contracts");
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  const form = useForm<InsertServiceAuthorizationForm>({
    resolver: zodResolver(insertServiceAuthorizationFormSchema),
    defaultValues: {
      clientId: saf?.clientId || clientId || 0,
      contractId: saf?.contractId || contractId || 0,
      serviceScopeId: saf?.serviceScopeId || undefined,
      safNumber: saf?.safNumber || "",
      title: saf?.title || "",
      description: saf?.description || "",
      startDate: saf?.startDate ? new Date(saf.startDate).toISOString().split('T')[0] : "",
      endDate: saf?.endDate ? new Date(saf.endDate).toISOString().split('T')[0] : "",
      status: saf?.status || "draft",
      documentUrl: saf?.documentUrl || "",
      approvedBy: saf?.approvedBy || undefined,
      approvedDate: saf?.approvedDate ? new Date(saf.approvedDate).toISOString().split('T')[0] : "",
      value: saf?.value || "",
      notes: saf?.notes || "",
    },
  });

  // Watch for client changes and reset contract selection
  useEffect(() => {
    if (selectedClientId !== form.getValues("clientId")) {
      form.setValue("contractId", 0);
    }
  }, [selectedClientId, form]);

  const handleSubmit = (data: InsertServiceAuthorizationForm) => {
    onSubmit(data);
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const getContractName = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.name || "Unknown Contract";
  };

  return (
    <div className="max-h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Client and Contract Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Client & Contract</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const clientId = parseInt(value);
                        field.onChange(clientId);
                        setSelectedClientId(clientId);
                      }} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {formatClientName(client)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ""}
                      disabled={!selectedClientId || contracts.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contract" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id.toString()}>
                            {contract.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedClientId && contracts.length === 0 && (
                      <p className="text-sm text-yellow-600">
                        No contracts found for the selected client.
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Client-Contract Consistency Warning */}
            {selectedClientId && form.watch("contractId") && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Client:</strong> {getClientName(selectedClientId)} <br />
                  <strong>Contract:</strong> {getContractName(form.watch("contractId"))}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This SAF will be associated with the selected client and contract only.
                </p>
              </div>
            )}
          </div>

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="safNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SAF Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SAF-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Service Authorization Form title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the service authorization..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Dates and Financial Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Schedule & Financial</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approvedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approved Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Document and Notes Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Documentation</h3>
            
            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input placeholder="URL to SAF document" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this SAF..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : saf ? "Update SAF" : "Create SAF"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { LicensePool, ServiceScope, Client } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { formatClientName } from "@/lib/utils";

const clientLicenseFormSchema = z.object({
  clientId: z.number().min(1, "Please select a client"),
  licensePoolId: z.number({
    required_error: "Please select a license pool",
  }),
  serviceScopeId: z.number().optional(),
  assignedLicenses: z.number().min(1, "Must assign at least 1 license"),
  notes: z.string().optional(),
});

type ClientLicenseFormData = z.infer<typeof clientLicenseFormSchema>;

interface ClientLicenseFormProps {
  clientId: number; // If 0, will show client selection field
  licensePoolId?: number; // If provided, will pre-select this pool and hide the field
  onSubmit: (data: ClientLicenseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientLicenseForm({ clientId, licensePoolId, onSubmit, onCancel, isLoading = false }: ClientLicenseFormProps) {
  const needsClientSelection = clientId === 0;
  
  const form = useForm<ClientLicenseFormData>({
    resolver: zodResolver(clientLicenseFormSchema),
    defaultValues: {
      clientId: clientId || undefined,
      licensePoolId: licensePoolId || undefined,
      assignedLicenses: 1,
      notes: "",
    },
  });

  const selectedClientId = form.watch("clientId");
  const selectedLicensePool = form.watch("licensePoolId");

  // Fetch clients (only if we need client selection)
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
    enabled: needsClientSelection,
  });

  // Fetch available license pools (only if not pre-selected)
  const { data: licensePools = [] } = useQuery<LicensePool[]>({
    queryKey: ["/api/license-pools"],
    enabled: !licensePoolId,
  });

  // Get the specific license pool if pre-selected
  const { data: selectedPool } = useQuery<LicensePool>({
    queryKey: ["/api/license-pools", licensePoolId],
    queryFn: async () => {
      const response = await fetch(`/api/license-pools/${licensePoolId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch license pool");
      }
      return response.json();
    },
    enabled: !!licensePoolId,
  });

  // Fetch available service scopes for the selected client
  const { data: serviceScopes = [] } = useQuery<ServiceScope[]>({
    queryKey: ["/api/clients", selectedClientId, "service-scopes"],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${selectedClientId}/service-scopes`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch service scopes");
      }
      return response.json();
    },
    enabled: !!selectedClientId && selectedClientId > 0,
  });

  const availableLicensePool = selectedPool || licensePools.find(pool => pool.id === selectedLicensePool);

  const handleSubmit = (data: ClientLicenseFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
        <DialogBody>
          <div className="space-y-6">
            {needsClientSelection && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
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
            )}

            {!licensePoolId && (
              <FormField
                control={form.control}
                name="licensePoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Pool</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a license pool" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(licensePools || []).filter(pool => pool.availableLicenses > 0).map((pool) => (
                          <SelectItem key={pool.id} value={pool.id.toString()}>
                            <div className="flex justify-between items-center w-full">
                              <span>{pool.name} ({pool.vendor})</span>
                              <span className="text-sm text-gray-500 ml-2">
                                {pool.availableLicenses} available
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {availableLicensePool && (
                      <p className="text-sm text-gray-600">
                        Product: {availableLicensePool.productName} | Available: {availableLicensePool.availableLicenses} licenses
                      </p>
                    )}
                  </FormItem>
                )}
              />
            )}

            {licensePoolId && selectedPool && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900">{selectedPool.name}</h4>
                <p className="text-sm text-gray-600">
                  {selectedPool.vendor} {selectedPool.productName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Available: {selectedPool.availableLicenses} licenses
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="serviceScopeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Scope (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                    value={field.value ? field.value.toString() : "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Service Scope</SelectItem>
                      {serviceScopes.map((scope) => (
                        <SelectItem key={scope.id} value={scope.id.toString()}>
                          {scope.name}
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
              name="assignedLicenses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Licenses to Assign</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1"
                      min={1}
                      max={availableLicensePool?.availableLicenses || 999}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                  {availableLicensePool && (
                    <p className="text-sm text-gray-500">
                      Maximum available: {availableLicensePool.availableLicenses} licenses
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this license assignment..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !availableLicensePool || (needsClientSelection && !selectedClientId)}>
            {isLoading ? "Assigning..." : "Assign Licenses"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
} 
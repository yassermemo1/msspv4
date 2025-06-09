import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLicensePoolSchema, type LicensePool, type InsertLicensePool } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useEffect } from "react";

interface LicensePoolFormProps {
  licensePool?: LicensePool;
  onSubmit: (data: InsertLicensePool) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LicensePoolForm({ licensePool, onSubmit, onCancel, isLoading = false }: LicensePoolFormProps) {
  const form = useForm<InsertLicensePool>({
    resolver: zodResolver(insertLicensePoolSchema),
    defaultValues: {
      name: licensePool?.name || "",
      vendor: licensePool?.vendor || "",
      productName: licensePool?.productName || "",
      licenseType: licensePool?.licenseType || "",
      totalLicenses: licensePool?.totalLicenses || 0,
      availableLicenses: licensePool?.availableLicenses || 0,
      orderedLicenses: licensePool?.orderedLicenses || 0,
      costPerLicense: licensePool?.costPerLicense || "",
      renewalDate: licensePool?.renewalDate ? new Date(licensePool.renewalDate).toISOString().split('T')[0] : "",
      purchaseRequestNumber: licensePool?.purchaseRequestNumber || "",
      purchaseOrderNumber: licensePool?.purchaseOrderNumber || "",
      notes: licensePool?.notes || "",
      isActive: licensePool?.isActive ?? true,
    },
  });

  // Watch for changes in ordered licenses
  const watchedOrderedLicenses = form.watch("orderedLicenses");

  // Auto-calculate total licenses when ordered licenses change
  useEffect(() => {
    if (watchedOrderedLicenses !== undefined) {
      // If editing existing license pool, add ordered licenses to existing total
      const existingTotal = licensePool?.totalLicenses || 0;
      const existingOrdered = licensePool?.orderedLicenses || 0;
      
      // Calculate new total: existing total (minus previously ordered) + new ordered
      const newTotal = existingTotal - existingOrdered + watchedOrderedLicenses;
      form.setValue("totalLicenses", newTotal);
    }
  }, [watchedOrderedLicenses, licensePool, form]);

  const handleSubmit = (data: InsertLicensePool) => {
    // Remove availableLicenses from submission - it will be calculated on backend
    const { availableLicenses, ...submitData } = data;
    onSubmit(submitData as InsertLicensePool);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
        <DialogBody>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Pool Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Microsoft 365 E5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Microsoft" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office 365" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select license type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="per-user">Per User</SelectItem>
                        <SelectItem value="per-device">Per Device</SelectItem>
                        <SelectItem value="concurrent">Concurrent</SelectItem>
                        <SelectItem value="site">Site License</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="orderedLicenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordered Licenses</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalLicenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Licenses</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        readOnly
                        disabled
                        className="bg-gray-50 text-gray-600"
                        title="Auto-calculated based on ordered licenses"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">Auto-calculated based on ordered licenses</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableLicenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Licenses</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        readOnly
                        disabled
                        className="bg-gray-50 text-gray-600"
                        title="Auto-calculated: Total - Assigned licenses"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">Auto-calculated: Total - Assigned licenses</p>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseRequestNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Request (PR) Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PR-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseOrderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Order (PO) Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PO-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPerLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per License ($)</FormLabel>
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
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this license pool..."
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : licensePool ? "Update License Pool" : "Create License Pool"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
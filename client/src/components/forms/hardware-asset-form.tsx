import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type HardwareAsset } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Enhanced schema to include quantity for bulk creation
const hardwareAssetFormSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  category: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  location: z.string().optional(),
  status: z.string().default("available"),
  purchaseRequestNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1").max(100, "Maximum 100 assets at once").default(1),
});

type HardwareAssetFormData = z.infer<typeof hardwareAssetFormSchema>;

interface HardwareAssetFormProps {
  asset?: HardwareAsset;
  onSubmit: (data: HardwareAssetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function HardwareAssetForm({ asset, onSubmit, onCancel, isLoading = false }: HardwareAssetFormProps) {
  const form = useForm<HardwareAssetFormData>({
    resolver: zodResolver(hardwareAssetFormSchema),
    defaultValues: {
      name: asset?.name || "",
      category: asset?.category || "",
      manufacturer: asset?.manufacturer || "",
      model: asset?.model || "",
      serialNumber: asset?.serialNumber || "",
      purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : "",
      purchaseCost: asset?.purchaseCost || "",
      warrantyExpiry: asset?.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : "",
      location: asset?.location || "",
      status: asset?.status || "available",
      purchaseRequestNumber: asset?.purchaseRequestNumber || "",
      purchaseOrderNumber: asset?.purchaseOrderNumber || "",
      notes: asset?.notes || "",
      quantity: 1, // Always default to 1, even for edits
    },
  });

  const quantity = form.watch("quantity");
  const isEditing = !!asset;
  const serialNumber = form.watch("serialNumber");

  const handleSubmit = (data: HardwareAssetFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
        <DialogBody>
          <div className="space-y-6">
            {!isEditing && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-gray-500">
                      Number of identical assets to create (max 100)
                    </p>
                  </FormItem>
                )}
              />
            )}

            {!isEditing && quantity > 1 && serialNumber && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  When creating multiple assets, serial numbers will be auto-generated with incremental suffixes (e.g., {serialNumber}-001, {serialNumber}-002, etc.)
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dell OptiPlex 7090" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number {!isEditing && quantity > 1 && "(Base)"}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC123XYZ" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                    {!isEditing && quantity > 1 && (
                      <p className="text-xs text-gray-500">
                        Base serial number - will generate: {field.value || "ABC123XYZ"}-001, {field.value || "ABC123XYZ"}-002, etc.
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="network">Network Equipment</SelectItem>
                        <SelectItem value="security">Security Device</SelectItem>
                        <SelectItem value="mobile">Mobile Device</SelectItem>
                        <SelectItem value="printer">Printer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dell" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., OptiPlex 7090" {...field} />
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
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Cost ($) {!isEditing && quantity > 1 && "(Per Unit)"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                    {!isEditing && quantity > 1 && field.value && (
                      <p className="text-xs text-gray-500">
                        Total cost: ${(parseFloat(field.value) * quantity).toFixed(2)}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Expiry</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Floor 2" {...field} />
                    </FormControl>
                    <FormMessage />
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this asset..."
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

            {!isEditing && quantity > 1 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bulk Creation Summary:</strong>
                  <br />• {quantity} identical assets will be created
                  <br />• Serial numbers will be auto-generated with incremental suffixes
                  <br />• All other fields will be identical across all assets
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isEditing ? "Update Asset" : `Create ${quantity > 1 ? `${quantity} Assets` : "Asset"}`}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCertificateOfComplianceSchema, type CertificateOfCompliance, type InsertCertificateOfCompliance } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Generate COC number based on current date
function generateCOCNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COC-${year}${month}-${random}`;
}

// Convert Date to string for form input
function dateToString(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

interface COCFormProps {
  coc?: CertificateOfCompliance;
  onSubmit: (data: InsertCertificateOfCompliance) => void;
  onCancel: () => void;
  isLoading?: boolean;
  clientId?: number;
  contractId?: number;
  safId?: number;
  initialData?: InsertCertificateOfCompliance;
}

// Use a type that has string dates for the form
type COCFormData = Omit<InsertCertificateOfCompliance, 'issueDate' | 'expiryDate' | 'auditDate' | 'nextAuditDate'> & {
  issueDate: string;
  expiryDate?: string;
  auditDate?: string;
  nextAuditDate?: string;
};

export function COCForm({ coc, onSubmit, onCancel, isLoading = false, clientId, contractId, safId, initialData }: COCFormProps) {
  const form = useForm<COCFormData>({
    defaultValues: {
      clientId: initialData?.clientId || coc?.clientId || clientId || 0,
      title: initialData?.title || coc?.title || "",
      cocNumber: initialData?.cocNumber || coc?.cocNumber || generateCOCNumber(),
      complianceType: initialData?.complianceType || coc?.complianceType || "",
      issueDate: dateToString(initialData?.issueDate || coc?.issueDate || new Date()),
      expiryDate: dateToString(initialData?.expiryDate || coc?.expiryDate),
      contractId: initialData?.contractId || coc?.contractId || contractId || null,
      status: initialData?.status || coc?.status || "issued",
      auditDate: dateToString(initialData?.auditDate || coc?.auditDate),
      nextAuditDate: dateToString(initialData?.nextAuditDate || coc?.nextAuditDate),
      description: initialData?.description || coc?.description || "",
      notes: initialData?.notes || coc?.notes || "",
      documentUrl: initialData?.documentUrl || coc?.documentUrl || "",
    },
  });

  const handleSubmit = (data: COCFormData) => {
    // Convert date strings back to Date objects
    const formData: InsertCertificateOfCompliance = {
      ...data,
      issueDate: new Date(data.issueDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      auditDate: data.auditDate ? new Date(data.auditDate) : null,
      nextAuditDate: data.nextAuditDate ? new Date(data.nextAuditDate) : null,
    };
    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cocNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>COC Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., COC-2024-001" {...field} />
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
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
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
                <Input placeholder="Certificate of Compliance title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="complianceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compliance Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select compliance type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ISO27001">ISO 27001</SelectItem>
                    <SelectItem value="SOC2">SOC 2</SelectItem>
                    <SelectItem value="GDPR">GDPR</SelectItem>
                    <SelectItem value="PCI-DSS">PCI-DSS</SelectItem>
                    <SelectItem value="HIPAA">HIPAA</SelectItem>
                    <SelectItem value="NIST">NIST</SelectItem>
                    <SelectItem value="FedRAMP">FedRAMP</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed description of the compliance certificate..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="auditDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audit Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nextAuditDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Audit Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <Input placeholder="URL to COC document" {...field} value={field.value || ""} />
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
                  placeholder="Additional notes about this certificate..."
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

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : coc ? "Update COC" : "Create COC"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
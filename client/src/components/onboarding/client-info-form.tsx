import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Minimal subset of the full FormData interface used in the onboarding page
export interface ClientInfoData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  industry?: string;
}

interface ClientInfoFormProps {
  data: ClientInfoData;
  setData: React.Dispatch<React.SetStateAction<ClientInfoData>>;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * A lightweight, fully-controlled form section for capturing basic client
 * information. Declared outside the main page component so its component
 * type remains stable between renders – this prevents React from unmounting
 * and remounting the inputs on every keystroke, which was causing cursor
 * focus to be lost.
 */
export const ClientInfoForm: React.FC<ClientInfoFormProps> = ({
  data,
  setData,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add New Client</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clientName">Company Name *</Label>
          <Input
            id="clientName"
            value={data.clientName || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, clientName: e.target.value }))
            }
            placeholder="Enter company name"
          />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={data.industry}
            onValueChange={(value) =>
              setData((prev) => ({ ...prev, industry: value }))
            }
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="clientEmail">Primary Email *</Label>
          <Input
            id="clientEmail"
            type="email"
            value={data.clientEmail || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, clientEmail: e.target.value }))
            }
            placeholder="contact@company.com"
          />
        </div>
        <div>
          <Label htmlFor="clientPhone">Phone Number</Label>
          <Input
            id="clientPhone"
            value={data.clientPhone || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, clientPhone: e.target.value }))
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="clientAddress">Company Address</Label>
          <Textarea
            id="clientAddress"
            value={data.clientAddress || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, clientAddress: e.target.value }))
            }
            placeholder="Enter company address"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!data.clientName || !data.clientEmail || isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Client"}
        </Button>
      </div>
    </div>
  );
}; 
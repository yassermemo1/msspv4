import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  DollarSign,
  Package
} from "lucide-react";

export const getStatusColor = (status: string): string => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  switch (normalizedStatus) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
    case 'delivered':
      return 'text-green-600';
    case 'pending':
    case 'in progress':
    case 'processing':
      return 'text-yellow-600';
    case 'inactive':
    case 'rejected':
    case 'cancelled':
    case 'overdue':
      return 'text-red-600';
    case 'draft':
    case 'review':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

export const getStatusIcon = (status: string) => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  switch (normalizedStatus) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
      return CheckCircle;
    case 'pending':
    case 'in progress':
    case 'processing':
      return Clock;
    case 'inactive':
    case 'rejected':
    case 'cancelled':
      return XCircle;
    case 'overdue':
      return AlertTriangle;
    case 'draft':
      return FileText;
    default:
      return Calendar;
  }
};

export const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    approved: 'default', 
    completed: 'default',
    paid: 'default',
    pending: 'secondary',
    'in progress': 'secondary',
    processing: 'secondary',
    inactive: 'destructive',
    rejected: 'destructive',
    cancelled: 'destructive',
    overdue: 'destructive',
    draft: 'outline'
  };
  
  return variants[normalizedStatus] || 'outline';
};

export const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  switch (normalizedStatus) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
      return 'default';
    case 'pending':
    case 'in progress':
    case 'processing':
      return 'secondary';
    case 'inactive':
    case 'rejected':
    case 'cancelled':
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
}; 
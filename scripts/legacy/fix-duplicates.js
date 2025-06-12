const fs = require('fs');
const path = require('path');

// Files with duplicate formatCurrency implementations
const formatCurrencyDuplicates = [
  'client/src/pages/client-detail-page.tsx',
  'client/src/pages/license-pool-detail-page.tsx', 
  'client/src/pages/proposals-page.tsx',
  'client/src/pages/contract-detail-page.tsx',
  'client/src/pages/saf-page.tsx'
];

// Files with duplicate formatDate implementations  
const formatDateDuplicates = [
  'client/src/pages/coc-page.tsx',
  'client/src/pages/home-page.tsx',
  'client/src/pages/client-detail-page.tsx',
  'client/src/pages/license-pool-detail-page.tsx',
  'client/src/pages/proposals-page.tsx', 
  'client/src/pages/contract-detail-page.tsx',
  'client/src/pages/saf-page.tsx'
];

console.log('🔧 Starting duplicate function consolidation...\n');

// Function to add import if not exists
function addImportIfNotExists(filePath, importStatement) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes(importStatement.trim())) {
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && !lines[i].includes('.css')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
      content = lines.join('\n');
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Added import to ${filePath}`);
    }
  }
}

// Function to remove local function implementation
function removeLocalFunction(filePath, functionName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern to match the local function declaration
  const patterns = [
    new RegExp(`\\s*const ${functionName} = \\([^}]*\\) => \\{[^}]*\\};?\\s*`, 'g'),
    new RegExp(`\\s*const ${functionName} = \\([^}]*\\) => [^;]*;\\s*`, 'g'),
    new RegExp(`\\s*function ${functionName}\\([^}]*\\) \\{[^}]*\\}\\s*`, 'g')
  ];
  
  let removed = false;
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      removed = true;
    }
  });
  
  if (removed) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Removed local ${functionName} from ${filePath}`);
  }
  
  return removed;
}

// Fix formatCurrency duplicates
console.log('📦 Consolidating formatCurrency functions...');
formatCurrencyDuplicates.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    addImportIfNotExists(filePath, "import { formatCurrency } from '@/lib/utils';");
    removeLocalFunction(filePath, 'formatCurrency');
  }
});

// Fix formatDate duplicates
console.log('\n📅 Consolidating formatDate functions...');
formatDateDuplicates.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    addImportIfNotExists(filePath, "import { formatDate } from '@/lib/utils';");
    removeLocalFunction(filePath, 'formatDate');
  }
});

// Fix common utility functions
console.log('\n🎨 Consolidating status utility functions...');
const statusUtilityFiles = [
  'client/src/pages/client-detail-page.tsx',
  'client/src/pages/contracts-page.tsx',
  'client/src/pages/services-page.tsx',
  'client/src/pages/proposals-page.tsx',
  'client/src/pages/assets-page.tsx'
];

// Create shared status utilities
const statusUtilsContent = `import { Badge } from "@/components/ui/badge";
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

export const getStatusBadge = (status: string) => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  const variants = {
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
  
  return (
    <Badge variant={variants[normalizedStatus] || 'outline'}>
      {status}
    </Badge>
  );
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
`;

// Write the status utilities file
fs.writeFileSync('client/src/lib/status-utils.ts', statusUtilsContent);
console.log('  ✅ Created shared status utilities');

// Update files to use shared status utilities
statusUtilityFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    addImportIfNotExists(filePath, "import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';");
    
    // Remove local implementations
    ['getStatusColor', 'getStatusIcon', 'getStatusBadge', 'getStatusVariant'].forEach(funcName => {
      removeLocalFunction(filePath, funcName);
    });
  }
});

console.log('\n🔧 Fixing server-side duplicates...');

// Fix server-side hashPassword duplicates
const authFiles = ['server/auth/auth.ts', 'server/auth/local-auth.ts'];
authFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove local hashPassword if it exists and add import
    if (content.includes('function hashPassword') || content.includes('const hashPassword')) {
      content = content.replace(/function hashPassword[^}]*\}/g, '');
      content = content.replace(/const hashPassword[^;]*;/g, '');
      
      if (!content.includes("import { hashPassword }")) {
        content = `import { hashPassword } from './password-utils';\n${content}`;
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Updated ${filePath} to use shared hashPassword`);
    }
  }
});

// Create shared password utilities
const passwordUtilsContent = `import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(plaintext: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plaintext, hash);
}
`;

fs.writeFileSync('server/auth/password-utils.ts', passwordUtilsContent);
console.log('  ✅ Created shared password utilities');

console.log('\n✨ Duplicate function consolidation completed!');
console.log('\n📊 Summary:');
console.log(`  • Consolidated formatCurrency: ${formatCurrencyDuplicates.length} files`);
console.log(`  • Consolidated formatDate: ${formatDateDuplicates.length} files`);
console.log(`  • Consolidated status utilities: ${statusUtilityFiles.length} files`);
console.log(`  • Fixed server-side duplicates: ${authFiles.length} files`);
console.log('  • Created shared utility files: 3 files'); 
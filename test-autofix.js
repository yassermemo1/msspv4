// Simple test of the auto-fix logic
function autoFixJQLQuery(query) {
  let fixed = query;
  
  // Fix 1: Ensure field names are lowercase
  fixed = fixed.replace(/\bProject\s*=/gi, 'project =');
  fixed = fixed.replace(/\bProject\s+in\s*\(/gi, 'project in (');
  fixed = fixed.replace(/\bStatus\s*=/gi, 'status =');
  
  // Fix 2: Add quotes around unquoted string values
  fixed = fixed.replace(/=\s*([A-Za-z][A-Za-z0-9_]*)\s*(?![A-Za-z0-9_()])/g, '= "$1"');
  fixed = fixed.replace(/!=\s*([A-Za-z][A-Za-z0-9_]*)\s*(?![A-Za-z0-9_()])/g, '!= "$1"');
  
  // Fix 3: Fix IN clauses - properly quote unquoted values
  fixed = fixed.replace(/\s+in\s+\(/gi, ' in (');
  
  // Fix IN clause values - quote individual unquoted values
  fixed = fixed.replace(/in\s*\(\s*([^)]+)\s*\)/gi, (match, values) => {
    // Split values and quote unquoted ones
    const fixedValues = values.split(',').map((value) => {
      const trimmed = value.trim();
      // If already quoted, keep as is
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed;
      }
      // Quote unquoted values (only if they're not empty and not functions)
      if (trimmed && !trimmed.includes('(') && !trimmed.includes(')')) {
        return `"${trimmed}"`;
      }
      return trimmed;
    }).join(', ');
    
    return `in (${fixedValues})`;
  });
  
  // Fix 4: Clean up extra spaces
  fixed = fixed.replace(/\s+/g, ' ').trim();
  
  return fixed;
}

// Test cases
const testCases = [
  'project in (DEP, MD)',
  'Project in (DEP, MD) AND Status = Open',
  'project in ("DEP", "MD")', // already correct
  'project = DEP AND status = Done'
];

console.log('🔧 Testing Auto-Fix Function:');
console.log('============================');

testCases.forEach((query, index) => {
  const fixed = autoFixJQLQuery(query);
  console.log(`\n${index + 1}. Input:  "${query}"`);
  console.log(`   Output: "${fixed}"`);
  console.log(`   Fixed:  ${query !== fixed ? '✅ YES' : '❌ NO'}`);
});

// Test the specific failing case
console.log('\n🎯 Testing Specific Failing Case:');
console.log('================================');
const failingCase = 'project in (DEP, MD)';
const result = autoFixJQLQuery(failingCase);
console.log(`Input:  "${failingCase}"`);
console.log(`Output: "${result}"`);
console.log(`Should be: "project in (\\"DEP\\", \\"MD\\")"`);
console.log(`Match: ${result === 'project in ("DEP", "MD")' ? '✅ YES' : '❌ NO'}`); 
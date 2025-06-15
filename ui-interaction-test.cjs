const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx and .ts files in client directory
function findReactFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findReactFiles(fullPath, files);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to extract handlers and interactions from a file
function extractInteractions(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const interactions = {
      file: filePath,
      onClick: [],
      onSubmit: [],
      onDelete: [],
      onSave: [],
      onUpdate: [],
      onCancel: [],
      onConfirm: [],
      customHandlers: [],
      apiCalls: [],
      formSubmissions: []
    };

    // Extract onClick handlers
    const onClickMatches = content.match(/onClick\s*=\s*{([^}]+)}/g);
    if (onClickMatches) {
      onClickMatches.forEach((match, index) => {
        const handler = match.replace(/onClick\s*=\s*{/, '').replace(/}$/, '');
        interactions.onClick.push({
          line: getLineNumber(content, match),
          handler: handler.trim(),
          context: getContext(content, match)
        });
      });
    }

    // Extract onSubmit handlers
    const onSubmitMatches = content.match(/onSubmit\s*=\s*{([^}]+)}/g);
    if (onSubmitMatches) {
      onSubmitMatches.forEach((match, index) => {
        const handler = match.replace(/onSubmit\s*=\s*{/, '').replace(/}$/, '');
        interactions.onSubmit.push({
          line: getLineNumber(content, match),
          handler: handler.trim(),
          context: getContext(content, match)
        });
      });
    }

    // Extract form submission patterns
    const formSubmissionPatterns = [
      /handleSubmit\s*\(/g,
      /onSubmit\s*:/g,
      /submitForm\s*\(/g,
      /formik\.handleSubmit/g,
      /form\.handleSubmit/g
    ];

    formSubmissionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          interactions.formSubmissions.push({
            line: getLineNumber(content, match),
            pattern: match,
            context: getContext(content, match)
          });
        });
      }
    });

    // Extract API calls
    const apiCallPatterns = [
      /fetch\s*\(/g,
      /axios\./g,
      /\.post\s*\(/g,
      /\.get\s*\(/g,
      /\.put\s*\(/g,
      /\.delete\s*\(/g,
      /\.patch\s*\(/g,
      /useMutation/g,
      /useQuery/g,
      /api\./g
    ];

    apiCallPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          interactions.apiCalls.push({
            line: getLineNumber(content, match),
            call: match,
            context: getContext(content, match)
          });
        });
      }
    });

    // Extract custom event handlers
    const customHandlerPatterns = [
      /handle[A-Z]\w*\s*=\s*\(/g,
      /on[A-Z]\w*\s*=\s*{/g,
      /\w*Handler\s*=\s*\(/g,
      /\w*Callback\s*=\s*\(/g
    ];

    customHandlerPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          interactions.customHandlers.push({
            line: getLineNumber(content, match),
            handler: match,
            context: getContext(content, match)
          });
        });
      }
    });

    // Extract specific action handlers
    const actionPatterns = [
      { type: 'onDelete', pattern: /onDelete\s*=|handleDelete|deleteItem|delete\w+/gi },
      { type: 'onSave', pattern: /onSave\s*=|handleSave|saveItem|save\w+/gi },
      { type: 'onUpdate', pattern: /onUpdate\s*=|handleUpdate|updateItem|update\w+/gi },
      { type: 'onCancel', pattern: /onCancel\s*=|handleCancel|cancelAction|cancel\w+/gi },
      { type: 'onConfirm', pattern: /onConfirm\s*=|handleConfirm|confirmAction|confirm\w+/gi }
    ];

    actionPatterns.forEach(({ type, pattern }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          interactions[type].push({
            line: getLineNumber(content, match),
            handler: match,
            context: getContext(content, match)
          });
        });
      }
    });

    return interactions;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to get line number of a match
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return 0;
  return content.substring(0, index).split('\n').length;
}

// Helper function to get context around a match
function getContext(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return '';
  
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + match.length + 50);
  return content.substring(start, end).replace(/\n/g, ' ').trim();
}

// Function to analyze all interactions
function analyzeUIInteractions() {
  console.log('🔍 Analyzing UI Interactions and Handlers...');
  console.log('='.repeat(60));

  const clientDir = './client/src';
  if (!fs.existsSync(clientDir)) {
    console.log('❌ Client directory not found!');
    return;
  }

  const reactFiles = findReactFiles(clientDir);
  console.log(`📁 Found ${reactFiles.length} React files to analyze`);

  const allInteractions = {};
  const summary = {
    totalFiles: reactFiles.length,
    filesWithInteractions: 0,
    totalOnClick: 0,
    totalOnSubmit: 0,
    totalApiCalls: 0,
    totalFormSubmissions: 0,
    totalCustomHandlers: 0,
    actionHandlers: {
      onDelete: 0,
      onSave: 0,
      onUpdate: 0,
      onCancel: 0,
      onConfirm: 0
    }
  };

  reactFiles.forEach(file => {
    const interactions = extractInteractions(file);
    if (interactions) {
      const hasInteractions = Object.values(interactions).some(arr => 
        Array.isArray(arr) && arr.length > 0
      );

      if (hasInteractions) {
        allInteractions[file] = interactions;
        summary.filesWithInteractions++;
        summary.totalOnClick += interactions.onClick.length;
        summary.totalOnSubmit += interactions.onSubmit.length;
        summary.totalApiCalls += interactions.apiCalls.length;
        summary.totalFormSubmissions += interactions.formSubmissions.length;
        summary.totalCustomHandlers += interactions.customHandlers.length;
        
        Object.keys(summary.actionHandlers).forEach(action => {
          summary.actionHandlers[action] += interactions[action].length;
        });
      }
    }
  });

  // Generate detailed report
  console.log('\n📊 UI INTERACTIONS SUMMARY:');
  console.log('-'.repeat(40));
  console.log(`Total Files Analyzed: ${summary.totalFiles}`);
  console.log(`Files with Interactions: ${summary.filesWithInteractions}`);
  console.log(`Total onClick Handlers: ${summary.totalOnClick}`);
  console.log(`Total onSubmit Handlers: ${summary.totalOnSubmit}`);
  console.log(`Total API Calls: ${summary.totalApiCalls}`);
  console.log(`Total Form Submissions: ${summary.totalFormSubmissions}`);
  console.log(`Total Custom Handlers: ${summary.totalCustomHandlers}`);
  
  console.log('\n🎯 Action Handler Breakdown:');
  Object.entries(summary.actionHandlers).forEach(([action, count]) => {
    console.log(`  ${action}: ${count}`);
  });

  // Show top files with most interactions
  console.log('\n🔥 Files with Most Interactions:');
  console.log('-'.repeat(40));
  
  const fileInteractionCounts = Object.entries(allInteractions).map(([file, interactions]) => {
    const totalCount = Object.values(interactions).reduce((sum, arr) => {
      return sum + (Array.isArray(arr) ? arr.length : 0);
    }, 0);
    return { file: file.replace('./client/src/', ''), count: totalCount };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  fileInteractionCounts.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file} (${item.count} interactions)`);
  });

  // Generate specific interaction lists for manual testing
  console.log('\n\n🧪 BUTTON HANDLERS TO TEST MANUALLY:');
  console.log('='.repeat(60));

  const buttonHandlers = [];
  const formHandlers = [];

  Object.entries(allInteractions).forEach(([file, interactions]) => {
    const shortFile = file.replace('./client/src/', '');
    
    interactions.onClick.forEach(handler => {
      buttonHandlers.push({
        file: shortFile,
        line: handler.line,
        handler: handler.handler,
        context: handler.context
      });
    });

    interactions.onSubmit.forEach(handler => {
      formHandlers.push({
        file: shortFile,
        line: handler.line,
        handler: handler.handler,
        context: handler.context
      });
    });
  });

  // Show button handlers
  console.log('\n🖱️  CLICK HANDLERS:');
  console.log('-'.repeat(30));
  buttonHandlers.slice(0, 20).forEach((handler, index) => {
    console.log(`${index + 1}. ${handler.file}:${handler.line}`);
    console.log(`   Handler: ${handler.handler}`);
    console.log(`   Context: ${handler.context.substring(0, 80)}...`);
    console.log('');
  });

  // Show form handlers
  console.log('\n📝 FORM SUBMIT HANDLERS:');
  console.log('-'.repeat(30));
  formHandlers.slice(0, 10).forEach((handler, index) => {
    console.log(`${index + 1}. ${handler.file}:${handler.line}`);
    console.log(`   Handler: ${handler.handler}`);
    console.log(`   Context: ${handler.context.substring(0, 80)}...`);
    console.log('');
  });

  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    allInteractions,
    buttonHandlers,
    formHandlers,
    fileInteractionCounts
  };

  fs.writeFileSync('ui-interactions-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📁 Detailed report saved to: ui-interactions-report.json');

  // Generate test checklist
  generateTestChecklist(buttonHandlers, formHandlers);
}

// Generate a manual testing checklist
function generateTestChecklist(buttonHandlers, formHandlers) {
  console.log('\n\n✅ MANUAL TESTING CHECKLIST:');
  console.log('='.repeat(60));

  const testChecklist = {
    criticalFunctionality: [
      '🔐 Login/Logout functionality',
      '👥 User management (create, edit, delete)',
      '🏢 Client management (CRUD operations)',
      '📄 Contract management (CRUD operations)',
      '🛠️ Service management (CRUD operations)',
      '📊 Dashboard interactions',
      '🔍 Search functionality',
      '📁 Document upload/download',
      '⚙️ Settings management'
    ],
    buttonTests: buttonHandlers.slice(0, 15).map((handler, index) => ({
      id: index + 1,
      location: `${handler.file}:${handler.line}`,
      description: `Test: ${handler.handler}`,
      tested: false
    })),
    formTests: formHandlers.slice(0, 10).map((handler, index) => ({
      id: index + 1,
      location: `${handler.file}:${handler.line}`,
      description: `Test form submission: ${handler.handler}`,
      tested: false
    }))
  };

  console.log('\n🎯 CRITICAL FUNCTIONALITY TO TEST:');
  testChecklist.criticalFunctionality.forEach((item, index) => {
    console.log(`${index + 1}. ${item}`);
  });

  console.log('\n🖱️  PRIORITY BUTTON TESTS:');
  testChecklist.buttonTests.forEach(test => {
    console.log(`☐ ${test.id}. ${test.description}`);
    console.log(`    Location: ${test.location}`);
  });

  console.log('\n📝 PRIORITY FORM TESTS:');
  testChecklist.formTests.forEach(test => {
    console.log(`☐ ${test.id}. ${test.description}`);
    console.log(`    Location: ${test.location}`);
  });

  fs.writeFileSync('manual-testing-checklist.json', JSON.stringify(testChecklist, null, 2));
  console.log('\n📋 Manual testing checklist saved to: manual-testing-checklist.json');
}

// Run the analysis
analyzeUIInteractions(); 
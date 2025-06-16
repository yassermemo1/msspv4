#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class UIHandlerTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        totalHandlers: 0,
        buttonHandlers: 0,
        onSubmitHandlers: 0,
        onClickHandlers: 0,
        potentialIssues: 0
      },
      files: [],
      potentialIssues: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      const fileAnalysis = {
        path: filePath,
        fileName,
        handlers: [],
        issues: []
      };

      // Look for different types of handlers
      this.findButtonHandlers(content, fileAnalysis);
      this.findOnSubmitHandlers(content, fileAnalysis);
      this.findOnClickHandlers(content, fileAnalysis);
      this.findFormHandlers(content, fileAnalysis);
      this.findEventHandlers(content, fileAnalysis);
      
      // Check for potential issues
      this.checkForIssues(content, fileAnalysis);

      if (fileAnalysis.handlers.length > 0 || fileAnalysis.issues.length > 0) {
        this.results.files.push(fileAnalysis);
        this.results.summary.totalHandlers += fileAnalysis.handlers.length;
        this.results.summary.potentialIssues += fileAnalysis.issues.length;
        this.results.potentialIssues.push(...fileAnalysis.issues);
      }

      return fileAnalysis;
    } catch (error) {
      this.log(`Error analyzing ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  findButtonHandlers(content, fileAnalysis) {
    // Look for button onClick handlers
    const buttonPatterns = [
      /onClick\s*=\s*\{([^}]+)\}/g,
      /<button[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /<Button[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /onPress\s*=\s*\{([^}]+)\}/g
    ];

    buttonPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handler = match[1].trim();
        fileAnalysis.handlers.push({
          type: 'button',
          handler: handler,
          line: this.getLineNumber(content, match.index),
          pattern: 'onClick'
        });
        this.results.summary.buttonHandlers++;
      }
    });
  }

  findOnSubmitHandlers(content, fileAnalysis) {
    // Look for form onSubmit handlers
    const submitPatterns = [
      /onSubmit\s*=\s*\{([^}]+)\}/g,
      /<form[^>]*onSubmit\s*=\s*\{([^}]+)\}/g,
      /<Form[^>]*onSubmit\s*=\s*\{([^}]+)\}/g,
      /handleSubmit\s*=\s*([^;,\n]+)/g
    ];

    submitPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handler = match[1].trim();
        fileAnalysis.handlers.push({
          type: 'submit',
          handler: handler,
          line: this.getLineNumber(content, match.index),
          pattern: 'onSubmit'
        });
        this.results.summary.onSubmitHandlers++;
      }
    });
  }

  findOnClickHandlers(content, fileAnalysis) {
    // Look for general onClick handlers (not on buttons)
    const clickPatterns = [
      /<div[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /<span[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /<li[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /<td[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /<tr[^>]*onClick\s*=\s*\{([^}]+)\}/g,
      /onClick\s*=\s*\{([^}]+)\}/g
    ];

    clickPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handler = match[1].trim();
        // Skip if we already found this as a button handler
        if (!fileAnalysis.handlers.some(h => h.handler === handler && h.type === 'button')) {
          fileAnalysis.handlers.push({
            type: 'click',
            handler: handler,
            line: this.getLineNumber(content, match.index),
            pattern: 'onClick'
          });
          this.results.summary.onClickHandlers++;
        }
      }
    });
  }

  findFormHandlers(content, fileAnalysis) {
    // Look for form-related handlers
    const formPatterns = [
      /onChange\s*=\s*\{([^}]+)\}/g,
      /onInput\s*=\s*\{([^}]+)\}/g,
      /onBlur\s*=\s*\{([^}]+)\}/g,
      /onFocus\s*=\s*\{([^}]+)\}/g,
      /onKeyDown\s*=\s*\{([^}]+)\}/g,
      /onKeyPress\s*=\s*\{([^}]+)\}/g,
      /onKeyUp\s*=\s*\{([^}]+)\}/g
    ];

    formPatterns.forEach((pattern, index) => {
      const types = ['change', 'input', 'blur', 'focus', 'keydown', 'keypress', 'keyup'];
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handler = match[1].trim();
        fileAnalysis.handlers.push({
          type: 'form',
          handler: handler,
          line: this.getLineNumber(content, match.index),
          pattern: types[index]
        });
      }
    });
  }

  findEventHandlers(content, fileAnalysis) {
    // Look for other event handlers
    const eventPatterns = [
      /addEventListener\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
      /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]+)\}/g,
      /useCallback\s*\(\s*([^,]+),/g,
      /useMemo\s*\(\s*([^,]+),/g
    ];

    const types = ['addEventListener', 'useEffect', 'useCallback', 'useMemo'];
    
    eventPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const handler = index === 0 ? match[2].trim() : match[1].trim();
        fileAnalysis.handlers.push({
          type: 'event',
          handler: handler,
          line: this.getLineNumber(content, match.index),
          pattern: types[index]
        });
      }
    });
  }

  checkForIssues(content, fileAnalysis) {
    const issues = [];

    // Check for missing error handling in async functions
    const asyncHandlers = content.match(/onClick\s*=\s*\{async\s*\([^}]+\)\s*=>\s*\{[^}]*\}/g);
    if (asyncHandlers) {
      asyncHandlers.forEach(handler => {
        if (!handler.includes('try') && !handler.includes('catch')) {
          issues.push({
            type: 'missing-error-handling',
            message: 'Async handler without error handling',
            line: this.getLineNumber(content, content.indexOf(handler)),
            severity: 'warning'
          });
        }
      });
    }

    // Check for empty handlers
    const emptyHandlers = content.match(/on\w+\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g);
    if (emptyHandlers) {
      emptyHandlers.forEach(handler => {
        issues.push({
          type: 'empty-handler',
          message: 'Empty event handler',
          line: this.getLineNumber(content, content.indexOf(handler)),
          severity: 'info'
        });
      });
    }

    // Check for preventDefault usage
    const preventDefaultUsage = content.match(/\.preventDefault\(\)/g);
    if (preventDefaultUsage) {
      issues.push({
        type: 'preventDefault-usage',
        message: 'Uses preventDefault (check if necessary)',
        count: preventDefaultUsage.length,
        severity: 'info'
      });
    }

    // Check for direct DOM manipulation (potential React anti-pattern)
    const domManipulation = content.match(/document\.(getElementById|querySelector|createElement)/g);
    if (domManipulation) {
      issues.push({
        type: 'dom-manipulation',
        message: 'Direct DOM manipulation detected (potential React anti-pattern)',
        count: domManipulation.length,
        severity: 'warning'
      });
    }

    // Check for missing dependencies in useCallback/useMemo
    const callbackMemo = content.match(/use(Callback|Memo)\s*\([^,]+,\s*\[\s*\]\s*\)/g);
    if (callbackMemo) {
      callbackMemo.forEach(usage => {
        issues.push({
          type: 'empty-dependencies',
          message: 'useCallback/useMemo with empty dependencies array',
          line: this.getLineNumber(content, content.indexOf(usage)),
          severity: 'warning'
        });
      });
    }

    // Check for console.log in handlers (should be removed in production)
    const consoleLogs = content.match(/console\.(log|warn|error)/g);
    if (consoleLogs) {
      issues.push({
        type: 'console-usage',
        message: 'Console statements found (consider removing for production)',
        count: consoleLogs.length,
        severity: 'info'
      });
    }

    fileAnalysis.issues = issues;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Only analyze relevant file types
        const ext = path.extname(entry.name).toLowerCase();
        if (['.tsx', '.ts', '.jsx', '.js', '.vue'].includes(ext)) {
          this.results.summary.totalFiles++;
          this.analyzeFile(fullPath);
        }
      }
    }
  }

  generateReport() {
    // Save detailed results
    fs.writeFileSync('ui-handlers-analysis.json', JSON.stringify(this.results, null, 2));

    // Print summary
    this.log('\n' + '='.repeat(80), 'info');
    this.log('🎯 UI HANDLERS & EVENT LISTENERS ANALYSIS', 'info');
    this.log('='.repeat(80), 'info');

    const { summary } = this.results;
    
    this.log(`📁 Total Files Analyzed: ${summary.totalFiles}`, 'info');
    this.log(`🎛️  Total Handlers Found: ${summary.totalHandlers}`, 'info');
    this.log(`🔘 Button Handlers: ${summary.buttonHandlers}`, 'info');
    this.log(`📝 Form Submit Handlers: ${summary.onSubmitHandlers}`, 'info');
    this.log(`👆 Click Handlers: ${summary.onClickHandlers}`, 'info');
    this.log(`⚠️  Potential Issues: ${summary.potentialIssues}`, summary.potentialIssues > 0 ? 'warning' : 'info');

    // Show files with most handlers
    const filesByHandlers = this.results.files
      .sort((a, b) => b.handlers.length - a.handlers.length)
      .slice(0, 10);

    if (filesByHandlers.length > 0) {
      this.log('\n📊 FILES WITH MOST HANDLERS:', 'info');
      filesByHandlers.forEach(file => {
        this.log(`   ${file.fileName}: ${file.handlers.length} handlers`, 'info');
      });
    }

    // Show potential issues
    if (this.results.potentialIssues.length > 0) {
      this.log('\n⚠️  POTENTIAL ISSUES FOUND:', 'warning');
      
      const issuesByType = this.results.potentialIssues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {});

      Object.entries(issuesByType).forEach(([type, count]) => {
        this.log(`   ${type}: ${count} occurrences`, 'warning');
      });

      // Show critical issues
      const criticalIssues = this.results.potentialIssues
        .filter(issue => issue.severity === 'error')
        .slice(0, 5);

      if (criticalIssues.length > 0) {
        this.log('\n🚨 CRITICAL ISSUES:', 'error');
        criticalIssues.forEach(issue => {
          this.log(`   ${issue.message} (Line: ${issue.line})`, 'error');
        });
      }
    }

    // Handler type breakdown
    this.log('\n📈 HANDLER TYPE BREAKDOWN:', 'info');
    const handlerTypes = this.results.files.flatMap(file => file.handlers)
      .reduce((acc, handler) => {
        acc[handler.type] = (acc[handler.type] || 0) + 1;
        return acc;
      }, {});

    Object.entries(handlerTypes).forEach(([type, count]) => {
      this.log(`   ${type}: ${count}`, 'info');
    });

    // Show files with potential issues
    const filesWithIssues = this.results.files.filter(file => file.issues.length > 0);
    if (filesWithIssues.length > 0) {
      this.log('\n🔍 FILES WITH POTENTIAL ISSUES:', 'warning');
      filesWithIssues.slice(0, 10).forEach(file => {
        this.log(`   ${file.fileName}: ${file.issues.length} issues`, 'warning');
      });
    }

    this.log('\n📄 Detailed analysis saved to: ui-handlers-analysis.json', 'info');
    this.log('='.repeat(80), 'info');

    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    this.log('\n💡 RECOMMENDATIONS:', 'info');

    const issues = this.results.potentialIssues;
    const handlerCount = this.results.summary.totalHandlers;

    // Error handling recommendations
    const missingErrorHandling = issues.filter(i => i.type === 'missing-error-handling').length;
    if (missingErrorHandling > 0) {
      this.log(`   🛡️  Add error handling to ${missingErrorHandling} async handlers`, 'warning');
    }

    // Performance recommendations
    const emptyDependencies = issues.filter(i => i.type === 'empty-dependencies').length;
    if (emptyDependencies > 0) {
      this.log(`   ⚡ Review ${emptyDependencies} useCallback/useMemo dependencies`, 'warning');
    }

    // Code quality recommendations
    const consoleLogs = issues.filter(i => i.type === 'console-usage').length;
    if (consoleLogs > 0) {
      this.log(`   🧹 Remove ${consoleLogs} console statements for production`, 'info');
    }

    const domManipulation = issues.filter(i => i.type === 'dom-manipulation').length;
    if (domManipulation > 0) {
      this.log(`   🔄 Consider replacing ${domManipulation} direct DOM manipulations with React patterns`, 'warning');
    }

    // Overall assessment
    if (handlerCount > 200) {
      this.log(`   📊 Consider component splitting - ${handlerCount} handlers detected`, 'info');
    }

    if (issues.length === 0) {
      this.log(`   ✅ No major issues detected in event handlers!`, 'success');
    }
  }

  run() {
    this.log('🔍 Starting UI Handlers Analysis...', 'info');
    
    const clientDir = path.join(process.cwd(), 'client');
    
    if (!fs.existsSync(clientDir)) {
      this.log('❌ Client directory not found. Make sure you\'re in the project root.', 'error');
      return;
    }

    this.scanDirectory(clientDir);
    this.generateReport();
  }
}

// Run the analysis
const tester = new UIHandlerTester();
tester.run(); 
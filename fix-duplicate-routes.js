#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DuplicateRouteFixer {
  constructor(filePath) {
    this.filePath = filePath;
    this.routes = new Map(); // Map<normalizedRoute, [occurrences]>
    this.duplicates = [];
    this.content = '';
    this.lines = [];
  }

  /**
   * Parse the file and extract all route definitions
   */
  parseFile() {
    console.log(`🔍 Analyzing routes in: ${this.filePath}`);
    
    this.content = fs.readFileSync(this.filePath, 'utf-8');
    this.lines = this.content.split('\n');
    
    // Regex to match Express route definitions
    const routeRegex = /^\s*(app|router)\.(get|post|put|delete|patch|head|options|all)\s*\(\s*["'`]([^"'`]+)["'`]/;
    
    this.lines.forEach((line, index) => {
      const match = line.match(routeRegex);
      if (match) {
        const [, expressObj, method, path] = match;
        const normalizedRoute = this.normalizeRoute(method.toUpperCase(), path);
        
        const routeInfo = {
          lineNumber: index + 1,
          originalLine: line.trim(),
          method: method.toUpperCase(),
          path: path,
          fullMatch: match[0],
          expressObject: expressObj
        };
        
        if (!this.routes.has(normalizedRoute)) {
          this.routes.set(normalizedRoute, []);
        }
        this.routes.get(normalizedRoute).push(routeInfo);
      }
    });
    
    // Find duplicates
    this.routes.forEach((occurrences, normalizedRoute) => {
      if (occurrences.length > 1) {
        this.duplicates.push({
          route: normalizedRoute,
          occurrences: occurrences
        });
      }
    });
    
    console.log(`📊 Found ${this.routes.size} unique routes, ${this.duplicates.length} duplicates`);
  }

  /**
   * Normalize route for comparison (ignore parameter names, normalize spacing)
   */
  normalizeRoute(method, path) {
    // Normalize path parameters to a standard format
    const normalizedPath = path
      .replace(/:[\w]+/g, ':param') // Replace :id, :userId, etc. with :param
      .replace(/\/+/g, '/') // Normalize multiple slashes
      .replace(/\/$/, '') // Remove trailing slash
      .toLowerCase();
    
    return `${method} ${normalizedPath}`;
  }

  /**
   * Generate detailed report of duplicates
   */
  generateReport() {
    console.log('\n📋 DUPLICATE ROUTES REPORT');
    console.log('=' .repeat(80));
    
    if (this.duplicates.length === 0) {
      console.log('✅ No duplicate routes found!');
      return;
    }

    const report = {
      summary: {
        totalRoutes: this.routes.size,
        duplicateGroups: this.duplicates.length,
        totalDuplicateOccurrences: this.duplicates.reduce((sum, dup) => sum + dup.occurrences.length, 0)
      },
      duplicates: []
    };

    this.duplicates.forEach((duplicate, index) => {
      const [method, path] = duplicate.route.split(' ', 2);
      
      console.log(`\n🔴 Duplicate #${index + 1}: ${method} ${path}`);
      console.log('─'.repeat(60));
      
      const duplicateInfo = {
        method,
        path,
        normalizedRoute: duplicate.route,
        occurrences: []
      };

      duplicate.occurrences.forEach((occurrence, occIndex) => {
        const status = occIndex === 0 ? '✅ KEEP' : '❌ REMOVE';
        console.log(`   ${status} Line ${occurrence.lineNumber}: ${occurrence.originalLine}`);
        
        duplicateInfo.occurrences.push({
          lineNumber: occurrence.lineNumber,
          line: occurrence.originalLine,
          action: occIndex === 0 ? 'keep' : 'remove'
        });
      });
      
      report.duplicates.push(duplicateInfo);
    });

    // Write JSON report
    fs.writeFileSync('duplicate-routes-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed JSON report saved to: duplicate-routes-report.json');
    
    return report;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report) {
    let markdown = `# Duplicate Routes Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Routes:** ${report.summary.totalRoutes}\n`;
    markdown += `- **Duplicate Groups:** ${report.summary.duplicateGroups}\n`;
    markdown += `- **Total Duplicate Occurrences:** ${report.summary.totalDuplicateOccurrences}\n\n`;
    
    if (report.duplicates.length === 0) {
      markdown += `✅ **No duplicates found!**\n`;
    } else {
      markdown += `## Duplicate Routes\n\n`;
      markdown += `| Method | Path | Line Numbers | Action |\n`;
      markdown += `|--------|------|--------------|--------|\n`;
      
      report.duplicates.forEach(dup => {
        const lineNumbers = dup.occurrences.map(occ => 
          `${occ.lineNumber}${occ.action === 'keep' ? ' ✅' : ' ❌'}`
        ).join(', ');
        
        markdown += `| ${dup.method} | \`${dup.path}\` | ${lineNumbers} | Keep first, remove others |\n`;
      });
      
      markdown += `\n## Detailed Analysis\n\n`;
      
      report.duplicates.forEach((dup, index) => {
        markdown += `### ${index + 1}. ${dup.method} ${dup.path}\n\n`;
        markdown += `**Occurrences:**\n\n`;
        
        dup.occurrences.forEach(occ => {
          const action = occ.action === 'keep' ? '✅ **KEEP**' : '❌ **REMOVE**';
          markdown += `- **Line ${occ.lineNumber}:** ${action}\n`;
          markdown += `  \`\`\`javascript\n  ${occ.line}\n  \`\`\`\n\n`;
        });
      });
    }
    
    fs.writeFileSync('fix-duplicate-routes.md', markdown);
    console.log('📄 Markdown report saved to: fix-duplicate-routes.md');
  }

  /**
   * Create a fixed version of the file with duplicates commented out
   */
  createFixedFile() {
    if (this.duplicates.length === 0) {
      console.log('✅ No duplicates to fix!');
      return;
    }

    console.log('\n🔧 Creating fixed version...');
    
    // Create a set of line numbers to comment out (all duplicates except the first occurrence)
    const linesToComment = new Set();
    
    this.duplicates.forEach(duplicate => {
      // Skip the first occurrence (index 0), comment out the rest
      for (let i = 1; i < duplicate.occurrences.length; i++) {
        linesToComment.add(duplicate.occurrences[i].lineNumber - 1); // Convert to 0-based index
      }
    });
    
    // Create the fixed content
    const fixedLines = this.lines.map((line, index) => {
      if (linesToComment.has(index)) {
        return `// TODO: Duplicate route removed - ${line.trim()}`;
      }
      return line;
    });
    
    const fixedContent = fixedLines.join('\n');
    const backupPath = `${this.filePath}.backup.${Date.now()}`;
    const fixedPath = `${this.filePath}.fixed`;
    
    // Create backup
    fs.writeFileSync(backupPath, this.content);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Create fixed version
    fs.writeFileSync(fixedPath, fixedContent);
    console.log(`✨ Fixed version created: ${fixedPath}`);
    
    console.log(`\n📝 To apply the fix:\n   mv "${fixedPath}" "${this.filePath}"`);
    
    return {
      backupPath,
      fixedPath,
      commentedLines: linesToComment.size
    };
  }

  /**
   * Run the complete analysis and fix process
   */
  run() {
    console.log('🚀 Starting Duplicate Route Analysis...\n');
    
    try {
      this.parseFile();
      const report = this.generateReport();
      this.generateMarkdownReport(report);
      const fixResult = this.createFixedFile();
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE');
      console.log('='.repeat(80));
      
      if (this.duplicates.length > 0) {
        console.log(`🔴 Found ${this.duplicates.length} duplicate route groups`);
        console.log(`📝 ${fixResult.commentedLines} duplicate routes marked for removal`);
        console.log('\n📁 Files generated:');
        console.log(`   - duplicate-routes-report.json (JSON report)`);
        console.log(`   - fix-duplicate-routes.md (Markdown report)`);
        console.log(`   - ${fixResult.fixedPath} (Fixed routes file)`);
        console.log(`   - ${fixResult.backupPath} (Backup)`);
      } else {
        console.log('🎉 No duplicate routes found! Your routes are clean.');
      }
      
    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const routesFile = process.argv[2] || 'server/routes.ts';
  
  if (!fs.existsSync(routesFile)) {
    console.error(`❌ Routes file not found: ${routesFile}`);
    console.log('\nUsage: node fix-duplicate-routes.js [path-to-routes-file]');
    process.exit(1);
  }
  
  const fixer = new DuplicateRouteFixer(routesFile);
  fixer.run();
}

module.exports = DuplicateRouteFixer; 
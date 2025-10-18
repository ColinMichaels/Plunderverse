/**
 * Test Reporter Utilities
 * Generates reports in multiple formats with comprehensive statistics
 */

import { TestResult, TestSuiteResult } from './testRunner';

export type ReportFormat = 'console' | 'html' | 'csv' | 'json' | 'markdown';

export interface ReportOptions {
  format?: ReportFormat;
  includeDetails?: boolean;
  includePerformance?: boolean;
  includeErrors?: boolean;
  includeWarnings?: boolean;
  includeSkipped?: boolean;
  groupByCategory?: boolean;
  sortBy?: 'name' | 'status' | 'duration';
  outputFile?: string;
  theme?: 'light' | 'dark';
}

export interface TestStatistics {
  totalTests: number;
  totalSuites: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  successRate: number;
  avgDuration: number;
  totalDuration: number;
  slowestTest: string;
  fastestTest: string;
  memoryUsage: number;
  timestamp: number;
}

/**
 * Test Reporter Class
 */
export class TestReporter {
  private results: TestSuiteResult[] = [];
  private options: ReportOptions;
  private startTime: number = Date.now();

  constructor(options: ReportOptions = {}) {
    this.options = {
      format: 'console',
      includeDetails: true,
      includePerformance: true,
      includeErrors: true,
      includeWarnings: true,
      includeSkipped: false,
      groupByCategory: true,
      sortBy: 'status',
      theme: 'dark',
      ...options
    };
  }

  /**
   * Add test suite results
   */
  addSuiteResults(results: TestSuiteResult) {
    this.results.push(results);
  }

  /**
   * Clear all results
   */
  clearResults() {
    this.results = [];
  }

  /**
   * Generate report in specified format
   */
  generateReport(format?: ReportFormat): string {
    const reportFormat = format || this.options.format || 'console';
    
    switch (reportFormat) {
      case 'console':
        return this.generateConsoleReport();
      case 'html':
        return this.generateHTMLReport();
      case 'csv':
        return this.generateCSVReport();
      case 'json':
        return this.generateJSONReport();
      case 'markdown':
        return this.generateMarkdownReport();
      default:
        return this.generateConsoleReport();
    }
  }

  /**
   * Console Report (colored output)
   */
  private generateConsoleReport(): string {
    const stats = this.calculateStatistics();
    const lines: string[] = [];
    
    // Header
    lines.push('\n' + '═'.repeat(80));
    lines.push('                         TEST RESULTS SUMMARY');
    lines.push('═'.repeat(80));
    
    // Overall Statistics
    lines.push('\n📊 OVERALL STATISTICS');
    lines.push('─'.repeat(40));
    lines.push(`Total Suites:    ${stats.totalSuites}`);
    lines.push(`Total Tests:     ${stats.totalTests}`);
    lines.push(`✅ Passed:       ${stats.passed} (${(stats.passed / stats.totalTests * 100).toFixed(1)}%)`);
    lines.push(`❌ Failed:       ${stats.failed} (${(stats.failed / stats.totalTests * 100).toFixed(1)}%)`);
    lines.push(`⚠️  Warnings:     ${stats.warnings}`);
    lines.push(`⏭️  Skipped:      ${stats.skipped}`);
    lines.push(`Success Rate:    ${stats.successRate.toFixed(1)}%`);
    
    // Performance
    if (this.options.includePerformance) {
      lines.push('\n⚡ PERFORMANCE METRICS');
      lines.push('─'.repeat(40));
      lines.push(`Total Duration:  ${this.formatDuration(stats.totalDuration)}`);
      lines.push(`Avg Duration:    ${this.formatDuration(stats.avgDuration)}`);
      lines.push(`Slowest Test:    ${stats.slowestTest}`);
      lines.push(`Fastest Test:    ${stats.fastestTest}`);
      if (stats.memoryUsage > 0) {
        lines.push(`Memory Usage:    ${this.formatMemory(stats.memoryUsage)}`);
      }
    }
    
    // Test Results by Suite
    lines.push('\n📋 TEST RESULTS BY SUITE');
    lines.push('─'.repeat(40));
    
    for (const suite of this.results) {
      const suitePassed = suite.passed === suite.total;
      const icon = suitePassed ? '✅' : suite.failed > 0 ? '❌' : '⚠️';
      
      lines.push(`\n${icon} ${suite.name}`);
      lines.push(`   Tests: ${suite.passed}/${suite.total} passed | Duration: ${this.formatDuration(suite.duration)}`);
      
      if (this.options.includeDetails) {
        const sortedTests = this.sortTests(suite.tests);
        
        for (const test of sortedTests) {
          if (test.status === 'skipped' && !this.options.includeSkipped) continue;
          
          const statusIcon = this.getStatusIcon(test.status);
          const duration = test.duration > 0 ? `(${test.duration.toFixed(0)}ms)` : '';
          
          lines.push(`     ${statusIcon} ${test.name} ${duration}`);
          
          if (test.status === 'failed' && this.options.includeErrors && test.errors) {
            for (const error of test.errors) {
              lines.push(`        └─ ${error}`);
            }
          }
          
          if (test.status === 'warning' && this.options.includeWarnings && test.warnings) {
            for (const warning of test.warnings) {
              lines.push(`        └─ ${warning}`);
            }
          }
        }
      }
    }
    
    // Recommendations
    const recommendations = this.generateRecommendations(stats);
    if (recommendations.length > 0) {
      lines.push('\n💡 RECOMMENDATIONS');
      lines.push('─'.repeat(40));
      for (const rec of recommendations) {
        lines.push(`• ${rec}`);
      }
    }
    
    // Footer
    lines.push('\n' + '═'.repeat(80));
    lines.push(`Report generated at: ${new Date().toLocaleString()}`);
    lines.push('═'.repeat(80) + '\n');
    
    // Display in console with colors
    this.displayConsoleReport(lines);
    
    return lines.join('\n');
  }

  /**
   * HTML Report
   */
  private generateHTMLReport(): string {
    const stats = this.calculateStatistics();
    const isDark = this.options.theme === 'dark';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Results Report - ${new Date().toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      background: ${isDark ? '#0f172a' : '#f8fafc'};
      color: ${isDark ? '#e2e8f0' : '#1e293b'};
      padding: 2rem;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      background: ${isDark ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    .timestamp {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .stat-card {
      background: ${isDark ? '#1e293b' : 'white'};
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'};
      transition: transform 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'};
    }
    
    .stat-label {
      font-size: 0.875rem;
      opacity: 0.7;
      margin-bottom: 0.25rem;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
    }
    
    .stat-card.passed { border-left: 4px solid #22c55e; }
    .stat-card.failed { border-left: 4px solid #ef4444; }
    .stat-card.warning { border-left: 4px solid #f59e0b; }
    .stat-card.performance { border-left: 4px solid #3b82f6; }
    
    .suite-section {
      background: ${isDark ? '#1e293b' : 'white'};
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'};
    }
    
    .suite-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
    }
    
    .suite-name {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .suite-stats {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
    }
    
    .test-list {
      margin-top: 1rem;
    }
    
    .test-item {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      margin: 0.5rem 0;
      background: ${isDark ? '#0f172a' : '#f8fafc'};
      border-radius: 6px;
      transition: background 0.2s;
    }
    
    .test-item:hover {
      background: ${isDark ? '#334155' : '#e2e8f0'};
    }
    
    .status-icon {
      margin-right: 0.75rem;
      font-size: 1.25rem;
    }
    
    .test-name {
      flex: 1;
      font-weight: 500;
    }
    
    .test-duration {
      opacity: 0.7;
      font-size: 0.875rem;
    }
    
    .error-details {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #ef4444;
    }
    
    .chart-container {
      background: ${isDark ? '#1e293b' : 'white'};
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'};
    }
    
    .progress-bar {
      height: 30px;
      background: ${isDark ? '#334155' : '#e2e8f0'};
      border-radius: 15px;
      overflow: hidden;
      display: flex;
      margin: 1rem 0;
    }
    
    .progress-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.875rem;
    }
    
    .progress-passed { background: #22c55e; }
    .progress-failed { background: #ef4444; }
    .progress-warning { background: #f59e0b; }
    .progress-skipped { background: #64748b; }
    
    .recommendations {
      background: ${isDark ? '#1e293b' : 'white'};
      padding: 1.5rem;
      border-radius: 8px;
      margin-top: 2rem;
      border-left: 4px solid #3b82f6;
    }
    
    .recommendations h2 {
      margin-bottom: 1rem;
      color: #3b82f6;
    }
    
    .recommendations ul {
      list-style: none;
      padding-left: 0;
    }
    
    .recommendations li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
    }
    
    .recommendations li:before {
      content: "💡";
      position: absolute;
      left: 0;
    }
    
    footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 Test Results Report</h1>
      <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
    </header>
    
    <div class="stats-grid">
      <div class="stat-card passed">
        <div class="stat-label">Tests Passed</div>
        <div class="stat-value">${stats.passed}</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-label">Tests Failed</div>
        <div class="stat-value">${stats.failed}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">Warnings</div>
        <div class="stat-value">${stats.warnings}</div>
      </div>
      <div class="stat-card performance">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${stats.successRate.toFixed(1)}%</div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>Test Distribution</h2>
      <div class="progress-bar">
        ${stats.passed > 0 ? `<div class="progress-segment progress-passed" style="width: ${(stats.passed / stats.totalTests * 100)}%">${stats.passed}</div>` : ''}
        ${stats.failed > 0 ? `<div class="progress-segment progress-failed" style="width: ${(stats.failed / stats.totalTests * 100)}%">${stats.failed}</div>` : ''}
        ${stats.warnings > 0 ? `<div class="progress-segment progress-warning" style="width: ${(stats.warnings / stats.totalTests * 100)}%">${stats.warnings}</div>` : ''}
        ${stats.skipped > 0 ? `<div class="progress-segment progress-skipped" style="width: ${(stats.skipped / stats.totalTests * 100)}%">${stats.skipped}</div>` : ''}
      </div>
    </div>
    
    ${this.generateHTMLSuiteResults()}
    
    ${this.generateHTMLRecommendations(stats)}
    
    <footer>
      <p>Plunderverse Test Suite v1.0.0 | Total Duration: ${this.formatDuration(stats.totalDuration)}</p>
    </footer>
  </div>
  
  <script>
    // Add interactivity
    document.querySelectorAll('.test-item').forEach(item => {
      item.addEventListener('click', () => {
        const details = item.querySelector('.error-details');
        if (details) {
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
      });
    });
  </script>
</body>
</html>
    `;
    
    return html;
  }

  private generateHTMLSuiteResults(): string {
    let html = '';
    
    for (const suite of this.results) {
      const suitePassed = suite.passed === suite.total;
      const icon = suitePassed ? '✅' : suite.failed > 0 ? '❌' : '⚠️';
      
      html += `
        <div class="suite-section">
          <div class="suite-header">
            <div class="suite-name">${icon} ${suite.name}</div>
            <div class="suite-stats">
              <span>✅ ${suite.passed}</span>
              <span>❌ ${suite.failed}</span>
              <span>⚠️ ${suite.warnings}</span>
              <span>⏱️ ${this.formatDuration(suite.duration)}</span>
            </div>
          </div>
          <div class="test-list">
      `;
      
      const sortedTests = this.sortTests(suite.tests);
      for (const test of sortedTests) {
        if (test.status === 'skipped' && !this.options.includeSkipped) continue;
        
        const statusIcon = this.getStatusIcon(test.status);
        const duration = test.duration > 0 ? this.formatDuration(test.duration) : '';
        
        html += `
          <div class="test-item">
            <span class="status-icon">${statusIcon}</span>
            <span class="test-name">${test.name}</span>
            <span class="test-duration">${duration}</span>
          </div>
        `;
        
        if (test.status === 'failed' && test.errors && this.options.includeErrors) {
          html += `<div class="error-details">${test.errors.join('<br>')}</div>`;
        }
      }
      
      html += `
          </div>
        </div>
      `;
    }
    
    return html;
  }

  private generateHTMLRecommendations(stats: TestStatistics): string {
    const recommendations = this.generateRecommendations(stats);
    
    if (recommendations.length === 0) return '';
    
    return `
      <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * CSV Report
   */
  private generateCSVReport(): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Suite,Test,Status,Duration (ms),Memory (bytes),Errors,Warnings');
    
    // Data rows
    for (const suite of this.results) {
      for (const test of suite.tests) {
        const errors = test.errors ? test.errors.join('; ') : '';
        const warnings = test.warnings ? test.warnings.join('; ') : '';
        
        lines.push([
          suite.name,
          test.name,
          test.status,
          test.duration.toFixed(2),
          test.memory || '',
          errors,
          warnings
        ].map(v => `"${v}"`).join(','));
      }
    }
    
    return lines.join('\n');
  }

  /**
   * JSON Report
   */
  private generateJSONReport(): string {
    const stats = this.calculateStatistics();
    
    const report = {
      metadata: {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        duration: Date.now() - this.startTime
      },
      statistics: stats,
      suites: this.results,
      recommendations: this.generateRecommendations(stats)
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Markdown Report
   */
  private generateMarkdownReport(): string {
    const stats = this.calculateStatistics();
    const lines: string[] = [];
    
    // Header
    lines.push('# Test Results Report');
    lines.push(`> Generated on ${new Date().toLocaleString()}\n`);
    
    // Statistics
    lines.push('## 📊 Overall Statistics\n');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Tests | ${stats.totalTests} |`);
    lines.push(`| Passed | ${stats.passed} (${(stats.passed / stats.totalTests * 100).toFixed(1)}%) |`);
    lines.push(`| Failed | ${stats.failed} (${(stats.failed / stats.totalTests * 100).toFixed(1)}%) |`);
    lines.push(`| Warnings | ${stats.warnings} |`);
    lines.push(`| Skipped | ${stats.skipped} |`);
    lines.push(`| Success Rate | ${stats.successRate.toFixed(1)}% |`);
    lines.push(`| Total Duration | ${this.formatDuration(stats.totalDuration)} |`);
    lines.push(`| Average Duration | ${this.formatDuration(stats.avgDuration)} |`);
    lines.push('');
    
    // Test Results by Suite
    lines.push('## 📋 Test Results by Suite\n');
    
    for (const suite of this.results) {
      const suitePassed = suite.passed === suite.total;
      const icon = suitePassed ? '✅' : suite.failed > 0 ? '❌' : '⚠️';
      
      lines.push(`### ${icon} ${suite.name}`);
      lines.push(`> ${suite.passed}/${suite.total} tests passed | Duration: ${this.formatDuration(suite.duration)}\n`);
      
      if (this.options.includeDetails) {
        lines.push('| Test | Status | Duration |');
        lines.push('|------|--------|----------|');
        
        const sortedTests = this.sortTests(suite.tests);
        for (const test of sortedTests) {
          if (test.status === 'skipped' && !this.options.includeSkipped) continue;
          
          const statusIcon = this.getStatusIcon(test.status);
          const duration = test.duration > 0 ? `${test.duration.toFixed(0)}ms` : '-';
          
          lines.push(`| ${test.name} | ${statusIcon} | ${duration} |`);
        }
        lines.push('');
      }
    }
    
    // Recommendations
    const recommendations = this.generateRecommendations(stats);
    if (recommendations.length > 0) {
      lines.push('## 💡 Recommendations\n');
      for (const rec of recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Calculate overall statistics
   */
  private calculateStatistics(): TestStatistics {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let skipped = 0;
    let totalDuration = 0;
    let allDurations: number[] = [];
    let memoryUsage = 0;
    
    for (const suite of this.results) {
      totalTests += suite.total;
      passed += suite.passed;
      failed += suite.failed;
      warnings += suite.warnings;
      skipped += suite.skipped;
      totalDuration += suite.duration;
      
      for (const test of suite.tests) {
        if (test.duration > 0) {
          allDurations.push(test.duration);
        }
        if (test.memory) {
          memoryUsage += test.memory;
        }
      }
    }
    
    const avgDuration = allDurations.length > 0 
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length 
      : 0;
    
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    
    // Find slowest and fastest tests
    let slowestTest = '';
    let fastestTest = '';
    let maxDuration = 0;
    let minDuration = Infinity;
    
    for (const suite of this.results) {
      for (const test of suite.tests) {
        if (test.duration > maxDuration) {
          maxDuration = test.duration;
          slowestTest = `${suite.name}::${test.name} (${test.duration.toFixed(0)}ms)`;
        }
        if (test.duration > 0 && test.duration < minDuration) {
          minDuration = test.duration;
          fastestTest = `${suite.name}::${test.name} (${test.duration.toFixed(0)}ms)`;
        }
      }
    }
    
    return {
      totalTests,
      totalSuites: this.results.length,
      passed,
      failed,
      warnings,
      skipped,
      successRate,
      avgDuration,
      totalDuration,
      slowestTest,
      fastestTest,
      memoryUsage,
      timestamp: Date.now()
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(stats: TestStatistics): string[] {
    const recommendations: string[] = [];
    
    if (stats.successRate < 80) {
      recommendations.push(`Success rate is below 80% (${stats.successRate.toFixed(1)}%). Focus on fixing failing tests.`);
    }
    
    if (stats.avgDuration > 1000) {
      recommendations.push(`Average test duration is high (${this.formatDuration(stats.avgDuration)}). Consider optimizing slow tests.`);
    }
    
    if (stats.warnings > stats.totalTests * 0.1) {
      recommendations.push(`High number of warnings (${stats.warnings}). Review and address warning conditions.`);
    }
    
    if (stats.skipped > stats.totalTests * 0.2) {
      recommendations.push(`Many tests are being skipped (${stats.skipped}). Review skip conditions.`);
    }
    
    if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push(`High memory usage detected (${this.formatMemory(stats.memoryUsage)}). Check for memory leaks.`);
    }
    
    if (stats.totalDuration > 30000) { // 30 seconds
      recommendations.push(`Total test duration exceeds 30 seconds. Consider parallel execution or test optimization.`);
    }
    
    // Specific test recommendations
    for (const suite of this.results) {
      if (suite.failed > 0) {
        recommendations.push(`Fix failing tests in "${suite.name}" suite (${suite.failed} failures).`);
      }
      
      if (suite.performance && suite.performance.maxDuration > 5000) {
        recommendations.push(`Optimize slow tests in "${suite.name}" suite (max: ${this.formatDuration(suite.performance.maxDuration)}).`);
      }
    }
    
    return recommendations;
  }

  /**
   * Display console report with colors
   */
  private displayConsoleReport(lines: string[]) {
    for (const line of lines) {
      if (line.includes('═') || line.includes('─')) {
        console.log('%c' + line, 'color: #64748b');
      } else if (line.includes('✅')) {
        console.log('%c' + line, 'color: #22c55e; font-weight: bold');
      } else if (line.includes('❌')) {
        console.log('%c' + line, 'color: #ef4444; font-weight: bold');
      } else if (line.includes('⚠️')) {
        console.log('%c' + line, 'color: #f59e0b; font-weight: bold');
      } else if (line.includes('⏭️')) {
        console.log('%c' + line, 'color: #64748b');
      } else if (line.includes('📊') || line.includes('⚡') || line.includes('📋') || line.includes('💡')) {
        console.log('%c' + line, 'color: #3b82f6; font-weight: bold');
      } else if (line.includes('TEST RESULTS SUMMARY')) {
        console.log('%c' + line, 'color: #a855f7; font-size: 18px; font-weight: bold');
      } else {
        console.log(line);
      }
    }
  }

  /**
   * Helper methods
   */
  private sortTests(tests: TestResult[]): TestResult[] {
    const sorted = [...tests];
    
    switch (this.options.sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'duration':
        return sorted.sort((a, b) => b.duration - a.duration);
      case 'status':
      default:
        const statusOrder = { failed: 0, warning: 1, passed: 2, skipped: 3, running: 4 };
        return sorted.sort((a, b) => 
          statusOrder[a.status] - statusOrder[b.status]
        );
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'warning': return '⚠️';
      case 'skipped': return '⏭️';
      case 'running': return '⚡';
      default: return '❓';
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  /**
   * Export report to file (for browser download)
   */
  exportToFile(format: ReportFormat = 'html', filename?: string) {
    const report = this.generateReport(format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `test-report-${timestamp}.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : format === 'markdown' ? 'md' : 'html'}`;
    const finalFilename = filename || defaultFilename;
    
    const blob = new Blob([report], { 
      type: format === 'json' ? 'application/json' : 
            format === 'csv' ? 'text/csv' : 
            format === 'html' ? 'text/html' : 
            'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📁 Report exported to ${finalFilename}`);
  }
}
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';
import { EvaluationRecord } from './test-utils';

interface TerminalReporterOptions {
  outputDir?: string;
  showDetails?: boolean;
  interactive?: boolean;
  compact?: boolean;
  theme?: 'default' | 'minimal' | 'vibrant';
}

interface ThemeConfig {
  primary: (text: string) => string;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  muted: (text: string) => string;
  bold: (text: string) => string;
  dim: (text: string) => string;
}

const THEMES: Record<string, ThemeConfig> = {
  default: {
    primary: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.cyan,
    muted: chalk.gray,
    bold: chalk.bold,
    dim: chalk.dim,
  },
  minimal: {
    primary: chalk.white,
    success: chalk.white,
    error: chalk.white,
    warning: chalk.white,
    info: chalk.white,
    muted: chalk.gray,
    bold: chalk.bold,
    dim: chalk.dim,
  },
  vibrant: {
    primary: chalk.magenta.bold,
    success: chalk.green.bold,
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    info: chalk.cyan.bold,
    muted: chalk.gray,
    bold: chalk.bold,
    dim: chalk.dim,
  },
};

class TerminalReporter {
  private _globalConfig: any;
  private _options: TerminalReporterOptions;
  private outputDir: string;
  private theme: ThemeConfig;
  private spinner: any;

  constructor(globalConfig: any, options: TerminalReporterOptions = {}) {
    this._globalConfig = globalConfig;
    this._options = {
      showDetails: true,
      interactive: false,
      compact: false,
      theme: 'default',
      ...options,
    };
    this.outputDir = path.resolve(options.outputDir || 'jest-evaluation-results');
    this.theme = THEMES[this._options.theme || 'default'];

    if (global.evaluationRecords === undefined) {
      global.evaluationRecords = [];
    }
  }

  onRunStart(): void {
    if (this._options.interactive) {
      this.spinner = ora({
        text: this.theme.info('Initializing LLM evaluation...'),
        spinner: 'dots',
      }).start();
    }
  }

  onTestStart(test: any): void {
    if (this._options.interactive && this.spinner) {
      this.spinner.text = this.theme.info(`Evaluating: ${test.path}`);
    }
  }

  onRunComplete(contexts: any, results: any): void {
    if (this.spinner) {
      this.spinner.stop();
    }

    const evaluationRecords = global.evaluationRecords;
    if (!evaluationRecords || evaluationRecords.length === 0) {
      this.displayNoRecords();
      return;
    }

    this.displayHeader();
    this.displaySummary(evaluationRecords);
    
    if (this._options.showDetails) {
      this.displayDetailedResults(evaluationRecords);
    }

    this.displayFooter(evaluationRecords);

    // Still generate file reports
    this.generateFileReports(evaluationRecords);
  }

  private displayHeader(): void {
    console.log('\n');
    try {
      const titleText = figlet.textSync('LLM EVAL', {
        font: 'Small',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      });
      console.log(this.theme.primary(titleText));
    } catch (error) {
      console.log(this.theme.primary(this.theme.bold('🤖 LLM EVALUATION RESULTS')));
    }
    console.log(this.theme.muted('━'.repeat(80)));
  }

  private displaySummary(records: EvaluationRecord[]): void {
    const totalTests = records.length;
    const passedTests = records.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Calculate total tokens
    const totalTokens = records.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0);
    const avgDuration = totalTests > 0 ? Math.round(records.reduce((sum, r) => sum + r.durationMs, 0) / totalTests) : 0;

    const summaryData = [
      ['📊 Total Tests', this.theme.bold(totalTests.toString())],
      ['✅ Passed', this.theme.success(passedTests.toString())],
      ['❌ Failed', failedTests > 0 ? this.theme.error(failedTests.toString()) : this.theme.muted('0')],
      ['📈 Success Rate', this.formatSuccessRate(successRate)],
      ['⏱️  Avg Duration', this.theme.info(`${avgDuration}ms`)],
      ['🔢 Total Tokens', this.theme.info(totalTokens.toLocaleString())],
    ];

    const summaryTable = new Table({
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      },
      style: { 'padding-left': 2, 'padding-right': 2 },
      colWidths: [20, 20],
    });

    summaryData.forEach(([key, value]) => {
      summaryTable.push([key, value]);
    });

    console.log('\n' + this.theme.bold('📋 SUMMARY'));
    console.log(summaryTable.toString());
  }

  private displayDetailedResults(records: EvaluationRecord[]): void {
    console.log('\n' + this.theme.bold('📝 DETAILED RESULTS'));

    // Group by test path
    const groupedRecords = records.reduce((acc, record) => {
      const fileName = path.basename(record.testPath);
      if (!acc[fileName]) acc[fileName] = [];
      acc[fileName].push(record);
      return acc;
    }, {} as Record<string, EvaluationRecord[]>);

    Object.entries(groupedRecords).forEach(([fileName, fileRecords]) => {
      console.log(`\n${this.theme.primary('📁 ' + fileName)}`);
      
      fileRecords.forEach(record => {
        this.displayTestResult(record);
      });
    });
  }

  private displayTestResult(record: EvaluationRecord): void {
    const statusIcon = record.passed ? '✅' : '❌';
    const statusColor = record.passed ? this.theme.success : this.theme.error;
    const testHeader = `${statusIcon} ${statusColor(record.testName)}`;

    console.log(`\n  ${testHeader}`);
    console.log(`  ${this.theme.muted('ID:')} ${this.theme.dim(record.id)}`);
    console.log(`  ${this.theme.muted('Duration:')} ${this.theme.info(record.durationMs + 'ms')}`);
    console.log(`  ${this.theme.muted('Model:')} ${this.theme.info(record.modelId)}`);

    if (record.usage) {
      console.log(`  ${this.theme.muted('Tokens:')} ${this.theme.info(`${record.usage.totalTokens} (${record.usage.promptTokens}+${record.usage.completionTokens})`)}`);
    }

    // Display criteria results
    if (this._options.showDetails && !this._options.compact) {
      this.displayCriteriaTable(record);
    } else {
      // Compact view - just show failed criteria
      const failedCriteria = record.results.filter(r => !r.passed);
      if (failedCriteria.length > 0) {
        console.log(`  ${this.theme.error('Failed criteria:')} ${failedCriteria.map(c => c.id).join(', ')}`);
      }
    }
  }

  private displayCriteriaTable(record: EvaluationRecord): void {
    if (record.results.length === 0) return;

    const criteriaTable = new Table({
      head: [
        this.theme.bold('Criterion'),
        this.theme.bold('Status'),
        this.theme.bold('Description')
      ],
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      },
      style: { 'padding-left': 1, 'padding-right': 1 },
      colWidths: [15, 8, 40],
      wordWrap: true,
    });

    record.results.forEach(result => {
      const status = result.passed 
        ? this.theme.success('✓ PASS') 
        : this.theme.error('✗ FAIL');
      
      criteriaTable.push([
        this.theme.info(result.id),
        status,
        this.theme.muted(this.truncateText(result.description, 35))
      ]);
    });

    console.log('    ' + criteriaTable.toString().split('\n').join('\n    '));
  }

  private displayFooter(records: EvaluationRecord[]): void {
    const hasFailures = records.some(r => !r.passed);
    const footerColor = hasFailures ? this.theme.error : this.theme.success;
    const statusText = hasFailures ? 'SOME EVALUATIONS FAILED' : 'ALL EVALUATIONS PASSED';

    console.log('\n' + this.theme.muted('━'.repeat(80)));
    
    const footerBox = boxen(footerColor(this.theme.bold(statusText)), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: hasFailures ? 'red' : 'green',
      backgroundColor: hasFailures ? undefined : undefined,
    });

    console.log(footerBox);

    // Show file paths
    console.log(this.theme.muted('💾 Reports saved to:'));
    console.log(this.theme.info(`   HTML: ${path.join(this.outputDir, 'evaluation-overview.html')}`));
    console.log(this.theme.info(`   JSON: ${path.join(this.outputDir, 'evaluation-overview.json')}`));
    console.log('');
  }

  private displayNoRecords(): void {
    const message = boxen(
      this.theme.warning('No LLM evaluation records found!\n\n') +
      this.theme.muted('Make sure you\'re using the ') +
      this.theme.info('toPassAllCriteria') +
      this.theme.muted(' matcher in your tests.'),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
        title: '⚠️  No Evaluations',
        titleAlignment: 'center',
      }
    );
    console.log(message);
  }

  private formatSuccessRate(rate: number): string {
    const percentage = rate.toFixed(1) + '%';
    if (rate === 100) {
      return this.theme.success(percentage);
    } else if (rate >= 80) {
      return this.theme.warning(percentage);
    } else {
      return this.theme.error(percentage);
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private generateFileReports(records: EvaluationRecord[]): void {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Generate JSON report
      const jsonReport = {
        summary: {
          totalTests: records.length,
          passedTests: records.filter(r => r.passed).length,
          failedTests: records.filter(r => !r.passed).length,
          successRate: records.length > 0 ? (records.filter(r => r.passed).length / records.length) * 100 : 0,
          totalTokens: records.reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0),
          avgDuration: records.length > 0 ? Math.round(records.reduce((sum, r) => sum + r.durationMs, 0) / records.length) : 0,
        },
        records: records,
        generatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(this.outputDir, 'terminal-evaluation-report.json'),
        JSON.stringify(jsonReport, null, 2)
      );

    } catch (error) {
      console.log(this.theme.error('Failed to generate file reports:'), error);
    }
  }

  // Interactive methods for future enhancement
  displayInteractiveMenu(records: EvaluationRecord[]): void {
    // Future: Add interactive terminal navigation
    console.log(this.theme.info('\n🎮 Interactive mode coming soon!'));
    console.log(this.theme.muted('Features planned:'));
    console.log(this.theme.muted('  • Navigate through test results'));
    console.log(this.theme.muted('  • View full conversation details'));
    console.log(this.theme.muted('  • Filter by status or criteria'));
    console.log(this.theme.muted('  • Export specific results'));
  }

  displayConversationPreview(record: EvaluationRecord): void {
    console.log(`\n${this.theme.bold('💬 Conversation Preview')} (${record.testName})`);
    
    const maxMessages = 4;
    const messages = record.conversation.slice(0, maxMessages);
    
    messages.forEach((msg: any, index: number) => {
      const roleColor = msg.role === 'user' ? this.theme.primary : this.theme.success;
      const content = typeof msg.content === 'string' 
        ? this.truncateText(msg.content, 60)
        : '[Complex content]';
      
      console.log(`  ${roleColor(msg.role.toUpperCase())}: ${this.theme.muted(content)}`);
    });

    if (record.conversation.length > maxMessages) {
      console.log(`  ${this.theme.dim(`... and ${record.conversation.length - maxMessages} more messages`)}`);
    }
  }
}

export default TerminalReporter;
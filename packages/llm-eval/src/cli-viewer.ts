#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import { EvaluationRecord } from './test-utils';

interface CLIOptions {
  reportPath?: string;
  theme?: 'default' | 'minimal' | 'vibrant';
  filter?: 'all' | 'passed' | 'failed';
  details?: boolean;
  interactive?: boolean;
}

type ChalkStyle = (text: string) => string;

interface Theme {
  primary: ChalkStyle;
  success: ChalkStyle;
  error: ChalkStyle;
  warning: ChalkStyle;
  info: ChalkStyle;
  muted: ChalkStyle;
  bold: ChalkStyle;
  dim: ChalkStyle;
}

interface ReportData {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    avgDuration: number;
    totalTokens: number;
  };
  records: EvaluationRecord[];
}

class CLIViewer {
  private options: CLIOptions;
  private theme: Theme;

  constructor(options: CLIOptions = {}) {
    this.options = {
      reportPath: 'jest-evaluation-results/terminal-evaluation-report.json',
      theme: 'default',
      filter: 'all',
      details: true,
      ...options,
    };

    // Initialize theme
    this.theme = {
      primary: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.cyan,
      muted: chalk.gray,
      bold: chalk.bold,
      dim: chalk.dim,
    };

    if (this.options.theme === 'vibrant') {
      this.theme = {
        primary: chalk.magenta.bold,
        success: chalk.green.bold,
        error: chalk.red.bold,
        warning: chalk.yellow.bold,
        info: chalk.cyan.bold,
        muted: chalk.gray,
        bold: chalk.bold,
        dim: chalk.dim,
      };
    } else if (this.options.theme === 'minimal') {
      this.theme = {
        primary: chalk.white,
        success: chalk.white,
        error: chalk.white,
        warning: chalk.white,
        info: chalk.white,
        muted: chalk.gray,
        bold: chalk.bold,
        dim: chalk.dim,
      };
    }
  }

  async run(): Promise<void> {
    try {
      const reportData = this.loadReport();
      if (!reportData) {
        this.displayNoReport();
        return;
      }

      this.displayHeader();
      this.displaySummary(reportData.summary);

      if (this.options.details) {
        this.displayRecords(reportData.records);
      }

      this.displayFooter();
    } catch (error) {
      this.displayError(error as Error);
    }
  }

  private loadReport(): ReportData | null {
    const reportPath = path.resolve(this.options.reportPath!);

    if (!fs.existsSync(reportPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(reportPath, 'utf8');
      return JSON.parse(data) as ReportData;
    } catch (error) {
      throw new Error(`Failed to parse report file: ${error}`);
    }
  }

  private displayHeader(): void {
    console.log('\n');
    console.log(
      this.theme.primary(this.theme.bold('🤖 LLM EVALUATION REPORT VIEWER'))
    );
    console.log(this.theme.muted('━'.repeat(60)));
  }

  private displaySummary(summary: ReportData['summary']): void {
    const summaryTable = new Table({
      chars: {
        top: '─',
        'top-mid': '┬',
        'top-left': '┌',
        'top-right': '┐',
        bottom: '─',
        'bottom-mid': '┴',
        'bottom-left': '└',
        'bottom-right': '┘',
        left: '│',
        'left-mid': '├',
        mid: '─',
        'mid-mid': '┼',
        right: '│',
        'right-mid': '┤',
        middle: '│',
      },
      style: { 'padding-left': 2, 'padding-right': 2 },
    });

    summaryTable.push(
      ['📊 Total Tests', this.theme.bold(summary.totalTests.toString())],
      ['✅ Passed', this.theme.success(summary.passedTests.toString())],
      [
        '❌ Failed',
        summary.failedTests > 0
          ? this.theme.error(summary.failedTests.toString())
          : this.theme.muted('0'),
      ],
      ['📈 Success Rate', this.formatSuccessRate(summary.successRate)],
      ['⏱️  Avg Duration', this.theme.info(`${summary.avgDuration}ms`)],
      ['🔢 Total Tokens', this.theme.info(summary.totalTokens.toLocaleString())]
    );

    console.log('\n' + this.theme.bold('📋 SUMMARY'));
    console.log(summaryTable.toString());
  }

  private displayRecords(records: EvaluationRecord[]): void {
    let filteredRecords = records;

    // Apply filter
    if (this.options.filter === 'passed') {
      filteredRecords = records.filter(r => r.passed);
    } else if (this.options.filter === 'failed') {
      filteredRecords = records.filter(r => !r.passed);
    }

    if (filteredRecords.length === 0) {
      console.log(
        `\n${this.theme.muted('No records match the filter: ' + this.options.filter)}`
      );
      return;
    }

    console.log(
      `\n${this.theme.bold('📝 DETAILED RESULTS')} ${this.theme.muted(`(${filteredRecords.length} records)`)}`
    );

    const recordsTable = new Table({
      head: [
        this.theme.bold('Test Name'),
        this.theme.bold('Status'),
        this.theme.bold('Duration'),
        this.theme.bold('Tokens'),
        this.theme.bold('Model'),
      ],
      chars: {
        top: '─',
        'top-mid': '┬',
        'top-left': '┌',
        'top-right': '┐',
        bottom: '─',
        'bottom-mid': '┴',
        'bottom-left': '└',
        'bottom-right': '┘',
        left: '│',
        'left-mid': '├',
        mid: '─',
        'mid-mid': '┼',
        right: '│',
        'right-mid': '┤',
        middle: '│',
      },
      style: { 'padding-left': 1, 'padding-right': 1 },
      colWidths: [30, 10, 10, 10, 15],
      wordWrap: true,
    });

    filteredRecords.forEach(record => {
      const status = record.passed
        ? this.theme.success('✓ PASS')
        : this.theme.error('✗ FAIL');

      recordsTable.push([
        this.truncateText(record.testName, 28),
        status,
        this.theme.info(`${record.durationMs}ms`),
        this.theme.info(record.usage?.totalTokens?.toString() || 'N/A'),
        this.theme.muted(this.truncateText(record.modelId, 13)),
      ]);
    });

    console.log(recordsTable.toString());

    // Show failed criteria for failed tests
    const failedRecords = filteredRecords.filter(r => !r.passed);
    if (failedRecords.length > 0 && this.options.details) {
      console.log(`\n${this.theme.error('❌ FAILURE DETAILS')}`);
      failedRecords.forEach(record => {
        const failedCriteria = record.results.filter(r => !r.passed);
        if (failedCriteria.length > 0) {
          console.log(`\n  ${this.theme.bold(record.testName)}:`);
          failedCriteria.forEach(criterion => {
            console.log(
              `    • ${this.theme.error(criterion.id)}: ${this.theme.muted(criterion.description)}`
            );
          });
        }
      });
    }
  }

  private displayFooter(): void {
    console.log('\n' + this.theme.muted('━'.repeat(60)));
    console.log(this.theme.dim('Use --help for more options'));
    console.log('');
  }

  private displayNoReport(): void {
    const message = boxen(
      this.theme.warning('No evaluation report found!\n\n') +
        this.theme.muted('Expected location: ') +
        this.theme.info(this.options.reportPath!) +
        '\n\n' +
        this.theme.muted(
          'Run your Jest tests with the terminal reporter first.'
        ),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
        title: '📄 Report Not Found',
        titleAlignment: 'center',
      }
    );
    console.log(message);
  }

  private displayError(error: Error): void {
    const message = boxen(
      this.theme.error('Error loading report:\n\n') +
        this.theme.muted(error.message),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: '❌ Error',
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
}

// CLI Interface
function showHelp(): void {
  console.log(`
${chalk.bold('LLM Evaluation Report Viewer')}

${chalk.yellow('Usage:')}
  npx jest-llm-eval view [options]

${chalk.yellow('Options:')}
  --report-path <path>     Path to the JSON report file
  --theme <theme>          Theme: default, minimal, vibrant
  --filter <filter>        Filter: all, passed, failed
  --no-details            Hide detailed results
  --help                  Show this help message

${chalk.yellow('Examples:')}
  npx jest-llm-eval view
  npx jest-llm-eval view --filter failed --theme vibrant
  npx jest-llm-eval view --report-path ./custom/report.json
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const options: CLIOptions = {};
  if (args.includes('--report-path')) {
    const index = args.indexOf('--report-path');
    options.reportPath = args[index + 1];
  }
  if (args.includes('--theme')) {
    const index = args.indexOf('--theme');
    options.theme = args[index + 1] as CLIOptions['theme'];
  }
  if (args.includes('--filter')) {
    const index = args.indexOf('--filter');
    options.filter = args[index + 1] as CLIOptions['filter'];
  }
  if (args.includes('--no-details')) {
    options.details = false;
  }

  const viewer = new CLIViewer(options);
  await viewer.run();
}

// Export for programmatic use
export { CLIViewer };

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('An unexpected error occurred:'), error);
    process.exit(1);
  });
}

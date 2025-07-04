import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import ora, { Ora } from 'ora';
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

// Minimal model message type
interface ModelMessage {
  role: string;
  content: string | object;
}

class TerminalReporter {
  private _globalConfig: object;
  private _options: TerminalReporterOptions;
  private outputDir: string;
  private theme: ThemeConfig;
  private spinner: Ora | undefined;
  private terminalWidth: number;

  constructor(globalConfig: object, options: TerminalReporterOptions = {}) {
    this._globalConfig = globalConfig;
    this._options = {
      showDetails: true,
      interactive: false,
      compact: false,
      theme: 'default',
      ...options,
    };
    this.outputDir = path.resolve(
      options.outputDir || 'jest-evaluation-results'
    );
    this.theme = THEMES[this._options.theme || 'default'];
    this.terminalWidth = Math.min(process.stdout.columns || 80, 120);

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

  onTestStart(test: { path: string }): void {
    if (this._options.interactive && this.spinner) {
      this.spinner.text = this.theme.info(`Evaluating: ${test.path}`);
    }
  }

  onRunComplete(): void {
    if (this.spinner) {
      this.spinner.stop();
    }

    const evaluationRecords = global.evaluationRecords;
    if (!evaluationRecords || evaluationRecords.length === 0) {
      this.displayNoRecords();
      return;
    }

    // Enhanced visual hierarchy display
    this.displayHeader();
    this.displaySummaryDashboard(evaluationRecords);

    if (this._options.showDetails) {
      this.displayDetailedResults(evaluationRecords);
    }

    this.displayFooter(evaluationRecords);
    this.generateFileReports(evaluationRecords);
  }

  private displayHeader(): void {
    console.log('\n');
    
    // Create a centered header box
    const headerBox = boxen(
      this.theme.primary(this.theme.bold('🤖 LLM EVALUATION RESULTS')),
      {
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'double',
        borderColor: 'blue',
        align: 'center',
        width: this.terminalWidth,
      }
    );
    
    console.log(headerBox);
  }

  private displaySectionHeader(title: string, emoji: string, subtitle?: string): void {
    const decorativeLine = '─'.repeat(this.terminalWidth - 2);
    console.log('\n' + this.theme.muted('┌' + decorativeLine + '┐'));
    
    const headerText = `${emoji} ${this.theme.bold(title)}`;
    const padding = ' '.repeat(Math.max(0, this.terminalWidth - headerText.length - 4));
    console.log(this.theme.muted('│ ') + headerText + padding + this.theme.muted(' │'));
    
    if (subtitle) {
      const subtitleText = this.theme.dim(subtitle);
      const subtitlePadding = ' '.repeat(Math.max(0, this.terminalWidth - subtitle.length - 4));
      console.log(this.theme.muted('│ ') + subtitleText + subtitlePadding + this.theme.muted(' │'));
    }
    
    console.log(this.theme.muted('└' + decorativeLine + '┘'));
  }

  private displaySummaryDashboard(records: EvaluationRecord[]): void {
    this.displaySectionHeader('SUMMARY DASHBOARD', '📊', 'Overall evaluation metrics');

    const totalTests = records.length;
    const passedTests = records.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Calculate metrics
    const totalTokens = records.reduce(
      (sum, r) => sum + (r.usage?.totalTokens || 0),
      0
    );
    const avgDuration =
      totalTests > 0
        ? Math.round(
            records.reduce((sum, r) => sum + r.durationMs, 0) / totalTests
          )
        : 0;

    // Create visual progress bar for success rate
    const progressBar = this.createProgressBar(passedTests, totalTests);

    // Create a comprehensive dashboard with enhanced styling
    const dashboardTable = new Table({
      chars: {
        top: '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
        bottom: '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
        left: '║', 'left-mid': '╟', mid: '─', 'mid-mid': '┼',
        right: '║', 'right-mid': '╢', middle: '│'
      },
      style: { 
        'padding-left': 2, 
        'padding-right': 2,
        head: ['cyan', 'bold'],
        border: ['blue'],
        compact: false
      },
      colWidths: [30, 35],
      wordWrap: true
    });

    // Add dashboard rows with enhanced formatting
    dashboardTable.push(
      [this.theme.bold('🎯 Success Rate'), this.formatSuccessRateWithBar(successRate, progressBar)],
      [this.theme.bold('📈 Tests Overview'), this.formatTestsOverview(passedTests, failedTests, totalTests)],
      [this.theme.bold('⏱️  Performance'), this.formatPerformanceMetrics(avgDuration, totalTokens)],
      [this.theme.bold('🏷️  Model Usage'), this.formatModelUsage(records)]
    );

    console.log(dashboardTable.toString());
  }

  private createProgressBar(current: number, total: number): string {
    const width = 20;
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `${filledBar}${emptyBar} ${percentage}%`;
  }

  private formatSuccessRateWithBar(rate: number, progressBar: string): string {
    const rateText = rate.toFixed(1) + '%';
    const coloredRate = this.formatSuccessRate(rate);
    
    return `${coloredRate}\n${this.theme.muted(progressBar)}`;
  }

  private formatTestsOverview(passed: number, failed: number, total: number): string {
    const passedText = this.theme.success(`✅ ${passed} passed`);
    const failedText = failed > 0 ? this.theme.error(`❌ ${failed} failed`) : this.theme.muted('❌ 0 failed');
    const totalText = this.theme.info(`📊 ${total} total`);
    
    return `${passedText}\n${failedText}\n${totalText}`;
  }

  private formatPerformanceMetrics(avgDuration: number, totalTokens: number): string {
    const durationText = this.theme.info(`${avgDuration}ms avg`);
    const tokensText = this.theme.info(`${totalTokens.toLocaleString()} tokens`);
    const costEstimate = this.estimateCost(totalTokens);
    const costText = this.theme.muted(`~$${costEstimate} est.`);
    
    return `${durationText}\n${tokensText}\n${costText}`;
  }

  private formatModelUsage(records: EvaluationRecord[]): string {
    const modelCounts = records.reduce((acc, r) => {
      acc[r.modelId] = (acc[r.modelId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const modelEntries = Object.entries(modelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Top 3 models
    
    return modelEntries
      .map(([model, count]) => `${this.theme.info(model)}: ${count}`)
      .join('\n');
  }

  private estimateCost(totalTokens: number): string {
    // Rough estimate based on GPT-4 pricing
    const costPer1kTokens = 0.03;
    const estimatedCost = (totalTokens / 1000) * costPer1kTokens;
    return estimatedCost.toFixed(4);
  }

  private displayDetailedResults(records: EvaluationRecord[]): void {
    this.displaySectionHeader('DETAILED RESULTS', '📝', 'Individual test evaluation results');

    // Group by test path with enhanced visual separation
    const groupedRecords = records.reduce(
      (acc, record) => {
        const fileName = path.basename(record.testPath);
        if (!acc[fileName]) acc[fileName] = [];
        acc[fileName].push(record);
        return acc;
      },
      {} as Record<string, EvaluationRecord[]>
    );

    Object.entries(groupedRecords).forEach(([fileName, fileRecords], index) => {
      // File header with enhanced styling
      const fileHeader = boxen(
        `📁 ${this.theme.primary(this.theme.bold(fileName))}`,
        {
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          margin: { top: 1, bottom: 0, left: 2, right: 2 },
          borderStyle: 'single',
          borderColor: 'blue',
          backgroundColor: 'blue',
          dimBorder: true
        }
      );
      
      console.log(fileHeader);

      fileRecords.forEach((record, recordIndex) => {
        this.displayTestResult(record, recordIndex === fileRecords.length - 1);
      });
    });
  }

  private displayTestResult(record: EvaluationRecord, isLast: boolean = false): void {
    const statusIcon = record.passed ? '✅' : '❌';
    const statusColor = record.passed ? this.theme.success : this.theme.error;
    const connectionChar = isLast ? '└' : '├';
    const continueChar = isLast ? ' ' : '│';
    
    // Test result header with tree-like structure
    console.log(`\n    ${this.theme.muted(connectionChar + '──')} ${statusIcon} ${statusColor(this.theme.bold(record.testName))}`);
    
    // Metadata in a more structured format
    const metadata = [
      ['Duration', `${record.durationMs}ms`],
      ['Model', record.modelId],
      ['Tokens', record.usage ? `${record.usage.totalTokens} (${record.usage.promptTokens}+${record.usage.completionTokens})` : 'N/A'],
      ['ID', record.id.substring(0, 8) + '...']
    ];
    
    metadata.forEach(([key, value], index) => {
      const isLastMetadata = index === metadata.length - 1;
      const metaChar = isLastMetadata && !this._options.showDetails ? '└' : '├';
      console.log(`    ${this.theme.muted(continueChar + '   ' + metaChar + '── ' + key + ':')} ${this.theme.info(value)}`);
    });

    // Display criteria results with enhanced formatting
    if (this._options.showDetails && !this._options.compact) {
      this.displayCriteriaTable(record, continueChar);
    } else {
      // Compact view - just show failed criteria
      const failedCriteria = record.results.filter(r => !r.passed);
      if (failedCriteria.length > 0) {
        console.log(
          `    ${this.theme.muted(continueChar + '   └── Failed:')} ${this.theme.error(failedCriteria.map(c => c.id).join(', '))}`
        );
      }
    }
  }

  private displayCriteriaTable(record: EvaluationRecord, continueChar: string): void {
    if (record.results.length === 0) return;

    console.log(`    ${this.theme.muted(continueChar + '   └── Criteria Results:')}`);

    // Compact inline format instead of table
    record.results.forEach((result, index) => {
      const statusIcon = result.passed ? '✅' : '❌';
      const criterionName = this.theme.info(this.theme.bold(result.id));
      const description = this.theme.muted(`(${result.description})`);
      
      // Use a simple bullet point format
      const bullet = index === record.results.length - 1 ? '└─' : '├─';
      console.log(`        ${this.theme.muted(bullet)} ${statusIcon} ${criterionName} ${description}`);
    });
  }



  // Add a method to create enhanced summary tables for different data types
  private createEnhancedTable(
    data: Array<[string, string]>,
    title?: string,
    style: 'dashboard' | 'data' | 'compact' = 'data'
  ) {
    const tableConfigs = {
      dashboard: {
        chars: {
          top: '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
          bottom: '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
          left: '║', 'left-mid': '╟', mid: '─', 'mid-mid': '┼',
          right: '║', 'right-mid': '╢', middle: '│'
        },
        style: { 'padding-left': 2, 'padding-right': 2, head: ['cyan', 'bold'], border: ['blue'] },
        colWidths: [30, 35]
      },
      data: {
        chars: {
          top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
          bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
          left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
          right: '│', 'right-mid': '┤', middle: '│'
        },
        style: { 'padding-left': 2, 'padding-right': 2, head: ['cyan'], border: ['white'] },
        colWidths: [25, 30]
      },
      compact: {
        chars: {
          top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
          bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
          left: '', 'left-mid': '', mid: '', 'mid-mid': '',
          right: '', 'right-mid': '', middle: ' │ '
        },
        style: { 'padding-left': 1, 'padding-right': 1, head: [], border: [] },
        colWidths: [20, 25]
      }
    };

    const config = tableConfigs[style];
    const table = new Table({
      ...config,
      head: title ? [this.theme.bold(title), ''] : undefined,
      wordWrap: true
    });

    data.forEach(([key, value]) => {
      table.push([key, value]);
    });

    return table;
  }

  // Enhanced method to create comparison tables
  private createComparisonTable(
    records: EvaluationRecord[],
    title: string = 'Test Comparison'
  ): void {
    if (records.length <= 1) return;

    console.log(`\n${this.theme.bold('📊 ' + title)}`);

    const comparisonTable = new Table({
      head: [
        this.theme.bold('Test'),
        this.theme.bold('Status'),
        this.theme.bold('Duration'),
        this.theme.bold('Tokens'),
        this.theme.bold('Model')
      ],
      chars: {
        top: '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
        bottom: '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
        left: '║', 'left-mid': '╟', mid: '─', 'mid-mid': '┼',
        right: '║', 'right-mid': '╢', middle: '│'
      },
      style: {
        'padding-left': 1,
        'padding-right': 1,
        head: ['cyan', 'bold'],
        border: ['blue']
      },
      colWidths: [25, 8, 10, 12, 15],
      wordWrap: true
    });

    records.forEach(record => {
      const statusIcon = record.passed ? '✅' : '❌';
      const truncatedName = this.truncateText(record.testName, 22);
      const tokens = record.usage?.totalTokens || 0;
      const model = this.truncateText(record.modelId, 12);

      comparisonTable.push([
        this.theme.info(truncatedName),
        statusIcon,
        this.theme.muted(`${record.durationMs}ms`),
        this.theme.muted(tokens.toString()),
        this.theme.muted(model)
      ]);
    });

    console.log(comparisonTable.toString());
  }

  // Enhanced method to display model performance breakdown
  private displayModelPerformanceTable(records: EvaluationRecord[]): void {
    const modelStats = records.reduce((acc, record) => {
      const model = record.modelId;
      if (!acc[model]) {
        acc[model] = {
          total: 0,
          passed: 0,
          failed: 0,
          totalDuration: 0,
          totalTokens: 0
        };
      }
      
      acc[model].total++;
      if (record.passed) {
        acc[model].passed++;
      } else {
        acc[model].failed++;
      }
      acc[model].totalDuration += record.durationMs;
      acc[model].totalTokens += record.usage?.totalTokens || 0;
      
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(modelStats).length <= 1) return;

    console.log(`\n${this.theme.bold('🤖 Model Performance Breakdown')}`);

    const modelTable = new Table({
      head: [
        this.theme.bold('Model'),
        this.theme.bold('Success Rate'),
        this.theme.bold('Avg Duration'),
        this.theme.bold('Avg Tokens'),
        this.theme.bold('Total Tests')
      ],
      chars: {
        top: '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
        bottom: '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
        left: '║', 'left-mid': '╟', mid: '─', 'mid-mid': '┼',
        right: '║', 'right-mid': '╢', middle: '│'
      },
      style: {
        'padding-left': 2,
        'padding-right': 2,
        head: ['cyan', 'bold'],
        border: ['blue']
      },
      colWidths: [20, 15, 12, 12, 12],
      wordWrap: true
    });

    Object.entries(modelStats).forEach(([model, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const avgDuration = Math.round(stats.totalDuration / stats.total);
      const avgTokens = Math.round(stats.totalTokens / stats.total);
      
      const rateColor = parseFloat(successRate) === 100 ? this.theme.success : 
                       parseFloat(successRate) >= 80 ? this.theme.warning : this.theme.error;

      modelTable.push([
        this.theme.info(this.truncateText(model, 18)),
        rateColor(`${successRate}%`),
        this.theme.muted(`${avgDuration}ms`),
        this.theme.muted(avgTokens.toString()),
        this.theme.muted(stats.total.toString())
      ]);
    });

    console.log(modelTable.toString());
  }

  private displayFooter(records: EvaluationRecord[]): void {
    const hasFailures = records.some(r => !r.passed);
    
    // Create a prominent footer section
    this.displaySectionHeader('EVALUATION COMPLETE', '🎉', 'Final status and report locations');
    
    // Status summary box
    const statusText = hasFailures ? 'SOME EVALUATIONS FAILED' : 'ALL EVALUATIONS PASSED';
    const statusColor = hasFailures ? this.theme.error : this.theme.success;
    const statusIcon = hasFailures ? '⚠️' : '✅';
    
    const statusBox = boxen(
      `${statusIcon} ${statusColor(this.theme.bold(statusText))}`,
      {
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'double',
        borderColor: hasFailures ? 'red' : 'green',
        align: 'center',
        width: this.terminalWidth,
      }
    );

    console.log(statusBox);

    // Report locations with enhanced formatting
    const reportBox = boxen(
      `${this.theme.bold('📄 Reports Generated')}\n\n` +
      `${this.theme.info('HTML:')} ${this.theme.dim(path.join(this.outputDir, 'evaluation-overview.html'))}\n` +
      `${this.theme.info('JSON:')} ${this.theme.dim(path.join(this.outputDir, 'evaluation-overview.json'))}`,
      {
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'single',
        borderColor: 'cyan',
        title: '💾 Output Files',
        titleAlignment: 'center',
      }
    );

    console.log(reportBox);
  }

  private displayNoRecords(): void {
    const message = boxen(
      `${this.theme.warning('⚠️  No LLM evaluation records found!')}\n\n` +
        `${this.theme.muted("Make sure you're using the ")} ${this.theme.info('toPassAllCriteria')} ${this.theme.muted('matcher in your tests.')}\n\n` +
        `${this.theme.dim('Example:')}\n` +
        `${this.theme.dim('expect(response).toPassAllCriteria(criteria);')}`,
      {
        padding: { top: 2, bottom: 2, left: 3, right: 3 },
        margin: { top: 2, bottom: 2, left: 0, right: 0 },
        borderStyle: 'double',
        borderColor: 'yellow',
        title: '🔍 No Evaluations Found',
        titleAlignment: 'center',
        width: this.terminalWidth,
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
          successRate:
            records.length > 0
              ? (records.filter(r => r.passed).length / records.length) * 100
              : 0,
          totalTokens: records.reduce(
            (sum, r) => sum + (r.usage?.totalTokens || 0),
            0
          ),
          avgDuration:
            records.length > 0
              ? Math.round(
                  records.reduce((sum, r) => sum + r.durationMs, 0) /
                    records.length
                )
              : 0,
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
  displayInteractiveMenu(): void {
    // Future: Add interactive terminal navigation
    console.log(this.theme.info('\n🎮 Interactive mode coming soon!'));
    console.log(this.theme.muted('Features planned:'));
    console.log(this.theme.muted('  • Navigate through test results'));
    console.log(this.theme.muted('  • View full conversation details'));
    console.log(this.theme.muted('  • Filter by status or criteria'));
    console.log(this.theme.muted('  • Export specific results'));
  }

  displayConversationPreview(record: EvaluationRecord): void {
    console.log(
      `\n${this.theme.bold('💬 Conversation Preview')} (${record.testName})`
    );
    const maxMessages = 4;
    const messages = record.conversation.slice(
      0,
      maxMessages
    ) as ModelMessage[];
    messages.forEach(msg => {
      const roleColor =
        msg.role === 'user' ? this.theme.primary : this.theme.success;
      const content =
        typeof msg.content === 'string'
          ? this.truncateText(msg.content, 60)
          : '[Complex content]';
      console.log(
        `  ${roleColor(msg.role.toUpperCase())}: ${this.theme.muted(content)}`
      );
    });
    if (record.conversation.length > maxMessages) {
      console.log(
        `  ${this.theme.dim(`... and ${record.conversation.length - maxMessages} more messages`)}`
      );
    }
  }
}

export default TerminalReporter;

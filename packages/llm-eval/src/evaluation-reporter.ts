import * as fs from 'fs';
import * as path from 'path';
import { EvaluationRecord } from './test-utils';

interface EvaluationReporterOptions {
  outputDir?: string;
}

class EvaluationReporter {
  private _globalConfig: any;
  private _options: EvaluationReporterOptions;
  private outputDir: string;

  constructor(globalConfig: any, options: EvaluationReporterOptions) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.outputDir = path.resolve(options.outputDir || 'jest-evaluation-results');

    if (global.evaluationRecords === undefined) {
      global.evaluationRecords = [];
    }
  }

  onRunComplete(contexts: any, results: any): void {
    const evaluationRecords = global.evaluationRecords;
    if (!evaluationRecords || evaluationRecords.length === 0) {
      console.log('\nNo evaluation records found to generate a report.');
      return;
    }
    console.log(`\nGenerating evaluation report with ${evaluationRecords.length} record(s)...`);

    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      const resultsSubDir = path.join(this.outputDir, 'details');
      if (!fs.existsSync(resultsSubDir)) {
          fs.mkdirSync(resultsSubDir, { recursive: true });
      }

      this.generateJsonOutput(evaluationRecords, resultsSubDir);
      this.generateHtmlOutput(evaluationRecords, resultsSubDir);

      console.log(`\nJest Evaluation Report generated at: ${this.outputDir}`);
    } catch (error) {
      console.error('Error generating Jest Evaluation Report:', error);
    }
  }

  private generateJsonOutput(records: EvaluationRecord[], resultsSubDir: string): void {
    const overviewJsonPath = path.join(this.outputDir, 'evaluation-overview.json');
    const overviewData = records.map(r => ({
      id: r.id,
      testName: r.testName,
      testPath: r.testPath,
      timestamp: r.timestamp,
      durationMs: r.durationMs,
      modelId: r.modelId,
      passed: r.passed,
      detailsJson: `details/${r.id}.json`,
      detailsHtml: `details/${r.id}.html`,
    }));
    fs.writeFileSync(overviewJsonPath, JSON.stringify(overviewData, null, 2));

    records.forEach(r => {
      const detailJsonPath = path.join(resultsSubDir, `${r.id}.json`);
      // Ensure all parts of the record are serializable
      const serializableRecord = {
          ...r,
          criteria: r.criteria.map(c => ({ ...c })),
          results: r.results.map(res => ({ ...res })),
          conversation: r.conversation.map(m => ({
              ...m,
              // Ensure content is string or simple serializable object
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          }))
      };
      fs.writeFileSync(detailJsonPath, JSON.stringify(serializableRecord, null, 2));
    });
  }

  private generateHtmlOutput(records: EvaluationRecord[], resultsSubDir: string): void {
    const overviewHtmlPath = path.join(this.outputDir, 'evaluation-overview.html');
    let overviewHtml = `
<html>
<head>
  <title>LLM Evaluation Overview</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
    .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #e9e9e9; }
    .passed { color: green; font-weight: bold; }
    .failed { color: red; font-weight: bold; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .group-header td { background-color: #ddd; font-weight: bold; padding: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>LLM Evaluation Overview</h1>
    <table>
      <thead>
        <tr><th>Test Name</th><th>Overall Status</th><th>Timestamp</th><th>Duration (ms)</th><th>Model ID</th><th>Details</th></tr>
      </thead>
      <tbody>`;

    // Group records by testPath
    const grouped: Record<string, EvaluationRecord[]> = {};
    records.forEach(r => {
      grouped[r.testPath] = grouped[r.testPath] || [];
      grouped[r.testPath].push(r);
    });
    Object.keys(grouped).forEach(testPath => {
      // Group header with file name
      overviewHtml += `
    <tr class="group-header"><td colspan="6">${this.escapeHtml(path.basename(testPath))}</td></tr>`;
      grouped[testPath].forEach(r => {
        overviewHtml += `
    <tr>
      <td style="padding-left:20px">${this.escapeHtml(r.testName)}</td>
      <td class="${r.passed ? 'passed' : 'failed'}">${r.passed ? '✅ Passed' : '❌ Failed'}</td>
      <td>${new Date(r.timestamp).toLocaleString()}</td>
      <td>${r.durationMs}</td>
      <td>${this.escapeHtml(r.modelId)}</td>
      <td><a href="details/${r.id}.html">View Details</a></td>
    </tr>`;
        this.generateDetailHtmlPage(r, resultsSubDir);
      });
    });

    overviewHtml += `
      </tbody>
    </table>
  </div>
</body>
</html>`;
    fs.writeFileSync(overviewHtmlPath, overviewHtml);
  }

  private generateDetailHtmlPage(record: EvaluationRecord, resultsSubDir: string): void {
    const detailHtmlPath = path.join(resultsSubDir, `${record.id}.html`);
    let detailHtmlContent = `
<html>
<head>
  <title>Evaluation Detail: ${this.escapeHtml(record.testName)}</title>
  <style>
    body { font-family: sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
    .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #e9e9e9; }
    .passed { color: green; }
    .failed { color: red; }
    .meta-info p, .token-usage p { margin: 5px 0; }
    .conversation { margin-top: 20px; }
    .message { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
    .message-role { font-weight: bold; margin-bottom: 5px; color: #555; }
    .message-user { background-color: #e7f3ff; }
    .message-assistant { background-color: #f0f0f0; }
    .message-content pre { white-space: pre-wrap; word-wrap: break-word; background-color: #fff; padding: 10px; border-radius: 4px; border: 1px solid #ddd; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Evaluation Detail: ${this.escapeHtml(record.testName)}</h1>
    <p><a href="../evaluation-overview.html">Back to Overview</a></p>
    
    <div class="meta-info">
      <h2>Run Information</h2>
      <p><strong>ID:</strong> ${this.escapeHtml(record.id)}</p>
      <p><strong>Test Path:</strong> ${this.escapeHtml(record.testPath)}</p>
      <p><strong>Timestamp:</strong> ${new Date(record.timestamp).toLocaleString()}</p>
      <p><strong>Duration:</strong> ${record.durationMs} ms</p>
      <p><strong>Model ID:</strong> ${this.escapeHtml(record.modelId)}</p>
      <p><strong>Overall Status:</strong> <span class="${record.passed ? 'passed' : 'failed'}">${record.passed ? '✅ Passed' : '❌ Failed'}</span></p>
    </div>

    <h2>Criteria Results</h2>
    <table>
      <thead><tr><th>ID</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>
        ${record.results.map(result => `
          <tr>
            <td>${this.escapeHtml(result.id)}</td>
            <td>${this.escapeHtml(result.description)}</td>
            <td class="${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? '✅ Passed' : '❌ Failed'}
            </td>
          </tr>`).join('')}
      </tbody>
    </table>

    <h2>Conversation</h2>
    <div class="conversation">
      ${record.conversation.map(msg => this.formatMessageHtml(msg)).join('')}
    </div>

    <h2>Token Usage</h2>
    <div class="token-usage">
      <p><strong>Input Tokens:</strong> ${record.usage ? record.usage.promptTokens : 'N/A'}</p>
      <p><strong>Output Tokens:</strong> ${record.usage ? record.usage.completionTokens : 'N/A'}</p>
      <p><strong>Total Tokens:</strong> ${record.usage ? record.usage.totalTokens : 'N/A'}</p>
    </div>
  </div>
</body>
</html>`;
    fs.writeFileSync(detailHtmlPath, detailHtmlContent);
  }

  private formatMessageHtml(message: any): string {
    let contentHtml = '';
    if (typeof message.content === 'string') {
      // Attempt to parse if it's a JSON string (e.g., from previous stringification)
      try {
          const parsedContent = JSON.parse(message.content);
          if (Array.isArray(parsedContent)) { // Vercel AI SDK tool_calls format
              contentHtml = parsedContent.map((part: any) => {
                  if (part.type === 'tool_calls' && Array.isArray(part.toolCalls)) {
                      return part.toolCalls.map((tc: any) => 
                          `<strong>Tool Call: ${tc.toolName}</strong><pre>${this.escapeHtml(JSON.stringify(tc.args, null, 2))}</pre>`
                      ).join('');
                  }
                  return `<pre>${this.escapeHtml(JSON.stringify(part, null, 2))}</pre>`;
              }).join('');
          } else { // If it's some other JSON string
               contentHtml = `<pre>${this.escapeHtml(JSON.stringify(parsedContent, null, 2))}</pre>`;
          }
      } catch (e) { // Not a JSON string, treat as plain text
          contentHtml = `<pre>${this.escapeHtml(message.content)}</pre>`;
      }
    } else if (Array.isArray(message.content)) { // Vercel AI SDK content array
      contentHtml = message.content.map((part: any) => {
        if (part.type === 'text') {
          return `<pre>${this.escapeHtml(part.text)}</pre>`;
        } else if (part.type === 'tool_calls' && Array.isArray(part.toolCalls)) {
          return part.toolCalls.map((tc: any) => 
            `<strong>Tool Call: ${this.escapeHtml(tc.toolName)}</strong><pre>${this.escapeHtml(JSON.stringify(tc.args, null, 2))}</pre>`
          ).join('');
        }
        return `<pre>${this.escapeHtml(JSON.stringify(part, null, 2))}</pre>`; // Fallback for other types
      }).join('');
    } else if (typeof message.content === 'object' && message.content !== null) {
      contentHtml = `<pre>${this.escapeHtml(JSON.stringify(message.content, null, 2))}</pre>`;
    }


    // Handle tool_calls if it's a separate property (older Vercel AI SDK style or custom)
    let toolCallsHtml = '';
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      toolCallsHtml = message.tool_calls.map((tc: any) =>
          `<strong>Tool Call: ${this.escapeHtml(tc.name || tc.toolName)}</strong><pre>${this.escapeHtml(JSON.stringify(tc.args, null, 2))}</pre>`
      ).join('');
    }


    return `
    <div class="message message-${this.escapeHtml(message.role)}">
      <div class="message-role">${this.escapeHtml(message.role.toUpperCase())}</div>
      <div class="message-content">${contentHtml}${toolCallsHtml}</div>
    </div>`;
  }

  private escapeHtml(unsafe: any): string {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
  }
}

export default EvaluationReporter;
# Changelog

## 1.1.0

### Minor Changes

- [`24f60fe`](https://github.com/alexerm/jest-llm-eval/commit/24f60fe4c69e9b22eee5da24d350fbaff2d6a062) Thanks [@alexerm](https://github.com/alexerm)! - Initial OSS setup: CI, release automation, issue/PR templates, README refresh, and coverage thresholds.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-04

### Added

- Initial release of Jest LLM Eval
- AI-powered test assertions using `toPassAllCriteria` matcher
- Confidence testing with `toPassWithConfidence` matcher
- Tool call verification with `toHaveToolCall` and `toHaveToolCallResult` matchers
- Multi-step conversation testing with `runMultiStepTest` helper
- Comprehensive HTML and JSON reporting
- Predefined evaluation criteria (Welcome, Relevance, Professionalism, etc.)
- Custom criteria builder with `defineEvaluationCriteria`
- Full TypeScript support with type definitions
- Integration with Vercel AI SDK
- Support for all major LLM providers through AI SDK
- Detailed conversation analysis and token usage tracking
- Example implementations for common use cases

### Features

- 🤖 **AI-Powered Assertions**: Evaluate LLM responses using another LLM as a judge
- 📊 **Rich Reporting**: Generate detailed HTML and JSON reports of evaluation results
- 🎯 **Flexible Criteria**: Use predefined criteria or create custom evaluation rules
- 🔧 **Jest Integration**: Seamlessly extends Jest with custom matchers
- 📈 **Confidence Testing**: Run tests multiple times to ensure reliability
- 🛠️ **Tool Call Testing**: Verify AI agents make correct tool/function calls
- 🔄 **Multi-Step Conversations**: Test complex conversation flows
- 📝 **TypeScript Support**: Full TypeScript definitions included

### Dependencies

- ai: ^3.1.1 (Vercel AI SDK)
- zod: ^3.23.8 (Schema validation)
- Jest: ^29.0.0+ (peer dependency)

### Documentation

- Comprehensive README with examples
- API reference documentation
- Best practices guide
- Multiple example implementations
- TypeScript type definitions

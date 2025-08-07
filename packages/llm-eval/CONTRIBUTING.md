# Contributing to Jest LLM Eval

Thank you for your interest in contributing to Jest LLM Eval! We welcome contributions from the community.

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/jest-llm-eval.git
   cd jest-llm-eval/packages/llm-eval
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

### Code Style

- Use TypeScript for all new code
- Follow the existing naming conventions
- Add JSDoc comments for public APIs
- Ensure all code is properly typed

### Testing

- Write tests for all new functionality
- Ensure existing tests still pass
- Include both unit tests and integration tests
- Test with different LLM providers when applicable

### Documentation

- Update README.md for new features
- Add examples for new functionality
- Update API documentation
- Keep CHANGELOG.md up to date

## Submitting Changes

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

## Reporting Issues

When reporting issues, please include:

- Jest LLM Eval version
- Node.js version
- Operating system
- Complete error messages
- Minimal reproduction case
- Expected vs actual behavior

## Feature Requests

We welcome feature requests! Please:

- Check if the feature already exists
- Provide a clear use case
- Explain the expected behavior
- Consider backwards compatibility

## Code Review Process

1. All changes require review
2. Automated checks must pass
3. At least one maintainer approval required
4. Changes should be rebased before merging

## Release Process

1. Update CHANGELOG.md
2. Update version in package.json
3. Create a release tag
4. Publish to npm

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the code of conduct

## Questions?

- Open an issue for bug reports
- Start a discussion for questions
- Check existing documentation first

Thank you for contributing! 🎉

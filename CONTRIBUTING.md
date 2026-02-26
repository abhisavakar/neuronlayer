# Contributing to MemoryLayer

Thank you for your interest in contributing to MemoryLayer! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use a clear, descriptive title
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Node.js version)
   - Relevant logs or error messages

### Suggesting Features

1. Check if the feature is already planned (see Roadmap in README)
2. Open an issue with `[Feature]` prefix
3. Describe the use case and proposed solution
4. Be open to discussion and alternatives

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write/update tests as needed
5. Run `npm run typecheck` and `npm test`
6. Submit a PR with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/memorylayer.git
cd memorylayer

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Project Structure

```
src/
├── core/           # Business logic (engine, features)
├── server/         # MCP server and tools
├── storage/        # Data persistence (SQLite, vectors)
├── indexing/       # File indexing and AST
├── types/          # TypeScript type definitions
├── utils/          # Shared utilities
└── agent/          # Standalone agent (optional)
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types from `src/types/`

### Code Style

- Use meaningful variable/function names
- Keep functions focused and small
- Add comments for non-obvious logic
- Follow existing patterns in the codebase

### Testing

- Write tests for new features
- Tests go in `__tests__/` directories or `*.test.ts` files
- Use Vitest for testing

### Commits

- Use clear, descriptive commit messages
- Follow conventional commits when possible:
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation
  - `refactor:` code restructuring
  - `test:` test additions/changes

## Areas Where Help Is Needed

### High Priority

1. **Language Support** - Add AST parsing for Python, Go, Rust
2. **Bug Fixes** - Check open issues
3. **Test Coverage** - Increase test coverage

### Medium Priority

1. **Documentation** - Improve README, add examples
2. **Performance** - Optimize indexing and search
3. **IDE Extensions** - VS Code extension

### Good First Issues

Look for issues labeled `good-first-issue` for beginner-friendly tasks.

## Questions?

- Open a Discussion on GitHub
- Check existing issues and documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

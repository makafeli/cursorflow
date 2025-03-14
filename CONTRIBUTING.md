# Contributing to CursorFlow MCP Server

Thank you for considering contributing to the CursorFlow MCP Server! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

When reporting bugs, please include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are also welcome. Please include:
- A clear and descriptive title
- A detailed description of the proposed enhancement
- Any potential implementation details (if you have ideas)
- Why this enhancement would be useful to most users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure they pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Create your `.env` file based on `.env.example`
4. Start the server in development mode: `npm run dev`

## Coding Guidelines

- Follow the existing code style
- Write unit tests for new features
- Update documentation for any changes to the API or features
- Keep pull requests focused on a single feature or bug fix

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests in the commit message

## Documentation

If your changes affect how users interact with the project, please update the README.md file accordingly.

## Testing

Please ensure all tests pass before submitting a pull request:

```bash
npm test
```

For new features, please add appropriate tests to ensure functionality.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE). 
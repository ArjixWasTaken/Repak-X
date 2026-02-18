---
sidebar_position: 2
---

# Contributing

Want to contribute to Repak X? Here's how to get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- [.NET 8 SDK](https://dotnet.microsoft.com/download)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/XzantGaming/Repak-X.git
cd Repak-X

# Install frontend dependencies
cd repak-x
npm install

# Run in development mode
cargo tauri dev
```

## Project Structure

See the [Architecture](./architecture) page for details on how the project is organized.

## Guidelines

- Follow existing code conventions (camelCase for JS, snake_case for Rust)
- Run `cargo fmt` before committing Rust code
- Test your changes thoroughly before submitting a PR

## Support

Join the [Repak X Discord](https://discord.gg/nrud2gjUJk) to discuss contributions with the team.

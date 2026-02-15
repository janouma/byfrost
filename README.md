# Byfrost

A web components micro builder that transforms components from various source formats into optimized, production-ready JavaScript modules.

## Overview

Byfrost is a suite of tools designed to compile and optimize web components from multiple frameworks into lightweight, minified JavaScript modules. At its core, Byfrost enables you to write components in your preferred framework (Svelte, Vue, Plain JS – and more by providing the right adapter) and compile them into framework-agnostic web components ready for production deployment.

## 🚀 Key Features

- **Multi-Framework Support**: Compile components from Svelte, Vue, Plain JS (.pjs) – and other formats via adapters
- **Intelligent Asset Handling**: Automatic copying and URL rewriting for static assets
- **Advanced Module Mapping**: Flexible import rewriting and dependency resolution
- **Production Optimization**: Automatic minification – and optional (beta) source maps
- **Extensible Architecture**: Plugin system for adding new source formats
- **Caching System**: Optional caching for improved build performance

## 📦 Packages

### [@byfrost/core](./packages/core/) - The Main Engine

The heart of Byfrost - a compiler that transforms your components into optimized web components. It provides both CLI and programmatic APIs for maximum flexibility.

**Key capabilities:**
- Command-line interface for easy integration into build pipelines
- Programmatic API for custom build tools
- Configurable compilation process with `byfrost.config.js`
- Asset preprocessing and optimization
- Module import rewriting and bundling

### [@byfrost/svelte](./packages/svelte/) - Svelte Adapter

Enables compilation of Svelte components into web components. Seamlessly integrates with the core compiler to handle Svelte-specific syntax and features.

### [@byfrost/vue](./packages/vue/) - Vue Adapter

Provides Vue component compilation support, allowing you to transform Vue Single File Components into optimized web components.

### [@byfrost/plainjs](./packages/plainjs/) - Plain JS Adapter

Enables plain JavaScript (.pjs) components integration (web components) while still benefiting from Byfrost's build pipeline and optimization features.

### [@byfrost/utils](./packages/utils/) - Utility Toolkit

A utility package providing essential tools for command execution, logging, string manipulation, object operations, email sending, and more. Used internally by other Byfrost packages and available for uses outside the @byfrost ecosystem.

## 📄 License

ISC

# Bifrost

A web components micro builder that transforms components from various source formats into optimized, production-ready JavaScript modules.

## Overview

Bifrost is a suite of tools designed to compile and optimize web components from multiple frameworks into lightweight, minified JavaScript modules. At its core, Bifrost enables you to write components in your preferred framework (Svelte, Vue – and more by providing the right adapter) and compile them into framework-agnostic web components ready for production deployment.

## 🚀 Key Features

- **Multi-Framework Support**: Compile components from Svelte, Vue – and other formats via adapters
- **Intelligent Asset Handling**: Automatic copying and URL rewriting for static assets
- **Advanced Module Mapping**: Flexible import rewriting and dependency resolution
- **Production Optimization**: Automatic minification – and optional (beta) source maps
- **Extensible Architecture**: Plugin system for adding new source formats
- **Caching System**: Optional caching for improved build performance

## 📦 Packages

### [@bifrost/core](./packages/core/) - The Main Engine

The heart of Bifrost - a compiler that transforms your components into optimized web components. It provides both CLI and programmatic APIs for maximum flexibility.

**Key capabilities:**
- Command-line interface for easy integration into build pipelines
- Programmatic API for custom build tools
- Configurable compilation process with `bifrost.config.js`
- Asset preprocessing and optimization
- Module import rewriting and bundling

### [@bifrost/svelte](./packages/svelte/) - Svelte Adapter

Enables compilation of Svelte components into web components. Seamlessly integrates with the core compiler to handle Svelte-specific syntax and features.

### [@bifrost/vue](./packages/vue/) - Vue Adapter

Provides Vue component compilation support, allowing you to transform Vue Single File Components into optimized web components.

### [@bifrost/utils](./packages/utils/) - Utility Toolkit

A utility package providing essential tools for command execution, logging, string manipulation, object operations, email sending, and more. Used internally by other Bifrost packages and available for uses outside the @bifrost ecosystem.

## 📄 License

ISC

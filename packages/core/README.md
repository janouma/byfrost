# @bifrost/core

A web components micro builder that compiles components from various source formats (Svelte, Vue – More format can be added) into optimized, minified JavaScript modules.

## Installation

```bash
npm install @bifrost/core
```

## Usage

### Command Line Interface

The package provides a CLI tool that can be used to compile web components:

```bash
npx @bifrost/core compile source=./src/components/my-component destination=./dist
```

#### Available Commands

- `--help` - Display usage information
- `compile` - Compile a component folder and save the result to the build folder

#### Compile Command Arguments

**Required:**
- `source=path` - Path to the component folder containing the source files
- `destination=path` - Path to the build folder that will host all compiled components

**Optional:**
- `sourceMap=yes/no` - Whether to generate source maps (default: no)
- `prefix=url` - CSS assets absolute or relative URL prefix for asset paths
- `config=path` - Path to the compile configuration file (default: `bifrost.config.js`)
- `cache=path` - Path to a module exporting a cache object (see Cache Interface below)

### Examples

#### Basic Compilation
```bash
npx @bifrost/core compile source=./src/my-component destination=./dist
```

#### With Source Maps
```bash
npx @bifrost/core compile source=./src/my-component destination=./dist sourceMap=yes
```

#### With Asset Prefix
```bash
npx @bifrost/core compile source=./src/my-component destination=./dist prefix=/assets
```

#### With Custom Config
```bash
npx @bifrost/core compile source=./src/my-component destination=./dist config=./my-config.js
```

## Component Structure

Your component folder should contain:
- An `index.*` file (e.g., `index.svelte`, `index.vue`) as the main component source
- Optional `assets/` folder for static assets
- Optional `styles/` folder for stylesheets

Example structure:
```
my-component/
├── index.svelte
├── assets/
│   └── icon.svg
└── styles/
    └── theme.css
```

## Configuration File

Create a `bifrost.config.js` file in your project root to customize the build process.
All config properties as well as the config file itself are optional.

Here is an example:

```javascript
export default {
  // (Optional) Custom style preprocessor function
  stylePreprocessor: ({ dest }) => {
    return (styles) => {
      // Process styles here
      return styles.replace(/\$prefix/g, dest);
    };
  },

  // Map source file extensions to their respective compilers
  srcTypesCompilerMapping: {
    // Default values
    // svelte: '@bifrost/svelte',
    // vue: '@bifrost/vue',

    // If one wants to add react support (module not provided)
    react: <react to custom element compiler name or path>
  },

  // Global property to enable modules copy to their destination folder for all `modulesMapping` entries
  copyModules: true,

  modulesMapping: {
    vue: {
      alias: 'vue/dist/vue.runtime.esm-browser.prod.js',
      destination: './packages/vue.js'
    },

    svelte: {
      alias: 'svelte/internal',
      destination: './packages/svelte/internal/index.js'
    },

    '/^svelte/(.*)$/': { destination: './packages/svelte/$1/index.js' },

    joi: {
      alias: 'joi/dist/joi-browser.min.js',
      destination: './packages/joi-browser.min.js'
    },

    'fuse.js': {
      alias: 'fuse.js/dist/fuse.basic.esm.min.js',
      destination: './packages/fuse.js/dist/fuse.basic.esm.min.js'
    },

    'element-adapter': {
      alias: 'element-adapter/dist/element-adapter.esm.js',
      destination: './packages/element-adapter/dist/element-adapter.esm.js'
    },

    '/^@bifrost/utils/(.+)$/': {
      destination: './packages/@bifrost/utils/$1'
    },

    '/^lib/(.+)$/': {
      alias: './lib/$1',
      copyModule: false
    },

    '/^@heimdall/shared-lib/components/(.+)\\.svelte$/': {
      alias: './shared_components/$1.js',
      copyModule: false
    }
  }
}
```

### Configuration Options

- **`srcTypesCompilerMapping`** - Object mapping file extensions to their compiler packages
- **`modulesMapping`** - Object for rewriting module imports:
  - Keys can be exact strings or regex patterns (wrapped in /^...$/)
  - Values can be strings (simple alias) or objects with `alias`, `destination`, and `copyModule` properties
- **`copyModules`** - Boolean to copy modules by default when using `modulesMapping`
- **`stylePreprocessor`** - Function that receives `{ dest }` and returns a style processing function

## Cache Interface

You can provide a custom cache module to optimize builds. The cache module should export an object with the following interface:

```javascript
export default {
  has: (sourcePath) => boolean,
  get: (sourcePath) => string,
  set: (sourcePath, compiledPath) => void,
  delete: (sourcePath) => void
}
```

Example cache implementation:
```javascript
const cache = new Map();

export default {
  has: (sourcePath) => cache.has(sourcePath),
  get: (sourcePath) => cache.get(sourcePath),
  set: (sourcePath, compiledPath) => cache.set(sourcePath, compiledPath),
  delete: (sourcePath) => cache.delete(sourcePath)
}
```

## Programmatic Usage

You can also use the compiler programmatically:

```javascript
import compileComponent from '@bifrost/core/lib/compiler.js';
import cache from './cache.js'

await compileComponent({
  source: './src/my-component',
  destination: './dist',
  prefix: '/assets',
  enableSourcemap: { js: true },
  cache,
  configWorkingDirectory: './',
  config: {
    srcTypesCompilerMapping: {
      svelte: '@bifrost/svelte'
    }
  }
});
```

## Import Types

The compiler recognizes several types of imports:

### Component Imports
```javascript
import MyComponent from './my-component/index.svelte';
```

### Asset Imports
```javascript
import iconUrl from './assets/icon.svg';
```

### Plain JS Imports
```javascript
import { helper } from './utils/helper.js';
```

## Features

- **Multi-format Support**: Compile from Svelte, Vue, and other formats
- **Code Minification**: Automatic minification using Terser
- **Source Maps**: Optional source map generation
- **Asset Handling**: Automatic copying and URL rewriting for assets
- **Module Mapping**: Flexible import rewriting and module copying
- **Dependency Resolution**: Intelligent handling of component and module dependencies
- **Caching**: Optional caching system for improved build performance

## Requirements

- Node.js 20.x
- npm 10.x

## License

ISC

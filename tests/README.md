# Testing Guide for Reactive-JSON

This guide explains how to run tests in the reactive-json project using Jest.

## Overview

The project uses **Jest** as the testing framework with **Babel** for transforming JSX and TypeScript files. The configuration supports:
- JavaScript files (`.js`)
- JSX files (`.jsx`)
- TypeScript files (`.ts`, `.tsx`)
- ES6 modules transformed to CommonJS for Jest compatibility

## Prerequisites

All required dependencies are already installed in the project:
- `jest` - Testing framework
- `babel-jest` - Babel transformer for Jest
- `@babel/preset-env` - Babel preset for modern JavaScript
- `@babel/preset-react` - Babel preset for JSX
- `@babel/preset-typescript` - Babel preset for TypeScript
- `identity-obj-proxy` - For mocking CSS modules

## Configuration Files

### `jest.config.mjs`
Main Jest configuration file that:
- Transforms `.js`, `.jsx`, `.ts`, `.tsx` files using `babel-jest`
- Maps CSS files to `identity-obj-proxy` for testing
- Maps static assets (images, fonts, videos, etc.) to mock files to prevent test failures
- Configures test file matching patterns

### `babel.config.cjs`
Babel configuration that:
- Transforms code to CommonJS (`modules: "cjs"`) for Jest compatibility
- Uses automatic JSX runtime for React
- Supports TypeScript syntax

## Running Tests

### Run All Tests

```bash
npm test
```

### Run a Specific Test File

```bash
npm test -- setAttributeValue.test.js
```

### Run Tests Matching a Pattern

```bash
npm test -- attributeTransformer
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests Verbosely

```bash
npm test -- --verbose
```

### Run a Specific Test by Name

```bash
npm test -- -t "should append string value"
```

## Test File Structure

Test files should be placed in the `tests/` directory and follow the naming convention:
- `*.test.js` - JavaScript test files (Jest tests)
- `*.test.jsx` - JSX test files (if needed)

Example structure:
```
tests/
  lib/
    component/
      attributeTransformer/
        setAttributeValue.test.js
```

## Writing Tests

### Basic Test Example

```javascript
import { setAttributeValue } from "../../../../lib/component/attributeTransformer/setAttributeValue.jsx";

describe("setAttributeValue", () => {
    it("should append string value in default mode", () => {
        const attributes = { class: "existing-class" };
        const result = setAttributeValue({
            attributes,
            globalDataContext: {},
            singleTransformProps: {
                name: "class",
                value: "new-class",
            },
            templateContext: {},
        });

        expect(result.class).toBe("existing-class new-class");
    });
});
```

### Mocking Dependencies

When testing components that depend on other modules, you can use Jest's mocking capabilities:

```javascript
// Mock a module
jest.mock("../../../../lib/engine/TemplateSystem.jsx", () => ({
    evaluateTemplateValue: jest.fn(({ valueToEvaluate }) => valueToEvaluate),
}));
```

### Testing with React Components

For testing React components, you may need to install additional dependencies:
- `@testing-library/react` - For rendering React components
- `@testing-library/jest-dom` - For DOM matchers

## Common Issues and Solutions

### Issue: "Cannot use import statement outside a module"

**Solution**: Ensure Babel is transforming your files. Check that:
1. `babel.config.cjs` exists and is properly configured
2. `jest.config.mjs` includes the transform configuration
3. Files are not in `transformIgnorePatterns`

### Issue: "SyntaxError: Unexpected token" for TypeScript files

**Solution**: Ensure `@babel/preset-typescript` is installed and included in `babel.config.cjs`

### Issue: CSS imports failing

**Solution**: The configuration already includes `identity-obj-proxy` for CSS files. If you encounter issues, ensure it's installed:
```bash
npm install --save-dev identity-obj-proxy
```

### Issue: Static assets (images, fonts, etc.) imports failing

**Solution**: The configuration already includes mocks for static assets via `tests/__mocks__/fileMock.js`. This prevents test failures when code imports assets like:
```javascript
import logo from './logo.png';
import font from './font.woff2';
```

If you encounter issues, ensure the mock file exists at `tests/__mocks__/fileMock.js`.

### Issue: Tests pass but coverage is low

**Solution**: Run tests with coverage to identify untested code:
```bash
npm test -- --coverage
```

## Configuration Details

### Why CommonJS instead of ES Modules?

Jest works more reliably with CommonJS modules. Even though the source code uses ES modules (`"type": "module"` in `package.json`), Babel transforms everything to CommonJS during testing. This ensures:
- Better compatibility with Jest's module system
- Easier mocking and module resolution
- More stable test execution

### Transform Process

1. Jest identifies test files matching `**/*.test.js`
2. Babel transforms `.js`, `.jsx`, `.ts`, `.tsx` files to CommonJS
3. Jest executes the transformed code
4. Results are reported

## Best Practices

1. **Keep tests close to source**: Place test files in `tests/` mirroring the `lib/` structure
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **One assertion per test**: Keep tests focused on a single behavior
4. **Mock external dependencies**: Mock modules that aren't part of the unit being tested
5. **Clean up**: Use `beforeEach` and `afterEach` to reset state between tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Babel Documentation](https://babeljs.io/docs/)
- [Testing Library Documentation](https://testing-library.com/)

## Troubleshooting

If you encounter issues:

1. **Clear Jest cache**:
   ```bash
   npm test -- --clearCache
   ```

2. **Check Babel configuration**:
   ```bash
   npx babel --show-config
   ```

3. **Run tests with debug output**:
   ```bash
   npm test -- --verbose --no-cache
   ```

4. **Verify dependencies are installed**:
   ```bash
   npm list jest babel-jest @babel/preset-env @babel/preset-react @babel/preset-typescript
   ```


# Reactive-JSON

A REACT-based lib that transforms JSON (or YAML) into interactive HTML markup.

This lib lessens the need to write JS code for building frontend apps.

With *reactive-json*, build your apps and forms frontend, embed them into your websites,
and make them interactive with your backend.

> **🤖 AI Guide**: If you're using an AI assistant (like Cursor, ChatGPT, Claude, etc.) to work with reactive-json, start by reading [`README_LLM.md`](./README_LLM.md) - it contains comprehensive patterns, examples, and best practices specifically designed for AI-assisted development.

## How to use *reactive-json*

Reactive-json must be included as an npm dependency in your React project. There are two main ways to use it:

### 1. Direct Integration in a React Application

Use the `<ReactiveJsonRoot>` component directly in your React application. This is the recommended method if you're developing a complete React application.

### 2. Automatic Association with HTML Tags

To integrate reactive-json into an existing web page, you can use `<reactive-json>` tags and create an automatic association via ReactDOM. This approach is ideal for integrating interactive components into existing websites.

## How to install *reactive-json*

Install the library in your React project:

```shell
npm install @ea-lab/reactive-json
```

### Method 1: Direct Usage in React

```js
import {ReactiveJsonRoot} from "@ea-lab/reactive-json";

const YourComponent = () => {
    return (
        <div>
          <ReactiveJsonRoot 
            rjBuildUrl={"/path/to/build.json"}
            rjBuildFetchMethod="GET" />
        </div>
    );
};
```

### Method 2: Automatic Association with HTML Tags

Create an initialization script that searches for `<reactive-json>` tags and automatically associates them:

```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import {ReactiveJsonRoot} from "@ea-lab/reactive-json";

// Find all <reactive-json> tags in the page
const appRootElements = document.querySelectorAll("reactive-json");

appRootElements.forEach(element => {
    // Get the fetch method from data attribute
    const maybeMethod = element.dataset?.method;

    // Get headers for data requests
    const headersForRjBuild_asElements = element.querySelectorAll("data-source-request-header");
    const headersForRjBuild = headersForRjBuild_asElements.length ? {} : undefined;

    headersForRjBuild_asElements.forEach((headerElement) => {
        const headerField = headerElement?.dataset?.headerField;
        const headerValue = headerElement?.dataset?.headerValue;

        if (headerField && headerValue) {
            headersForRjBuild[headerField] = headerValue;
        }
    });

    // Create React root and mount the component
    const root = ReactDOM.createRoot(element);

    root.render(
        <React.StrictMode>
            <ReactiveJsonRoot
                rjBuildFetchMethod={maybeMethod}
                rjBuildUrl={element.dataset.url}
                headersForRjBuild={headersForRjBuild}
            />
        </React.StrictMode>
    );
});
```

Then in your HTML:

```html
<reactive-json data-url="/api/my-config.json" data-method="GET">
    <!-- Optional headers for authentication -->
    <data-source-request-header 
        data-header-field="Authorization" 
        data-header-value="Bearer your-token">
    </data-source-request-header>
</reactive-json>
```

## ReactiveJsonRoot Properties

The `ReactiveJsonRoot` component accepts the following properties:

- `rjBuildUrl`: The URL of the document containing the build data (JSON or YAML)
- `rjBuildFetchMethod`: The fetch method for the data ("GET" or "POST", case-insensitive)
- `headersForRjBuild`: Headers for the data request (e.g., authentication info)
- `plugins`: Reactive-JSON plugins to extend functionality (**must** use `mergeComponentCollections`)
- `debugMode`: Debug mode to show the data structure and debug info
- `maybeRawAppRjBuild`: A RjBuild configuration to initialize directly (string or object)

## How to extend *reactive-json*

To add new components, consult the complete documentation:

**Online Documentation**: https://reactive-json.ea-lab.io

**Local Documentation** (install the docs package):
```shell
npm install --save-dev @ea-lab/reactive-json-docs
```

Documentation is available at:
- `node_modules/@ea-lab/reactive-json-docs/public/rjbuild/docs/extend/component-development.md`
- Main entry point: `node_modules/@ea-lab/reactive-json-docs/public/rjbuild/docs/index.yaml`

## Demo Application

If you retrieved the source code of *reactive-json*, a demo app is available for use:

```shell
npm run dev
```

## Project structure

This project was bootstrapped with [Vite](https://vite.dev/).

### Components `/lib/component`

This is where the main component code is located.

We provided a basic set of components that people will mostly need.
Those components usually wrap around famous third-party libs such as
*React-Bootstrap* and *Chart.js*.

Of course, you can add your own components in your React project,
by following the same pattern.

#### Actions `/lib/component/action`

Action components are special components that may be
used within the `actions:` section of an **element** component.

Actions **do** something **when** conditions are met.

#### Elements `/lib/component/element`

Element components are the main structural components that will display anything.

They may be HTML markup (`html`), interactive (`form`), graphic charts (`chart`),
and anything that displays or not (`special`).

When adding your own elements, you must register them in the `View` component.

#### Hooks `/lib/component/hook`

Contains reusable hooks, in the React sense.

#### Reaction functions `/lib/component/reaction`

Reaction components are functions that are like the `action` components,
but they **do** something **in response** to an **event**.

The reaction components must be registered in the `ReactOnEvent` component.

### Engine `/lib/engine`

Contains the core functionality of *reactive-json*.

This is where `ReactiveJsonRoot.jsx` is.

Usually, you won't need to edit its content. (But feel free to inspect it if you
want to contribute!)

### Public files `public`

This directory contains files for the demo app.

This directory is not included in the build.

### Demo app `src`

All the demo app related code is here. This code is not included in the build.

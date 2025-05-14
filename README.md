# Reactive-JSON

A REACT-based lib that transforms JSON (or YAML) into HTML markup.

This lib lessens the need to write JS code for building frontend apps.

With *reactive-json*, build your apps and forms frontend, embed them into your websites,
and make them interactive with your backend.

TODO: make and insert a descriptive image.

## How to use *reactive-json*

The library can be:

- used as a standalone lib: simply load the dist files in your web page
  and it will work on the `<reactive-json>` HTML tags.
- included in your React project: use the provided `<ReactiveJsonRoot>` component
  in your React app. This is the way to go if you want to use reactive-json plugins.

If you retrieved the source code of *reactive-json*, a demo app is available for use.

```shell
npm run dev
```

## How to install *reactive-json*

### Standalone mode

This mode only needs you to download the `/dist` folder and load the JS and CSS assets
in your web pages.

If the `/dist` is not available (probably because you pulled the library from
the source code repository), you will have to generate it:

```shell
npm install && npm run build
```

### Library mode

This mode is when you have a React project, and you want to include *reactive-json*
as a part of your project.

First, install the lib:

```shell
npm install @ea-lab/reactive-json
```

And that's all!

You will have to use the `<ReactiveJsonRoot>` component, with the appropriate
options.

```js
import {ReactiveJsonRoot} from "@ea-lab/reactive-json";

//...

const YourComponent = () => {
    return (
        <div>
          <ReactiveJsonRoot dataUrl={"/path/to/build.json"}/>
        </div>
    );
};
```

## How to extend *reactive-json*

To add new components, you must be in library mode. Indeed, the
standalone mode is a fixed set of functionality. This can be changed later if
a plugin system can be implemented; do not hesitate to contribute in this
project if you know how to make it, it would be really appreciated!

## Project structure

This project was bootstrapped with [Vite](https://vite.dev/).

The following is the specific documentation for the *reactive-json* project.

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

# Reactive-JSON

A REACT-based lib that transforms JSON (or YAML) into HTML markup.

This lib lessens the need to write JS code for building frontend apps.

With *reactive-json*, build your apps and forms frontend, embed them into your websites,
and make them interactive with your backend.

## Content

Lbrary and demo app for *reactive-json*.

The library can be:

- included in your React project: use the provided `<ReactiveJsonRoot>` component
  in your React app. This is the way to go if you want to use reactive-json plugins.
- used as a standalone lib: simply load the dist files in your web page
  and it will work on the `<reactive-json>` HTML tags.

The app shows how to use *reactive-json*.

## Project structure

This project was bootstrapped with [Vite](https://vite.dev/).

The following is the specific documentation for the *reactive-json* project.

### Components `/lib/component`

This is where the extensible code is located.

We provided a basic set of components that people will mostly need.
Those components usually wrap around famous third-party libs such as
*React-Bootstrap* and *Chart.js*.

Of course, you can add your own components, by following the same pattern.

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

### Utilities `/lib/component/utility`

Generic reusable code.

### Engine `/lib/engine`

Contains the core functionality of *reactive-json*.

This is where `ReactiveJsonRoot.jsx`* is.

(* the main entrypoint component of *reactive-json*.)

Usually, you won't need to edit its content. (But feel free to inspect it if you
want to contribute!)

### Demo app `src`

All the demo app related code is here. This code is not included in the build.

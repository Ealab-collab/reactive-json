import { createContext } from 'react';

/**
 * This context contains all the build data for the current app.
 *
 * The use of this context is similar to TemplateContext,
 * but the difference is that this one has only one instance.
 *
 * @type {React.Context<{}>}
 */
const GlobalDataContext = createContext({});

export default GlobalDataContext;

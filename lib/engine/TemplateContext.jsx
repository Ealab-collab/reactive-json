import { createContext } from 'react';

/**
 * A template context contains the data that is shared between the contained components.
 *
 * A template context is created when using the "load" keyword in the render array,
 * and it is supplied with the current data of the component that loaded the template.
 *
 * @type {React.Context<{}>}
 */
const TemplateContext = createContext({});

export default TemplateContext;

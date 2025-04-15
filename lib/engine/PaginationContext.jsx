import { createContext } from 'react';

/**
 * This is a context opened when a pagination is needed.
 *
 * @type {React.Context<{}>}
 */
const PaginationContext = createContext({pagination: {}});

export default PaginationContext;

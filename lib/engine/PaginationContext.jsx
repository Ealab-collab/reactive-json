import { createContext } from "react";

/**
 * This is a context opened when a pagination is needed.
 *
 * @type {React.Context<{}>}
 */
export const PaginationContext = createContext({ pagination: {} });

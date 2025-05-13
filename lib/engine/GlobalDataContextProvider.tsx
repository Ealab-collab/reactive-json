import {GlobalDataContext} from "./GlobalDataContext";
import {RjBuildDefBase} from "./Types";

export interface GlobalDataContextProviderProps {
    value: {
        element: Array<RjBuildDefBase>,
        headersForData: any,
        plugins: any,
        setRawAppData: any,
        templateData: object,
        templatePath: string,
        updateData: any,
    },
}

/**
 * Standard implementation of the provider for GlobalDataContext.
 *
 * @param {GlobalDataContextProviderProps} props Component props. Must have the "value" key.
 *
 * @returns {JSX.Element}
 *
 * @constructor
 */
export const GlobalDataContextProvider = (props) => {
    // Shallow copy. This will help to keep the original data representation.
    const valueCopy = {...props.value};

    if (valueCopy.getRootContext === undefined) {
        // The root context is unset.
        // Self reference this root object with this closure.
        // It's useful so that new global data contexts such as those created
        // by the DataFilter component can access the root global data context value
        // instead of the current GlobalDataContext value from useContext().
        // The submitData reaction function uses such root value.
        valueCopy.getRootContext = () => {
            return props.value;
        };
    }

    return <GlobalDataContext.Provider value={valueCopy}>
        {props.children}
    </GlobalDataContext.Provider>;
}

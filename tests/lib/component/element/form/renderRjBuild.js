import { act } from "react";
import { createRoot } from "react-dom/client";
import { ReactiveJsonRoot } from "../../../../../lib/engine/ReactiveJsonRoot.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DebugRoot = ({ children }) => <div>{children}</div>;
const DebugContent = ({ children }) => <div data-testid="content">{children}</div>;
const DebugData = ({ children }) => <pre data-testid="data">{children}</pre>;

/**
 * Renders a RjBuild in a jsdom container, with helpers to read the root data and interact with the DOM.
 *
 * Requires the jsdom test environment.
 *
 * @param {{}} rjBuild The RjBuild to render.
 *
 * @returns {{container: HTMLElement, getData: function(): {}, click: function(Element): Promise<void>, selectValue: function(HTMLSelectElement, string): Promise<void>, unmount: function(): Promise<void>}}
 */
export const renderRjBuild = async (rjBuild) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(
            <ReactiveJsonRoot
                debugMode={true}
                DebugModeContentWrapper={DebugContent}
                DebugModeDataWrapper={DebugData}
                DebugModeRootWrapper={DebugRoot}
                maybeRawAppRjBuild={rjBuild}
            />
        );
    });

    return {
        container,
        getData: () => JSON.parse(container.querySelector("[data-testid='data']").textContent),
        click: async (element) => {
            await act(async () => {
                element.click();
            });
        },
        selectValue: async (select, value) => {
            await act(async () => {
                // Use the native setter so that React's value tracker sees the change.
                Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, value);
                select.dispatchEvent(new Event("change", { bubbles: true }));
            });
        },
        unmount: async () => {
            await act(async () => {
                root.unmount();
            });
            container.remove();
        },
    };
};

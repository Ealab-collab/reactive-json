import { addData } from "./addData.jsx";
import { fetchData } from "./fetchData.jsx";
import { moveData } from "./moveData.jsx";
import { postMessage } from "./postMessage.jsx";
import { redirectNow } from "./redirectNow.jsx";
import { removeData } from "./removeData.jsx";
import { setClipboardData } from "./setClipboardData.jsx";
import { setData } from "./setData.jsx";
import { submitData } from "./submitData.jsx";
import { triggerEvent } from "./triggerEvent.jsx";

/**
 * Reactive-json core reaction components.
 */
export const coreReactionComponents = {
    addData,
    fetchData,
    moveData,
    postMessage,
    redirectNow,
    removeData,
    setClipboardData,
    setData,
    submitData,
    triggerEvent,
};

export * from "./addData.jsx";
export * from "./fetchData.jsx";
export * from "./utility/index.js";
export * from "./moveData.jsx";
export * from "./postMessage.jsx";
export * from "./redirectNow.jsx";
export * from "./removeData.jsx";
export * from "./setClipboardData.jsx";
export * from "./setData.jsx";
export * from "./submitData.jsx";
export * from "./triggerEvent.jsx";

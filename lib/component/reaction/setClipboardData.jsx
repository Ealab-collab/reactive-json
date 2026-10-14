import { dataLocationToPath, evaluateTemplateValue } from "../../engine/TemplateSystem.jsx";

/**
 * Copies the text with a temporary textarea and the deprecated "copy" command.
 *
 * This is the only way to copy outside a secure context (plain http on a host other than localhost),
 * where navigator.clipboard is not available.
 *
 * @param {string} text The text to copy.
 *
 * @returns {boolean} True when the text has been copied.
 */
const copyWithSelection = (text) => {
    if (typeof document === "undefined" || typeof document.execCommand !== "function") {
        return false;
    }

    const previouslyFocused = document.activeElement;
    const textarea = document.createElement("textarea");

    try {
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        // Off screen instead of hidden: a hidden element cannot be selected, so it cannot be copied.
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        // Some browsers (iOS) ignore select() on a readonly field.
        textarea.setSelectionRange(0, text.length);

        return document.execCommand("copy");
    } catch {
        return false;
    } finally {
        textarea.remove();

        // Give the focus back, e.g. to keep a modal's focus trap working.
        if (previouslyFocused && typeof previouslyFocused.focus === "function") {
            previouslyFocused.focus();
        }
    }
};

/**
 * Copies data to the clipboard.
 *
 * The value is a string or a number. Nothing happens when it is empty.
 * Outside a secure context, where navigator.clipboard is not available,
 * the copy falls back to the deprecated "copy" command.
 *
 * With `statusPath`, the location receives "copied" or "failed" once the copy is done,
 * so that the page can react to the outcome.
 *
 * @param {{}} props
 */
export const setClipboardData = async (props) => {
    const { globalDataContext, templateContext } = props;
    const evaluatedValue = evaluateTemplateValue({
        valueToEvaluate: props?.args?.value,
        globalDataContext,
        templateContext,
    });

    if (typeof evaluatedValue !== "string" && typeof evaluatedValue !== "number") {
        return;
    }

    const text = String(evaluatedValue);

    if (text === "") {
        return;
    }

    let copied = false;

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
        } catch (error) {
            copied = copyWithSelection(text);

            if (!copied) {
                console.error("Failed to copy data to the clipboard:", error);
            }
        }
    } else {
        copied = copyWithSelection(text);

        if (!copied) {
            console.error("Failed to copy data to the clipboard: no clipboard API is available.");
        }
    }

    const statusPath = props?.args?.statusPath;

    if (typeof statusPath === "string") {
        globalDataContext.updateData(
            copied ? "copied" : "failed",
            dataLocationToPath({
                currentPath: templateContext.templatePath,
                dataLocation: statusPath,
                globalDataContext,
                templateContext,
            })
        );
    }
};

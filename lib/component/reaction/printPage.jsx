/**
 * Opens the print dialog of the browser for the current page.
 */
export const printPage = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print();
    }
};

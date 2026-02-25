import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, useCallback } from "react";
import { createPortal } from "react-dom";
import { ActionDependant, TemplateContext, GlobalDataContext } from "../../../../engine";
import { DebugMode } from "./DebugMode.enum";
import DebugList from "./ModeDisplay/DebugList/DebugList";
import DebugJson from "./ModeDisplay/DebugJson/DebugJson";
// TODO: https://github.com/Ealab-collab/reactive-json/issues/30
// Move styles to the module file.
//import "./reset.css";
import { flattenObject } from "./utils";
import styles from "./VariablesDebug.module.css";

export const VariablesDebug = ({ props }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mode, setMode] = useState(DebugMode.LIST);
    const templateContext = useContext(TemplateContext);
    const copyButtonRef = useRef(null);
    const [portalContainer, setPortalContainer] = useState(null);
    const mainAttributesHolderRef = useRef(null);

    useEffect(() => {
        if (typeof document === "undefined") return;
        let container = document.getElementById("rj-debug-root");
        if (!container) {
            container = document.createElement("div");
            container.id = "rj-debug-root";
            container.classList.add(styles.debugRoot);
            document.body.appendChild(container);
        }
        setPortalContainer(container);
    }, []);

    const globalDataContext = useContext(GlobalDataContext);
    const store = globalDataContext?.store;

    // Helper function for normalizing path
    const normalizePath = (p) => {
        if (!p) return "";
        if (p === "data") return "";
        if (p.startsWith("data.")) return p.substring(5);
        return p;
    };

    // Memoize subscribe for performance
    const subscribe = useCallback((callback) => {
        if (store) {
            const path = normalizePath(templateContext?.templatePath);
            return store.subscribe(path, callback);
        }
        return () => {};
    }, [store, templateContext?.templatePath]);

    // Memoize getSnapshot
    const getSnapshot = useCallback(() => {
        if (store) {
            const path = normalizePath(templateContext?.templatePath);
            return store.get(path);
        }
        return templateContext?.templateData;
    }, [store, templateContext?.templateData, templateContext?.templatePath]);

    const storeData = useSyncExternalStore(subscribe, getSnapshot);

    const data = useMemo(() => storeData ?? {}, [storeData]);

    const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);
    const flatRows = useMemo(() => flattenObject(data), [data]);

    const handleCopy = async () => {
        const copyButton = copyButtonRef.current;
        try {
            await navigator.clipboard.writeText(
                mode === DebugMode.JSON
                    ? jsonString
                    : flatRows.map((row) => `${row.path}: ${JSON.stringify(row.value)}`).join("\n")
            );

            if (!copyButton) return;

            copyButton.classList.add(styles.copyBtnSuccess);
            copyButton.textContent = "Copied!";
            setTimeout(() => {
                copyButtonRef.current?.classList.remove(styles.copyBtnSuccess, styles.copyBtnError);
            }, 3000);
        } catch {
            copyButton?.classList.add(styles.copyBtnError);
            setTimeout(() => {
                copyButton?.classList.remove(styles.copyBtnError);
            }, 3000);
        }
    };

    const content = (
        <ActionDependant {...props} attributesHolderRef={mainAttributesHolderRef}>
            <div
                className={`${styles.container} ${isExpanded ? styles.expanded : ""}`}
                onClick={() => setIsExpanded((prevIsExpanded) => !prevIsExpanded)}
                role="button"
                ref={mainAttributesHolderRef}
            >
                <div className={styles.header}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        Debug Variables <code>{templateContext.templatePath}</code>
                    </p>
                    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                        {isExpanded && (
                            <>
                                <button
                                    className={`${styles.btn} ${mode === DebugMode.LIST ? styles.active : ""}`}
                                    onClick={() => setMode(DebugMode.LIST)}
                                >
                                    List
                                </button>
                                <button
                                    className={`${styles.btn} ${mode === DebugMode.JSON ? styles.active : ""}`}
                                    onClick={() => setMode(DebugMode.JSON)}
                                >
                                    JSON
                                </button>
                            </>
                        )}
                        <button
                            className={styles.btn}
                            onClick={() => setIsExpanded((prevIsExpanded) => !prevIsExpanded)}
                        >
                            {isExpanded ? "Collapse" : "Expand"}
                        </button>
                        {isExpanded && (
                            <button
                                className={`${styles.btn} ${styles.copyBtn}`}
                                onClick={handleCopy}
                                ref={copyButtonRef}
                            >
                                Copy
                            </button>
                        )}
                    </div>
                </div>
                {isExpanded && (
                    <div className={styles.info} onClick={(e) => e.stopPropagation()}>
                        {mode === DebugMode.JSON ? (
                            <DebugJson jsonString={jsonString} />
                        ) : (
                            <DebugList flatRows={flatRows} />
                        )}
                    </div>
                )}
            </div>
        </ActionDependant>
    );

    if (!portalContainer) return null;
    return createPortal(content, portalContainer);
};

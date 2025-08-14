import React, { useContext, useMemo, useRef, useState } from "react";
import { flattenObject } from "./utils";
import { DebugMode } from "./DebugMode.enum";
import DebugList from "./ModeDisplay/DebugList/DebugList";
import DebugJson from "./ModeDisplay/DebugJson/DebugJson";
import { TemplateContext } from "../../../engine";
import "./reset.css";
import styles from "./VariablesDebug.module.css";

export const VariablesDebug = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mode, setMode] = useState(DebugMode.LIST);
    const templateContext = useContext(TemplateContext);
    const copyButtonRef = useRef(null);

    const data = useMemo(
        () => templateContext?.templateData ?? {},
        [templateContext]
    );

    const jsonString = useMemo(
        () => JSON.stringify(data, null, 2),
        [data, templateContext]
    );
    const flatRows = useMemo(
        () => flattenObject(data),
        [data, templateContext]
    );

    const handleCopy = async () => {
        const copyButton = copyButtonRef.current;
        try {
            await navigator.clipboard.writeText(
                mode === DebugMode.JSON
                    ? jsonString
                    : flatRows
                          .map(
                              (row) =>
                                  `${row.path}: ${JSON.stringify(row.value)}`
                          )
                          .join("\n")
            );

            if (!copyButton) return;

            copyButton.classList.add(styles.copyBtnSuccess);
            copyButton.textContent = "Copied!";
            setTimeout(() => {
                copyButtonRef.current?.classList.remove(
                    styles.copyBtnSuccess,
                    styles.copyBtnError
                );
            }, 3000);
        } catch {
            copyButton?.classList.add(styles.copyBtnError);
            setTimeout(() => {
                copyButton?.classList.remove(styles.copyBtnError);
            }, 3000);
        }
    };

    return (
        <div
            className={`${styles.container} ${
                isExpanded ? styles.expanded : ""
            }`}
            onClick={() => setIsExpanded((prevIsExpanded) => !prevIsExpanded)}
            role="button"
        >
            <div className={styles.header}>
                <p style={{ margin: 0, fontWeight: 600 }}>Debug Variables</p>
                <div
                    className={styles.actions}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isExpanded && (
                        <>
                            <button
                                className={`${styles.btn} ${
                                    mode === DebugMode.LIST ? styles.active : ""
                                }`}
                                onClick={() => setMode(DebugMode.LIST)}
                            >
                                List
                            </button>
                            <button
                                className={`${styles.btn} ${
                                    mode === DebugMode.JSON ? styles.active : ""
                                }`}
                                onClick={() => setMode(DebugMode.JSON)}
                            >
                                JSON
                            </button>
                        </>
                    )}
                    <button
                        className={styles.btn}
                        onClick={() =>
                            setIsExpanded((prevIsExpanded) => !prevIsExpanded)
                        }
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
                <div
                    className={styles.info}
                    onClick={(e) => e.stopPropagation()}
                >
                    {mode === DebugMode.JSON ? (
                        <DebugJson jsonString={jsonString} />
                    ) : (
                        <DebugList flatRows={flatRows} />
                    )}
                </div>
            )}
        </div>
    );
};

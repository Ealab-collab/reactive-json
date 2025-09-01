import { useDebugContext } from "../../../engine/DebugContext.jsx";
import { useEffect, useState, useRef } from "react";
import styles from "./DebugOverlay.module.css";

const HIDE_AFTER_CHANGE_MS = 120;

export const DebugOverlay = () => {
    const { debugComponents, viewportSize, scrollPosition, scanAndUpdatePositions } = useDebugContext();
    const [isScrolling, setIsScrolling] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const scrollHideTimerRef = useRef(null);
    const resizeHideTimerRef = useRef(null);


    useEffect(() => {
        if (scanAndUpdatePositions) {
            scanAndUpdatePositions();
        }
    }, [viewportSize, scrollPosition, scanAndUpdatePositions]);
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);
            if (scrollHideTimerRef.current) clearTimeout(scrollHideTimerRef.current);
            scrollHideTimerRef.current = setTimeout(() => setIsScrolling(false), HIDE_AFTER_CHANGE_MS);
        };

        const handleResize = () => {
            setIsResizing(true);
            if (resizeHideTimerRef.current) clearTimeout(resizeHideTimerRef.current);
            resizeHideTimerRef.current = setTimeout(() => setIsResizing(false), HIDE_AFTER_CHANGE_MS);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
            if (scrollHideTimerRef.current) clearTimeout(scrollHideTimerRef.current);
            if (resizeHideTimerRef.current) clearTimeout(resizeHideTimerRef.current);
        };
    }, []);

    return (
        <div className={styles.overlayRoot}>
            <div className={styles.infoPanel}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>🔍 Debug Mode Active</div>
                <div>
                    Viewport: {viewportSize.width} × {viewportSize.height}
                </div>
                <div>
                    Scroll: {scrollPosition.x}, {scrollPosition.y}
                </div>
                <div>Components: {debugComponents.length}</div>
                <div style={{ marginTop: "8px", fontSize: "10px", opacity: 0.8 }}>
                    Positions auto-update on scroll/resize
                </div>
                <button onClick={scanAndUpdatePositions} className={styles.scanButton}>
                    🔍 Scan Now
                </button>
            </div>

            {!isScrolling &&
                !isResizing &&
                debugComponents.map((component) => (
                    <button
                        key={component.path}
                        className={styles.indicatorButton}
                        style={{
                            top: component.rect.top - scrollPosition.y + 2,
                            left: component.rect.left - scrollPosition.x + component.rect.width - 22,
                        }}
                        title={component.title}
                        onClick={() => {
                            console.info("Component clicked:", component.path);
                        }}
                    >
                        ?
                    </button>
                ))}
        </div>
    );
};

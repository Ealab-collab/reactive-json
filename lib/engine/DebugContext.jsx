import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";

export const DebugContext = createContext();

const timeToWaitAfterViewportChange = 100;

export const DebugProvider = ({ children }) => {
    const [debugComponents, setDebugComponents] = useState([]);
    const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [scrollPosition, setScrollPosition] = useState({ x: window.pageXOffset, y: window.pageYOffset });

    const handleResize = useCallback(() => {
        let resizeTimer;
        return () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                setViewportSize((prev) => {
                    const newSize = { width: window.innerWidth, height: window.innerHeight };
                    if (prev.width === newSize.width && prev.height === newSize.height) {
                        return prev;
                    }
                    return newSize;
                });
            }, timeToWaitAfterViewportChange);
        };
    }, []);

    const handleScroll = useCallback(() => {
        let scrollTimer;
        return () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                setScrollPosition({ x: window.pageXOffset, y: window.pageYOffset });
            }, timeToWaitAfterViewportChange);
        };
    }, []);

    useEffect(() => {
        const debouncedResize = handleResize();
        const debouncedScroll = handleScroll();

        window.addEventListener("resize", debouncedResize);
        window.addEventListener("scroll", debouncedScroll, { passive: true });

        return () => {
            window.removeEventListener("resize", debouncedResize);
            window.removeEventListener("scroll", debouncedScroll);
        };
    }, [handleResize, handleScroll]);

    // Determine whether a DOMRect is within an extended viewport area
    // The extension by its own width/height avoids flicker for partially off-screen elements
    const isRectWithinExtendedViewport = useCallback((rect) => {
        if (!rect) return false;

        const hasPositiveSize = rect.width > 0 && rect.height > 0;
        if (!hasPositiveSize) return false;

        const extendedTop = -rect.height;
        const extendedLeft = -rect.width;
        const extendedBottom = window.innerHeight + rect.height;
        const extendedRight = window.innerWidth + rect.width;

        const isVerticallyWithin = rect.top >= extendedTop && rect.bottom <= extendedBottom;
        const isHorizontallyWithin = rect.left >= extendedLeft && rect.right <= extendedRight;

        return isVerticallyWithin && isHorizontallyWithin;
    }, []);

    const scanAndUpdatePositions = useCallback(() => {
        console.info("Scanning for components...");

        const potentialComponents = [];

        const reactComponents = document.querySelectorAll(
            '[class*="View"], [class*="Component"], [class*="Field"], [class*="Element"]'
        );
        reactComponents.forEach((element, index) => {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                potentialComponents.push({
                    element,
                    path: `react-component-${index}`,
                    type: "react",
                });
            }
        });

        const formElements = document.querySelectorAll("input, select, textarea, button, label, form");
        formElements.forEach((element, index) => {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                potentialComponents.push({
                    element,
                    path: `form-element-${index}`,
                    type: "form",
                });
            }
        });

        const contentDivs = document.querySelectorAll("div, section, article, main, aside, header, footer");
        contentDivs.forEach((element, index) => {
            const MIN_WIDTH = 50;
            const MIN_HEIGHT = 20;
            if (
                element.offsetWidth > MIN_WIDTH &&
                element.offsetHeight > MIN_HEIGHT &&
                element.children.length > 0 &&
                !element.classList.contains("debug-overlay")
            ) {
                potentialComponents.push({
                    element,
                    path: `content-div-${index}`,
                    type: "content",
                });
            }
        });

        const newComponents = [];

        potentialComponents.forEach(({ element, path, type }) => {
            const rect = element.getBoundingClientRect();

            if (isRectWithinExtendedViewport(rect)) {
                newComponents.push({
                    path: `${type}: ${path}`,
                    rect: {
                        top: rect.top + window.pageYOffset,
                        left: rect.left + window.pageXOffset,
                        width: rect.width,
                        height: rect.height,
                    },
                    title: `Type: ${type}, Path: ${path}`,
                });
            }
        });

        setDebugComponents(newComponents);
        console.info(`Found ${newComponents.length} components`);
    }, [isRectWithinExtendedViewport]);

    const contextValue = useMemo(
        () => ({
            debugComponents,
            scanAndUpdatePositions,
            viewportSize,
            scrollPosition,
        }),
        [debugComponents, scanAndUpdatePositions, viewportSize, scrollPosition]
    );

    return <DebugContext.Provider value={contextValue}>{children}</DebugContext.Provider>;
};

DebugProvider.propTypes = {
    children: PropTypes.node,
};

export const useDebugContext = () => {
    const context = useContext(DebugContext);
    if (!context) {
        throw new Error("useDebugContext must be used within a DebugProvider");
    }
    return context;
};

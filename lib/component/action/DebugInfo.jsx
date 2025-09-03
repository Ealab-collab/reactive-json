import { useContext, useRef, useEffect, useState, useCallback } from "react";
import { GlobalDataContext } from "../../engine/GlobalDataContext.jsx";
import { TemplateContext } from "../../engine/TemplateContext.jsx";

/**
 * Map to store hover listeners to avoid duplication
 * Key: DOM element, Value: {onMouseEnter, onMouseLeave}
 */
const hoverListenersMap = new WeakMap();

/**
 * Shared debug popup to avoid duplication
 */
let sharedDebugPopup = null;

/**
 * Action component that adds debug info on hover
 * Optimized to limit the number of listeners
 */
export const DebugInfo = ({ children, componentProps, actionProps }) => {
    const globalDataContext = useContext(GlobalDataContext);
    const templateContext = useContext(TemplateContext);
    const containerRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    // Create shared popup if it doesn't exist
    useEffect(() => {
        if (!sharedDebugPopup) {
            sharedDebugPopup = document.createElement('div');
            sharedDebugPopup.id = 'reactive-json-debug-popup';
            sharedDebugPopup.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.95);
                color: white;
                padding: 16px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                max-width: 500px;
                max-height: 400px;
                overflow: auto;
                z-index: 10000;
                pointer-events: none;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                border: 1px solid #444;
                display: none;
                line-height: 1.4;
            `;
            document.body.appendChild(sharedDebugPopup);
        }

        return () => {
            // Cleanup when the last component unmounts
            if (sharedDebugPopup && document.querySelectorAll('[data-debug-info]').length === 0) {
                document.body.removeChild(sharedDebugPopup);
                sharedDebugPopup = null;
            }
        };
    }, []);

    // Optimized mousemove handler
    const handleMouseMove = useCallback((e) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
    }, []);

    // Optimized mouse enter handler
    const handleMouseEnter = useCallback((e) => {
        e.stopPropagation();
        setIsHovered(true);
        
        // Add mousemove listener only when necessary
        document.addEventListener('mousemove', handleMouseMove);
        
        if (sharedDebugPopup) {
            // Collect debug information
            const debugInfo = {
                componentType: componentProps?.type || 'Unknown',
                templatePath: templateContext?.path || 'Root',
                templateData: templateContext?.templateData,
                globalDataPath: globalDataContext?.path || 'Root',
                hasActions: Array.isArray(componentProps?.actions) && componentProps.actions.length > 0,
                actionsCount: Array.isArray(componentProps?.actions) ? componentProps.actions.length : 0,
                hasAttributes: !!componentProps?.attributes,
                hasContent: !!componentProps?.content,
                dataLocation: componentProps?.dataLocation,
                load: componentProps?.load,
                props: componentProps
            };

            // Analyze actions to provide more details
            let actionsDetails = '';
            if (debugInfo.hasActions) {
                const actionTypes = componentProps.actions.map(action => action.what || 'Unknown').join(', ');
                actionsDetails = `<div style="margin-left: 10px; font-size: 11px; color: #aaa;">Types: ${actionTypes}</div>`;
            }

            // Generate approximate YAML path
            const generateYamlPath = () => {
                if (debugInfo.load) {
                    return `templates.${debugInfo.load}`;
                }
                if (debugInfo.templatePath && debugInfo.templatePath !== 'Root') {
                    const pathParts = debugInfo.templatePath.split('.');
                    return `renderView${pathParts.length > 1 ? '.' + pathParts.slice(1).join('.') : ''}`;
                }
                return 'renderView';
            };

            const yamlPath = generateYamlPath();

            // Location tips
            const locationTips = (() => {
                const tips = [];
                if (debugInfo.load) {
                    tips.push(`📍 Look in section "templates.${debugInfo.load}"`);
                }
                if (debugInfo.dataLocation) {
                    tips.push(`🔗 dataLocation property: "${debugInfo.dataLocation}"`);
                }
                if (debugInfo.componentType && debugInfo.componentType !== 'Unknown') {
                    tips.push(`🏷️ Look for "type: ${debugInfo.componentType}"`);
                }
                return tips;
            })();

            // Create HTML content for popup
            const content = `
                <div style="font-weight: bold; color: #4CAF50; margin-bottom: 8px;">
                    🐛 Reactive-JSON Debug Info
                </div>
                <div><strong>Type:</strong> ${debugInfo.componentType}</div>
                <div><strong>Template Path:</strong> ${debugInfo.templatePath}</div>
                <div><strong>Global Data Path:</strong> ${debugInfo.globalDataPath}</div>
                ${debugInfo.load ? `<div><strong>Template:</strong> ${debugInfo.load}</div>` : ''}
                ${debugInfo.dataLocation ? `<div><strong>Data Location:</strong> ${debugInfo.dataLocation}</div>` : ''}
                ${debugInfo.hasActions ? `<div><strong>Actions:</strong> ${debugInfo.actionsCount}${actionsDetails}</div>` : ''}
                ${debugInfo.hasAttributes ? '<div><strong>Has Attributes:</strong> ✓</div>' : ''}
                ${debugInfo.hasContent ? '<div><strong>Has Content:</strong> ✓</div>' : ''}
                
                <hr style="margin: 8px 0; border: 1px solid #333;">
                <div style="font-size: 11px;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 4px;">📁 YAML Location:</div>
                    <div style="background: rgba(255,215,0,0.1); padding: 4px; border-radius: 3px; margin-bottom: 6px;">
                        <code style="color: #FFD700;">${yamlPath}</code>
                    </div>
                    ${locationTips.map(tip => `<div style="color: #87CEEB; margin: 2px 0;">• ${tip}</div>`).join('')}
                </div>
                
                <hr style="margin: 8px 0; border: 1px solid #333;">
                <div style="font-size: 11px; color: #ccc;">
                    <div><strong>Template Data:</strong></div>
                    <pre style="margin: 4px 0; max-height: 100px; overflow: auto; background: rgba(255,255,255,0.1); padding: 4px; border-radius: 3px;">${JSON.stringify(debugInfo.templateData, null, 2).slice(0, 500)}${JSON.stringify(debugInfo.templateData, null, 2).length > 500 ? '...' : ''}</pre>
                </div>
            `;

            sharedDebugPopup.innerHTML = content;
            sharedDebugPopup.style.display = 'block';
        }
    }, [componentProps, templateContext, globalDataContext, handleMouseMove]);

    // Optimized mouse leave handler
    const handleMouseLeave = useCallback((e) => {
        e.stopPropagation();
        setIsHovered(false);
        
        // Remove mousemove listener for optimization
        document.removeEventListener('mousemove', handleMouseMove);
        
        if (sharedDebugPopup) {
            sharedDebugPopup.style.display = 'none';
        }
    }, [handleMouseMove]);

    // Effect to update popup position
    useEffect(() => {
        if (isHovered && sharedDebugPopup) {
            const popup = sharedDebugPopup;
            let x = mousePosition.x + 10;
            let y = mousePosition.y + 10;

            // Adjust position to avoid overflow
            if (x + popup.offsetWidth > window.innerWidth) {
                x = mousePosition.x - popup.offsetWidth - 10;
            }
            if (y + popup.offsetHeight > window.innerHeight) {
                y = mousePosition.y - popup.offsetHeight - 10;
            }

            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
        }
    }, [isHovered, mousePosition]);

    // Add listeners in an optimized way
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check if listeners already exist for this element
        if (!hoverListenersMap.has(container)) {
            // Mark element as having debug info
            container.setAttribute('data-debug-info', 'true');
            
            // Store listener references
            const listeners = {
                onMouseEnter: handleMouseEnter,
                onMouseLeave: handleMouseLeave
            };
            
            hoverListenersMap.set(container, listeners);
            
            // Add listeners
            container.addEventListener('mouseenter', listeners.onMouseEnter);
            container.addEventListener('mouseleave', listeners.onMouseLeave);
        }

        return () => {
            if (container && hoverListenersMap.has(container)) {
                const listeners = hoverListenersMap.get(container);
                container.removeEventListener('mouseenter', listeners.onMouseEnter);
                container.removeEventListener('mouseleave', listeners.onMouseLeave);
                container.removeAttribute('data-debug-info');
                hoverListenersMap.delete(container);
            }
        };
    }, [handleMouseEnter, handleMouseLeave]);

    return (
        <div ref={containerRef} style={{ display: 'contents' }}>
            {children}
        </div>
    );
};

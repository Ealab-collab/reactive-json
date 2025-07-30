/**
 * Data mapping system with modular processors.
 * Allows to selectively dispatch response data to different locations.
 */

/**
 * Applies the dataMapping system to a response.
 * 
 * @param {Object} params - Parameters
 * @param {Object} params.dataMapping - Configuration of the dataMapping.
 * @param {*} params.responseData - Response data to map.
 * @param {Object} params.globalDataContext - Global data context.
 * @param {Object} params.templateContext - Template context.
 */
export const applyDataMapping = ({ dataMapping, responseData, globalDataContext, templateContext }) => {
    if (!dataMapping || typeof dataMapping !== 'object') {
        return;
    }

    // Get enabled data mapping processors.
    const dataMappingProcessors = globalDataContext.plugins?.dataMapping || {};

    if (Object.keys(dataMappingProcessors).length === 0) {
        return;
    }

    // Execute each processor.
    Object.entries(dataMapping).forEach(([processorName, config]) => {
        const processor = dataMappingProcessors[processorName];
        
        if (!processor) {
            console.warn("dataMappingSystem: Unknown processor: ", processorName);
            return;
        }

        try {
            processor({config, globalDataContext, responseData, templateContext});
        } catch (error) {
            console.error("dataMappingSystem: Error in processor ", processorName, ":", error);
        }
    });
};

 
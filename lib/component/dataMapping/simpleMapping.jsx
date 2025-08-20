import { dataLocationToPath, evaluateTemplateValueCollection } from "../../engine/TemplateSystem.jsx";

/**
 * Simple mapping processor based on string → location associations.
 *
 * @param {Object} mappingProps.config - Simple mapping configuration
 * @param {Object} mappingProps.globalDataContext - Global data context
 * @param {Object} mappingProps.templateContext - Template context
 * @param {*} mappingProps.responseData - Response data to map
 */
export function simpleMapping({ config, globalDataContext, templateContext, responseData }) {
    const { stringMap = {}, onErrorMap } = config;

    const { updateData } = globalDataContext;

    try {
        /*
         * The first step is to gather all the destination paths, values, and update modes.
         * We must do this before applying the data because we want to
         * have consistent data when applying it.
         * Then, when the gathering succeeds, we apply all the data at once.
         * Finally, when the gathering fails, we apply the fallback map (onErrorMap).
         */

        /**
         * The data to apply.
         */
        const toApply = Object.entries(stringMap)
            .map(([destinationDataLocation, mappingConfig]) => {
                return processMappingItem({
                    destinationDataLocation,
                    mappingConfig,
                    sourceDataRetriever: ({ location }) =>
                        retrieveValueFromResponseData({ location, data: responseData }),
                });
            })
            .filter(Boolean);

        // Apply the data.
        // Dev note: The values are supposed to be cloned in updateData,
        // so we don't need to clone them here.
        toApply.forEach(applyMappingItem);
    } catch (error) {
        // The mapping is failing.
        if (!onErrorMap) {
            // There is no onErrorMap. The mapping totally failed.
            throw error;
        }

        // There is an onErrorMap. The mapping failed.
        // Apply the onErrorMap.
        const toApplyOnError = Object.entries(onErrorMap)
            .map(([destinationDataLocation, mappingConfig]) => {
                return processMappingItem({
                    destinationDataLocation,
                    mappingConfig,
                    sourceDataRetriever: retrieveValueFromTemplateData,
                });
            })
            .filter(Boolean);

        // Apply the data.
        // Dev note: The values are supposed to be cloned in updateData,
        // so we don't need to clone them here.
        toApplyOnError.forEach(applyMappingItem);
    }

    /**
     * Applies a mapping item.
     *
     * @param {Object} mappingItem - The mapping item to apply.
     */
    function applyMappingItem({ destinationPath, value, updateMode }) {
        // TODO: support root update.
        updateData(value, destinationPath, updateMode);
    }

    /**
     * Retrieves the value from the response data.
     *
     * @param {Object} params - The parameters to retrieve the value from the response data.
     * @param {string} params.location - The location to parse.
     * @param {Object} params.data - The data to parse.
     * @returns {any} The value at the given location.
     */
    function retrieveValueFromResponseData({ location, data }) {
        if (typeof data !== "object") {
            throw new Error("simpleMapping: Could not find location in response data: " + location + ".");
        }

        if (!location || location === "") {
            throw new Error("simpleMapping: Location is empty.");
        }

        const currentLocation = location.split(".")[0];

        if (currentLocation in data) {
            const remainingLocation = location.split(".").slice(1).join(".");

            if (remainingLocation === "") {
                // When no remaining location, return the value.
                return data[currentLocation];
            }

            // When there is a remaining location, parse the remaining location.
            return retrieveValueFromResponseData({ location: remainingLocation, data: data[currentLocation] });
        }

        // When the current location is not found, throw an error.
        throw new Error(
            "simpleMapping: Could not find location in response data: " + location + " (location not found in data)."
        );
    }

    /**
     * Retrieves the value from the template data.
     *
     * @param {Object} params - The parameters to retrieve the value from the template data.
     * @param {string} params.location - The location to parse.
     * @returns {any} The value at the given location.
     */
    function retrieveValueFromTemplateData({ location }) {
        // Retrieve using the template system.
        return evaluateTemplateValueCollection({
            valueToEvaluate: location,
            globalDataContext,
            templateContext,
            evaluationDepth: -1,
        });
    }

    /**
     * Processes a mapping item.
     *
     * @param {Object} params - The parameters to process the mapping item.
     * @param {string} params.destinationDataLocation - The destination data location.
     * @param {Object} params.mappingConfig - The mapping configuration.
     * @param {Function} params.sourceDataRetriever - The function to retrieve the value from the source data.
     * @returns {Object} The processed mapping item.
     */
    function processMappingItem({ destinationDataLocation, mappingConfig, sourceDataRetriever }) {
        // Default configuration.
        const { value, required = true, defaultValue } = mappingConfig;

        let updateMode = "";

        // Validate the configuration.
        // Invalid configuration should not trigger an error; they are ignored.
        // Validate the updateMode.
        const allowedUpdateModes = ["add", "move", "remove", "replace", ""];

        if (updateMode && !allowedUpdateModes.includes(updateMode)) {
            console.warn("simpleMapping: invalid updateMode:", updateMode, "for", destinationDataLocation);
            return;
        }

        if (updateMode === "replace") {
            // Empty string means "replace" in ReactiveJsonRoot::updateDataObject.
            updateMode = "";
        }

        if (!value) {
            console.warn("simpleMapping: 'value' is missing for", destinationDataLocation);
            return;
        }

        // Process the destination path early in order to fail fast when it is invalid.
        const evaluatedDestinationPath = dataLocationToPath({
            dataLocation: destinationDataLocation,
            // TODO: This is incorrect because simpleMapping could be called from a fetchData reaction that is not located at the root of the data.
            currentPath: "data",
            globalDataContext,
            templateContext,
        });

        if (typeof evaluatedDestinationPath !== "string" || !evaluatedDestinationPath.startsWith("data")) {
            console.warn(
                "simpleMapping: the given destination path is invalid:",
                destinationDataLocation,
                "->",
                evaluatedDestinationPath
            );
            return;
        }

        try {
            const sourceValue = sourceDataRetriever({ location: value });

            return {
                destinationPath: evaluatedDestinationPath,
                value: sourceValue,
                updateMode: updateMode,
            };
        } catch (error) {
            // The value is not found in the response data.
            if (required) {
                // This is a required value. The mapping may fail unless there is a fallback map (onErrorMap).
                throw new Error("simpleMapping: Required value not found in response data: " + value + ".");
            }

            // The location is not required. Use defaultValue if provided.
            if (defaultValue !== undefined) {
                // Evaluate the default value.
                const evaluatedDefaultValue = evaluateTemplateValueCollection({
                    valueToEvaluate: defaultValue,
                    globalDataContext,
                    templateContext,
                    evaluationDepth: -1,
                });

                return {
                    destinationPath: evaluatedDestinationPath,
                    value: evaluatedDefaultValue,
                    updateMode: updateMode,
                };
            }
        }
    }
}

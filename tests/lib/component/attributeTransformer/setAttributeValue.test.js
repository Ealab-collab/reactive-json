import { setAttributeValue } from "../../../../lib/component/attributeTransformer/setAttributeValue.jsx";

describe("setAttributeValue", () => {
    const mockGlobalDataContext = {};
    const mockTemplateContext = {};

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("String values", () => {
        it("should append string value in default mode", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "new-class",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("existing-class new-class");
        });

        it("should replace string value in replace mode", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    mode: "replace",
                    value: "new-class",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("new-class");
        });

        it("should prevent duplicate values by default", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "existing-class",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("existing-class");
        });

        it("should allow duplicate values when preventDuplicateValues is false", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "existing-class",
                    preventDuplicateValues: false,
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("existing-class existing-class");
        });

        it("should use custom separator", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "new-class",
                    separator: ",",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("existing-class,new-class");
        });

        it("should handle empty string attribute", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "new-class",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("new-class");
        });

        it("should handle missing attribute", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = {};
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "new-class",
                },
                templateContext: mockTemplateContext,
            });

            expect(result.className).toBe("new-class");
        });

        it("should replace value when currentValue is not a string", () => {
            // Use an attribute that doesn't get normalized (not "class" or "for")
            // so we can test the replacement case properly
            const attributes = { dataValue: { invalid: "object" } };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "dataValue",
                    value: "new-value",
                },
                templateContext: mockTemplateContext,
            });

            // When currentValue is not a string, it should be replaced with the new value
            expect(result.dataValue).toBe("new-value");
        });
    });

    describe("Object values", () => {
        it("should merge object properties in default mode", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: "blue",
                        padding: "10px",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "red blue",
                fontSize: "12px",
                padding: "10px",
            });
        });

        it("should replace entire object in replace mode", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    mode: "replace",
                    value: {
                        borderColor: "blue",
                        padding: "10px",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "blue",
                padding: "10px",
            });
        });

        it("should merge nested objects recursively", () => {
            const attributes = {
                style: {
                    border: {
                        color: "red",
                        width: "1px",
                    },
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        border: {
                            color: "blue",
                            style: "solid",
                        },
                        padding: "10px",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                border: {
                    color: "red blue",
                    width: "1px",
                    style: "solid",
                },
                fontSize: "12px",
                padding: "10px",
            });
        });

        it("should handle object with string properties in append mode", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    mode: "append",
                    value: {
                        borderColor: "blue",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style.borderColor).toBe("red blue");
        });

        it("should handle object with string properties in replace mode", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    mode: "replace",
                    value: {
                        borderColor: "blue",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "blue",
            });
        });

        it("should handle missing object attribute", () => {
            const attributes = {};

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: "blue",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "blue",
            });
        });

        it("should handle non-object current value by replacing with new object", () => {
            const attributes = {
                style: "invalid-string",
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: "blue",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "blue",
            });
        });

        it("should prevent duplicate string values in object properties", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: "red",
                    },
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style.borderColor).toBe("red");
        });

        it("should allow duplicate string values when preventDuplicateValues is false", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: "red",
                    },
                    preventDuplicateValues: false,
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style.borderColor).toBe("red red");
        });

        it("should handle array values by replacing (arrays are not objects)", () => {
            const attributes = {
                items: ["item1", "item2"],
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "items",
                    value: ["item3"],
                    mode: "replace",
                },
                templateContext: mockTemplateContext,
            });

            // Arrays are treated as non-objects (Array.isArray check), so they follow string logic
            // In replace mode, the array replaces the existing value
            // The array is stored as-is (not stringified) because replace mode directly assigns
            expect(Array.isArray(result.items)).toBe(true);
            expect(result.items).toEqual(["item3"]);
        });

        it("should handle null value", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: null,
                },
                templateContext: mockTemplateContext,
            });

            // null is not an object, so it follows string logic
            // Since style is an object (not a string), it gets replaced with null
            expect(result.style).toBeNull();
        });

        it("should assign undefined to object properties", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {
                        borderColor: undefined,
                        padding: "10px",
                    },
                },
                templateContext: mockTemplateContext,
            });

            // undefined properties should be assigned (not ignored)
            expect(result.style.borderColor).toBeUndefined();
            expect(result.style.fontSize).toBe("12px");
            expect(result.style.padding).toBe("10px");
        });

        it("should assign undefined to object properties in replace mode", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                    fontSize: "12px",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    mode: "replace",
                    value: {
                        borderColor: undefined,
                        padding: "10px",
                    },
                },
                templateContext: mockTemplateContext,
            });

            // In replace mode, undefined properties should be assigned
            expect(result.style.borderColor).toBeUndefined();
            expect(result.style.fontSize).toBeUndefined(); // Not in new object, so undefined
            expect(result.style.padding).toBe("10px");
        });
    });

    describe("Edge cases", () => {
        it("should return attributes object even if no changes are made", () => {
            // Use className directly since "class" gets normalized to "className"
            const attributes = { className: "existing" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: "existing",
                },
                templateContext: mockTemplateContext,
            });

            expect(result).toBe(attributes);
            expect(result.className).toBe("existing");
        });

        it("should handle empty object merge", () => {
            const attributes = {
                style: {
                    borderColor: "red",
                },
            };

            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "style",
                    value: {},
                },
                templateContext: mockTemplateContext,
            });

            expect(result.style).toEqual({
                borderColor: "red",
            });
        });

        it("should assign undefined when undefined in replace mode", () => {
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    mode: "replace",
                    value: undefined,
                },
                templateContext: mockTemplateContext,
            });

            // undefined value in replace mode assigns undefined to the attribute
            expect(result.className).toBeUndefined();
        });

        it("should ignore undefined value in append mode", () => {
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    value: undefined,
                },
                templateContext: mockTemplateContext,
            });

            // undefined value in append mode is ignored, current value unchanged
            expect(result.className).toBe("existing-class");
            expect(result).toBe(attributes);
        });

        it("should ignore missing value property", () => {
            const attributes = { className: "existing-class" };
            const result = setAttributeValue({
                attributes,
                globalDataContext: mockGlobalDataContext,
                singleTransformProps: {
                    name: "className",
                    // value is missing (undefined)
                },
                templateContext: mockTemplateContext,
            });

            // missing value (undefined) is ignored, current value unchanged
            expect(result.className).toBe("existing-class");
            expect(result).toBe(attributes);
        });
    });
});


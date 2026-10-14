import { evaluateFieldOptions } from "../../../../lib/engine/utility/formElementsCommon.jsx";

describe("evaluateFieldOptions", () => {
    const globalDataContext = {
        templatePath: "data",
        templateData: {
            me: { id: "u42", name: "Ada" },
            sessions: [{ label: "20 octobre", kind: "autumn" }, { label: "15 décembre", kind: "winter" }],
            colors: ["red", "green"],
            prefix: "Session",
        },
    };
    const templateContext = {
        templatePath: "data.rows.0",
        templateData: { code: "a", name: "Alpha" },
    };
    const evaluate = (props) => evaluateFieldOptions({ props, globalDataContext, templateContext });

    describe("static options", () => {
        it("evaluates the label and the value in the element context", () => {
            expect(evaluate({ options: [{ label: "~.name", value: "~.code" }, { label: "~~.me.name", value: "~~.me.id" }] }))
                .toEqual([
                    { label: "Alpha", value: "a" },
                    { label: "Ada", value: "u42" },
                ]);
        });

        it("keeps the literal values and the other keys", () => {
            const attributes = { class: "~.code" };

            expect(evaluate({ options: [{ label: "Yes", value: true, attributes }, { label: "Ten", value: 10 }] }))
                .toEqual([
                    { label: "Yes", value: true, attributes },
                    { label: "Ten", value: 10 },
                ]);
        });

        it("uses a scalar item as both label and value", () => {
            expect(evaluate({ options: ["small", "~.code"] })).toEqual([
                { label: "small", value: "small" },
                { label: "a", value: "a" },
            ]);
        });

        it("returns an empty list when there are no options", () => {
            expect(evaluate({})).toEqual([]);
            expect(evaluate({ options: "not a list" })).toEqual([]);
        });
    });

    describe("dynamic options", () => {
        it("takes precedence over the static options", () => {
            expect(evaluate({ dynamicOptions: "~~.colors", options: [{ label: "Ignored", value: "x" }] })).toEqual([
                { label: "red", value: "red" },
                { label: "green", value: "green" },
            ]);
        });

        it("returns an empty list when the reference does not resolve to a list", () => {
            expect(evaluate({ dynamicOptions: "~~.missing" })).toEqual([]);
            expect(evaluate({ dynamicOptions: "~~.prefix" })).toEqual([]);
        });
    });

    describe("optionMapping", () => {
        it("evaluates the mapping with the item as the template context", () => {
            expect(
                evaluate({
                    dynamicOptions: "~~.sessions",
                    optionMapping: { label: "~.label", value: "~.label" },
                })
            ).toEqual([
                { label: "20 octobre", value: "20 octobre", kind: "autumn" },
                { label: "15 décembre", value: "15 décembre", kind: "winter" },
            ]);
        });

        it("evaluates the nested structures of the mapping and keeps global references", () => {
            expect(
                evaluate({
                    dynamicOptions: "~~.sessions",
                    optionMapping: {
                        label: { type: "strong", content: ["~~.prefix", " ", "~.label"] },
                        value: "~.label",
                        attributes: { class: "~.kind" },
                    },
                })[1]
            ).toEqual({
                label: { type: "strong", content: ["Session", " ", "15 décembre"] },
                value: "15 décembre",
                kind: "winter",
                attributes: { class: "winter" },
            });
        });

        it("maps scalar items through the whole item reference", () => {
            expect(evaluate({ dynamicOptions: "~~.colors", optionMapping: { label: "~", value: "~" } })).toEqual([
                { label: "red", value: "red" },
                { label: "green", value: "green" },
            ]);
        });

        it("applies to the static options too", () => {
            expect(evaluate({ options: [{ title: "One", id: 1 }], optionMapping: { label: "~.title", value: "~.id" } }))
                .toEqual([{ title: "One", id: 1, label: "One", value: 1 }]);
        });
    });
});

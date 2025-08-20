export const validJsonObject = {
    a: 1,
    test: "test",
    object: {
        prop: 42,
    },
};

export const invalidJsonObject = "{invalid: json";

export const validYamlObject = `
a: 1
test: test
object:
  prop: 42
`;

export const expectedYamlObject = {
    a: 1,
    test: "test",
    object: {
        prop: 42,
    },
};

export const invalidYamlObject = `
invalid: [unclosed
test: test
object:
  prop: 42
`;

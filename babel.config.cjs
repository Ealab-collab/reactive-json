module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                targets: {
                    node: "current",
                },
                // Transform to CommonJS for Jest compatibility
                // Jest works better with CommonJS even with --experimental-vm-modules
                modules: "cjs",
            },
        ],
        [
            "@babel/preset-react",
            {
                runtime: "automatic", // Use the new JSX transform
            },
        ],
        "@babel/preset-typescript", // Support TypeScript files
    ],
};


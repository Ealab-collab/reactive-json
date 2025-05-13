export interface RjComponent {}

export interface ElementRjComponent extends RjComponent {
    props: RjBuildDefBase | Array<RjBuildDefBase> | undefined,
    path: string | undefined,
    currentData: any,
    datafield: string | undefined,
}

/**
 * The Reactive-JSON build definition from the JSON / YAML file.
 */
export interface RjBuildDefBase {
    /**
     * The Reactive-JSON component type.
     *
     * Either an HTML tag name, or a registered Reactive-JSON ElementRjComponent name.
     */
    type: string,
}

export declare class CustomFilter<u extends Record<keyof u, unknown>> extends PIXI.Filter {
    #private;
    constructor(vertex?: string, fragment?: string, uniforms?: u);
}

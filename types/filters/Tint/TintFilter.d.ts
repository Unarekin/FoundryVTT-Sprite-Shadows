import { CustomFilter } from "filters/CustomFilter";
export interface TintUniforms {
    tint: PIXI.ColorSource;
}
export declare class TintFilter extends CustomFilter<TintUniforms> {
    get tint(): PIXI.ColorSource;
    set tint(val: PIXI.ColorSource);
    get color(): import("pixi.js").ColorSource;
    set color(val: import("pixi.js").ColorSource);
    constructor(color?: PIXI.ColorSource);
}

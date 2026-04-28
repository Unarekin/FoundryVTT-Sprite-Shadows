import { CustomFilter } from "filters/CustomFilter";
export interface AlphaThresholdUniforms {
    threshold: number;
    alpha: number;
}
export declare class AlphaThresholdFilter extends CustomFilter<AlphaThresholdUniforms> {
    get threshold(): any;
    set threshold(val: any);
    get alpha(): any;
    set alpha(val: any);
    constructor(threshold?: number, alpha?: number);
}

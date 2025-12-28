export declare function downloadJSON(json: object, name: string): void;
export declare function uploadJSON<t = any>(): Promise<t>;
export declare function isoToCartesian(isoX: number, isoY: number): {
    x: number;
    y: number;
};
export declare function cartesianToIso(isoX: number, isoY: number): {
    x: number;
    y: number;
};

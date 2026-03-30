export declare function logImage(url: string, width?: number, height?: number): void;
export declare function logTexture(texture: PIXI.Texture): void;
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
export declare function findCentralAnchorPoint(texture: PIXI.Texture): {
    x: number;
    y: number;
} | undefined;
export declare function findBottomAnchorPoint(texture: PIXI.Texture): {
    x: number;
    y: number;
} | undefined;
/**
 * Returns black or white based on the luminance of a given color
 * @param {PIXI.Color} color - {@link PIXI.Color}
 * @returns - {@link PIXI.Color} representing black or white
 */
export declare function contrastColor(color: PIXI.Color): PIXI.Color;

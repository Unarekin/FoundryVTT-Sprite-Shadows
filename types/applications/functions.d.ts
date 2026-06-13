export declare function unhighlightSprite(sprite: PIXI.Sprite): void;
export declare function highlightSprite(sprite: PIXI.Sprite, layer?: foundry.canvas.layers.PlaceablesLayer<any>): PIXI.DisplayObject | undefined;
export declare function releaseSprite(sprite: PIXI.Sprite): void;
type ResizeCallback = ((adjust: {
    x: number;
    y: number;
}) => void);
export declare function controlSprite(sprite: PIXI.Sprite, resize?: boolean, resizeCallback?: ResizeCallback, layer?: foundry.canvas.layers.PlaceablesLayer<any>): import("pixi.js").DisplayObject | undefined;
export declare function setFormElementValue(element: HTMLElement, selector: string, value: string, dispatchEvent?: boolean): void;
export {};

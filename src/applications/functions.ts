const highlightRegistry = new WeakMap<PIXI.Sprite, PIXI.DisplayObject>();
const controlRegistry = new WeakMap<PIXI.Sprite, PIXI.DisplayObject>();

function destroyDisplayObject(displayObject: PIXI.DisplayObject) {
  if (displayObject.filters?.length) {
    const filters = [...displayObject.filters];
    displayObject.filters = [];
    filters.forEach(filter => { filter.destroy(); });
  }

  if (displayObject.children?.length) {
    const children = [...displayObject.children];
    children.forEach(child => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      displayObject.removeChild(child as any);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      destroyDisplayObject(child as any);
    });
  }
}

export function unhighlightSprite(sprite: PIXI.Sprite) {
  const oldSprite = highlightRegistry.get(sprite);
  if (oldSprite) {
    destroyDisplayObject(oldSprite);
    highlightRegistry.delete(sprite);
  }
}

function boundsRelativeTo(bounds: PIXI.Rectangle, parent: PIXI.DisplayObject): PIXI.Rectangle {
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom }
  ].map(pos => parent.toLocal(pos));

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  corners.forEach(({ x, y }) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return new PIXI.Rectangle(minX, minY, maxX - minX, maxY - minY);
}

export function highlightSprite(sprite: PIXI.Sprite): PIXI.DisplayObject | undefined {
  unhighlightSprite(sprite);
  if (!canvas?.tokens) return;

  const highlightSprite = createHighlightBorder(sprite, false);
  if (highlightSprite) {
    canvas.tokens.addChild(highlightSprite);
    highlightRegistry.set(sprite, highlightSprite);
  }
  return highlightSprite;
}

export function releaseSprite(sprite: PIXI.Sprite) {
  const oldSprite = controlRegistry.get(sprite);
  if (oldSprite) {
    destroyDisplayObject(oldSprite);
    controlRegistry.delete(sprite);
  }
}

export function controlSprite(sprite: PIXI.Sprite, resize = true) {
  releaseSprite(sprite);
  unhighlightSprite(sprite);
  if (!canvas?.tokens) return;

  const frame = createHighlightBorder(sprite, resize, CONFIG.Canvas.dispositionColors.CONTROLLED);
  if (frame) {
    canvas.tokens.addChild(frame);
    controlRegistry.set(sprite, frame);
  }
  return frame;
}

function createHighlightBorder(sprite: PIXI.Sprite, resize = false, color: PIXI.ColorSource = CONFIG.Canvas.dispositionColors.NEUTRAL): PIXI.DisplayObject | undefined {
  if (!canvas?.tokens) return;

  const frame = new PIXI.Container();
  frame.name = `${sprite.name ?? "ShadowSprite"}-Interaction`;
  frame.eventMode = "passive";
  frame.visible = true;

  const interaction = frame.addChild(new PIXI.Container());
  interaction.name = "interaction";
  interaction.eventMode = "auto";
  interaction.hitArea = frame.getBounds(true);

  const border = frame.addChild(new PIXI.Graphics() as unknown as PIXI.DisplayObject) as unknown as PIXI.Graphics;
  border.eventMode = "none";
  border.name = "border";

  border.tint = color as string;
  const thickness = (CONFIG.Canvas.objectBorderThickness * ((canvas.dimensions as unknown as { uiScale: number }).uiScale ?? 1));

  const bounds = boundsRelativeTo(sprite.getBounds() as unknown as PIXI.Rectangle, canvas.tokens);

  border.clear();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  border.lineStyle({ width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND as any, alignment: 0.75 })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .drawShape(bounds as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  border.lineStyle({ width: thickness / 2, color: 0xFFFFFF, join: PIXI.LINE_JOIN.ROUND as any, alignment: 1 })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .drawShape(bounds as any);

  const handle = frame.addChild(new foundry.canvas.containers.ResizeHandle([1, 1]) as unknown as PIXI.DisplayObject) as unknown as foundry.canvas.containers.ResizeHandle;
  handle.eventMode = "static";
  handle.name = "handle";
  handle.visible = resize;
  handle.x = bounds.right;
  handle.y = bounds.bottom;

  // TODO: Add handle events
  return frame;
}

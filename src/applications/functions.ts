
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

export function highlightSprite(sprite: PIXI.Sprite, layer?: foundry.canvas.layers.PlaceablesLayer<any>): PIXI.DisplayObject | undefined {
  unhighlightSprite(sprite);
  if (!canvas?.tokens) return;

  const highlightSprite = createHighlightBorder(sprite, false);
  if (highlightSprite) {
    if (layer) layer.addChild(highlightSprite);
    else canvas.tokens.addChild(highlightSprite);
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

type ResizeCallback = ((adjust: { x: number, y: number }) => void);

export function controlSprite(sprite: PIXI.Sprite, resize = true, resizeCallback?: ResizeCallback, layer?: foundry.canvas.layers.PlaceablesLayer<any>) {
  releaseSprite(sprite);
  unhighlightSprite(sprite);
  if (!canvas?.tokens) return;

  const frame = createHighlightBorder(sprite, resize, CONFIG.Canvas.dispositionColors.CONTROLLED);
  if (frame) {
    const handle = ((frame.children ?? []) as PIXI.DisplayObject[]).find((child) => child.name === "handle");
    if (handle) {
      const mouseMove = (e: MouseEvent) => {
        e.stopPropagation();
        if (!canvas?.tokens) return;

        const adjustment = {
          x: e.movementX,
          y: e.movementY
        }

        const border = ((frame.children ?? []) as PIXI.DisplayObject[]).find((child) => child.name === "border");
        if (border instanceof PIXI.Graphics) {
          const bounds = sprite.getBounds();

          if (!e.shiftKey) {
            const { width, height } = sprite.texture.baseTexture;
            const ratio = width / height;

            if (adjustment.x >= adjustment.y) {
              // This would normally be divided, but in this case we
              // multiply by the inverse to preserve the original
              // polarity
              adjustment.y = adjustment.x * (1 / ratio);
            } else {
              adjustment.x = adjustment.y * ratio;
            }
          }


          bounds.width += adjustment.x;
          bounds.height += adjustment.y;

          const local = boundsRelativeTo(bounds as unknown as PIXI.Rectangle, canvas.tokens);



          sprite.width += adjustment.x;
          sprite.height += adjustment.y;


          drawSelectionBorder(border, local);
          handle.x = local.right;
          handle.y = local.bottom;
        }

        if (resizeCallback) resizeCallback(adjustment);
      };


      handle.addEventListener("pointerenter", () => { handle.scale.set(1.5, 1.5); });
      handle.addEventListener("pointerout", () => { handle.scale.set(1, 1); });
      handle.addEventListener("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        if (e.buttons === 1) {
          e.stopPropagation();
          window.addEventListener("mousemove", mouseMove);
        }
      });
      handle.addEventListener("pointerup", () => { window.removeEventListener("mousemove", mouseMove) });
      handle.addEventListener("pointercancel", () => { window.removeEventListener("mousemove", mouseMove); });
      handle.addEventListener("pointerupoutside", () => { window.removeEventListener("mousemove", mouseMove); });
    }
    console.warn("Adding control frame:", layer);
    if (layer)
      layer.addChild(frame);
    else
      canvas.tokens.addChild(frame);
    controlRegistry.set(sprite, frame);
  }
  return frame;
}

function drawSelectionBorder(graphics: PIXI.Graphics, bounds: PIXI.Rectangle) {
  if (!canvas) return;

  const thickness = (CONFIG.Canvas.objectBorderThickness * ((canvas.dimensions as unknown as { uiScale: number }).uiScale ?? 1));
  graphics.clear();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  graphics.lineStyle({ width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND as any, alignment: 0.75 })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .drawShape(bounds as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  graphics.lineStyle({ width: thickness / 2, color: 0xFFFFFF, join: PIXI.LINE_JOIN.ROUND as any, alignment: 1 })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .drawShape(bounds as any);
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


  const bounds = boundsRelativeTo(sprite.getBounds() as unknown as PIXI.Rectangle, canvas.tokens);
  drawSelectionBorder(border, bounds);

  const handle = frame.addChild(new foundry.canvas.containers.ResizeHandle([1, 1]) as unknown as PIXI.DisplayObject) as unknown as foundry.canvas.containers.ResizeHandle;
  handle.eventMode = "static";
  handle.name = "handle";
  handle.visible = resize;
  handle.x = bounds.right;
  handle.y = bounds.bottom;

  // TODO: Add handle events
  return frame;
}


export function setFormElementValue(element: HTMLElement, selector: string, value: string, dispatchEvent = true) {
  const elem = element.querySelector(selector);
  if (!(elem instanceof HTMLInputElement)) return;
  elem.value = value;
  if (dispatchEvent)
    elem.dispatchEvent(new Event("change", { bubbles: true }));
}
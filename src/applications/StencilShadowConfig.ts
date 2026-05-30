import { StencilShadow } from "types";
import { StencilShadowContext } from "./types"
import { TintFilter } from "filters";
import { findBottomAnchorPoint, findCentralAnchorPoint } from "functions";
import { controlSprite, releaseSprite } from "./functions";

export class StencilShadowConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2<StencilShadowContext>) {
  #editPromise: Promise<StencilShadow | undefined> | undefined = undefined;
  #editResolve: ((config?: StencilShadow) => void) | undefined = undefined;
  #originalBounds = { x: 0, y: 0, width: 0, height: 0 };

  static DEFAULT_OPTIONS = {
    window: {
      title: "SPRITESHADOWS.SETTINGS.STENCIL.LABEL",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 600
    },
    tag: "form",
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      handler: StencilShadowConfig.FormHandler
    },
    actions: {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      cancel: StencilShadowConfig.Cancel,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      autoSetShadowAnchor: StencilShadowConfig.AutoSetAnchor
    }
  }

  static PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: `modules/${__MODULE_ID__}/templates/config/stencilEdit.hbs`
    },
    footer: {
      template: `templates/generic/form-footer.hbs`
    }
  }

  static AutoSetAnchor(this: StencilShadowConfig) {
    try {
      if (!this.previewSprite) return;

      const data = this.getFormData();
      if (!data) return;

      const anchor = data.alignment === "bottom" ? findBottomAnchorPoint(this.previewSprite.texture) : findCentralAnchorPoint(this.previewSprite.texture);

      if (!anchor) return;

      this.setElementValue(`[name="adjustments.anchor.x"]`, anchor.x, false);
      this.setElementValue(`[name="adjustments.anchor.y"]`, anchor.y, true);
      this.updatePreviewSprite();
      this.applyDragAdjustmentPreviews();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
    }
  }

  static async Cancel(this: StencilShadowConfig): Promise<void> {
    await this.close();
  }

  static async Edit(shadow: StencilShadow, previewSprite?: PIXI.Sprite): Promise<StencilShadow | undefined> {
    return (new StencilShadowConfig(shadow, previewSprite)).Edit();
  }

  public async Edit(shadow?: StencilShadow, previewSprite?: PIXI.Sprite): Promise<StencilShadow | undefined> {
    if (this.#editPromise) return this.#editPromise;
    if (shadow) this.shadowConfig = shadow;
    if (previewSprite) {
      this.previewSprite = previewSprite;
      this.#originalBounds = {
        x: previewSprite.x,
        y: previewSprite.y,
        width: previewSprite.width,
        height: previewSprite.height
      }
    }

    this.#editPromise = new Promise(resolve => {
      this.#editResolve = resolve;
    });
    await this.render({ force: true });
    return this.#editPromise;
  }



  protected getFormData(): StencilShadow | undefined {
    if (!this.form) return;
    const data = foundry.utils.expandObject((new foundry.applications.ux.FormDataExtended(this.form)).object) as StencilShadow;

    // When Sprite Animations is not installed, this form element is a hidden type,
    // which returns a string not a boolean.
    data.ignoreSpriteAnimationsMeshAdjustments = Boolean(data.ignoreSpriteAnimationsMeshAdjustments);

    data.skew *= (Math.PI / 180);

    return data;
  }

  static FormHandler(this: StencilShadowConfig) {
    try {
      if (this.#editResolve) {
        const data = this.getFormData();
        this.#editResolve(data);
        this.#editPromise = undefined;
        this.#editResolve = undefined;
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) ui.notifications?.error(err.message, { console: false });
    }
  }

  _onChangeForm(config: foundry.applications.api.ApplicationV2.FormConfiguration, e: Event) {
    super._onChangeForm(config, e);
    this.updatePreviewSprite();
    this.applyDragAdjustmentPreviews();
  }

  protected applyDragAdjustmentPreviews() {
    if (!this.previewSprite) return;

    const data = this.getFormData();
    if (!data) return;

    this.previewSprite.x = this.#originalBounds.x + data.adjustments.x;
    this.previewSprite.y = this.#originalBounds.y + data.adjustments.y;
    this.previewSprite.width = this.#originalBounds.width + data.adjustments.width;
    this.previewSprite.height = this.#originalBounds.height + data.adjustments.height;
  }

  protected setElementValue(selector: string, value: string | number, triggerChange = false) {
    const elem = this.element.querySelector(selector);

    if (elem instanceof HTMLElement) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (elem as any).value = value;
      if (triggerChange) elem.dispatchEvent(new Event("change"));
    }
  }

  protected addElementListener(selector: string, event: keyof HTMLElementEventMap, listener: EventListener) {
    const elements = this.element.querySelectorAll(selector);
    for (const elem of elements) {
      elem.addEventListener(event, listener);
    }
  }

  protected updatePreviewSprite(overrideData?: StencilShadow) {
    if (!this.previewSprite) return;
    const data = overrideData ?? this.getFormData();
    if (!data) return;

    this.previewSprite.alpha = data.alpha;
    this.previewSprite.angle = data.rotation;

    this.previewSprite.skew.x = data.skew;


    if (Array.isArray(this.previewSprite.filters)) {
      this.previewSprite.filters.forEach(filter => {
        if (filter instanceof TintFilter) filter.tint = data.color;
        if (filter instanceof PIXI.BlurFilter) filter.blur = data.blur;
      });
    }

    // Apply adjustments
    this.previewSprite.anchor.set(data.adjustments.anchor.x, data.adjustments.anchor.y);


  }

  protected _setDragListeners() {
    if (!canvas?.primary) return;

    if (canvas?.tokens)
      canvas.tokens.eventMode = "passive";

    canvas.primary.eventMode = "passive";


    if (this.previewSprite) {
      const sprite = this.previewSprite
      sprite.addEventListener("mousedown", e => {
        if (e.buttons === 1)
          this._beginDragSprite(e, sprite);
      });
      sprite.addEventListener("pointermove", e => {
        if (e.buttons === 1)
          this._onDragSprite(e);
      });
      window.addEventListener("mouseup", e => {
        if (e.buttons === 1)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this._endDragSprite(e as any);
      });
    }
  }


  protected _setDraggable() {
    if (!this.previewSprite) return;
    this.previewSprite.cursor = "grab";
    this.previewSprite.interactive = true;
  }

  protected _onClose(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    super._onClose(options);
    if (this.previewSprite) {
      releaseSprite(this.previewSprite);
      this.previewSprite.removeAllListeners("pointerdown");
      this.previewSprite.removeAllListeners("pointermove");

      this.previewSprite.cursor = "inherit";
    }

    if (this.#editResolve) {
      this.#editResolve();
      if (this.previewSprite) {
        this.previewSprite.x = this.#originalBounds.x;
        this.previewSprite.y = this.#originalBounds.y;
        this.previewSprite.width = this.#originalBounds.width;
        this.previewSprite.height = this.#originalBounds.height;
      }
    }

    this.#editPromise = undefined;
    this.#editResolve = undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    window.removeEventListener("mouseup", this._endDragSprite as any);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    window.removeEventListener("mousemove", this._onDragSprite as any);
  }


  #highlightBorderDisplayed = false;
  #dragTarget: PIXI.Sprite | undefined = undefined;
  protected _beginDragSprite(e: PIXI.FederatedPointerEvent, sprite: PIXI.Sprite) {
    e.stopPropagation();
    sprite.cursor = "grabbing";
    this.#dragTarget = sprite;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const placeable = (sprite as any).placeable;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (placeable._preview?.border) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.#highlightBorderDisplayed = placeable._preview.border.visible as boolean;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      placeable._preview.border.visible = false;
    }
    releaseSprite(sprite);
  }

  protected _endDragSprite = ((e: PIXI.FederatedPointerEvent) => {
    if (!this.#dragTarget) return;

    e.stopPropagation();
    this.#dragTarget.cursor = "grab";

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const placeable = (this.#dragTarget as any).placeable;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (placeable._preview?.border) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      placeable._preview.border.visible = !!this.#highlightBorderDisplayed;
    }

    if (this.previewSprite) controlSprite(this.previewSprite, true);
    this.#dragTarget = undefined;
  }).bind(this);

  protected _onDragSprite = ((e: MouseEvent) => {
    if (!this.#dragTarget) return;
    e.stopPropagation();

    const global = this.#dragTarget.getGlobalPosition().clone();
    global.x += e.movementX;
    global.y += e.movementY;

    this.setElementValue(`[name="adjustments.x"]`, this.shadowConfig.adjustments.x, false);
    this.setElementValue(`[name="adjustments.y"]`, this.shadowConfig.adjustments.y, false);
    // if (this.previewSprite) controlSprite(this.previewSprite, true);
    if (this.previewSprite) releaseSprite(this.previewSprite);

  }).bind(this);

  protected setRangePickerListener(name: string, radians = false) {
    const elem = this.element.querySelector(`[name="${name}"]`);
    if (!(elem instanceof HTMLElement)) return;

    elem.addEventListener("input", (e) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const val = parseFloat(e.target?.value ?? "") * (radians ? (Math.PI / 180) : 1);
      const data = this.getFormData();
      if (!data) return;
      foundry.utils.setProperty(data, name, val);
      this.updatePreviewSprite(data);
    })
  }

  async _onFirstRender(context: StencilShadowContext, options: foundry.applications.api.ApplicationV2.RenderOptions) {
    await super._onFirstRender(context, options);

    if (this.previewSprite) {
      controlSprite(this.previewSprite, true, e => {
        const widthElem = this.element.querySelector(`[name="adjustments.width"]`);
        if (widthElem instanceof HTMLInputElement)
          widthElem.value = (parseFloat(widthElem.value) + e.x).toString();
        const heightElem = this.element.querySelector(`[name="adjustments.height"]`);
        if (heightElem instanceof HTMLInputElement)
          heightElem.value = (parseFloat(heightElem.value) + e.y).toString();

      });
    }
    this._setDragListeners();
    this._setDraggable();
  }

  async _onRender(context: StencilShadowContext, options: foundry.applications.api.ApplicationV2.RenderOptions) {
    await super._onRender(context, options);

    this.setRangePickerListener("alpha");
    this.setRangePickerListener("rotation");
    this.setRangePickerListener("skew", true);


    const color = this.element.querySelector(`[name="color"]`);
    if (color instanceof HTMLElement) {
      color.addEventListener("change", () => { this.updatePreviewSprite(); });
    }
  }

  async _prepareContext(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    const context = await super._prepareContext(options);

    context.idPrefix = foundry.utils.randomID();
    context.shadow = foundry.utils.deepClone(this.shadowConfig);

    const color = new PIXI.Color(context.shadow.color);
    context.shadow.color = color.toHex();

    // Convert skew to degrees
    context.shadow.skew *= (180 / Math.PI);

    context.spriteAnimations = game.modules?.get("sprite-animations")?.active ?? false;

    context.adjustPosTooltip = `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustPosition.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGPOS")}</p></div>`;
    context.adjustSizeTooltip = `<div class='toolclip'><video width='512' autoplay loop muted><source src='modules/${__MODULE_ID__}/assets/tooltips/AdjustSize.webm'></video><p>${game.i18n?.localize("SPRITESHADOWS.SETTINGS.ADJUSTMENTS.DRAGSIZE")}</p></div>`;

    context.alignmentSelect = {
      bottom: "SPRITESHADOWS.SETTINGS.ALIGNMENT.BOTTOM",
      center: "SPRITESHADOWS.SETTINGS.ALIGNMENT.CENTER"
    };

    context.buttons = [
      { type: "button", label: "Cancel", action: "cancel", icon: "fa-solid fa-times" },
      { type: "submit", label: "Save", icon: "fa-solid fa-check" }
    ]

    return context;
  }

  constructor(public shadowConfig: StencilShadow, protected previewSprite?: PIXI.Sprite, options?: foundry.applications.api.ApplicationV2.Configuration) {
    super(options);

    if (this.previewSprite) {
      const { x, y, width, height } = this.previewSprite;
      this.#originalBounds = { x, y, width, height };
    }
  }
}
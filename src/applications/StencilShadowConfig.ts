import { StencilShadow } from "types";
import { StencilShadowContext } from "./types"
import { TintFilter } from "filters";
import { findBottomAnchorPoint, findCentralAnchorPoint } from "functions";

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

  protected shadowDragAdjustments = {
    x: "",
    y: "",
    width: "",
    height: ""
  };

  protected _shadowDragAdjustMouseUp = (() => {
    this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
  }).bind(this);

  protected _shadowDragAdjustMouseMove = ((e: MouseEvent) => {
    if (this.shadowDragAdjustments.x) this.applyShadowDragAdjustment(this.shadowDragAdjustments.x, e.movementX);
    if (this.shadowDragAdjustments.y) this.applyShadowDragAdjustment(this.shadowDragAdjustments.y, e.movementY);
    if (this.shadowDragAdjustments.width) this.applyShadowDragAdjustment(this.shadowDragAdjustments.width, e.movementX);
    if (this.shadowDragAdjustments.height) this.applyShadowDragAdjustment(this.shadowDragAdjustments.height, e.movementY);

  }).bind(this);

  protected applyShadowDragAdjustment(selector: string, delta: number, clamp = false) {
    const elem = this.element.querySelector(selector);
    if (elem instanceof HTMLInputElement) {
      const val = Math.floor(parseFloat(elem.value) + delta)
      this.setElementValue(selector, (clamp ? Math.max(0, val) : val).toString(), true);
    }
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

  protected _onClose(options: foundry.applications.api.ApplicationV2.RenderOptions) {
    super._onClose(options);

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

    window.removeEventListener("mousemove", this._shadowDragAdjustMouseMove);
    window.removeEventListener("mouseup", this._shadowDragAdjustMouseUp);
  }

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

    window.addEventListener("mouseup", this._shadowDragAdjustMouseUp);
    window.addEventListener("mousemove", this._shadowDragAdjustMouseMove);
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


    this.addElementListener(`[data-role="shadow-drag-pos"]`, "mousedown", () => {
      this.shadowDragAdjustments.x = `[name="adjustments.x"]`;
      this.shadowDragAdjustments.y = `[name="adjustments.y"]`;
      this.shadowDragAdjustments.width = this.shadowDragAdjustments.height = "";
    });

    this.addElementListener(`[data-role="shadow-drag-size"]`, "mousedown", () => {
      this.shadowDragAdjustments.x = this.shadowDragAdjustments.y = "";
      this.shadowDragAdjustments.width = `[name="adjustments.width"]`;
      this.shadowDragAdjustments.height = `[name="adjustments.height"]`;
    })
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
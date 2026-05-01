import { TokenMixin, TileMixin } from "./placeables";
import { TokenConfigMixin, TileConfigMixin, SceneConfigMixin, StandaloneTokenConfig, StandaloneTileConfig, StandaloneSceneConfig, PrototypeTokenConfigMixin, StandalonePrototypeTokenConfig, GlobalConfig } from "./applications";
import { TintFilter, AlphaThresholdFilter } from "./filters";
import { DeepPartial, ShadowedObject } from "types";


Hooks.once("canvasReady", () => {
  // Initialize Pixi DevTools if we are a debug build
  if (__DEV__ && canvas?.stage) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (window as any).__PIXI_DEVTOOLS__ = {
      stage: canvas.stage,
      renderer: canvas?.app?.renderer
    }
  }
});


Hooks.once("canvasConfig", () => {
  setTimeout(() => {
    const ShadowedToken = TokenMixin(CONFIG.Token.objectClass);
    CONFIG.Token.objectClass = ShadowedToken;

    const ShadowedTile = TileMixin(CONFIG.Tile.objectClass);
    CONFIG.Tile.objectClass = ShadowedTile;

    game.SpriteShadows = {
      TokenClass: ShadowedToken,
      TileClass: ShadowedTile,
      filters: {
        TintFilter,
        AlphaThresholdFilter
      }
    };
  });

});

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function applyMixin(collection: Record<string, any>, mixin: Function) {
  const entries = Object.entries(collection);
  for (const [key, { cls }] of entries) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const mixed = mixin(cls);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    collection[key].cls = mixed;
  }
}

Hooks.on("canvasConfig", () => {
  if (game?.settings?.get(__MODULE_ID__, "injectConfigTab")) {
    applyMixin(CONFIG.Token.sheetClasses.base, TokenConfigMixin);
    applyMixin(CONFIG.Tile.sheetClasses.base, TileConfigMixin);
    CONFIG.Token.prototypeSheetClass = PrototypeTokenConfigMixin(CONFIG.Token.prototypeSheetClass as unknown as typeof foundry.applications.sheets.PrototypeTokenConfig);

    applyMixin(CONFIG.Scene.sheetClasses.base, SceneConfigMixin);
  }


  if (game?.modules?.get("isometric-perspective")?.active) {
    // Check if it needs to be positioned according to isometric projection
    Hooks.on("refreshToken", (token: Token) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if ((token as any).shouldUseIsometric) (token as any).positionBlobShadowIsometric();
    });

    Hooks.on("refreshTile", (tile: Tile) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if ((tile as any).shouldUseIsometric) (tile as any).positionBlobShadowIsometric();
    })
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateActor", (actor: Actor, delta: Actor.UpdateData, options: Actor.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TokenClass && actor.token?.object instanceof (game.SpriteShadows.TokenClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (actor.token.object as any).refreshShadow(true)
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateToken", (token: TokenDocument, delta: TokenDocument.UpdateData, options: TokenDocument.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TokenClass && token.object instanceof (game.SpriteShadows.TokenClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (token.object as any).refreshShadow()
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Hooks.on("updateTile", (tile: TileDocument, delta: TileDocument.UpdateData, options: TileDocument.Database.UpdateOptions, userId: string) => {
  if (game.SpriteShadows?.TileClass && tile.object instanceof (game.SpriteShadows.TileClass as any)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (tile.object as any).refreshShadow(true);
  }
});

Hooks.on("updateScene", (scene: Scene) => {
  if (canvas?.scene === scene) {
    scene.tokens.forEach(token => { (token.object as ShadowedObject<foundry.canvas.placeables.Token>).refreshShadow(); });
    scene.tiles.forEach(tile => { (tile.object as ShadowedObject<foundry.canvas.placeables.Tile>).refreshShadow(); });
  }
})

const _standaloneConfigs = new WeakMap<ShadowedObject | Scene | Actor | GlobalConfig>();

function createHeaderControl(callback: (() => Promise<void> | void), visible?: boolean | (() => boolean)): foundry.applications.api.ApplicationV2.HeaderControlsEntry {
  return {
    icon: "fa-solid fa-lightbulb",
    label: "SPRITESHADOWS.TITLE",
    class: "sprite-shadows",
    visible,
    onClick: callback,
    onclick: callback
  }
}

function canModifyDocument(doc: foundry.abstract.Document.Any): boolean {
  return !!(game.user && doc.canUserModify(game.user, "update"));
}

function getStandaloneApplication<t extends GlobalConfig>(key: any, configClass: typeof t): t {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  if (_standaloneConfigs.has(key))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return _standaloneConfigs.get(key) as unknown as t;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const app = new configClass(key) as t;
  const origClose = app.close.bind(app);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  _standaloneConfigs.set(key, app);
  app.close = async function (options: DeepPartial<foundry.applications.api.ApplicationV2.ClosingOptions>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    _standaloneConfigs.delete(key);
    return origClose(options);
  }

  return app;
}

Hooks.on("getHeaderControlsTileConfig", (app: foundry.applications.sheets.TileConfig, controls: foundry.applications.api.ApplicationV2.HeaderControlsEntry[]) => {
  controls.unshift(createHeaderControl(async () => {
    const tile = app.document.object as unknown as ShadowedObject;
    const configApp = getStandaloneApplication<StandaloneTileConfig>(tile, StandaloneTileConfig);
    if (configApp)
      await configApp.render({ force: true })
  }, () => canModifyDocument(app.document)));
})

Hooks.on("getHeaderControlsSceneConfig", (app: foundry.applications.sheets.SceneConfig, controls: foundry.applications.api.ApplicationV2.HeaderControlsEntry[]) => {
  controls.unshift(createHeaderControl(async () => {
    const configApp = getStandaloneApplication<StandaloneSceneConfig>(app.document, StandaloneSceneConfig);

    if (configApp)
      await configApp.render({ force: true });
  }, () => canModifyDocument(app.document)));
});


Hooks.on("ready", () => {
  const actorSheetHooks = ["getHeaderControlsActorSheetV2"];

  if (!game.settings?.get(__MODULE_ID__, "injectConfigTab"))
    actorSheetHooks.push("getActorSheetHeaderButtons")

  actorSheetHooks.forEach(hook => {
    Hooks.on(hook as Hooks.HookName, (app: foundry.applications.sheets.ActorSheetV2, controls: foundry.applications.api.ApplicationV2.HeaderControlsEntry[]) => {
      controls.unshift(createHeaderControl(async () => {
        const configApp = app.actor.token?.object ? getStandaloneApplication<StandaloneTokenConfig>(app.actor.token.object as unknown as ShadowedObject, StandaloneTokenConfig) : getStandaloneApplication<StandalonePrototypeTokenConfig>(app.actor, StandalonePrototypeTokenConfig);
        if (configApp)
          await configApp.render({ force: true });
      }, () => canModifyDocument(app.document)));
    });
  });

  if (!game.settings?.get(__MODULE_ID__, "injectConfigTab")) {
    Hooks.on("getHeaderControlsTokenConfig", (app: foundry.applications.sheets.TokenConfig, controls: foundry.applications.api.ApplicationV2.HeaderControlsEntry[]) => {
      controls.unshift(createHeaderControl(async () => {
        const configApp = getStandaloneApplication<StandaloneTokenConfig>(app.document.object, StandaloneTokenConfig);
        if (configApp)
          await configApp.render({ force: true });
      }, () => canModifyDocument(app.document)));
    });

    Hooks.on("getHeaderControlsPrototypeTokenConfig", (app: foundry.applications.sheets.PrototypeTokenConfig, controls: foundry.applications.api.ApplicationV2.HeaderControlsEntry[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const token = (app as any).token as foundry.data.PrototypeToken;
      controls.unshift(createHeaderControl(async () => {
        const configApp = getStandaloneApplication<StandalonePrototypeTokenConfig>(token, StandalonePrototypeTokenConfig);
        if (configApp)
          await configApp.render({ force: true });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      }, () => canModifyDocument((app as any).actor as Actor)));
    });
  }
})







let lastVisibilityRefreshWarn = 0;
Hooks.on("visibilityRefresh", () => {
  if (!canvas?.scene) return;
  const start = performance.now();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  canvas.scene.tokens.forEach(doc => { (doc.object as any).refreshShadow(); });
  const duration = performance.now() - start;
  // Warn if refresh took over 16 ms and we haven't warn them in the last 5 mins
  if (duration > 16 && (Date.now() - lastVisibilityRefreshWarn) > 300000) {
    lastVisibilityRefreshWarn = Date.now();
    if (game.i18n) console.warn(game.i18n.format("SPRITESHADOWS.ERRORS.VISIONREFRESHPERFORMANCE", { duration: duration.toString() }));
  }
})
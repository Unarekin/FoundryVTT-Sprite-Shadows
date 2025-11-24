
Hooks.on("ready", () => {
  game?.settings?.register(__MODULE_ID__, "enableShadows", {
    name: "SPRITESHADOWS.SETTINGS.ENABLE.LABEL",
    hint: "SPRITESHADOWS.SETTINGS.ENABLE.HINT",
    config: true,
    scope: "world",
    type: Boolean,
    default: true,
    requiresReload: false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onChange(value: boolean) {
      /** TODO  */
    }
  });
})
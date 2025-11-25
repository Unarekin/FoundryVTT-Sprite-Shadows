
export class LocalizedError extends Error {
  constructor(message?: string, subs?: Record<string, string>) {
    if (message) super(game?.i18n?.format(`SPRITESHADOWS.ERRORS.${message}`, subs ?? {}))
    else super();
  }
}
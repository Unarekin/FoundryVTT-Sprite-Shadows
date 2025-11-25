import { ShadowConfiguration } from "../src/types"
import { libWrapper as wrapperClass } from "./libwrapper"






declare module '*.scss';

declare module "fvtt-types/configuration" {
  interface FlagConfig {
    Actor: {
      [__MODULE_ID__]: ShadowConfiguration;
    }
  }
}

declare global {

  const libWrapper: typeof wrapperClass;
  const __MODULE_ID__ = "sprite-shadows";
  declare const __DEV__: boolean;
  declare const __MODULE_TITLE__: string;
  declare const __MODULE_VERSION__: string;

  interface SettingConfig {
    "sprite-shadows.enableShadows": boolean;
  }

  interface Game {
    SpriteShadows: Record<string, unknown>;
  }
}
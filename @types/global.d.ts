import { ShadowConfiguration } from "../src/types"

declare const __DEV__: boolean;
declare const __MODULE_TITLE__: string;
// declare const __MODULE_ID__: string;
const __MODULE_ID__ = "sprite-shadows";
declare const __MODULE_VERSION__: string;


declare module '*.scss';

declare module "fvtt-types/configuration" {
  interface FlagConfig {
    Actor: {
      [__MODULE_ID__]: ShadowConfiguration;
    }
  }
}

declare global {
  interface SettingConfig {
    "sprite-shadows.enableShadows": boolean;
  }
}
import { ShadowConfiguration } from "../src/types"
import { libWrapper as wrapperClass } from "./libwrapper"






declare module '*.scss';

declare module "fvtt-types/configuration" {
  interface FlagConfig {
    TileDocument: {
      [__MODULE_ID__]: ShadowConfiguration;
    },
    TokenDoument: {
      [__MODULE_ID__]: ShadowConfiguration;
    },
    Actor: {
      [__MODULE_ID__]: ShadowConfiguration;
      "sprite-animations": {
        animations: ({
          name: string;
          src: string;
          loop?: boolean;
        })[],
        meshAdjustments: {
          enable: boolean;
          height: number;
          width: number;
          x: number;
          y: number;
        }
      }
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

  declare module '*.frag' {
    const content: string;
    export default content;
  }

  declare module '*.vert' {
    const content: string;
    export default content;
  }
}
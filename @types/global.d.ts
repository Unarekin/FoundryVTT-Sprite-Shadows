import { libWrapper as wrapperClass } from "./libwrapper"
import { ShadowConfiguration, ShadowConfigSource, IsometricFlags } from "../src/types"

declare module '*.scss';


declare global {

  const libWrapper: typeof wrapperClass;

  const __MODULE_ID__ = "sprite-shadows";
  declare const __DEV__: boolean;
  declare const __MODULE_TITLE__: string;
  declare const __MODULE_VERSION__: string;

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

declare module "fvtt-types/configuration" {

  interface SettingConfig {
    "sprite-shadows.enableShadows": boolean;
  }

  interface FlagConfig {
    Tile: {
      [__MODULE_ID__]: {
        config: ShadowConfiguration;
        configSource: ShadowConfigSource;
      };
      "isometric-perspective"?: IsometricFlags;
    },
    Token: {
      [__MODULE_ID__]: {
        config: ShadowConfiguration;
        configSource: ShadowConfigSource;
      };
      "isometric-perspective"?: IsometricFlags;
    },
    Actor: {
      [__MODULE_ID__]: ShadowConfiguration,
      "sprite-animations"?: {
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
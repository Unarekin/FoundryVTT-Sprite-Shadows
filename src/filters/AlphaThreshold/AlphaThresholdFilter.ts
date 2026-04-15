import { CustomFilter } from "filters/CustomFilter";
import frag from "./AlphaThresholdFilter.frag";

export interface AlphaThresholdUniforms {
  threshold: number;
  alpha: number;
}

export class AlphaThresholdFilter extends CustomFilter<AlphaThresholdUniforms> {
  public get threshold() { return this.uniforms.threshold; }
  public set threshold(val) { this.uniforms.threshold = val; }

  public get alpha() { return this.uniforms.alpha; }
  public set alpha(val) { this.uniforms.alpha = val; }

  constructor(threshold = 1, alpha = 1) {
    super(undefined, frag, { threshold, alpha });
  }

}
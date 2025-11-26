import frag from "./TintFilter.frag";
import vert from "./TintFilter.vert";


export class TintFilter extends PIXI.Filter {

  #color: PIXI.Color;

  public get color() { return this.#color; }
  public set color(val: PIXI.ColorSource) {
    this.#color = new PIXI.Color(val);
    this.uniforms.tint = this.#color.toRgbArray();
  }

  #addGLESVersion(version: number, shader: string) {
    const lines = shader.split("\n");
    const versionIndex = lines.findIndex(line => line.startsWith("#version"));
    if (versionIndex !== -1) {
      const version = lines.splice(versionIndex, 1);
      lines.unshift(...version);
    } else {
      lines.unshift(`#version ${version} es`);
    }

    return lines.join("\n");
  }


  constructor(color: PIXI.ColorSource = "black") {
    const actualColor = new PIXI.Color(color);
    super(vert, frag, { tint: actualColor.toRgbArray() });
    this.#color = actualColor;

    // Enable GLSL 3.00
    if (!this.program.fragmentSrc.includes("#version 300 es"))
      this.program.fragmentSrc = this.#addGLESVersion(300, this.program.fragmentSrc);

    if (!this.program.vertexSrc.includes("#version 300 es"))
      this.program.vertexSrc = this.#addGLESVersion(300, this.program.vertexSrc);

  }
}
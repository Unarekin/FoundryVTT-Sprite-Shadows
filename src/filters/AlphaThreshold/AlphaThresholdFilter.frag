#version 300 es

precision highp float;

uniform sampler2D uSampler;
in vec2 vTextureCoord;
out vec4 color;

uniform float threshold;
uniform float alpha;

void main() {
    vec4 pixel = texture(uSampler, vTextureCoord);
    if (pixel.a < threshold)
      color = vec4(0.0);
    else
      color = pixel;

  color.a = color.a * alpha;
}
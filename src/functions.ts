export function logImage(url: string, width = 256, height = 256) {
  const image = new Image();

  image.onload = function () {
    const style = [
      `font-size: 1px`,
      `padding-left: ${width}px`,
      `padding-bottom: ${height}px`,
      // `padding: ${this.height / 100 * size}px ${this.width / 100 * size}px`,
      `background: url(${url}) no-repeat`,
      `background-size:contain`,
      `border:1px solid black`,
      `max-width: 512px`
    ].join(";")
    console.log('%c ', style);
  }

  image.src = url;
}

export function logTexture(texture: PIXI.Texture) {
  const renderTexture = PIXI.RenderTexture.create({ width: texture.width, height: texture.height });
  const sprite = PIXI.Sprite.from(texture);
  canvas?.app?.renderer.render(sprite, { renderTexture });

  const ratio = 512 / Math.max(texture.width, texture.height);
  const width = texture.width > texture.height ? 512 : texture.width * ratio;
  const height = texture.height > texture.width ? 512 : texture.height * ratio;

  canvas?.app?.renderer.extract.base64(renderTexture)
    .then(base64 => {
      logImage(base64, width, height);
    }).catch(console.error);
}


export function downloadJSON(json: object, name: string) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const objUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objUrl;
  link.download = name.endsWith(".json") ? name : `${name}.json`;
  link.click();
  URL.revokeObjectURL(objUrl);
}

export function uploadJSON<t = any>(): Promise<t> {
  return new Promise<t>((resolve, reject) => {
    const file = document.createElement("input");
    file.setAttribute("type", "file");
    file.setAttribute("accept", "application/json");
    file.onchange = e => {
      const file = (e.currentTarget as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error());
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        if (!e.target?.result) throw new Error();
        if (typeof e.target.result === "string") resolve(JSON.parse(e.target.result) as t);
      }

      reader.readAsText(file);
    }

    file.onerror = (event, source, line, col, error) => {
      if (error) reject(error);
      else reject(new Error(typeof event === "string" ? event : typeof undefined));
    }

    file.click();
  })
}

export function isoToCartesian(isoX: number, isoY: number) {
  const angle = Math.PI / 4;
  return {
    x: (isoX * Math.cos(angle) - isoY * Math.sin(angle)),
    y: (isoX * Math.sin(angle) + isoY * Math.cos(angle))
  };
}

export function cartesianToIso(isoX: number, isoY: number) {
  const angle = Math.PI / 4;
  return {
    x: (isoX * Math.cos(-angle) - isoY * Math.sin(-angle)),
    y: (isoX * Math.sin(-angle) + isoY * Math.cos(-angle))
  };
}

function getImageDataFromTexture(texture: PIXI.Texture): ImageData | undefined {
  if (!canvas?.app?.renderer) return;
  const rt = PIXI.RenderTexture.create({ width: texture.baseTexture.width, height: texture.baseTexture.height });
  const sprite = new PIXI.Sprite(texture);
  sprite.width = rt.width;
  sprite.height = rt.height;
  canvas.app.renderer.render(sprite, { renderTexture: rt, clear: false });
  const pixels = Uint8ClampedArray.from(canvas.app.renderer.extract.pixels(rt));
  return new ImageData(pixels, rt.width, rt.height);
}

export function findCentralAnchorPoint(texture: PIXI.Texture): { x: number, y: number } | undefined {
  const imageData = getImageDataFromTexture(texture);
  if (!imageData) return;

  // Determine visual bounds
  const { width, height } = texture.baseTexture;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = imageData.data[index + 3]
      if (alpha > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  return {
    x: (left + ((right - left) / 2)) / width,
    y: (top + ((bottom - top) / 2)) / height
  }
}

export function findBottomAnchorPoint(texture: PIXI.Texture): { x: number, y: number } | undefined {

  const imageData = getImageDataFromTexture(texture);
  if (!imageData) return;

  const anchor = {
    x: 0.5,
    y: 1
  }

  const { width, height } = texture.baseTexture;
  let bottom = height;

  // Find bottommost pixel
  outer: for (let y = height; y > 0; y--) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = imageData.data[index + 3];
      if (alpha > 0) {
        bottom = y;
        break outer;
      }
    }
  }

  anchor.y = bottom / height;

  return anchor;
}

/**
 * Returns black or white based on the luminance of a given color
 * @param {PIXI.Color} color - {@link PIXI.Color}
 * @returns - {@link PIXI.Color} representing black or white
 */
export function contrastColor(color: PIXI.Color): PIXI.Color {
  const yiq = ((color.red * 299) + (color.g * 587) + (color.b * 114)) / 1000;
  return (yiq >= 128) ? new PIXI.Color(0x000000) : new PIXI.Color(0xFFFFFF);
}
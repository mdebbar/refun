type RGB = [number, number, number];

export function decompose(color: number): RGB {
  return [(color & 0xff0000) >> 16, (color & 0x00ff00) >> 8, color & 0x0000ff];
}

export function compose(...color: RGB): number {
  return (color[0] << 16) + (color[1] << 8) + color[2];
}

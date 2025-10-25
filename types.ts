export enum IconStyle {
  FLAT_SINGLE_COLOR = 'Flat filled single color',
  FLAT_COLORED = 'Flat colored',
  OUTLINE = 'Outline',
  GRADIENT = 'Gradient flat',
  ISOMETRIC = 'Isometric',
  THREE_D = '3D render',
}

export interface GeneratedIcon {
  id: string;
  pngSrc: string;
  prompt: string;
  style: IconStyle;
  color: string;
  isUiIcon: boolean;
}

export enum IconStyle {
  FLAT_SINGLE_COLOR = 'Flat filled single color',
  FLAT_COLORED = 'Flat colored',
  OUTLINE = 'Outline',
}

export interface GeneratedIcon {
  id: string;
  pngSrc: string;
  prompt: string;
}
export enum IconStyle
{
  FLAT_SINGLE_COLOR = 'Flat filled single color',
  FLAT_COLORED = 'Flat colored',
  OUTLINE = 'Outline',
  GRADIENT = 'Gradient flat',
  ISOMETRIC = 'Isometric',
  THREE_D = '3D render',
}

export interface GeneratedIcon
{
  id: string
  pngSrc: string
  prompt: string
  style: IconStyle
  color: string
  isUiIcon: boolean
}

export type ReferenceMode = 'edit' | 'inspire'

export interface ReferenceIcon
{
  icon: GeneratedIcon
  mode: ReferenceMode
}

export interface ToastAction
{
  label: string
  onClick: () => void
}

export interface ToastState
{
  message: string
  action?: ToastAction
}

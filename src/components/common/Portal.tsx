import { PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'

/**
 * Portal component for overlay elements (Toast, Selection Box, Dialog, Toolbar).
 * Ensures 'fixed' positioning is relative to the viewport, avoiding issues with parent transforms.
 */
const Portal = ({ children }: PropsWithChildren) =>
{
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default Portal

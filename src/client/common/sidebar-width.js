import {
  sidebarWidth,
  sidebarWidthWithLabels
} from './constants'

export default function getSidebarWidth (config = {}) {
  return config.sidebarShowLabels === false
    ? sidebarWidth
    : sidebarWidthWithLabels
}

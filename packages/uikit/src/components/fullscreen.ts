import { Signal } from '@preact/signals-core'
import { Camera, OrthographicCamera, PerspectiveCamera } from 'three'

export function updateSizeFullscreen(
  sizeX: Signal<number>,
  sizeY: Signal<number>,
  pixelSize: Signal<number>,
  distanceToCamera: number,
  camera: Camera,
  screenHeight: number,
) {
  if (camera instanceof PerspectiveCamera) {
    const cameraHeight = 2 * Math.tan((Math.PI * camera.fov) / 360) * distanceToCamera
    pixelSize.value = cameraHeight / screenHeight
    sizeY.value = cameraHeight
    sizeX.value = cameraHeight * camera.aspect
  }
  if (camera instanceof OrthographicCamera) {
    const cameraHeight = camera.top - camera.bottom
    const cameraWidth = camera.right - camera.left
    pixelSize.value = cameraHeight / screenHeight
    sizeY.value = cameraHeight
    sizeX.value = cameraWidth
  }
}

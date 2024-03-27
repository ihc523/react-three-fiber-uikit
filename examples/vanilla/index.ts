import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { patchRenderOrder, Container, Root, Image } from '@vanilla-three/uikit'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EventHandlers } from '@vanilla-three/uikit/internals'

// init

const camera = new PerspectiveCamera(70, 1, 0.01, 10)
camera.position.z = 1

const scene = new Scene()

const canvas = document.getElementById('root') as HTMLCanvasElement
const controls = new OrbitControls(camera, canvas)

function handlerToEventName(key: string) {
  return key[2].toLocaleLowerCase() + key.slice(3)
}

//UI
const root = new Root(
  {
    bindEventHandlers(object, handlers) {
      for (const key in handlers) {
        const handler = handlers[key as keyof EventHandlers]
        if (handler == null) {
          continue
        }
        object.addEventListener(handlerToEventName(key), handler as any)
      }
    },
    unbindEventHandlers(object, handlers) {
      for (const key in handlers) {
        const handler = handlers[key as keyof EventHandlers]
        if (handler == null) {
          continue
        }
        object.removeEventListener(handlerToEventName(key), handler as any)
      }
    },
  },
  camera,
  scene,
  {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    sizeX: 1,
    sizeY: 0.5,
    backgroundColor: 'red',
  },
)
new Container(root, { flexGrow: 1, backgroundColor: 'blue' })
const x = new Container(root, {
  padding: 30,
  flexGrow: 1,
  backgroundColor: 'green',
  hover: { backgroundColor: 'yellow' },
})
x.dispatchEvent({ type: 'pointerOver', target: x, nativeEvent: { pointerId: 1 } } as any)
new Image(x, {
  keepAspectRatio: false,
  borderRadius: 1000,
  height: '100%',
  flexBasis: 0,
  flexGrow: 1,
  src: 'https://picsum.photos/300/300',
})

const renderer = new WebGLRenderer({ antialias: true, canvas })
renderer.setAnimationLoop(animation)
renderer.localClippingEnabled = true
patchRenderOrder(renderer)

function updateSize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

updateSize()
window.addEventListener('resize', updateSize)

// animation

let prev: number | undefined
function animation(time: number) {
  const delta = prev == null ? 0 : time - prev
  prev = time

  root.update(delta)
  controls.update(delta)

  renderer.render(scene, camera)
}

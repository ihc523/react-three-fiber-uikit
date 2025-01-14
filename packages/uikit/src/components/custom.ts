import { YogaProperties, createFlexNodeState } from '../flex/node.js'
import { createHoverPropertyTransformers, setupCursorCleanup } from '../hover.js'
import { computedIsClipped, createGlobalClippingPlanes } from '../clipping.js'
import { ScrollbarProperties } from '../scroll.js'
import { WithAllAliases } from '../properties/alias.js'
import { PanelProperties } from '../panel/instanced-panel.js'
import { TransformProperties, applyTransform, computedTransformMatrix } from '../transform.js'
import { AllOptionalProperties, WithClasses, WithReactive } from '../properties/default.js'
import { createResponsivePropertyTransformers } from '../responsive.js'
import { ElementType, ZIndexProperties, computedOrderInfo, setupRenderOrder } from '../order.js'
import { createActivePropertyTransfomers } from '../active.js'
import { Signal, effect, signal } from '@preact/signals-core'
import {
  WithConditionals,
  computedGlobalMatrix,
  computedHandlers,
  computedMergedProperties,
  createNode,
} from './utils.js'
import { Initializers, Subscriptions } from '../utils.js'
import { Listeners, setupLayoutListeners, setupViewportListeners } from '../listeners.js'
import { Object3DRef, ParentContext } from '../context.js'
import { ShadowProperties, darkPropertyTransformers, makeClippedRaycast } from '../internals.js'
import { FrontSide, Material, Mesh } from 'three'

export type InheritableCustomContainerProperties = WithClasses<
  WithConditionals<
    WithAllAliases<
      WithReactive<
        YogaProperties &
          PanelProperties &
          ZIndexProperties &
          TransformProperties &
          ScrollbarProperties &
          ShadowProperties
      >
    >
  >
>

export type CustomContainerProperties = InheritableCustomContainerProperties & Listeners

export function createCustomContainer(
  parentContext: ParentContext,
  style: Signal<CustomContainerProperties | undefined>,
  properties: Signal<CustomContainerProperties | undefined>,
  defaultProperties: Signal<AllOptionalProperties | undefined>,
  object: Object3DRef,
  meshRef: { current?: Mesh | null },
) {
  const hoveredSignal = signal<Array<number>>([])
  const activeSignal = signal<Array<number>>([])
  const initializers: Initializers = []

  setupCursorCleanup(hoveredSignal, initializers)

  //properties
  const mergedProperties = computedMergedProperties(style, properties, defaultProperties, {
    ...darkPropertyTransformers,
    ...createResponsivePropertyTransformers(parentContext.root.size),
    ...createHoverPropertyTransformers(hoveredSignal),
    ...createActivePropertyTransfomers(activeSignal),
  })

  //create node
  const flexState = createFlexNodeState(parentContext.anyAncestorScrollable)
  createNode(undefined, flexState, parentContext, mergedProperties, object, initializers)

  //transform
  const transformMatrix = computedTransformMatrix(mergedProperties, flexState, parentContext.root.pixelSize)
  applyTransform(object, transformMatrix, initializers)

  const globalMatrix = computedGlobalMatrix(parentContext.childrenMatrix, transformMatrix)

  const isClipped = computedIsClipped(
    parentContext.clippingRect,
    globalMatrix,
    flexState.size,
    parentContext.root.pixelSize,
  )

  //instanced panel
  const orderInfo = computedOrderInfo(mergedProperties, ElementType.Custom, undefined, parentContext.orderInfo)
  const clippingPlanes = createGlobalClippingPlanes(parentContext.root, parentContext.clippingRect, initializers)

  initializers.push((subscriptions) => {
    const mesh = meshRef.current
    if (mesh == null) {
      return subscriptions
    }
    mesh.matrixAutoUpdate = false
    if (mesh.material instanceof Material) {
      mesh.material.clippingPlanes = clippingPlanes
      mesh.material.needsUpdate = true
      mesh.material.shadowSide = FrontSide
    }
    mesh.raycast = makeClippedRaycast(
      mesh,
      mesh.raycast,
      parentContext.root.object,
      parentContext.clippingRect,
      orderInfo,
    )
    setupRenderOrder(mesh, parentContext.root, orderInfo)
    subscriptions.push(
      effect(() => (mesh.receiveShadow = mergedProperties.value.read('receiveShadow', false))),
      effect(() => (mesh.castShadow = mergedProperties.value.read('castShadow', false))),
      effect(() => {
        if (flexState.size.value == null) {
          return
        }
        const [width, height] = flexState.size.value
        const pixelSize = parentContext.root.pixelSize.value
        mesh.scale.set(width * pixelSize, height * pixelSize, 1)
        mesh.updateMatrix()
      }),
      effect(() => void (mesh.visible = !isClipped.value)),
    )
    return subscriptions
  })

  setupLayoutListeners(style, properties, flexState.size, initializers)
  setupViewportListeners(style, properties, isClipped, initializers)

  return Object.assign(flexState, {
    root: parentContext.root,
    handlers: computedHandlers(style, properties, defaultProperties, hoveredSignal, activeSignal),
    initializers,
  })
}

export interface KeyframeOptions {
  offset?: number
  [val: string]: KeyframeValueResolver<string | number>
}

export interface PropertyOptions {
  [name: string]: KeyframeValueResolver<string | number> | KeyframeValueResolver<string | number>[]
}

export interface Keyframe {
  offset: number
  value: string | number
}

export type AnimationTarget = any
export type KeyframeValue = string | number

export interface KeyframeFunction<T> {
  (target?: any, index?: number): KeyframeValueResolver<T>
}

export type KeyframeValueResolver<T> = T | KeyframeFunction<T>

export interface SplitTextResult {
  words: HTMLElement[]
  characters: HTMLElement[]
}

export interface AnimationController {
  (type: string, time: number, playbackRate: number): void
}

export interface Plugin {
  animate(effect: Effect, animations: AnimationController[]): boolean
  resolve(selector: string): any[]
  transform(target: TargetConfiguration, effects: PropertyEffects): void
}

export interface PropertyKeyframe {
  time: number
  prop: string
  index: number
  order: number
  value: KeyframeValueResolver<string | number>
}
export interface PropertyEffects {
  [name: string]: {
    [offset: number]: string | number
  }
}

export interface TargetConfiguration {
  target: AnimationTarget
  propNames: string[]
  from: number
  to: number
  endDelay: number
  duration: number
  keyframes: PropertyKeyframe[]
}

export interface BaseAnimationOptions {
  targets: AnimationTarget | AnimationTarget[]
  props: KeyframeOptions[] | PropertyOptions
  stagger?: number
  delay?: KeyframeValueResolver<number>
  endDelay?: KeyframeValueResolver<number>
}

export interface ToAnimationOptions extends BaseAnimationOptions {
  duration?: number
  from?: number
}

export interface AddAnimationOptions extends BaseAnimationOptions {
  from?: number
  to?: number
  duration?: number
}

export interface AnimationOptions {
  from: number
  to: number
  duration: number
  targets: AnimationTarget[]
  props: PropertyOptions | KeyframeOptions[]
  stagger?: number
  delay?: KeyframeValueResolver<number>
  endDelay?: KeyframeValueResolver<number>
}

export interface Effect {
  target: AnimationTarget
  prop: string;
  keyframes: Keyframe[]
  to: number
  from: number
}

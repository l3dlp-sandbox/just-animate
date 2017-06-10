import { _, FATAL, FINISHED, IDLE, PAUSED, RUNNING } from '../utils'
import { assign, isArray, convertToMs } from '../utils'
import {
    Animation, AnimationPlaybackState, AnimationTargetContext, AnimationTimeContext, AnimationTiming, CssKeyframeOptions,
    CssPropertyOptions, Func, Keyframe, Resolvable
} from '../types'
import {
    addTransition, fixOffsets, expandOffsets, fixPartialKeyframes, keyframeOffsetComparer, propsToKeyframes, resolve,
    resolvePropertiesInKeyframes, spaceKeyframes
} from '../transformers'

// fixme: see if this can be removed
/* this controls the amount of time left before the timeline gives up 
on individual animation and calls finish.  If an animation plays after its time, it looks
like it restarts and that causes jank */
const animationPadding = (1.0 / 60) + 7

const createAnimation = (ctx: AnimationTargetContext, timings: AnimationTiming) => {
    // process css as either keyframes or calculate what those keyframes should be   
    const options = ctx.options!
    const target = ctx.target as HTMLElement
    const css = options.css

    let sourceKeyframes: CssKeyframeOptions[]
    if (isArray(css)) {
        // if an array, no processing has to occur
        sourceKeyframes = css as CssKeyframeOptions[]
        expandOffsets(sourceKeyframes)
    } else {
        sourceKeyframes = []
        propsToKeyframes(css as CssPropertyOptions, sourceKeyframes, ctx)
    }

    const targetKeyframes: Keyframe[] = []

    resolvePropertiesInKeyframes(sourceKeyframes, targetKeyframes, ctx)

    if (options.$transition === true) {
        // add computed properties to match "to" properties
        addTransition(targetKeyframes, target)
        delete options.$transition
    }

    if (targetKeyframes.length > 1) {
        // don't attempt to fill animation if less than 2 keyframes
        spaceKeyframes(targetKeyframes)
    }
    if (targetKeyframes.length) {
        // fix first and last offsets
        fixOffsets(targetKeyframes)
    }

    // sort by offset (should have all offsets assigned)
    targetKeyframes.sort(keyframeOffsetComparer)

    if (targetKeyframes.length > 0) {
        // don't attempt to fill animation if less than 1 keyframes
        fixPartialKeyframes(targetKeyframes)
    }

    const animator = (target as any).animate(targetKeyframes, timings)
    animator.cancel()
    return animator
}

/** Implements the IAnimationController interface for the Web Animation API */
export class Animator {
    public endTimeMs: number
    public startTimeMs: number
    private ctx: AnimationTimeContext
    private easingFn: (n: number) => number
    private timing: AnimationTiming
    private onCancel?: (ctx: AnimationTimeContext) => void
    private onFinish?: (ctx: AnimationTimeContext) => void
    private onPause?: (ctx: AnimationTimeContext) => void
    private onPlay?: (ctx: AnimationTimeContext) => void
    private onUpdate?: (ctx: AnimationTimeContext) => void
    private _animator: Animation

    private get animator(): Animation {
        const self = this
        if (self._animator) {
            return self._animator
        }
        const { ctx, timing } = self
        self._animator = createAnimation(ctx, timing)
        return self._animator
    }

    public get playState() {
        const { animator } = this
        return !animator ? 'fatal' : animator.playState
    }
    public set playState(value: AnimationPlaybackState) {
        const { animator } = this
        const playState = !animator ? FATAL : animator.playState
        if (playState === value) {
            // do nothing if the play state has not changed
            return
        }
        if (playState === FATAL) {
            animator.cancel()
        } else if (value === FINISHED) {
            animator.finish()
        } else if (value === IDLE) {
            animator.cancel()
        } else if (value === PAUSED) {
            animator.pause()
        } else if (value === RUNNING) {
            animator.play()
        }
    }

    constructor(options: IAnimationOptions) {
        const self = this
        const { delay, easing, endDelay, from, index, target, targets } = options

        const ctx: AnimationTimeContext = {
            index: index,
            target: target,
            targets: targets
        }

        // fire create function if provided (allows for modifying the target prior to animating)
        if (options.onCreate) {
            options.onCreate!(ctx)
        }

        const iterations = resolve(options.iterations, ctx) || 1
        const iterationStart = resolve(options.iterationStart, ctx) || 0
        const direction = resolve(options.direction, ctx) || _
        const duration = +options.to - +options.from
        const fill = resolve(options.fill, ctx) || 'none'
        const delayMs = convertToMs(resolve(delay, ctx) || 0)
        const endDelayMs = convertToMs(resolve(endDelay, ctx) || 0)
        const totalTime = delayMs + ((iterations || 1) * duration) + endDelayMs

        // setup instance variables
        self.onCancel = options.onCancel
        self.onFinish = options.onFinish
        self.onPause = options.onPause
        self.onPlay = options.onPlay
        self.onUpdate = options.onUpdate
        self.endTimeMs = from + totalTime
        self.startTimeMs = from

        // add resolver context
        self.ctx = ctx

        // add easing fn
        self.easingFn = options.easingFn

        // setup WAAPI timing object
        self.timing = {
            delay: delayMs,
            endDelay: endDelayMs,
            direction,
            duration,
            easing,
            fill,
            iterations,
            iterationStart,
            totalTime
        }
    }

    public isActive(currentTime: number, playbackRate: number) {
        const self = this
        const isForward = playbackRate >= 0
        const startTimeMs = isForward ? self.startTimeMs : self.startTimeMs + animationPadding
        const endTimeMs = isForward ? self.endTimeMs : self.endTimeMs - animationPadding

        return startTimeMs <= currentTime && currentTime <= endTimeMs
    }

    public seek(value: number) {
        const { animator } = this
        if (animator.currentTime !== value) {
            animator.currentTime = value
        }
    }
    public playbackRate(value: number) {
        const { animator } = this
        if (animator.playbackRate !== value) {
            animator.playbackRate = value
        }
    }

    public cancel() {
        const self = this
        self.playState = IDLE
        if (self.onCancel) {
            self.onCancel(self.ctx)
        }
    }

    public finish() {
        const self = this
        const { ctx } = self
        self.playState = FINISHED
        if (self.onFinish) {
            self.onFinish(ctx)
        }
    }

    public pause() {
        const self = this
        const { ctx } = self
        self.playState = PAUSED
        if (self.onPause) {
            self.onPause(ctx)
        }
    }

    public restart() {
        const { animator } = this
        animator.cancel()
        animator.play()
    }

    public tick(currentTime: number, playbackRate: number, delta: number, isLastFrame: boolean) {
        const self = this
        const { ctx } = self
        if (isLastFrame) {
            self.restart()
        }

        let playedThisFrame = false
        if (self.playState !== RUNNING || isLastFrame) {
            self.playbackRate(playbackRate)
            self.playState = RUNNING
            playedThisFrame = true
        }

        self.playbackRate(playbackRate)

        const shouldTriggerPlay = !!self.onPlay && playedThisFrame
        const shouldTriggerUpdate = !!self.onUpdate

        if (shouldTriggerPlay || shouldTriggerUpdate) {
            assign(ctx, {
                computedOffset: _,
                currentTime: _,
                delta: _,
                duration: _,
                iterations: _,
                offset: _,
                playbackRate: _
            })
        }

        if (shouldTriggerPlay && self.onPlay) {
            self.onPlay(ctx)
        }

        if (shouldTriggerUpdate) {
            const relativeDuration = self.endTimeMs - self.startTimeMs
            const relativeCurrentTime = currentTime - self.startTimeMs
            const timeOffset = relativeCurrentTime / relativeDuration

            // set context object values for this update cycle 
            assign(ctx, {
                computedOffset: self.easingFn(timeOffset),
                currentTime: relativeCurrentTime,
                delta,
                offset: timeOffset,
                playbackRate
            })

            self.onUpdate(ctx)
        }
    }
}

export interface IAnimationOptions {
    direction: Resolvable<string>
    delay: Resolvable<number>
    easing: string
    endDelay: Resolvable<number>
    fill: Resolvable<string>
    from: number
    iterationStart: Resolvable<number>
    iterations: Resolvable<number>
    easingFn: Func<number>
    index: number
    to: number
    target: any
    targets: any[]

    onCancel: (ctx: AnimationTimeContext) => void
    onCreate: (ctx: AnimationTimeContext) => void
    onFinish: (ctx: AnimationTimeContext) => void
    onPause: (ctx: AnimationTimeContext) => void
    onPlay: (ctx: AnimationTimeContext) => void
    onUpdate: (ctx: AnimationTimeContext) => void
}

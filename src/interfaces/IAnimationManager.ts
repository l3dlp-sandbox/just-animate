import {IIndexed} from './IIndexed';
import {IKeyframe} from './IKeyframe';
import {ElementSource} from './IElementProvider';
import {IAnimationEffectTiming} from './IAnimationEffectTiming';
import {IAnimator} from './IAnimator';
import {ISequenceOptions} from './ISequenceOptions';
import {IKeyframeOptions} from './IKeyframeOptions';
import {ITimelineOptions} from './ITimelineOptions';

export interface IAnimationManager {
    animate(keyframesOrName: string | IIndexed<IKeyframe>, el: ElementSource, timings?: IAnimationEffectTiming): IAnimator;
    animateSequence(options: ISequenceOptions): IAnimator;
    animateTimeline(options: ITimelineOptions): IAnimator;
    configure(timings?: IAnimationEffectTiming): IAnimationManager;
    findAnimation(name: string): IKeyframeOptions;
    findEasing(name: string): string;
    register(name: string, animationOptions: IKeyframeOptions): IAnimationManager;
}
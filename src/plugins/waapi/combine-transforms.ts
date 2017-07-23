import { PropertyEffects, TargetConfiguration } from '../../types';
import { includes, pushDistinct, forEach } from '../../utils/lists';
import { _ } from '../../utils/resources';
import { TRANSFORM, transforms, aliases, PX, transformAngles, DEG } from './constants';
import { isDefined } from '../../utils/type';
import { parseUnit } from './parse-unit';

export function combineTransforms(target: TargetConfiguration, effects: PropertyEffects) {
  // get all unique properties
  const transformNames = target.propNames.filter(t => includes(transforms, t))

  // if transform is in the list, remove shorthand properties
  if (transformNames.length > 1 && includes(transformNames, TRANSFORM)) {
    throw new Error('mixing transform and shorthand properties is not allowed')
  }

  // get a list of offsets
  const offsets: number[] = []
  forEach(transformNames, name => {
    const effect = effects[name]
    if (effect) {
      forEach(Object.keys(effect), k => {
        pushDistinct(offsets, +k)
      })
    }
  })

  // put offsets in numerical order
  offsets.sort()

  // create effects for each transform function at each offset
  // this should guarantee transforms are processed in the order that they are scene
  // from the original properties or keyframes
  const transformEffects = offsets.map(offset => {
    // create effect
    const values = {} as { [name: number]: string | number }
    forEach(transformNames, name => {
      if (effects[name] === _) {
        debugger
      }
      values[name] = effects[name][offset]
    })

    return {
      offset,
      values
    }
  })

  // fill in gaps in keyframes
  const len = transformEffects.length
  for (let i = len - 1; i > -1; --i) {
    const effect = transformEffects[i]

    // foreach keyframe if has transform property
    for (const transform in effect.values) {
      let value = effect.values[transform];

      if (isDefined(value)) {
        continue
      }

      // find first value in range
      let startingPos: number = _
      for (var j = i - 1; j > -1; j--) {
        if (isDefined(transformEffects[j].values[transform])) {
          startingPos = j
          break;
        }
      }

      // find next value in range
      let endingPos: number = _
      for (var k = i + 1; k < len; k++) {
        if (isDefined(transformEffects[k].values[transform])) {
          endingPos = k
          break
        }
      } 
      
      // determine which values were found
      const startingPosFound = startingPos !== _
      const endingPosFound = endingPos !== _
      if (startingPosFound && endingPosFound) {
        // if both start and end are found, fill the value based on the relative offset
        const startEffect = transformEffects[startingPos]
        const endEffect = transformEffects[endingPos]  
        const startVal = parseUnit(startEffect.values[transform]);
        const endVal = parseUnit(endEffect.values[transform]);

        for (let g = startingPos + 1; g < endingPos; g++) {
          const currentOffset = offsets[g];

          // calculate offset delta (how much animation progress to apply)
          const offsetDelta = (currentOffset - startEffect.offset) / (endEffect.offset - startEffect.offset);
          const currentValue = startVal.value + (endVal.value - startVal.value) * offsetDelta;

          const currentValueWithUnit = currentValue + (endVal.unit || startVal.unit || '')
          const currentKeyframe = transformEffects[g];
          currentKeyframe.values[transform] = currentValueWithUnit;
        }
      } else {
        // if either start or end was not found, fill from the last known position
        const valuePos = endingPosFound ? endingPos : startingPos
        const gStart = endingPosFound ? 0 : startingPos + 1
        const gEnd = endingPosFound ? endingPos : len
        for (let g = gStart; g < gEnd; g++) {
          transformEffects[g].values[transform] = transformEffects[valuePos].values[transform]
        }
      }
    }
  }

  if (transformEffects.length) {
    // remove transform shorthands
    forEach(transformNames, name => {
      effects[name] = _
    })
    
    const transformEffect = {}
    forEach(transformEffects, effect => {
      let val = '';
      for (var prop in effect.values) {
        if (prop === TRANSFORM) {
          val = effect.values[prop] + '';
          break;
        }
        const unit = parseUnit(effect.values[prop])
        if (!unit.unit) {
          unit.unit = includes(transformAngles, prop) ? DEG : PX
        }
 
        val += (val ? ' ' : '') + (aliases[prop] || prop) + '(' + effect.values[prop] + unit.unit + ')'
      }
      transformEffect[effect.offset] = val
    })
    effects[TRANSFORM] = transformEffect
  }
}

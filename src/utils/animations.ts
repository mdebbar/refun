import { animating, AnyUI } from '../framework';
import { EasingFn } from './easing';
import { div, style } from '../html';

// Speed is how many full circles each second.
export const rotating = animating(function rotating(
  speed: number,
  easing: EasingFn,
  children: AnyUI,
) {
  return passed => {
    const t = ((passed / 1000) * speed) % 1;
    const deg = Math.ceil(easing(t) * 360);
    return style({
      transform: `rotate(${deg}deg)`,
    })(div(null, children));
  };
});

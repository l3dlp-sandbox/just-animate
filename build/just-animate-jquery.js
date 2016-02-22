var AnimationManager_1 = require('./app/AnimationManager');
var animations = require('./animations/_all');
var animationManager = new AnimationManager_1.AnimationManager();
for (var animationName in animations) {
    var a = animations[animationName];
    animationManager.register(animationName, a.keyframes, a.timings);
}
window['Just'] = animationManager;
(function ($) {
    $.fn.justAnimate = function (name, timings) {
        this.each(function (index, el) {
            animationManager.animate(name, el, timings);
        });
        return this;
    };
}(jQuery));
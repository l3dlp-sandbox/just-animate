var AnimationManager_1 = require('./app/AnimationManager');
var animations = require('./animations/_all');
var animationManager = new AnimationManager_1.AnimationManager();
for (var animationName in animations) {
    var a = animations[animationName];
    animationManager.register(animationName, a.keyframes, a.timings);
}
window['Just'] = animationManager;
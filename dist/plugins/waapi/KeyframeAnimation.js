"use strict";
var resources_1 = require('../../common/resources');
var KeyframeAnimator = (function () {
    function KeyframeAnimator(target, keyframes, timings) {
        var self = this;
        var animator = target[resources_1.animate](keyframes, timings);
        // immediately cancel to prevent effects until play is called    
        animator.cancel();
        self._animator = animator;
    }
    KeyframeAnimator.prototype.seek = function (value) {
        if (this._animator.currentTime !== value) {
            this._animator.currentTime = value;
        }
    };
    KeyframeAnimator.prototype.playbackRate = function (value) {
        if (this._animator.playbackRate !== value) {
            this._animator.playbackRate = value;
        }
    };
    KeyframeAnimator.prototype.reverse = function () {
        this._animator.playbackRate *= -1;
    };
    KeyframeAnimator.prototype.playState = function (value) {
        var self = this;
        var animator = self._animator;
        var playState = animator.playState;
        if (value === resources_1.nil) {
            return playState;
        }
        if (value === resources_1.finished) {
            animator.finish();
        }
        else if (value === resources_1.idle) {
            animator.cancel();
        }
        else if (value === resources_1.paused) {
            animator.pause();
        }
        else if (value === resources_1.running) {
            animator.play();
        }
    };
    KeyframeAnimator.prototype.onupdate = function (context) { };
    return KeyframeAnimator;
}());
exports.KeyframeAnimator = KeyframeAnimator;
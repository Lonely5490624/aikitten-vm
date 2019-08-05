const Video = require('../io/video');
const Ml = require('../engine/Ml').default;
const Clone = require('../util/clone');
const RenderedTarget = require('../sprites/rendered-target');
const StageLayering = require('../engine/stage-layering');

window.mlObject = Object.create(null);

class AikittenMachineLearning {
    constructor (runtime) {
        window.runtime = this.runtime = runtime;
        
        this._penSkinId = -1;

        window.mlObject.model = null;
        window.mlObject.strokePath = null;
        window.mlObject.previousPen = 'down';
        // window.mlObject.x = 0;
        // window.mlObject.y = 0;
        window.mlObject._penSkinId = this._getPenLayerID();
        window.mlObject.poses = null;
        window.mlObject.defaultDiameter = null;

        // this.model = null;
        // this.strokePath = null;
        // this.previousPen = 'down';
        this.x = 0;
        this.y = 0;
        this._classifier = null; // 特征集，这里只用这一个特征集

        this._gotStroke = this._gotStroke.bind(this);
        this._onTargetMoved = this._onTargetMoved.bind(this);
    }

    static get DEFAULT_PEN_STATE () {
        return {
            penDown: false,
            color: 66.66,
            saturation: 100,
            brightness: 100,
            transparency: 0,
            _shade: 50, // Used only for legacy `change shade by` blocks
            penAttributes: {
                color4f: [1, 0, 0, 1],
                diameter: 1
            }
        };
    }

    static get STATE_KEY () {
        return 'Scratch.pen';
    }

    getPrimitives () {
        return {
            machineLearning_addfeaturetolabel: this.addFeatureToLabel,
            machineLearning_labeloffeature: this.labelOfFeature,
            machineLearning_clearfeature: this.clearFeature,
            machineLearning_scrawlinit: this.scrawlInit,
            machineLearning_scrawldrawwithpen: this.scrawlDrawWithPen,
            machineLearning_skeletaltrackinginit: this.skeletalTrackingInit,
            machineLearning_skeletaltrackingdrawwithpen: this.skeletalTrackingDrawWithPen,
            machineLearning_skeletaltrackingcoordinate: this.skeletalTrackingCoordinate
        };
    }

    addFeatureToLabel (args) {
        if (!this.runtime.ioDevices.video.provider.video) return;
        const videoEle = this.runtime.ioDevices.video.provider.video;
        const label = args.LABEL;
        // 这里给video加上宽度，ml5需要这个，目前就设为480*360
        videoEle.width = 480;
        videoEle.height = 360;
        return new Promise(resolve => {
            Ml.ml5FeatureExtractor(videoEle, label, this._classifier).then(res => {
                this._classifier = res;
                resolve();
            });
        });
    }

    labelOfFeature () {
        if (!this.runtime.ioDevices.video.provider.video) return;
        const videoEle = this.runtime.ioDevices.video.provider.video;
        if (!this._classifier) return;
        return new Promise(resolve => {
            Ml.ml5Classify(videoEle, this._classifier).then(res => {
                resolve(res);
            });
        });
    }

    clearFeature () {
        this._classifier = null;
    }

    scrawlInit (args) {
        const category = args.CATEGORY;
        return new Promise(resolve => {
            window.mlObject.model = window.ml5.sketchRNN(category, () => {
                resolve();
            });
        });
    }

    scrawlDrawWithPen (args, util) {
        if (!window.mlObject.model) return;
        const target = util.target;
        const penState = this._getPenState(target);

        this.target = target;

        penState.penDown = true;
        target.addListener(RenderedTarget.EVENT_TARGET_MOVED, this._onTargetMoved);

        const penSkinId = this._penSkinId;
        if (penSkinId >= 0) {
            this.runtime.renderer.penPoint(penSkinId, penState.penAttributes, target.x, target.y);
            this.runtime.requestRedraw();
        }
        // this._clear(); // 清空stage上的线条
        window.mlObject.model.reset(); // 重置ml5的画线
        return new Promise(resolve => {
            window.mlObject.model.generate(this._gotStroke);
            // 这里设置一个计时器，strokePath遇到end，表示涂鸦画完了，就resolve()，以便于下一个积木块运行
            const interval = setInterval(() => {
                if (window.mlObject.previousPen === 'end') {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    _drawKeypoints (target) {
        const penState = this._getPenState(target);
        const clonePenState = Clone.simple(penState);
        clonePenState.penAttributes.diameter = window.mlObject.defaultDiameter || 4;
        // Loop through all the poses detected
        for (let i = 0; i < window.mlObject.poses.length; i++) {
            // For each pose detected, loop through all the keypoints
            const pose = window.mlObject.poses[i].pose;
            for (let j = 0; j < pose.keypoints.length; j++) {
                // A keypoint is an object describing a body part (like rightArm or leftShoulder)
                const keypoint = pose.keypoints[j];
                // Only draw an ellipse is the pose probability is bigger than 0.2
                if (keypoint.score > 0.2) {
                    // 静像和非静像模式的坐标换算不一样
                    let x;
                    let y;
                    if (this.runtime.ioDevices.video.mirror) {
                        x = -(keypoint.position.x - 240);
                        y = -(keypoint.position.y - 180);
                    } else {
                        x = keypoint.position.x - 240;
                        y = -(keypoint.position.y - 180);
                    }
                    this.runtime.renderer.penPoint(this._getPenLayerID(), clonePenState.penAttributes, x, y);
                }
            }
        }
    }

    _drawSkeleton (target) {
        const penState = this._getPenState(target);
        // Loop through all the skeletons detected
        for (let i = 0; i < window.mlObject.poses.length; i++) {
            const skeleton = window.mlObject.poses[i].skeleton;
            // For every skeleton, loop through all body connections
            for (let j = 0; j < skeleton.length; j++) {
                const partA = skeleton[j][0];
                const partB = skeleton[j][1];
                // 静像和非静像模式的坐标换算不一样
                let oldX;
                let oldY;
                let newX;
                let newY;
                if (this.runtime.ioDevices.video.mirror) {
                    oldX = -(partA.position.x - 240);
                    oldY = -(partA.position.y - 180);
                    newX = -(partB.position.x - 240);
                    newY = -(partB.position.y - 180);
                } else {
                    oldX = partA.position.x - 240;
                    oldY = -(partA.position.y - 180);
                    newX = partB.position.x - 240;
                    newY = -(partB.position.y - 180);
                }
                this.runtime.renderer.penLine(this._getPenLayerID(), penState.penAttributes, oldX, oldY, newX, newY);
            }
        }
    }

    skeletalTrackingInit () {
        if (!this.runtime.ioDevices.video.provider._video) return;
        const video = this.runtime.ioDevices.video.provider._video;
        // 这里给video加上宽度，ml5需要这个，目前就设为480*360
        video.width = 480;
        video.height = 360;
        return new Promise(resolve => {
            window.mlObject.poseNet = window.ml5.poseNet(video, () => {
                resolve();
            });

        });
    }

    skeletalTrackingDrawWithPen (args, util) {
        // This sets up an event that fills the global variable "poses"
        // with an array every time new poses are detected
        return new Promise(resolve => {
            window.mlObject.poseNet.on('pose', results => {
                window.mlObject.poses = results;
                this._drawKeypoints(util.target);
                this._drawSkeleton(util.target);
                // 移除监听事件，避免一直在监听pose事件，一直有返回事件
                window.mlObject.poseNet.removeAllListeners();
                resolve();
            });
        });
    }

    skeletalTrackingCoordinate (args) {
        const part = args.PART;
        const coor = args.COOR;
        if (window.mlObject.poses) {
            try {
                if (window.mlObject.poses[0].pose[part].confidence < 0.3) return;
                let result;
                if (this.runtime.ioDevices.video.mirror) {
                    if (coor === 'x') {
                        result = -(window.mlObject.poses[0].pose[part][coor] - 240);
                    } else if (coor === 'y') {
                        result = -(window.mlObject.poses[0].pose[part][coor] - 180);
                    }
                } else if (coor === 'x') result = window.mlObject.poses[0].pose[part][coor] - 240;
                else if (coor === 'y') result = -(window.mlObject.poses[0].pose[part][coor] - 180);
                return result;
            } catch (error) {
                return;
            }
        }
        return;
    }

    _gotStroke (err, res) {
        /**
         * 由于ml5默认的尺寸大小是640*480
         * 但是我们canvas是480*360的
         * 正好宽度比都是3/4，所以这里把res的dx和dy分别乘上3/4
         */
        res.dx *= (3 / 4);
        res.dy *= (3 / 4);
        const target = this.target;
        setTimeout(() => {
            const penState = this._getPenState(target);
            if (window.mlObject.previousPen === 'down') {
                this.runtime.renderer.penLine(this._getPenLayerID(), penState.penAttributes, this.x, -this.y, this.x + res.dx, -(this.y + res.dy));
            }
            this.x = this.x + res.dx;
            this.y = this.y + res.dy;
            window.mlObject.previousPen = res.pen;
            if (res.pen !== 'end') {
                res = null;
                window.mlObject.model.generate(this._gotStroke);
            } else if (res.pen === 'end') {
                // 当遇到end时，抬起画笔并移除画笔的移动事件
                penState.penDown = false;
                target.removeListener(RenderedTarget.EVENT_TARGET_MOVED, this._onTargetMoved);
                this.x = 0;
                this.y = 0;
            }
        }, 5);
    }

    _clear () {
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penClear(penSkinId);
            this.runtime.requestRedraw();
        }
    }

    _getPenState (target) {
        let penState = target.getCustomState(AikittenMachineLearning.STATE_KEY);
        if (!penState) {
            penState = Clone.simple(AikittenMachineLearning.DEFAULT_PEN_STATE);
            target.setCustomState(AikittenMachineLearning.STATE_KEY, penState);
        }
        return penState;
    }

    _onTargetMoved (target, oldX, oldY, isForce) {
        // Only move the pen if the movement isn't forced (ie. dragged).
        if (!isForce) {
            const penSkinId = this._getPenLayerID();
            if (penSkinId >= 0) {
                const penState = this._getPenState(target);
                this.runtime.renderer.penLine(penSkinId, penState.penAttributes, oldX, oldY, target.x, target.y);
                this.runtime.requestRedraw();
            }
        }
    }

    _getPenLayerID () {
        // 如果全局变量存在MLPenSkinId则直接返回，否则创建好后设置为全局MLPenSkinId
        if (window.MLPenSkinId) return window.MLPenSkinId;

        if (this._penSkinId < 0 && this.runtime.renderer) {
            window.MLPenSkinId = this._penSkinId = this.runtime.renderer.createPenSkin();
            this._penDrawableId = this.runtime.renderer.createDrawable(StageLayering.PEN_LAYER);
            this.runtime.renderer.updateDrawableProperties(this._penDrawableId, {skinId: this._penSkinId});
        }
        return this._penSkinId;
    }
}

module.exports = AikittenMachineLearning;

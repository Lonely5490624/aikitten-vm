/* eslint-disable max-len */
/* eslint-disable no-mixed-operators */
const formatMessage = require('format-message');
const Face = require('./Face').default;
const StageLayering = require('../engine/stage-layering');
const iconDetectCover = require('../static/detect-cover.png');

const expressTrans = {
    'en': {
        angry: 'angry',
        disgusted: 'disgusted',
        fearful: 'fearful',
        happy: 'happy',
        neutral: 'neutral',
        sad: 'sad',
        surprised: 'surprised'
    },
    'zh-cn': {
        angry: '生气',
        disgusted: '厌恶',
        fearful: '惧怕',
        happy: '高兴',
        neutral: '平静',
        sad: '难过',
        surprised: '惊讶'
    }
};

class Scratch3FaceBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "counter" block value. For compatibility with 2.0.
         * @type {number}
         */
        this._counter = 0;
        this._penSkinId = -1;

        this._currentFace = null;

        this.faceGroup = {};
        this.searchResult = '';
        this.isFirst = true;
        this.similarity = 0;

        Face.loadModel();
    }

    _getViewerLanguageCode () {
        return (formatMessage.setup().locale || navigator.language || navigator.userLanguage || 'en-US').toLowerCase();
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            face_detectface: this.detectFace,
            face_detectfaceupload: this.detectFaceUpload,
            face_detectgenderstring: this.detectGenderString,
            face_detectgender: this.detectGender,
            face_detectage: this.detectAge,
            face_detectexpression: this.detectExpression,
            face_facematchupload: this.faceMatchUpload,
            face_facesimilarity: this.faceSimilarity,
            face_createfacegroup: this.createFaceGroup,
            face_addfacetogroup: this.addFaceToGroup,
            face_searchgroup: this.searchGroup,
            face_searchresultface: this.searchResultFace
        };
    }

    getHats () {
        return {
            face_whendetectedface: {
                restartExistingThreads: true
            },
            face_whensearchedface: {
                restartExistingThreads: true
            },
            face_whensearchend: {
                restartExistingThreads: true
            }
        };
    }

    _getPenLayerID () {
        if (this._penSkinId < 0 && this.runtime.renderer) {
            this._penSkinId = this.runtime.renderer.createPenSkin();
            this._penDrawableId = this.runtime.renderer.createDrawable(StageLayering.PEN_LAYER);
            this.runtime.renderer.updateDrawableProperties(this._penDrawableId, {skinId: this._penSkinId});
        }
        return this._penSkinId;
    }

    detectFace (args, util) {
        const self = this;
        if (!this.runtime.ioDevices.video.provider._video) {
            this._currentFace = null;
            return;
        }
        let detectCover = null;
        if (self.isFirst) {
            detectCover = document.createElement('div');
            const detectImg = document.createElement('img');
            detectImg.src = iconDetectCover;
            detectCover.style.position = 'fixed';
            detectCover.style.top = 0;
            detectCover.style.left = 0;
            detectCover.style.right = 0;
            detectCover.style.bottom = 0;
            detectCover.style.zIndex = 9999;
            detectCover.style.backgroundColor = 'rgba(0,0,0,.7)';
            detectCover.style.display = 'flex';
            detectCover.style.justifyContent = 'center';
            detectCover.style.alignItems = 'center';
            detectCover.appendChild(detectImg);
            document.body.appendChild(detectCover);
        }
        return new Promise(resolve => {
            setTimeout(() => {
                // const canvas = self.runtime.ioDevices.video.getFrame({format: 'canvas', dimensions: [640, 480]});
                // document.body.appendChild(canvas);
                // console.log(1111, canvas);
                Face.detectionFace(self.runtime.ioDevices.video.provider._video).then(res => {
                    if (res) {
                        self._currentFace = res;
                        // 这里使用画笔画一个人脸的轮廓
                        const penState = {
                            penDown: true,
                            color: 66.66,
                            saturation: 100,
                            brightness: 100,
                            transparency: 0,
                            _shade: 50, // Used only for legacy `change shade by` blocks
                            penAttributes: {
                                color4f: [0.66, 0.85, 0.40, 1],
                                diameter: 1
                            }
                        };
                        const positions = res.landmarks.positions;
                        const object = {
                            face: positions.slice(0, 17),
                            rightEyebrows: positions.slice(17, 22),
                            leftEyebrows: positions.slice(22, 27),
                            nose: positions.slice(27, 36),
                            rightEye: positions.slice(36, 42),
                            leftEye: positions.slice(42, 48),
                            mouth: positions.slice(48)
                        };
                        for (const [key, val] of Object.entries(object)) {
                            for (let i = 0; i < val.length; i++) {
                                let oldX;
                                let oldY;
                                let newX;
                                let newY;
                                if (this.runtime.ioDevices.video.mirror) {
                                    oldX = -(val[i].x / 1.333333 - 240);
                                    oldY = -(val[i].y / 1.333333 - 180);
                                    if (i === val.length - 1 && (key === 'rightEye' || key === 'leftEye' || key === 'mouth')) {
                                        newX = -(val[0].x / 1.333333 - 240);
                                        newY = -(val[0].y / 1.333333 - 180);
                                    } else {
                                        newX = -((val[i + 1] ? val[i + 1].x : val[i].x) / 1.333333 - 240);
                                        newY = -((val[i + 1] ? val[i + 1].y : val[i].y) / 1.333333 - 180);
                                    }
                                } else {
                                    oldX = val[i].x / 1.333333 - 240;
                                    oldY = -(val[i].y / 1.333333 - 180);
                                    if (i === val.length - 1 && (key === 'rightEye' || key === 'leftEye' || key === 'mouth')) {
                                        newX = val[0].x / 1.333333 - 240;
                                        newY = -(val[0].y / 1.333333 - 180);
                                    } else {
                                        newX = (val[i + 1] ? val[i + 1].x : val[i].x) / 1.333333 - 240;
                                        newY = -((val[i + 1] ? val[i + 1].y : val[i].y) / 1.333333 - 180);
                                    }
                                }
                                self.runtime.renderer.penLine(self._getPenLayerID(), penState.penAttributes, oldX, oldY, newX, newY);
                            }
                        }
                        setTimeout(() => {
                            self.runtime.renderer.penClear(self._getPenLayerID());
                        }, 1000);

                        util.startHats('face_whendetectedface');
                        self.isFirst = false;
                        if (detectCover) document.body.removeChild(detectCover);
                        resolve();
                    } else {
                        self._currentFace = res;
                        self.isFirst = false;
                        if (detectCover) document.body.removeChild(detectCover);
                        resolve();
                    }
                });
            }, 100);
        });
    }

    detectFaceUpload (args, util) {
        const self = this;
        window.openImageUpload('人脸检测');
        let detectCover = null;
        return new Promise(resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue1) {
                    if (self.isFirst) {
                        detectCover = document.createElement('div');
                        const detectImg = document.createElement('img');
                        detectImg.src = iconDetectCover;
                        detectCover.style.position = 'fixed';
                        detectCover.style.top = 0;
                        detectCover.style.left = 0;
                        detectCover.style.right = 0;
                        detectCover.style.bottom = 0;
                        detectCover.style.zIndex = 9999;
                        detectCover.style.backgroundColor = 'rgba(0,0,0,.7)';
                        detectCover.style.display = 'flex';
                        detectCover.style.justifyContent = 'center';
                        detectCover.style.alignItems = 'center';
                        detectCover.appendChild(detectImg);
                        document.body.appendChild(detectCover);
                    }
                    const imageDom = document.createElement('img');
                    imageDom.src = e.newValue1;
                    const canvas = document.createElement('canvas');
                    canvas.width = imageDom.width * 2;
                    canvas.height = imageDom.height * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageDom, 0, 0);
                    setTimeout(() => {
                        Face.detectionFace(canvas).then(res => {
                            if (res) {
                                this._currentFace = res;
                                util.startHats('face_whendetectedface');
                                window.removeEventListener('setItemEvent', handleEvent);
                                self.isFirst = false;
                                if (detectCover) document.body.removeChild(detectCover);
                                resolve();
                            } else {
                                this._currentFace = res;
                                window.removeEventListener('setItemEvent', handleEvent);
                                self.isFirst = false;
                                if (detectCover) document.body.removeChild(detectCover);
                                resolve();
                            }
                        });
                    }, 100);
                } else {
                    /**
                     * 这里else表示在上传的时候关闭了弹出框，这时也要监听，并且resolve让下一步继续执行
                     */
                    window.removeEventListener('setItemEvent', handleEvent);
                    resolve();
                }
            };
            window.addEventListener('setItemEvent', handleEvent);
        });
    }

    detectGenderString () {
        if (!this._currentFace) return;
        const transfer = {
            male: '男性',
            female: '女性'
        };
        return transfer[this._currentFace.gender];
    }

    detectGender (args) {
        if (!this._currentFace) return;
        return this._currentFace.gender === args.GENDER;
    }

    detectAge () {
        if (!this._currentFace) return;
        return parseInt(this._currentFace.age, 10) || null;
    }
    
    detectExpression () {
        if (!this._currentFace) return;
        const expressions = this._currentFace.expressions;
        const express = Object.keys(expressions).find(item => expressions[item] > 0.5);
        return expressTrans[this._getViewerLanguageCode()][express] || null;
    }

    faceMatchUpload () {
        const self = this;
        window.openImageUploadDouble();
        let detectCover = null;
        return new Promise((resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue1 && e.newValue2) {
                    if (self.isFirst) {
                        detectCover = document.createElement('div');
                        const detectImg = document.createElement('img');
                        detectImg.src = iconDetectCover;
                        detectCover.style.position = 'fixed';
                        detectCover.style.top = 0;
                        detectCover.style.left = 0;
                        detectCover.style.right = 0;
                        detectCover.style.bottom = 0;
                        detectCover.style.zIndex = 9999;
                        detectCover.style.backgroundColor = 'rgba(0,0,0,.7)';
                        detectCover.style.display = 'flex';
                        detectCover.style.justifyContent = 'center';
                        detectCover.style.alignItems = 'center';
                        detectCover.appendChild(detectImg);
                        document.body.appendChild(detectCover);
                    }
                    const imageDom1 = document.createElement('img');
                    imageDom1.src = e.newValue1;
                    const imageDom2 = document.createElement('img');
                    imageDom2.src = e.newValue2;
                    const canvas1 = document.createElement('canvas');
                    canvas1.width = imageDom1.width * 2;
                    canvas1.height = imageDom1.height * 2;
                    const ctx1 = canvas1.getContext('2d');
                    ctx1.drawImage(imageDom1, 0, 0);
                    const canvas2 = document.createElement('canvas');
                    canvas2.width = imageDom2.width * 2;
                    canvas2.height = imageDom2.height * 2;
                    const ctx2 = canvas2.getContext('2d');
                    ctx2.drawImage(imageDom2, 0, 0);
                    setTimeout(() => {
                        Face.faceMatchUpload(canvas1, canvas2).then(res => {
                            if (res) {
                                self.similarity = ((1 - res.distance) * 100).toFixed(0);
                            } else {
                                self.similarity = 0;
                            }
                            self.isFirst = false;
                            if (detectCover) document.body.removeChild(detectCover);
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        });
                    }, 100);
                } else {
                    /**
                     * 这里else表示在上传的时候关闭了弹出框，这时也要监听，并且resolve让下一步继续执行
                     */
                    window.removeEventListener('setItemEvent', handleEvent);
                    resolve();
                }
            };
            window.addEventListener('setItemEvent', handleEvent);
        }));
    }

    faceSimilarity () {
        if (!this.similarity) return;
        return this.similarity;
    }

    createFaceGroup (args) {
        const group = args.GROUP;
        this.faceGroup[group] = null;
    }

    addFaceToGroup (args) {
        if (!this._currentFace) return;
        const group = args.GROUP;
        const name = args.FACE;
        return new Promise((resolve, reject) => {
            Face.classFace(this._currentFace, name, this.faceGroup[group]).then(res => {
                this.faceGroup[group] = res;
                resolve();
            });
        });
    }

    searchGroup (args, util) {
        const group = args.GROUP;
        if (this.faceGroup[group]) {
            Face.faceRecognition(this._currentFace, this.faceGroup[group]).then(res => {
                if (res) {
                    util.startHats('face_whensearchedface', {
                        TEXT: res
                    });
                }
                this.searchResult = res;
                util.startHats('face_whensearchend');
            })
                .catch(() => {
                    this.searchResult = '';
                    util.startHats('face_whensearchend');
                });
        } else {
            this.searchResult = '';
            util.startHats('face_whensearchend');
        }
    }

    searchResultFace () {
        return this.searchResult;
    }
}

module.exports = Scratch3FaceBlocks;

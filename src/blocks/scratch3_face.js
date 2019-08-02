const formatMessage = require('format-message');
const Face = require('./Face').default;

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

        this._currentFace = null;

        this.faceGroup = {};
        this.searchResult = '';

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
            face_detectgender: this.detectGender,
            face_detectage: this.detectAge,
            face_detectexpression: this.detectExpression,
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

    controlVideo (args) {
        if (args.STATUS === 'ON') {
            this.runtime.ioDevices.video.enableVideo();
        } else {
            this.runtime.ioDevices.video.disableVideo();
        }
    }

    detectFace (args, util) {
        if (!this.runtime.ioDevices.video.provider._video) {
            this._currentFace = null;
            return;
        }
        Face.detectionFace(this.runtime.ioDevices.video.provider._video).then(res => {
            if (res) {
                this._currentFace = res;
                util.startHats('face_whendetectedface');
            } else {
                this._currentFace = res;
            }
        });
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

    createFaceGroup (args) {
        const group = args.GROUP;
        this.faceGroup[group] = null;
    }

    addFaceToGroup (args) {
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

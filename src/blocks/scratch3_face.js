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

        this.videoEle = null;
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
            this.runtime.ioDevices.video.enableVideo().then(() => {
                this.videoEle = this.runtime.ioDevices.video.provider._video;
            });
        } else {
            this.runtime.ioDevices.video.disableVideo();
            this.videoEle = null;
        }
    }

    detectFace (args, util) {
        if (!this.videoEle) {
            return;
        }
        Face.detectionFace(this.videoEle).then(res => {
            if (res) {
                util.startHats('face_whendetectedface');
            }
        });
    }

    detectGender (args) {
        if (!this.videoEle) {
            return;
        }
        const gender = args.GENDER;
        return new Promise((resolve, reject) => {
            Face.detectionGenderAndAge(this.videoEle).then(res => {
                resolve(res.gender === gender);
            });
        });
    }

    detectAge () {
        if (!this.videoEle) {
            return;
        }
        return new Promise((resolve, reject) => {
            Face.detectionGenderAndAge(this.videoEle).then(res => {
                resolve(parseInt(res.age, 10));
            });
        });
    }
    
    detectExpression () {
        if (!this.videoEle) {
            return;
        }
        return new Promise((resolve, reject) => {
            Face.detectionFaceExpressions(this.videoEle).then(res => {
                resolve(expressTrans[this._getViewerLanguageCode()][res] || '');
            });
        });
    }

    createFaceGroup (args) {
        const group = args.GROUP;
        this.faceGroup[group] = null;
    }

    addFaceToGroup (args) {
        if (!this.videoEle) {
            return;
        }
        const group = args.GROUP;
        const name = args.FACE;
        return new Promise((resolve, reject) => {
            Face.classFace(this.videoEle, name, this.faceGroup[group]).then(res => {
                this.faceGroup[group] = res;
                resolve();
            });
        });
    }

    searchGroup (args, util) {
        if (!this.videoEle) {
            return;
        }
        const group = args.GROUP;
        if (this.faceGroup[group]) {
            Face.faceRecognition(this.videoEle, this.faceGroup[group]).then(res => {
                if (res) {
                    util.startHats('face_whensearchedface', {
                        TEXT: res
                    });
                }
                this.searchResult = res;
                util.startHats('face_whensearchend');
            })
                .catch(() => {
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

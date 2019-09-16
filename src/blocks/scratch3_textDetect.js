const Video = require('../io/video');
const iconWarn = require('../static/icon-warning.svg');

const bankCardType = {
    1: '储蓄卡',
    2: '信用卡'
};

class AikittenTextDetect {
    constructor (runtime) {
        this.runtime = runtime;

        this.bankCardInfo = null;
        this.idCardInfo = null;
        this.licensePlateInfo = null;
        this.imageTextInfo = null;
    }

    getPrimitives () {
        return {
            textDetect_similarity: this.similarity,
            textDetect_bankcarddetectionvideo: this.bankCardDetectionVideo,
            textDetect_bankcarddetectionupload: this.bankCardDetectionUpload,
            textDetect_bankcarddetectionsrc: this.bankCardDetectionSrc,
            textDetect_bankcardinfo: this.getBacnCardInfo,
            textDetect_idcarddetectionvideo: this.idCardDetectionVideo,
            textDetect_idcarddetectionupload: this.idCardDetectionUpload,
            textDetect_idcarddetectionsrc: this.idCardDetectionSrc,
            textDetect_idcardinfo: this.getIdCardInfo,
            textDetect_licenseplatedetectionsrc: this.licensePlateDetectionSrc,
            textDetect_licenseplatedetectionupload: this.licensePlateDetectionUpload,
            textDetect_licenseplateinfo: this.getLicensePlateInfo,
            textDetect_imagetextdetectionsrc: this.imageTextDetectionSrc,
            textDetect_imagetextdetectionupload: this.imageTextDetectionUpload,
            textDetect_imagetextinfo: this.getImageText
        };
    }

    getBase64FromVideo () {
        if (!this.runtime.ioDevices.video.provider._video) return;
        const canvas = this.runtime.ioDevices.video.getFrame({
            format: Video.FORMAT_CANVAS
        });
        const imgBase64 = canvas.toDataURL('image/png');
        return imgBase64;
    }

    similarity (args) {
        const text1 = args.TEXT1;
        const text2 = args.TEXT2;
        const reqJson = {
            text1,
            text2
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/textSimilarity', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    resolve(res.score);
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    bankCardDetectionVideo () {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            base64: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/bankCardDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.bankCardInfo = res.result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    bankCardDetectionUpload () {
        window.openImageUpload('银行卡检测');
        return new Promise((resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue) {
                    const reqJson = {
                        base64: e.newValue
                    };
                    fetch('http://localhost:8081/aikitten/bankCardDetection', {
                        body: JSON.stringify(reqJson),
                        headers: {
                            'content-type': 'application/json'
                        },
                        method: 'POST'
                    }).then(res => res.json())
                        .then(res => {
                            this.bankCardInfo = res.result;
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        })
                        .catch(() => {
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        });
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

    bankCardDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                base64: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/bankCardDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.bankCardInfo = res.result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getBacnCardInfo () {
        if (this.bankCardInfo) {
            const arr = [];
            if (this.bankCardInfo.bank_card_number) {
                arr.push(this.bankCardInfo.bank_card_number);
            }
            if (this.bankCardInfo.bank_name) {
                arr.push(this.bankCardInfo.bank_name);
            }
            if (bankCardType[this.bankCardInfo.bank_card_type]) {
                arr.push(bankCardType[this.bankCardInfo.bank_card_type]);
            }
            if (this.bankCardInfo.valid_date && this.bankCardInfo.valid_date !== 'NO VALID') {
                arr.push(this.bankCardInfo.valid_date);
            }
            return arr.join();
        }
        return;
    }

    idCardDetectionVideo () {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            base64: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/idCardDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.idCardInfo = res.words_result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    idCardDetectionUpload () {
        window.openImageUpload('身份证检测');
        return new Promise((resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue) {
                    const reqJson = {
                        base64: e.newValue
                    };
                    fetch('http://localhost:8081/aikitten/idCardDetection', {
                        body: JSON.stringify(reqJson),
                        headers: {
                            'content-type': 'application/json'
                        },
                        method: 'POST'
                    }).then(res => res.json())
                        .then(res => {
                            this.idCardInfo = res.words_result;
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        })
                        .catch(() => {
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        });
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

    idCardDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                base64: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/idCardDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.idCardInfo = res.words_result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getIdCardInfo () {
        if (this.idCardInfo) {
            const arr = [];
            if (this.idCardInfo['姓名'] && this.idCardInfo['姓名'].words) {
                arr.push(this.idCardInfo['姓名'].words);
            }
            if (this.idCardInfo['公民身份号码'] && this.idCardInfo['公民身份号码'].words) {
                arr.push(this.idCardInfo['公民身份号码'].words);
            }
            if (this.idCardInfo['出生'] && this.idCardInfo['出生'].words) {
                arr.push(this.idCardInfo['出生'].words);
            }
            if (this.idCardInfo['性别'] && this.idCardInfo['性别'].words) {
                arr.push(this.idCardInfo['性别'].words);
            }
            if (this.idCardInfo['民族'] && this.idCardInfo['民族'].words) {
                arr.push(this.idCardInfo['民族'].words);
            }
            if (this.idCardInfo['住址'] && this.idCardInfo['住址'].words) {
                arr.push(this.idCardInfo['住址'].words);
            }
            return arr.join();
        }
        return;
    }

    licensePlateDetectionUpload () {
        window.openImageUpload('车牌号检测');
        return new Promise((resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue) {
                    const reqJson = {
                        base64: e.newValue
                    };
                    fetch('http://localhost:8081/aikitten/licensePlateDetection', {
                        body: JSON.stringify(reqJson),
                        headers: {
                            'content-type': 'application/json'
                        },
                        method: 'POST'
                    }).then(res => res.json())
                        .then(res => {
                            this.licensePlateInfo = res.words_result;
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        })
                        .catch(() => {
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        });
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

    licensePlateDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                base64: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/licensePlateDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.licensePlateInfo = res.words_result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getLicensePlateInfo () {
        if (this.licensePlateInfo) {
            return this.licensePlateInfo.number;
        }
        return;
    }

    imageTextDetectionUpload () {
        window.openImageUpload('图片内文字检测');
        return new Promise((resolve => {
            /**
             * 需要监听storage的变化
             * 并且在该方法执行完后移除事件监听，避免重复执行
             */

            const handleEvent = e => {
                if (e.newValue) {
                    const base64 = e.newValue.replace(/data:image\/(.*);base64,/, '');
                    const reqJson = {
                        base64
                    };
                    fetch('http://localhost:8081/aikitten/webImageDetection', {
                        body: JSON.stringify(reqJson),
                        headers: {
                            'content-type': 'application/json'
                        },
                        method: 'POST'
                    }).then(res => res.json())
                        .then(res => {
                            this.imageTextInfo = res.words_result;
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        })
                        .catch(() => {
                            window.removeEventListener('setItemEvent', handleEvent);
                            resolve();
                        });
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

    imageTextDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                base64: imageSrc
            };
            fetch('http://localhost:8081/aikitten/webImageUrlDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.imageTextInfo = res.words_result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getImageText () {
        if (this.imageTextInfo) {
            const arr = [];
            this.imageTextInfo.forEach(item => {
                arr.push(item.words);
            });
            return arr.join();
        }
        return;
    }
}

module.exports = AikittenTextDetect;

const Video = require('../io/video');

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
            textDetect_bankcarddetectionsrc: this.bankCardDetectionSrc,
            textDetect_bankcardinfo: this.getBacnCardInfo,
            textDetect_idcarddetectionvideo: this.idCardDetectionVideo,
            textDetect_idcarddetectionsrc: this.idCardDetectionSrc,
            textDetect_idcardinfo: this.getIdCardInfo,
            textDetect_licenseplatedetectionsrc: this.licensePlateDetectionSrc,
            textDetect_licenseplateinfo: this.getLicensePlateInfo,
            textDetect_imagetextdetectionsrc: this.imageTextDetectionSrc,
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
        return new Promise((resolve, reject) => {
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
        return new Promise((resolve, reject) => {
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

    bankCardDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('请输入正确的网络图片地址', 3000);
            return;
        }
        return new Promise((resolve, reject) => {
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
                    console.log(res);
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
        return new Promise((resolve, reject) => {
            fetch('http://localhost:8081/aikitten/idCardDetection', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    console.log(res);
                    this.idCardInfo = res.words_result;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    idCardDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('请输入正确的网络图片地址', 3000);
            return;
        }
        return new Promise((resolve, reject) => {
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
                    console.log(res);
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
            if (this.idCardInfo['姓名'].words) {
                arr.push(this.idCardInfo['姓名'].words);
            }
            if (this.idCardInfo['公民身份号码'].words) {
                arr.push(this.idCardInfo['公民身份号码'].words);
            }
            if (this.idCardInfo['出生'].words) {
                arr.push(this.idCardInfo['出生'].words);
            }
            if (this.idCardInfo['性别'].words) {
                arr.push(this.idCardInfo['性别'].words);
            }
            if (this.idCardInfo['民族'].words) {
                arr.push(this.idCardInfo['民族'].words);
            }
            if (this.idCardInfo['住址'].words) {
                arr.push(this.idCardInfo['住址'].words);
            }
            return arr.join();
        }
        return;
    }

    licensePlateDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('请输入正确的网络图片地址', 3000);
            return;
        }
        return new Promise((resolve, reject) => {
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
                    console.log(res);
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

    imageTextDetectionSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('请输入正确的网络图片地址', 3000);
            return;
        }
        return new Promise((resolve, reject) => {
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
                    console.log(res);
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

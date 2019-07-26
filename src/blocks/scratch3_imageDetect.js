const Video = require('../io/video');
const iconWarn = require('../static/icon-warning.svg');

class AikittenImageDetect {
    constructor (runtime) {
        this.runtime = runtime;

        this.generalResult = null;
        this.animalResult = null;
        this.ingredientResult = null;
    }

    getPrimitives () {
        return {
            imageDetect_generaldetectvideo: this.generalDetectVideo,
            imageDetect_generaldetectsrc: this.generalDetectSrc,
            imageDetect_generalname: this.getGeneralName,
            imageDetect_generaltype: this.getGeneralType,
            imageDetect_animaldetectvideo: this.animalDetectVideo,
            imageDetect_animaldetectsrc: this.animalDetectSrc,
            imageDetect_animalname: this.getAnimalName,
            imageDetect_plantdetectvideo: this.plantDetectVideo,
            imageDetect_plantdetectsrc: this.plantDetectSrc,
            imageDetect_plantname: this.getPlantName,
            imageDetect_ingredientdetectvideo: this.ingredientDetectVideo,
            imageDetect_ingredientdetectsrc: this.ingredientDetectSrc,
            imageDetect_ingredientname: this.getIngredientName
        };
    }

    getHats () {
        return {
            imageDetect_whendetectedanimal: {
                restartExistingThreads: true
            },
            imageDetect_whendetectedplant: {
                restartExistingThreads: true
            },
            imageDetect_whendetectedingredient: {
                restartExistingThreads: true
            }
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

    generalDetectVideo () {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            image: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/generalDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.generalResult = res.result ? res.result[0] : null;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    generalDetectSrc (args) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                image: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/generalDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    this.generalResult = res.result ? res.result[0] : null;
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getGeneralName () {
        if (this.generalResult) {
            return this.generalResult.keyword;
        }
        return;
    }

    getGeneralType () {
        if (this.generalResult) {
            return this.generalResult.root;
        }
        return;
    }

    animalDetectVideo (args, util) {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            image: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/animalDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    if (res && res.result && res.result[0].name !== '非动物') {
                        this.animalResult = res.result[0];
                        util.startHats('imageDetect_whendetectedanimal');
                        resolve();
                    } else {
                        this.animalResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    animalDetectSrc (args, util) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                image: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/animalDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    if (res && res.result && res.result[0].name !== '非动物') {
                        this.animalResult = res.result[0];
                        util.startHats('imageDetect_whendetectedanimal');
                        resolve();
                    } else {
                        this.animalResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getAnimalName () {
        if (this.animalResult) {
            return this.animalResult.name;
        }
        return;
    }

    plantDetectVideo (args, util) {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            image: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/plantDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    if (res && res.result && res.result[0].name !== '非植物') {
                        this.plantResult = res.result[0];
                        util.startHats('imageDetect_whendetectedplant');
                        resolve();
                    } else {
                        this.plantResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    plantDetectSrc (args, util) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                image: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/plantDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    if (res && res.result && res.result[0].name !== '非植物') {
                        this.plantResult = res.result[0];
                        util.startHats('imageDetect_whendetectedplant');
                        resolve();
                    } else {
                        this.plantResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getPlantName () {
        if (this.plantResult) {
            return this.plantResult.name;
        }
        return;
    }

    ingredientDetectVideo (args, util) {
        const imgBase64 = this.getBase64FromVideo();
        const reqJson = {
            image: imgBase64
        };
        return new Promise(resolve => {
            fetch('http://localhost:8081/aikitten/ingredientDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    if (res && res.result && res.result[0].name !== '非果蔬食材') {
                        this.ingredientResult = res.result[0];
                        util.startHats('imageDetect_whendetectedingredient');
                        resolve();
                    } else {
                        this.ingredientResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    ingredientDetectSrc (args, util) {
        const imageSrc = args.SRC;
        if (!/^(http:\/\/|https:\/\/)/.test(imageSrc)) {
            window.Toast.error('网络地址格式不正确！', 3000, iconWarn);
            return;
        }
        return new Promise(resolve => {
            const reqJson = {
                image: imageSrc,
                isUrl: true
            };
            fetch('http://localhost:8081/aikitten/ingredientDetect', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(res => {
                    // if (res && res.result && res.result[0].name !== '非果蔬食材') {
                    //     this.ingredientResult = res.result[0];
                    //     util.startHats('imageDetect_whendetectedingredient');
                    //     resolve();
                    // } else {
                    //     if (res.result[1]) {
                    //         this.ingredientResult = res.result[1];
                    //         util.startHats('imageDetect_whendetectedingredient');
                    //     } else {
                    //         this.ingredientResult = null;
                    //     }
                    //     resolve();
                    // }
                    if (res && res.result && res.result[0].name !== '非果蔬食材') {
                        this.ingredientResult = res.result[0];
                        util.startHats('imageDetect_whendetectedingredient');
                        resolve();
                    } else {
                        this.ingredientResult = null;
                        resolve();
                    }
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    getIngredientName () {
        if (this.ingredientResult) {
            return this.ingredientResult.name;
        }
        return;
    }
}

module.exports = AikittenImageDetect;

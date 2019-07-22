import GlobalConfig from './GlobalConfig';

const faceapi = window.ml5.faceapi.default;

const SSD_MOBILENETV1 = 'ssd_mobilenetv1';
const TINY_FACE_DETECTOR = 'tiny_face_detector';
const MTCNN = 'mtcnn';
// ssd_mobilenetv1 options
const minConfidence = 0.5;

// tiny_face_detector options
const inputSize = 512;
const scoreThreshold = 0.5;

// mtcnn options
const minFaceSize = 20;

const url = `${GlobalConfig.serverURL}:${GlobalConfig.localServerPort}`;
const Face = {
    loadModel: function () {
        return new Promise((resolve, reject) => {
            Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(url),
                faceapi.loadFaceLandmarkModel(url), // 标点
                faceapi.loadFaceRecognitionModel(url), // 识别
                faceapi.loadFaceExpressionModel(url), // 表情
                faceapi.nets.ageGenderNet.load(url) // 年龄、性别
            ]).then(res => {
                resolve('models loaded');
            })
                .catch(err => {
                    reject(err);
                });
        });
    },
    getFaceDetectorOptions: function (Detector = 'ssd_mobilenetv1') {
        return Detector === SSD_MOBILENETV1 ?
            new faceapi.SsdMobilenetv1Options({minConfidence}) :
            (
                Detector === TINY_FACE_DETECTOR ?
                    new faceapi.TinyFaceDetectorOptions({inputSize, scoreThreshold}) :
                    new faceapi.MtcnnOptions({minFaceSize})
            );
    },
    detectionFace: function (element) {
        return new Promise((resolve, reject) => {
            faceapi.detectSingleFace(element, this.getFaceDetectorOptions())
                .withFaceLandmarks()
                .withAgeAndGender()
                .withFaceExpressions()
                .withFaceDescriptor()
                .then(res => {
                    resolve(res ? res : null);
                });
        });
    },
    detectionGenderAndAge: function (element) {
        return new Promise((resolve, reject) => {
            faceapi.detectSingleFace(element, this.getFaceDetectorOptions()).withFaceLandmarks()
                .withAgeAndGender()
                .then(res => {
                    let re = {};
                    if (res) {
                        re = {
                            age: res.age,
                            gender: res.gender
                        };
                    }
                    resolve(re);
                });
        });
    },
    detectionFaceExpressions: function (element) {
        return new Promise((resolve, reject) => {
            faceapi.detectSingleFace(element, this.getFaceDetectorOptions()).withFaceLandmarks()
                .withFaceExpressions()
                .then(res => {
                    if (res) {
                        const exRes = res.expressions;
                        const sorted = exRes.asSortedArray();
                        const resultsToDisplay = sorted.filter(item => item.probability > 0.05);
                        resolve(resultsToDisplay[0].expression);
                    } else {
                        resolve('');
                    }
                });
        });
    },
    classFace: function (faceData, faceName, matcherClass) {
        return new Promise((resolve, reject) => {
            let faceMatcher;
            const descriptorsArr = [];
            descriptorsArr.push(faceData.descriptor);
            const opt = new faceapi.LabeledFaceDescriptors(
                faceName,
                descriptorsArr
            );
            if (matcherClass) {
                matcherClass._labeledDescriptors.push(opt);
                faceMatcher = matcherClass;
            } else {
                faceMatcher = new faceapi.FaceMatcher(opt);
            }
            resolve(faceMatcher);
            
        });
    },
    faceRecognition: function (faceData, faceMatcher, minConfidence = 0.45) {
        return new Promise((resolve, reject) => {
            const bestMatch = faceMatcher.findBestMatch(faceData.descriptor);
            resolve(bestMatch._distance > minConfidence ? '' : bestMatch._label);
        });
    }
};

export default Face;

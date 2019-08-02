let Ml = {
    mlPoseNet: (element, pose) => {

        return new Promise((resolve, reject) => {
            if (!pose) {
                let pose = ml5.poseNet(element, callback);
                function callback() {
                    resolve(pose);
                }
            }
        })
    },
    draw: (canvas, res) => {
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 640, 480)
        ctx.strokeStyle = "#cc0000";
        ctx.fillStyle = "#cc0000";
        let point;
        let partA;
        let partB;
        for (let i = 0; i < res.length; i++) {
            let pose = res[i].pose;
            for (let j = 0; j < pose.keypoints.length; j++) {
                let keypoint = pose.keypoints[j];
                if (keypoint.score > 0.2) {
                    point = { x: keypoint.position.x, y: keypoint.position.y };
                    ctx.fillRect(point.x, point.y, 5, 5);
                }
            }
        }
        for (let i = 0; i < res.length; i++) {
            let skeleton = res[i].skeleton;
            for (let j = 0; j < skeleton.length; j++) {
                // console.log(skeleton)
                partA = skeleton[j][0];
                partB = skeleton[j][1];
                ctx.beginPath();
                ctx.lineTo(partA.position.x, partA.position.y)
                ctx.lineTo(partB.position.x, partB.position.y)
                ctx.stroke();

            }
        }
    },
    ml5FeatureExtractor: (element, name, classifier) => {
        return new Promise((resolve, reject) => {
            let Train = (classifier) => {
                Promise.all([
                    classifier.addImage(element, name),
                    classifier.addImage(element, name),
                    classifier.addImage(element, name)
                ]).then(res => {
                    classifier.train((res) => {
                        if (!res) {
                            resolve(classifier)
                        }
                    })
                })
            }
            if (classifier) {
                Train(classifier)
            } else {
                const featureExtractor = ml5.featureExtractor("MobileNet", () => {

                    const classifier = featureExtractor.classification(element, { numLabels: 10 }, () => {
                        Train(classifier)
                    });
                });
            }


        })
    },
    ml5Classify: (element, classifier) => {
        return new Promise((resolve, reject) => {
            classifier.classify(element, (err, res) => {
                if (err) {
                    reject(err)
                }
                resolve(res[0].label)
            })
        })
    },
    ml5RNNDraw: (element, type, model,width=640,height=480) => {
        return new Promise((resolve, reject) => {
            let ctx = element.getContext("webgl");
            let x, y;
            let previous_pen;
            let curModel;
            let i = 10;
            ctx.strokeStyle = "#cc0000";
            let startDraw = (curModel) => {
                curModel.reset();
                ctx.clearRect(0, 0, width, height);
                x = width/2
                y = height/2
                curModel.generate(draw);
            }
            let draw = (err, res) => {
                let t = setTimeout(() => {
                    
                    if (previous_pen == "down") {
                        ctx.beginPath();
                       
                        ctx.moveTo(x, y)
                        ctx.lineTo(x+res.dx, y+res.dy);
                        ctx.stroke();
                    }
                    x = x + res.dx;
                    y = y + res.dy;
                    previous_pen = res.pen;
                    if (res.pen !== "end") {
                        res = null;
                        curModel.generate(draw)
                    }
                }, 5)




            }
            if (model && model.model.info.name == type) {

                curModel = model;
                startDraw(curModel)

            } else {
                curModel = ml5.sketchRNN(type, () => {
                    startDraw(curModel);
                    resolve(curModel)
                })
            }



        })


    }

}
export default Ml
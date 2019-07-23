class AikittenRead {
    constructor (runtime) {
        this.runtime = runtime;

        // 默认的一些数值
        this.voice = 1; // 声音类型：男声
        this.speed = 5; // 语速
        this.tone = 5; // 音调
        this.vol = 5; // 音量

        this._soundPlayers = new Map();

        this._stopAllRead = this._stopAllRead.bind(this);
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', this._stopAllRead);
        }
    }

    getPrimitives () {
        return {
            read_readtext: this.readText,
            read_setvoice: this.setVoice,
            read_setspeed: this.setSpeed,
            read_settone: this.setTone,
            read_setvol: this.setVol
        };
    }

    readText (args) {
        return new Promise((resolve, reject) => {
            fetch(`http://localhost:8081/aikitten/text2audio?text=${args.TEXT}&spd=${this.speed}&pit=${this.tone}&vol=${this.vol}&per=${this.voice}`)
                .then(res => res.blob())
                .then(res => {
                    if (res.type !== 'audio/mp3') {
                        resolve();
                        return;
                    }
                    const audio = document.createElement('audio');
                    audio.setAttribute('src', URL.createObjectURL(res));
                    audio.setAttribute('data-id', 'aikitten-read');
                    document.body.appendChild(audio);
                    audio.play();
                    audio.onended = function () {
                        document.body.removeChild(audio);
                        resolve();
                    };
                })
        });
    }

    setVoice (args) {
        this.voice = args.VOICE;
    }

    setSpeed (args) {
        this.speed = args.SPEED;
    }

    setTone (args) {
        this.tone = args.TONE;
    }

    setVol (args) {
        this.vol = args.VOL;
    }

    _stopAllRead () {
        // 停止并删除已存在的audio标签
        const existingAudios = document.querySelectorAll('audio[data-id="aikitten-read"]');
        if (existingAudios && existingAudios.length) {
            existingAudios.forEach(audio => {
                document.body.removeChild(audio);
            });
        }
    }
}

module.exports = AikittenRead;

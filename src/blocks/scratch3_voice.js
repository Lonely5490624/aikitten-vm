const Resampler = require('../util/resampler.js');
const BUFSIZE = 8192;

class AikittenVoice {
    constructor (runtime) {
        this.runtime = runtime;
        this._context = null;
        this._resampler = null;
        this._onSpeechDone = null;
        this.initMicroPhone = this.initMicroPhone.bind(this);
        this._processAudioCallback = this._processAudioCallback.bind(this);
        this._resetListening = this._resetListening.bind(this);
        this._recognize = this._recognize.bind(this);
        this._recognizeSuccess = this._recognizeSuccess.bind(this);
    
        this.runtime.on('PROJECT_STOP_ALL', this._resetListening.bind(this));
    
        this.initMicroPhone();
        this.bufferArray = [];
    }

    initMicroPhone () {
        if (!this._context) {
            this._context = new (window.AudioContext || window.webkitAudioContext)();
            this._resampler = new Resampler(this._context.sampleRate, 16000, 1, BUFSIZE);
        }
        this._audioPromise = navigator.mediaDevices.getUserMedia({
            audio: true
        });
  
        this._audioPromise.then(stream => {
            this._micStream = stream;
        }).catch(e => {
            console.error(`Problem connecting to microphone:  ${e}`);
        });
  
    }

    _processAudioCallback (e) {
        const resampled = this._resampler.resample(e.inputBuffer.getChannelData(0));
        this.bufferArray.push.apply(this.bufferArray, resampled);
    }
  
    _recognizeSuccess (txt) {
  
        this.result = txt;
        if (this._onSpeechDone) {
            this._onSpeechDone();
        }
        const words = [];
        this.runtime.targets.forEach(target => {
            target.blocks._scripts.forEach(id => {
                const b = target.blocks.getBlock(id);
                if (b.opcode === 'voice_whenheard') {
                    // Grab the text from the hat block's shadow.
                    const inputId = b.inputs.TEXT.block;
                    const inputBlock = target.blocks.getBlock(inputId);
                    // Only grab the value from text blocks. This means we'll
                    // miss some. e.g. values in variables or other reporters.
                    if (inputBlock.opcode === 'text') {
                        const word = target.blocks.getBlock(inputId).fields.TEXT.value;
                        if (txt.indexOf(word) > -1) {
                            this.runtime.startHats('voice_whenheard', {TEXT: word});
                            words.push(word);
                            console.log(words)
                        }
                    }
                }
            });
        });
    }
  
    _recognize () {
        const _recognizeSuccess = this._recognizeSuccess;
        this._resetListening();
        // var pcm = floatTo16BitPCM(this.bufferArray);
        // console.log("total", pcm);
        // build wav file
        const dataLength = this.bufferArray.length * 2; // 16bit
        const buffer = new ArrayBuffer(dataLength);
        const data = new DataView(buffer);
        let offset = 0;
  
        for (let i = 0; i < this.bufferArray.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, this.bufferArray[i]));
            data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
  
        const blob = new Blob([data], {type: 'audio/wav'});
        const reader = new FileReader();
        const _this = this;
        reader.onload = function () {
            const dataUrl = reader.result;
            const base64 = dataUrl.split(',')[1];
            const reqJson = {
                format: 'pcm',
                rate: 16000,
                dev_pid: 1537,
                channel: 1,
                cuid: 'aikitten',
                len: dataLength,
                speech: base64
            };
            fetch('http://localhost:8081/aikitten/audio2text', {
                body: JSON.stringify(reqJson),
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST'
            }).then(res => res.json())
                .then(ret => {
                    console.log(ret);
                    if (ret.err_no === 0) {
                        _recognizeSuccess(ret.result[0]);
                    } else {
                        _recognizeSuccess('');
                    }
                });
        };
        reader.readAsDataURL(blob);
  
    }
  
    _resetListening () {
        this.runtime.emitMicListening(false);
        // Note that this can be called before any Listen And Wait block did setup,
        // so check that things exist before disconnecting them.
        if (this._context) {
            this._context.suspend.bind(this._context);
        }
        // This is called on green flag to reset things that may never have existed
        // in the first place. Do a bunch of checks.
        if (this._scriptNode) {
            this._scriptNode.removeEventListener('audioprocess', this._processAudioCallback);
            this._scriptNode.disconnect();
        }
        if (this._sourceNode) {
            this._sourceNode.disconnect();
        }
  
    }

    getPrimitives () {
        return {
            voice_waitinput: this.waitInput,
            voice_voiceout: this.voiceOut,
            voice_whenheard: this.whenHeard
        };
    }

    getHats () {
        return {
            voice_whenheard: {
                restartExistingThreads: true
            }
        };
    }

    waitInput () {
        this.runtime.emitMicListening(true);
        this.bufferArray = [];
        return new Promise(resolve => {
            this._sourceNode = this._context.createMediaStreamSource(this._micStream);
            this._scriptNode = this._context.createScriptProcessor(BUFSIZE, 1, 1);

            this._sourceNode.connect(this._scriptNode);
            this._scriptNode.addEventListener('audioprocess', this._processAudioCallback);
            this._scriptNode.connect(this._context.destination);
            setTimeout(this._recognize, 6000);
            this._onSpeechDone = resolve;
        });
    }

    voiceOut () {
        return this.result;
    }

    whenHeard () {
        return true;
    }
}

module.exports = AikittenVoice;

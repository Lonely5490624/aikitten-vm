class Scratch3VideoBlocks {
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
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            video_controlvideo: this.controlVideo
        };
    }

    controlVideo (args) {
        if (args.STATUS === 'ON') {
            this.runtime.ioDevices.video.enableVideo().then(() => {
                console.log(this.runtime.ioDevices.video.provider._video);
            });
        } else {
            this.runtime.ioDevices.video.disableVideo();
            // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
            // this.runtime.ioDevices.video.mirror = state === VideoState.ON;
        }
    }
}

module.exports = Scratch3VideoBlocks;

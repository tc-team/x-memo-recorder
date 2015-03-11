var VoiceRecorder = function (cfg) {
    var localStream = null;
    var microphone = null;
    var WORKER_PATH = './voice-recorder-worker.js';
    var config = cfg || {};
    var context = null;
    var node = null;
    var worker = null;
    var recording = false;
    var currCallback = null;

    var bufferLen = config.bufferLen || 4096;
    var numChannels = config.numChannels || 1;
    var audio_worker = config.worker || WORKER_PATH;

    if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio:true}, 
            function (stream) {
                localStream = stream;
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                context = new AudioContext();
                microphone = context.createMediaStreamSource(stream);
                node = context.createScriptProcessor(bufferLen, numChannels, numChannels);

                worker = new Worker(audio_worker);
                worker.postMessage({
                    command: 'init',
                    config: {
                        sampleRate: context.sampleRate,
                        numChannels: numChannels
                    }
                });

                node.onaudioprocess = function (input) {
                    if (!recording) return;

                    worker.postMessage({
                        command: 'record',
                        buffer: input.inputBuffer.getChannelData(0)
                    });
                };      

                worker.onmessage = function (e) {
                    var blob = e.data;
                    currCallback(blob);
                };

                microphone.connect(node);
                node.connect(context.destination);

            }, 
            function (error) {
                console.log('Error capturing audio');
            }
        );
    } else {
        console.log('getUserMedia not supported in this browser.');
    }
    
      

    

    this.exportWAV = function (cb) {
        currCallback = cb;
        type = 'audio/wav';
        worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    };  

    this.record = function () {
        recording = true;
    };

    this.stop = function () {
        recording = false;
    };

    this.clear = function(){
        worker.postMessage({ command: 'clear' });
    };

    this.destroy = function () {
        if (localStream != null) {
            localStream.stop();
        }
        var microphone = null;
        var context = null;
        var node = null;
        var worker = null;
        var recording = false;
        var currCallback = null;
    };
    
};

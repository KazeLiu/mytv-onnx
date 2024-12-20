// Copyright (c)  2024  Xiaomi Corporation
// 导入 sherpa-onnx-node 模块，用于语音识别
const sherpa_onnx = require('sherpa-onnx-node');
const portAudio = require("naudiodon2");

class StreamingTransducer {
    recognizer = null;
    stream = null;
    config = {
        'featConfig': {
            'sampleRate': 16000,
            'featureDim': 80,
        },
        'modelConfig': {
            'transducer': {
                'encoder':
                    '../model/sherpa-onnx-streaming-zipformer-multi-zh-hans-2023-12-12/encoder-epoch-20-avg-1-chunk-16-left-128.int8.onnx',
                'decoder':
                    '../model/sherpa-onnx-streaming-zipformer-multi-zh-hans-2023-12-12/decoder-epoch-20-avg-1-chunk-16-left-128.int8.onnx',
                'joiner':
                    '../model/sherpa-onnx-streaming-zipformer-multi-zh-hans-2023-12-12/joiner-epoch-20-avg-1-chunk-16-left-128.int8.onnx',
            },
            'tokens':
                '../model/sherpa-onnx-streaming-zipformer-multi-zh-hans-2023-12-12/tokens.txt',
            'numThreads': 2,
            'provider': 'cpu',
            'debug': 1,
        },
        'decodingMethod': 'greedy_search',
        'maxActivePaths': 4,
        'enableEndpoint': true,
        'rule1MinTrailingSilence': 2.4,
        'rule2MinTrailingSilence': 1.2,
        'rule3MinUtteranceLength': 20
    };

    constructor() {
        this.recognizer = new sherpa_onnx.OnlineRecognizer(this.config);
        this.stream = this.recognizer.createStream();
    }


    useMic() {
        let lastText = '';
        let segmentIndex = 0;
        const ai = new portAudio.AudioIO({
            inOptions: {
                channelCount: 1,
                closeOnError: true,  // Close the stream if an audio error is detected, if
                                     // set false then just log the error
                deviceId: -1,  // Use -1 or omit the deviceId to select the default device
                sampleFormat: portAudio.SampleFormatFloat32,
                sampleRate: this.recognizer.config.featConfig.sampleRate
            }
        });

        ai.on('data', data => {
            const samples = new Float32Array(data.buffer);
            this.stream.acceptWaveform(
                {sampleRate: this.recognizer.config.featConfig.sampleRate, samples: samples});

            while (this.recognizer.isReady(this.stream)) {
                this.recognizer.decode(this.stream);
            }

            const isEndpoint = this.recognizer.isEndpoint(this.stream);
            const text = this.recognizer.getResult(this.stream).text.toLowerCase();

            if (text.length > 0 && lastText != text) {
                lastText = text;
                new sherpa_onnx.Display(50).print(segmentIndex, lastText);
            }
            if (isEndpoint) {
                if (text.length > 0) {
                    lastText = text;
                    segmentIndex += 1;
                }
                this.recognizer.reset(this.stream)
            }
        });
        ai.start();
    }


}

module.exports = {
    StreamingTransducer
}
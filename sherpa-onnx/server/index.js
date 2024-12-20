// server.js
const WebSocket = require('ws');
const {StreamingTransducer} = require('../stream/streamingTransducer');
const sherpa_onnx = require('sherpa-onnx-node');

class AudioServer {
    constructor(port = 1234) {
        this.wss = new WebSocket.Server({port});
        this.transducer = new StreamingTransducer();
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('New client connected');

            // 创建一个新的识别流
            const stream = this.transducer.stream;
            const recognizer = this.transducer.recognizer;
            let lastText = '';
            let segmentIndex = 0;

            ws.on('message', (data) => {
                try {
                    // const waveFilename =
                    //     '../model/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20/test_wavs/0.wav';
                    // const wave = sherpa_onnx.readWave(waveFilename);
                    // stream.acceptWaveform({sampleRate: wave.sampleRate, samples: wave.samples});
                    //
                    // const tailPadding = new Float32Array(wave.sampleRate * 0.4);
                    // stream.acceptWaveform({samples: tailPadding, sampleRate: wave.sampleRate});

                    // 将接收到的音频数据转换为Float32Array
                    const audioData = new Float32Array(data);
                    // 处理音频数据
                    stream.acceptWaveform({
                        sampleRate: recognizer.config.featConfig.sampleRate,
                        samples: audioData
                    });
                    // 进行识别
                    while (recognizer.isReady(stream)) {
                        recognizer.decode(stream);
                    }
                    const isEndpoint = recognizer.isEndpoint(stream);
                    const text = recognizer.getResult(stream).text.toLowerCase();
                    // 发送识别结果给客户端
                    if (text.length > 0 && lastText !== text) {
                        lastText = text;
                        console.log('推送消息', text)
                        ws.send(JSON.stringify({type: 'result', text: lastText}));
                    }

                    if (isEndpoint) {
                        if (text.length > 0) {
                            segmentIndex += 1;
                        }
                        recognizer.reset(stream);
                    }
                } catch (error) {
                    console.error('Error processing audio:', error);
                    ws.send(JSON.stringify({type: 'error', message: error.message}));
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });

        console.log(`WebSocket server started on port ${this.wss.options.port}`);
    }
}

// 启动服务器
const server = new AudioServer();
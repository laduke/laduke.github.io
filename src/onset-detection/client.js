console.log("client");

window.scrollTo(0, document.body.scrollHeight);


// document.body.onclick = () => {
    run();
// }

async function run() {
    const canvasCtx = setupCanvas("canvas-1");

    const audioCtx = new AudioContext();
    // const response = await fetch("368392_electrodynamix.mp3");
    const response = await fetch("samples_guitar-acoustic_A2.mp3");
    const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());

    const dataArray = buffer.getChannelData(0);
    let sampleRate = buffer.sampleRate;

    let start = sampleRate * 0;
    let bufferLength = sampleRate * 1.2;
    // let bufferLength = sampleRate * 7.2; //electrodynamix
    let end = start + bufferLength;

    let view1 = dataArray.subarray(start, end);

    drawWave(canvasCtx, { yOffset: canvasCtx.canvas.height / 2 }, view1);


    const play1 = document.getElementById("play-1");

    play1.onclick = () => {
        function bufferFromData(data) {
            const numberOfChannels = 1;
            const sampleRate = audioCtx.sampleRate;

            const audioBuffer = audioCtx.createBuffer(
                numberOfChannels,
                data.length,
                sampleRate
            );
            audioBuffer.copyToChannel(data, 0)

            return audioBuffer
        }

        const source1 = audioCtx.createBufferSource();
        source1.buffer = bufferFromData(view1)
        source1.connect(audioCtx.destination);
        source1.start(0);
    }


}

function setupCanvas(id) {
    const canvasCtx = getCanvas(id);
    const width = 400;
    const height = 220;

    canvasCtx.canvas.width = width;
    canvasCtx.canvas.height = height;
    canvasCtx.clearRect(0, 0, canvasCtx.width, canvasCtx.height);
    canvasCtx.fillStyle = "rgb(200 200 200)";
    canvasCtx.fillRect(0, 0, width, height);

    return canvasCtx;

    function getCanvas(id) {
        const canvas = document.getElementById(id);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(
                `The element of id "${id}" is not a HTMLCanvasElement. Make sure a <canvas id="${id}""> element is present in the document.`,
            );
        }

        const canvasCtx = canvas.getContext("2d");
        if (canvasCtx == null) {
            throw new Error(
                "This browser does not support 2-dimensional canvas rendering contexts.",
            );
        }

        return canvasCtx;
    }
}

function drawWave(canvasCtx, { yOffset = 255, strokeStyle }, slice) {
    let x = 0;
    let y = yOffset;
    const sliceWidth = canvasCtx.canvas.width / slice.length;

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = strokeStyle || `rgba(0, 128, 128, 0.5)`;
    canvasCtx.moveTo(x, y);
    canvasCtx.beginPath();

    let max = 0
    for (let i = 0; i < slice.length; i++) {
        max = Math.abs(slice[i]) > max ? Math.abs(slice[i]) : max;
    }

    const startTime = performance.now();
    for (let i = 0; i < slice.length; i++) {
        const v = slice[i];
        const y = v * (canvasCtx.canvas.height / max / 2) + yOffset;

        canvasCtx.lineTo(x, y);
        x += sliceWidth;
    }
    canvasCtx.stroke();
    const endTime = performance.now();
    console.log(`draw loop took ${endTime - startTime} ms`);
}

console.log("client");
import FFT from "fft.js";
const PI2 = Math.PI * 2;

window.scrollTo(0, document.body.scrollHeight);


// TODO if audioctx loaded && isIntersection && !once

let audioCtx
let loaded

const c2 = setupCanvas("canvas-2");
const c3fft = setupCanvas("canvas-3");

let track

loadContext()
async function loadContext() {
    const response = await fetch("samples_guitar-acoustic_A2.mp3");

    audioCtx = new AudioContext();
    await run1();
    await run2(c2)
    // c3fft.canvas.height = 600
    // c3fft.canvas.width = 800
    await run3(c3fft, response)
    loaded = true
    document.body.removeEventListener('click', loadContext)
}

// let callback = (entries, observer) => {
//     entries.forEach((entry) => {
//         if (entry.isIntersecting && loaded) {
//             run2(c2)
//             observer.unobserve(entry.target)
//         }
//     });
// };


// function createObserver(el, handleFunc) {
//     let options = {
//         root: null,
//         rootMargin: "0px",
//         threshold: 1.0,
//     };

//     const observer = new IntersectionObserver(handleFunc, options);
//     observer.observe(el);
// }

// createObserver(c2.canvas, callback)

const numSteps = 20.0;

const boxElement = document.querySelector("#box");
let prevRatio = 0.0;
let increasingColor = "rgb(40 40 190 / ratio)";
let decreasingColor = "rgb(190 40 40 / ratio)";

document.body.addEventListener('click', loadContext)

async function run1() {
    const canvasCtx = setupCanvas("canvas-1");

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


    const play = document.getElementById("play-1");

    play.onclick = () => {
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



async function run2(canvasCtx) {


    const response = await fetch("368392_electrodynamix.mp3");
    // const response = await fetch("samples_guitar-acoustic_A2.mp3");
    const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());

    const dataArray = buffer.getChannelData(0);
    let sampleRate = buffer.sampleRate;

    let start = sampleRate * 0;
    let bufferLength = sampleRate * 4.0;
    // let bufferLength = sampleRate * 7.2; //electrodynamix
    let end = start + bufferLength;

    let view1 = dataArray.subarray(start, end);

    drawWave(canvasCtx, { yOffset: canvasCtx.canvas.height / 2 }, view1);


    const play = document.getElementById("play-2");

    play.onclick = () => {
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

async function run3(canvasCtx, track) {


    // const response = await fetch("samples_guitar-acoustic_A2.mp3");
    const buffer = await audioCtx.decodeAudioData(await track.arrayBuffer());

    const dataArray = buffer.getChannelData(0);
    let sampleRate = buffer.sampleRate;

    let start = sampleRate * 0;
    let bufferLength = sampleRate * 4.0;
    // let bufferLength = sampleRate * 7.2; //electrodynamix
    let end = start + bufferLength;

    let view1 = dataArray.subarray(start, end);



    /*

    0Hz to 16KHz. 2^14 = 16384
    */

    drawFFT(canvasCtx, { yOffset: canvasCtx.canvas.height / 2 }, view1)

    function drawFFT(canvasCtx, { yOffset = 255 }, slice) {
        const fftSize = Math.pow(2, 9); // 9,10,11
        const f = new FFT(fftSize / 2);
        const out = f.createComplexArray();

        let window = new Array(fftSize).fill(0);
        for (let i = 0; i < window.length; i++) {
            window[i] = hamming(i, window.length);
        }

        const sliceWidth = view1.length / canvasCtx.canvas.width

        for (let i = 0; i < view1.length; i = i + fftSize) {
            let realInput = view1.slice(i, i + fftSize);
            // the last chunk isn't the right, a full fftSize, size. not sure correct way to deal with
            if (realInput.length !== fftSize) {
                continue
            }

            for (let j = 0; j < realInput.length; j++) {
                realInput[i] = window[i] * realInput[i];
            }

            f.realTransform(out, realInput);
            f.completeSpectrum(out);
            // console.log(out)

            let min = Infinity
            let max = -Infinity

            let mags = new Array(fftSize / 2).fill(0);
            for (let j = 0; j < out.length - 1; j += 2) {
                let mag = Math.sqrt((out[j] * out[j]) + (out[j + 1] * out[j + 1]))
                if (mag < min) { min = mag }
                if (mag > max) { max = mag }
                // 0 -> 0, 2 -> 1, 4 -> 2
                mags[j / 2] = mag
            }

            // console.log(min, max)
            for (let j = 0; j < mags.length; j++) {
                let x = scaleValue(i, 0, view1.length, 0, canvasCtx.canvas.width)
                let y = scaleValue(j, 0, mags.length, 0, canvasCtx.canvas.height)
                // const hue = intensityToHue(mags[j], -1, 1)
                // y axis is freq: 0 - ~ 24Khz
                // let y = j * height
                canvasCtx.moveTo(x, y);
                // canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`
                const l = scaleValue(mags[j], min, max, 0, 100)
                canvasCtx.fillStyle = `hsl(255, 0%, ${l}%)`
                canvasCtx.fillRect(x, y, sliceWidth, 1);
            }

        }
    }

    function hamming(n, N) {
        return 0.54 - 0.46 * Math.cos((PI2 * n) / (N - 1));
    }

    function intensityToHue(value, min, max) {
        const normalized = (value - min) / (max - min);

        // Map the normalized value to a hue range (e.g., Green 120 to Red 0)
        // We can use a range from 0 (red) to 240 (blue) for a full rainbow effect
        const hue = (1 - normalized) * 240;

        // const saturation = '100%';
        // const lightness = '50%';

        // return `hsl(${hue}, ${saturation}, ${lightness})`;
        return hue
    }

}

function setupCanvas(id) {
    const canvasCtx = getCanvas(id);
    const width = 800;
    const height = 400;

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

function scaleValue(value, inMin, inMax, outMin, outMax) {
    const normalizedValue = (value - inMin) / (inMax - inMin);

    const scaledValue = normalizedValue * (outMax - outMin) + outMin;

    return Math.max(outMin, Math.min(outMax, scaledValue));
}

console.log("client");
import FFT from "fft.js";
const PI2 = Math.PI * 2;

window.scrollTo(0, document.body.scrollHeight);

// TODO if audioctx loaded && isIntersection && !once

let audioCtx;
let loaded;

const c2 = setupCanvas("canvas-2");
const c3fft = setupCanvas("canvas-3");

let track;

loadContext();
async function loadContext() {
  // const response = await fetch("samples_guitar-acoustic_A2.mp3");
  const response = await fetch("368392_electrodynamix.mp3");

  audioCtx = new AudioContext();
  await run1();
  await run2(c2);
  // c3fft.canvas.height = 600
  // c3fft.canvas.width = 800
  await run3(c3fft, response);
  loaded = true;
  document.body.removeEventListener("click", loadContext);
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

// const numSteps = 20.0;

// const boxElement = document.querySelector("#box");
// let prevRatio = 0.0;
// let increasingColor = "rgb(40 40 190 / ratio)";
// let decreasingColor = "rgb(190 40 40 / ratio)";

document.body.addEventListener("click", loadContext);

// 0, 1, 2 :: 0, 1 -> [0,1, 2,3, 4,5]

/*
0 0 0
0 1 1
1 0 2
1 1 3
2 0 4
2 1 5
*/

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
        sampleRate,
      );
      audioBuffer.copyToChannel(data, 0);

      return audioBuffer;
    }

    const source1 = audioCtx.createBufferSource();
    source1.buffer = bufferFromData(view1);
    source1.connect(audioCtx.destination);
    source1.start(0);
  };
}

async function run2(canvasCtx) {
  const response = await fetch("368392_electrodynamix.mp3");
  // const response = await fetch("samples_guitar-acoustic_A2.mp3");
  const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());

  const dataArray = buffer.getChannelData(0);
  let sampleRate = buffer.sampleRate;

  let start = sampleRate * 0;
  let bufferLength = sampleRate * 1.2;
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
        sampleRate,
      );
      audioBuffer.copyToChannel(data, 0);

      return audioBuffer;
    }

    const source1 = audioCtx.createBufferSource();
    source1.buffer = bufferFromData(view1);
    source1.connect(audioCtx.destination);
    source1.start(0);
  };
}

async function run3(canvasCtx, track) {
  // const response = await fetch("samples_guitar-acoustic_A2.mp3");
  const buffer = await audioCtx.decodeAudioData(await track.arrayBuffer());

  const dataArray = buffer.getChannelData(0);
  let sampleRate = buffer.sampleRate;

  let start = 256; // sampleRate * 0;
  let bufferLength = sampleRate * 1.2;
  // let bufferLength = sampleRate * 7.2; //electrodynamix
  let end = start + bufferLength;

  let view = dataArray.subarray(start, end);

  /*

    0Hz to 16KHz. 2^14 = 16384
    */

  drawFFT(canvasCtx, { yOffset: canvasCtx.canvas.height / 2 }, view);

  function drawFFT(canvasCtx, {}, slice) {
    /*
     * FFT Size Trade-offs:
     * 2^9 (512):  Fast, good time resolution, 128 freq bins, coarse frequency detail
     * 2^10 (1024): Medium, balanced, 256 freq bins, good frequency detail
     * 2^11 (2048): Slow, poor time resolution, 512 freq bins, excellent frequency detail
     *
     * Larger FFT = better frequency resolution but worse time resolution
     * Smaller FFT = better time resolution but worse frequency resolution
     */
    const FFT_SIZE_POWER = 10; // Change this: 9=fast/coarse, 10=balanced, 11=detailed/slow
    const USE_LOG_SCALE = true; // Set to false for linear frequency scale
    const OVERLAP_PERCENT = 50; // Change this: 0=no overlap, 50=half, 75=good, 87.5=smooth
    const fftSize = Math.pow(2, FFT_SIZE_POWER);
    const actualFFTSize = fftSize / 2; // This is what we initialize FFT with
    const f = new FFT(actualFFTSize);
    const out = f.createComplexArray();

    // Calculate hop size from overlap percentage
    const hopSize = Math.floor(actualFFTSize * (1 - OVERLAP_PERCENT / 100));

    let window = new Array(actualFFTSize).fill(0);
    for (let i = 0; i < window.length; i++) {
      window[i] = hamming(i, window.length);
    }

    // Calculate number of time frames and frequency bins
    const numTimeFrames =
      Math.floor((view.length - actualFFTSize) / hopSize) + 1;
    const numFreqBins = actualFFTSize / 2; // Only use positive frequencies

    // FFT configuration summary
    const freqResolutionHz = buffer.sampleRate / 2 / numFreqBins;
    const timeResolutionMs = (hopSize / buffer.sampleRate) * 1000;
    const samplesPerWindow = actualFFTSize;
    const bytesPerSample = 4; // 32-bit float
    const bytesPerWindow = samplesPerWindow * bytesPerSample;
    const bytesAdvancePerHop = hopSize * bytesPerSample;
    const actualOverlapPercent = (
      ((samplesPerWindow - hopSize) / samplesPerWindow) *
      100
    ).toFixed(1);

    console.log(`
=== FFT WINDOWING EXPLANATION ===
FFT_SIZE_POWER: ${FFT_SIZE_POWER} → ${actualFFTSize} samples per window

OVERLAP CONTROL:
- Requested overlap: ${OVERLAP_PERCENT}%
- Actual overlap: ${actualOverlapPercent}%
- Window size: ${samplesPerWindow} samples (${bytesPerWindow} bytes)
- Hop size: ${hopSize} samples (advance between windows)
- Shared samples: ${samplesPerWindow - hopSize} samples between adjacent windows

WHY OVERLAP?
- Without overlap: Window 1: [0-511], Window 2: [512-1023], Window 3: [1024-1535]...
- With ${actualOverlapPercent}% overlap: Window 1: [0-${samplesPerWindow - 1}], Window 2: [${hopSize}-${hopSize + samplesPerWindow - 1}], Window 3: [${hopSize * 2}-${hopSize * 2 + samplesPerWindow - 1}]...
- Benefits: Smoother time resolution, reduces artifacts from windowing function
- Trade-off: More computation (${numTimeFrames} windows vs ${Math.floor(view.length / samplesPerWindow)} non-overlapped)

OVERLAP PRESETS:
- 0%: No overlap, fastest processing, blocky results
- 50%: Basic overlap, good performance/quality balance
- 75%: High quality, smooth spectrogram (recommended)
- 87.5%: Maximum smoothness, slower processing

MEMORY USAGE:
- Process: ${bytesPerWindow} bytes per FFT
- Advance: ${bytesAdvancePerHop} bytes between FFTs
- Total windows: ${numTimeFrames}

RESOLUTION:
- Time: ${timeResolutionMs.toFixed(1)}ms per frame
- Frequency: ${freqResolutionHz.toFixed(1)}Hz per bin
- Output: ${numTimeFrames} time × ${numFreqBins} freq bins
=================================`);

    // Store magnitudes as 2D array: magnitudes[timeFrame][freqBin]
    let magnitudes = new Array(numTimeFrames);
    for (let i = 0; i < numTimeFrames; i++) {
      magnitudes[i] = new Array(numFreqBins);
    }

    let min = Infinity;
    let max = -Infinity;

    let startTime = performance.now();

    // Process each time frame
    let timeFrameIndex = 0;
    for (let i = 0; i < view.length - actualFFTSize + 1; i += hopSize) {
      if (timeFrameIndex >= numTimeFrames) break;

      let realInput = view.slice(i, i + actualFFTSize);

      // Apply window function
      for (let j = 0; j < realInput.length; j++) {
        realInput[j] = window[j] * realInput[j];
      }

      f.realTransform(out, realInput);
      f.completeSpectrum(out);

      // Calculate magnitudes - FFT output has alternating real/imaginary pairs
      for (let j = 0; j < actualFFTSize; j += 2) {
        const freqBin = j / 2;
        if (freqBin >= numFreqBins) break;

        let mag = Math.sqrt(out[j] * out[j] + out[j + 1] * out[j + 1]);

        // Apply log scale for better visualization
        mag = Math.log(mag + 1e-10); // Add small value to avoid log(0)

        magnitudes[timeFrameIndex][freqBin] = mag;

        if (mag < min) min = mag;
        if (mag > max) max = mag;
      }

      timeFrameIndex++;
    }

    let endTime = performance.now();
    console.log(`FFT processing took ${endTime - startTime} ms`);

    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);

    // Draw spectrogram with consistent pixel sizing
    startTime = performance.now();

    // Normalize pixel dimensions to maintain consistent visual density
    const targetTimePixels = 400; // Target number of time pixels for consistency
    const targetFreqPixels = 200; // Target number of freq pixels for consistency

    const pixelWidth = Math.max(
      1,
      Math.ceil(
        canvasCtx.canvas.width / Math.min(numTimeFrames, targetTimePixels),
      ),
    );
    const pixelHeight = Math.max(
      1,
      Math.ceil(
        canvasCtx.canvas.height / Math.min(numFreqBins, targetFreqPixels),
      ),
    );

    if (USE_LOG_SCALE) {
      // For log scale, draw row by row to fill gaps
      for (let pixelY = 0; pixelY < canvasCtx.canvas.height; pixelY++) {
        // Find which frequency bin this pixel row corresponds to
        const logPos =
          (canvasCtx.canvas.height - pixelY) / canvasCtx.canvas.height;
        const minFreq = buffer.sampleRate / actualFFTSize;
        const maxFreq = buffer.sampleRate / 2;
        const currentFreq = minFreq * Math.pow(maxFreq / minFreq, logPos);
        const freqBin = Math.min(
          numFreqBins - 1,
          Math.floor((currentFreq / maxFreq) * numFreqBins),
        );

        for (let timeFrame = 0; timeFrame < numTimeFrames; timeFrame++) {
          const magnitude = magnitudes[timeFrame][freqBin];

          const x = Math.floor(
            (timeFrame / numTimeFrames) * canvasCtx.canvas.width,
          );

          // Color version - Blue-to-yellow color scale
          const normalized = (magnitude - min) / (max - min);
          const blue = Math.floor(255 * (1 - normalized));
          const green = Math.floor(255 * normalized);
          const red = Math.floor(128 + 127 * normalized);
          canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;

          canvasCtx.fillRect(x, pixelY, pixelWidth, 1);
        }
      }
    } else {
      // Linear scale - original method works fine
      for (let timeFrame = 0; timeFrame < numTimeFrames; timeFrame++) {
        for (let freqBin = 0; freqBin < numFreqBins; freqBin++) {
          const magnitude = magnitudes[timeFrame][freqBin];

          const x = Math.floor(
            (timeFrame / numTimeFrames) * canvasCtx.canvas.width,
          );

          const y = Math.floor(
            canvasCtx.canvas.height -
              (freqBin / numFreqBins) * canvasCtx.canvas.height,
          );

          // Color version - Blue-to-yellow color scale
          const normalized = (magnitude - min) / (max - min);
          const blue = Math.floor(255 * (1 - normalized));
          const green = Math.floor(255 * normalized);
          const red = Math.floor(128 + 127 * normalized);
          canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;

          canvasCtx.fillRect(x, y, pixelWidth, pixelHeight);
        }
      }
    }

    endTime = performance.now();

    // Draw frequency axis labels
    drawFrequencyLabels(
      canvasCtx,
      numFreqBins,
      buffer.sampleRate,
      USE_LOG_SCALE,
      actualFFTSize,
    );
  }

  function drawFrequencyLabels(
    canvasCtx,
    numFreqBins,
    sampleRate,
    useLogScale,
    actualFFTSize,
  ) {
    const nyquistFreq = sampleRate / 2;
    const maxDisplayFreq = Math.min(nyquistFreq, 20000); // Cap at 20kHz for readability

    canvasCtx.fillStyle = "white";
    canvasCtx.font = "12px Arial";
    canvasCtx.textAlign = "left";

    // Choose appropriate frequency intervals based on scale type
    const labelIntervals = useLogScale
      ? [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] // Musical intervals
      : [0, 1000, 2000, 5000, 10000, 15000, 20000]; // Linear intervals

    for (const freq of labelIntervals) {
      if (freq > maxDisplayFreq) break;
      if (useLogScale && freq < sampleRate / actualFFTSize) continue; // Skip below fundamental

      let y;
      if (useLogScale) {
        // Logarithmic positioning
        const minFreq = sampleRate / actualFFTSize;
        const logPos =
          Math.log(freq / minFreq) / Math.log(nyquistFreq / minFreq);
        y = Math.floor(
          canvasCtx.canvas.height - logPos * canvasCtx.canvas.height,
        );
      } else {
        // Linear positioning
        const freqBin = (freq / nyquistFreq) * numFreqBins;
        y = Math.floor(
          canvasCtx.canvas.height -
            (freqBin / numFreqBins) * canvasCtx.canvas.height,
        );
      }

      // Draw frequency label
      const label = freq < 1000 ? `${freq}` : `${freq / 1000}k`;
      canvasCtx.fillText(label, canvasCtx.canvas.width - 40, y + 4);

      // Draw tick mark
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "white";
      canvasCtx.lineWidth = 1;
      canvasCtx.moveTo(canvasCtx.canvas.width - 45, y);
      canvasCtx.lineTo(canvasCtx.canvas.width - 5, y);
      canvasCtx.stroke();
    }
  }

  function hamming(n, N) {
    return 0.54 - 0.46 * Math.cos((PI2 * n) / (N - 1));
  }

  // Color mapping functions (kept for reference)
  function intensityToHue(value, min, max) {
    const normalized = (value - min) / (max - min);

    // Old red-green scale (replaced with more accessible options above)
    // Map the normalized value to a hue range (e.g., Green 120 to Red 0)
    // We can use a range from 0 (red) to 240 (blue) for a full rainbow effect
    const hue = (1 - normalized) * 240;

    // const saturation = '100%';
    // const lightness = '50%';

    // return `hsl(${hue}, ${saturation}, ${lightness})`;
    return hue;
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

  let max = 0;
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

// console.log(22,mags[0])
// let size = 2 // ex1[0].length
// for (let i = 0; i < ex1.length; i++) {
//     for (let j = 0; j < size; j++) {
//         ex2[(i * ex1[0].length) + j] = ex1[i][j]
//     }
// }

// for (let i = 0; i < ex2.length; i++) {
//     ex3[Math.floor(i/size)] = ex3[Math.floor(i/size)] || []
//     ex3[Math.floor(i/size)][i%size] = ex2[i]
// }

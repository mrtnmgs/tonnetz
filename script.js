// DATA
function fillMatrix() {
  const minMidiPitch = 22;
  const maxMidiPitch = 108;
  let x = 0;
  let y = 0;
  const m = [[minMidiPitch]];
  let fifth = minMidiPitch;
  let minThird = minMidiPitch;

  while (minThird < maxMidiPitch) {
    while (fifth < maxMidiPitch) {
      fifth = m[x][y] + 7;
      y++;
      m[x][y] = fifth; // move right = up a fifth;
    }
    // when we reach the end of the row, go to the next one
    // reset x and fifth;
    y = 0;
    fifth = 0;
    minThird = m[x][y] + 3;
    x++;
    m[x] = [];
    m[x][y] = minThird; // move up = up a minor third;
  }
  return m;
}

const matrix = fillMatrix();
const numRows = matrix[0].length;
const numCols = matrix.length;

// MUSICAL ABSTRACTIONS
const noteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function midiToNote(pitch) {
  // midi pitch to note name. C3 = MIDI 48 = "C"
  return noteNames[pitch % 12];
}

function midiToNotesOct(pitches) {
  // same as above with octave number (format the synth wants)
  return pitches.map(
    (pitch) => noteNames[pitch % 12] + Math.floor(pitch / 12 - 1)
  );
}

// GEOMETRY
function hexPoints(x, y, radius) {
  const tileRadius = radius; //(radius * 2) / 3;
  const points = [];
  for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 3) {
    let pointX, pointY;

    pointX = x + tileRadius * Math.sin(theta);
    pointY = y + tileRadius * Math.cos(theta);

    points.push(pointX + "," + pointY);
  }

  return points.join(" ");
}

const radius = 50;

// HTML ELEMENTS
function createRow(i) {
  const rowEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
  rowEl.classList.add("note-row", `note-row-${i}`);
  rowEl.style.transform = `translateX(${((radius * 5) / 6) * i}px)`;
  return rowEl;
}

function createTile(x, y) {
  const offset = (Math.sqrt(3) * radius) / 2;
  let posx = 40 + offset * col * 2;
  const posy = radius * 2 * numCols - (40 + offset * row * Math.sqrt(3));

  const p = matrix[x][y];
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("tile");

  const polygon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  polygon.style.fill = "transparent";
  polygon.style.stroke = "black";
  polygon.style.strokeWidth = "4px";
  polygon.setAttribute("points", hexPoints(posx, posy, radius));
  polygon.classList.add("note");
  polygon.setAttribute("data-matrix", [x, y]);
  group.appendChild(polygon);
  const text = createText(posx, posy, p);
  group.appendChild(text);
  group.addEventListener("click", () => handleClick(polygon, x, y));
  return group;
}

function createText(posx, posy, p) {
  const noteName = midiToNote(p);
  const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const text = noteName + p;
  textEl.textContent = text;
  // const xOffset = 10 - text.length * 2;
  // textEl.setAttribute("x", posx - xOffset);
  textEl.setAttribute("x", posx - 25);
  textEl.setAttribute("y", posy + 5);
  return textEl;
}

function colorTile(el, color) {
  el.style.transition = "0ms";
  el.style.fill = color;
  setTimeout(() => {
    el.style.transition = "300ms";
    el.style.fill = "transparent";
  }, 300);
}

// LA CUISINE
const svg = document.getElementById("s");
svg.setAttribute("width", radius * 2 * numRows);
svg.setAttribute("height", radius * 2 * numCols);

for (row = 0; row < matrix.length; row++) {
  // row = y axis
  const rowEl = createRow(row);
  for (col = 0; col < matrix[row].length; col++) {
    const tileEl = createTile(row, col);
    rowEl.appendChild(tileEl);
  }
  svg.appendChild(rowEl);
}

function handleClick(polygonEl, x, y) {
  colorTile(polygonEl, "#FFDDDDBB");
  //const note = midiToNotesOct([matrix[x][y]]);
  //play(note);
  // play takes noteOct as input, but playChord takes an x and a y
  playChord(x, y);
}
function getElFromCoords(coords) {
  return document.querySelector(`[data-matrix="${coords}"]`);
}

// AUDIO
const tempo = 60;

function bpmToMs(bpm) {
  return 60000 / bpm
}

function playChord(x, y) {
  const tonicEl = getElFromCoords([x, y]);
  colorTile(tonicEl, "#FFBBDDDD");
  // find the element based on its relation in the matrix
  // min third is above, maj is below;
  const [thirdX, thirdY] = Math.round(Math.random())
    ? [x, y + 1]
    : [x + 1, y - 1]; // randomly min or maj
  const thirdEl = getElFromCoords([thirdX, thirdY]);
  thirdEl && colorTile(thirdEl, "#BBDDFFDD");
  const [fifthX, fifthY] = [x + 1, y];
  const fifthEl = getElFromCoords([fifthX, fifthY]);
  fifthEl && colorTile(fifthEl, "#BBFFDDDD");

  let notez = midiToNotesOct([
    matrix[x][y],
    matrix[thirdX][thirdY],
    matrix[fifthX][fifthY],
  ]);

  // play(notez);
  arpeggiate(notez);
}

function playLater(note, time) {
  setTimeout(() => play(note), time);
}

// takes array of NoteOct as input
function arpeggiate(chord) {
  const beat = bpmToMs(tempo) / chord.length;
  chord.forEach((note, i) => playLater(note, beat * (i + 1) - beat));
}

const monosynth = new Tone.PolySynth(Tone.MonoSynth, {
  volume: -8,
  oscillator: {
    type: "square8",
  },
  envelope: {
    attack: 0.05,
    decay: 0.8,
    sustain: 0.4,
    release: 0.5,
  },
  filterEnvelope: {
    attack: 0.001,
    decay: 0.7,
    sustain: 0.1,
    release: 0.8,
    baseFrequency: 300,
    octaves: 4,
  },
});

function play(notes) {
  if (Tone.context.state !== "running") {
    Tone.context.resume();
  }

  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      partials: [0, 2, 3, 4, 5, 8],
    },
  }).toDestination();

  poly.triggerAttackRelease(notes, "2n");
}

function walker(x, y) {
  w = setInterval(() => {
    const dir = Math.floor(Math.random() * 7);
    switch (dir) {
      case 0:
        x += 1;
      case 1:
        x += 1;
        y -= 1;
      case 2:
        y -= 1;
      case 3:
        x -= 1;
      case 4:
        x -= 1;
        y += 1;
      case 5:
        y += 1;
    }
    if (!!matrix[x][y]) {
      playChord(x, y);
    } else {
      w.clearInterval();
    }
  }, bpmToMs(tempo) * 3);
}

let w;
document.addEventListener("keydown", (ev) => {
  switch (ev.key) {
    case "1":
      w = walker(4, 3);
      break;
    case "2":
      console.log(w);
      w.clearInterval();
      break;
  }
});

// todo
// keyboard movement TYHBVF or note names
// inputs for the options 
// straighten out the grid

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

function getPitch(x, y) {
  return matrix[y][x];
}

function midiToNote(pitch) {
  // midi pitch to note name. C3 = MIDI 48 = "C"
  return noteNames[pitch % 12];
}

function midiToNoteOct(pitch) {
  return noteNames[pitch % 12] + Math.floor(pitch / 12 - 1);
}

function coordsToNoteOct(x, y) {
  const pitch = getPitch(x, y);
  return midiToNoteOct(pitch);
}

// GEOMETRY
function hexPoints(x, y, radius) {
  const tileRadius = (radius * 6) / 7;
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

  const p = getPitch(x, y);
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
  textEl.classList.add("note-name");
  const text = noteName;
  textEl.textContent = text;
  textEl.setAttribute("x", posx - 10);
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
    const tileEl = createTile(col, row);
    rowEl.appendChild(tileEl);
  }
  svg.appendChild(rowEl);
}

function handleClick(polygonEl, x, y) {
  colorTile(polygonEl, "#FFDDDDBB");
  //const note = coordsToNoteOct(x,y);
  //play(note);
  // play takes noteOct as input, but playChord takes an x and a y
  mode === "note" ? play(coordsToNoteOct(x, y)) : playChord(x, y);
}
function getElFromCoords(coords) {
  return document.querySelector(`[data-matrix="${coords}"]`);
}

// AUDIO
const tempo = 120;
let mode = "note"; // note || chord

function bpmToMs(bpm) {
  return 60000 / bpm;
}

function playChord(x, y, arp = false) {
  const notes = [];
  const tonicEl = getElFromCoords([x, y]);
  if (tonicEl) {
    colorTile(tonicEl, "#FFBBDDDD");
    notes.push(coordsToNoteOct(x, y));
    // find the element based on its relation in the matrix
    // min third is above, maj is below;
    const [thirdX, thirdY] = Math.round(Math.random())
      ? [x, y + 1]
      : [x + 1, y - 1]; // randomly min or maj
    const thirdEl = getElFromCoords([thirdX, thirdY]);
    if (thirdEl) {
      colorTile(thirdEl, "#BBDDFFDD");
      notes.push(coordsToNoteOct(thirdX, thirdY));
    }

    const [fifthX, fifthY] = [x + 1, y];
    const fifthEl = getElFromCoords([fifthX, fifthY]);
    if (fifthEl) {
      colorTile(fifthEl, "#BBFFDDDD");
      notes.push(coordsToNoteOct(fifthX, fifthY));
    }

    // add octave
    notes.push(midiToNoteOct(getPitch(x, y) + 12));

    // play twice
    notes.push(...notes);

    arp ? arpeggiate(notes) : play(notes);
  }
}

// takes array of NoteOct as input
function arpeggiate(chord) {
  const beat = (bpmToMs(tempo) * 4) / chord.length;
  chord.forEach((note, i) => {
    const delay = beat * (i + 1) - beat;
    setTimeout(() => play(note), delay);
  });
}

function play(notes) {
  if (Tone.context.state !== "running") {
    Tone.context.resume();
  }

  /*
{
  volume: -8,
  oscillator: {
    type: "triangle8",
  },
  envelope: {
    attack: 0.01,
    decay: 0.8,
    sustain: 0.1,
    release: 0.1,
  },
  filterEnvelope: {
    attack: 0.001,
    decay: 0.7,
    sustain: 0.1,
    release: 0.8,
    baseFrequency: 300,
    octaves: 4,
  },
}
*/

  mono.triggerAttackRelease(notes, "8n");
  poly.triggerAttackRelease(notes, "8n");
}

const mono = new Tone.PolySynth(Tone.MonoSynth, {
  volume: -20,
  oscillator: {
    type: "square8",
  },
  envelope: {
    attack: 0.01,
    decay: 0.3,
    sustain: 0.4,
    release: 0.8,
  },
  filterEnvelope: {
    attack: 0.001,
    decay: 0.7,
    sustain: 0.1,
    release: 0.8,
    baseFrequency: 300,
    octaves: 4,
  },
}).toDestination();

const poly = new Tone.PolySynth(Tone.Synth, {
  volume: -24,
  oscillator: {
    type: "sine3",
  },
}).toDestination();

function walker(x, y) {
  playChord(x, y, true);
  return setInterval(() => {
    const dir = Math.floor(Math.random() * 7);
    switch (dir) {
      case 0:
        x += 1;
        break;
      case 1:
        x += 1;
        y -= 1;
        break;
      case 2:
        y -= 1;
        break;
      case 3:
        x -= 1;
        break;
      case 4:
        x -= 1;
        y += 1;
        break;
      case 5:
        y += 1;
        break;
    }
    playChord(x, y, true);
  }, bpmToMs(tempo) * 4); // 1 bar in 4/4
}

let pointer = 0;
function pattern(x, y) {
  playChord(x, y, true);
  return setInterval(() => {
    const dirs = [2, 3, 5, 1]; // down, left, up, down+right
    // const dirs = [3, 5, 0, 2]; // left, up, right, down (loop)
    const dir = dirs[pointer];
    switch (dir) {
      case 0:
        x += 1;
        break;
      case 1:
        x += 1;
        y -= 1;
        break;
      case 2:
        y -= 1;
        break;
      case 3:
        x -= 1;
        break;
      case 4:
        x -= 1;
        y += 1;
        break;
      case 5:
        y += 1;
        break;
    }
    playChord(x, y, true);
    pointer = (pointer + 1) % dirs.length;
  }, bpmToMs(tempo) * 4); // 1 bar in 4/4
}

let seqs = [];
document.addEventListener("keydown", (ev) => {
  switch (ev.key) {
    case "1":
      const x = Math.floor(Math.random() * 3) + 1;
      const y = Math.floor(Math.random() * 4) + 1;
      seqs.push(walker(x, y));
      break;
    case "2":
      seqs.push(pattern(2, 8));
      break;
    case "3":
      mode = mode === "note" ? "chord" : "note";
      break;
    case "0":
      const seq = seqs.pop();
      clearInterval(seq);
      break;
  }
});

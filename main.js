let flakesize = 600;
const defaultFlakeName = "snowflake.svg";
let flakeName = defaultFlakeName;

let gridsize = 1;

let open = false;
let s1;
let moveVec;
let btn;

paper.install(window);
window.onload = function () {
  paper.setup("paperCanvas");

  let startsize = Math.min(view.bounds.width, view.bounds.height) * 0.3;
  let endsize = gridsize * flakesize;
  let zoomlevel = (startsize * 1.5) / endsize; //0.3;

  view.zoom = zoomlevel;
  view.center = new Point(endsize / 2, endsize / 2);
  btn = document.getElementById("generate");

  let canvas = document.getElementById("paperCanvas");

  if (view.bounds.width > view.bounds.height) {
    moveVec = [view.bounds.width / 10, 0];
  } else {
    moveVec = [0, view.bounds.height / 10];
  }

  generate();

  view.onMouseDown = function (event) {
    if (!open) {
      s1.whitePaper.tweenTo(
        { position: s1.whitePaper.position.subtract(moveVec) },
        { easing: "easeInOutQuint", duration: 200 }
      );

      s1.bluePaper.tweenTo(
        { position: s1.bluePaper.position.add(moveVec) },
        { easing: "easeInOutQuint", duration: 200 }
      );
      s1.engravings.tweenTo(
        { position: s1.engravings.position.add(moveVec) },
        { easing: "easeInOutQuint", duration: 200 }
      );
      open = true;
    } else {
      s1.whitePaper.tweenTo(
        { position: view.bounds.center },
        { easing: "easeInOutQuint", duration: 200 }
      );

      s1.bluePaper.tweenTo(
        { position: view.bounds.center },
        { easing: "easeInOutQuint", duration: 200 }
      );
      s1.engravings.tweenTo(
        { position: view.bounds.center },
        { easing: "easeInOutQuint", duration: 200 }
      );
      open = false;
    }
    s1.whitePaper.position = event.point;
  };
};


//Create a new snowflake
function generate() {
  project.activeLayer.removeChildren();
  // Generate the seed the snowflake instantiation process will use for random 
  // numbers. If the user has put a name and/or birthdate in, hash the string 
  // for the seed. Otherwise use Math.random to make it.
  let seedString = document.getElementById("fname").value + document.getElementById("lname").value +
    document.getElementById("birthdate").value;
  let seed;
  if (seedString.length != 0) {
    seed = cyrb128(seedString);
    flakeName = seedString + ".svg";
  } else {
    seed = [(Math.random() * 4294967295) | 0, (Math.random() * 4294967295) | 0, 
      (Math.random() * 4294967295) | 0, (Math.random() * 4294967295) | 0];
    flakeName = defaultFlakeName;
  }
  // Instantiate the snowflake asynchronously
  (async function () {
    s1 = new Snowflake(view.bounds.center, 5, seed);
  })();
}

function downloadSVGLaser() {
  s1.whitePaper.position = view.bounds.center;
  s1.bluePaper.position = view.bounds.center;
  s1.engravings.position = view.bounds.center;
  s1.toggleMode();
  var svg = project.exportSVG({ asString: true, bounds: "content" });
  var svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = flakeName;
  s1.toggleMode();
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Hash a string to four 32-bit quantities. Algorithm and public domain implementation by bryc
// See: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

// "Simple Fast Counter" PRNG. Algorithm from http://pracrand.sourceforge.net/. Public domain JS implementation by bryc
// See: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}
const mpFaceMesh = window;

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const solutionOptions = {
  cameraNear: 30,
  cameraFar: 1000,
  cameraVerticalFovDegrees: 75,
  selfieMode: true,
  enableFaceGeometry: false,
  maxNumFaces: 1,
  refineLandmarks: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

const scene = new THREE.Scene();
const light = new THREE.AmbientLight(0xffffff);
scene.add(light);
const loader = new GLTFLoader();
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x000000, 0); // the default
let camera = new THREE.PerspectiveCamera(
  solutionOptions.cameraVerticalFovDegrees,
  window.innerWidth / window.innerHeight,
  solutionOptions.cameraNear,
  solutionOptions.cameraFar
);

let theHat;
loader.load(
  "pirate-hat.glb",
  (gltf) => {
    theHat = gltf.scene;
    scene.add(theHat);
  },
  undefined,
  (error) => console.error(error)
);

const config = {
  locateFile: (file) => {
    return (
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@` +
      `${mpFaceMesh.VERSION}/${file}`
    );
  },
};

// Our input frames will come from here.
const videoElement = document.getElementsByClassName("input_video")[0];
const faceContainer = document.getElementsByClassName("face-container")[0];
// const canvasElement = document.getElementsByClassName("output_canvas")[0];
// /** @type {CanvasRenderingContext2D} */
// const canvasCtx = canvasElement.getContext("2d");

const NOSE_POINT = 45;

let firstResult = true;
function onResults(results) {
  if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
    return;
  }
  if (firstResult) {
    // Hide the spinner.
    document.body.classList.add("loaded");
    firstResult = false;
  }
  const nose = results.multiFaceLandmarks[0][NOSE_POINT];
  const nosePosScreen = new THREE.Vector3(
    (nose.x - 0.5) * 2,
    (1 - nose.y - 0.5) * 2,
    -1
  );
  const nosePos = nosePosScreen.unproject(camera);
  theHat.position.set(nosePos.x, nosePos.y, nosePos.z);
  // theHat.position.set(
  //   nose.x * videoElement.clientWidth,
  //   (1 - nose.y) * videoElement.clientHeight,
  //   -nose.z * camera.position.z,
  // );
}

/** @type {FaceMesh} */
const faceMesh = new mpFaceMesh.FaceMesh(config);
faceMesh.setOptions(solutionOptions);
faceMesh.onResults(onResults);

const render = async () => {
  await faceMesh.send({ image: videoElement });
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
};

const start = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = stream;
  await new Promise((r) => setTimeout(r, 10));

  renderer.setSize(videoElement.clientWidth, videoElement.clientHeight);
  camera = new THREE.PerspectiveCamera(
    solutionOptions.cameraVerticalFovDegrees,
    videoElement.clientWidth / videoElement.clientHeight,
    solutionOptions.cameraNear,
    solutionOptions.cameraFar
  );
  camera.position.set(
    0,
    0,
    (videoElement.clientWidth / 2) *
      Math.tan(
        (solutionOptions.cameraVerticalFovDegrees / 2 / 360) * 2 * Math.PI
      )
  );
  scene.add(camera);
  renderer.domElement.classList.add("output_canvas");
  renderer.domElement.style = ""; // so we get size automatically instead of using their broken detection
  faceContainer.appendChild(renderer.domElement);

  render();
};
start();

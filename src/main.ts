import { FaceMesh } from "@mediapipe/face_mesh";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
let cameraDistance = 100;

let theHat: THREE.Group;
loader.load(
  "pirate-hat.glb",
  (gltf) => {
    theHat = gltf.scene;
    scene.add(theHat);
  },
  undefined,
  (error) => console.error(error)
);

// Our input frames will come from here.
const videoElement = document.getElementsByClassName("input_video")[0] as HTMLVideoElement;
const faceContainer = document.getElementsByClassName("face-container")[0] as HTMLDivElement;
// const canvasElement = document.getElementsByClassName("output_canvas")[0];
// /** @type {CanvasRenderingContext2D} */
// const canvasCtx = canvasElement.getContext("2d");

let firstResult = true;

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `./node_modules/@mediapipe/face_mesh/${file}`;
  },
});
faceMesh.setOptions(solutionOptions);
faceMesh.onResults(function onResults(results) {
  if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
    return;
  }
  if (firstResult) {
    // Hide the spinner.
    document.body.classList.add("loaded");
    firstResult = false;
  }
  // 0 // nose tip
  // 10-11 // face middle, top to down
  // 13-14 // mouth top-down
  // 21 // left head
  // 151-152 // another middle of face
  // 251 // right head
  const nose = results.multiFaceLandmarks[0][21];
  const nosePosScreen = new THREE.Vector3(
    (nose.x - 0.5) * 2,
    (1 - nose.y - 0.5) * 2,
    Math.min(0, nose.z + 0.025) * 30
  );
  const nosePos = nosePosScreen.unproject(camera);
  theHat.position.set(nosePos.x, nosePos.y, nosePos.z);
  // theHat.position.set(
  //   nose.x * videoElement.clientWidth,
  //   (1 - nose.y) * videoElement.clientHeight,
  //   -nose.z * camera.position.z,
  // );
});

const render = async () => {
  if (!videoElement.videoHeight || !videoElement.videoWidth) {
    console.log("ignoring empty video frame");
    window.requestAnimationFrame(render);
    return;
  }
  await faceMesh.send({ image: videoElement });
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
};

const start = async () => {
  console.log("starting");
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" }, height: 720, width: 1200 },
    });
  } catch (ex) {
    console.error("failed video", ex);
    return;
  }
  videoElement.srcObject = stream;
  await new Promise((r) => setTimeout(r, 10));

  renderer.setSize(videoElement.clientWidth, videoElement.clientHeight);
  camera = new THREE.PerspectiveCamera(
    solutionOptions.cameraVerticalFovDegrees,
    videoElement.clientWidth / videoElement.clientHeight,
    solutionOptions.cameraNear,
    solutionOptions.cameraFar
  );
  cameraDistance =
    (videoElement.clientWidth / 2) *
    Math.tan(
      (solutionOptions.cameraVerticalFovDegrees / 2 / 360) * 2 * Math.PI
    );
  camera.position.set(0, 0, cameraDistance);
  scene.add(camera);
  renderer.domElement.classList.add("output_canvas");
  (renderer.domElement as any).style = ""; // so we get size automatically instead of using their broken detection
  faceContainer.appendChild(renderer.domElement);

  render();
};
start();

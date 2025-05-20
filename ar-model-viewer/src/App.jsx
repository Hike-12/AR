import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const models = [
  { name: 'Bear', path: '/bear/scene.gltf' },
  { name: 'Elk', path: '/elk/scene.gltf' },
  { name: 'Owl', path: '/owl/scene.gltf' },
  { name: 'Panther', path: '/panther/scene.gltf' },
  { name: 'Horse', path: '/horse/scene.gltf' },
];

export default function FakeARViewer() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [renderer, setRenderer] = useState(null);
  const [modelScale, setModelScale] = useState(1); // Add this
  const modelGroupRef = useRef(); // Add this
  useEffect(() => {
  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  setupCamera();
}, []);

  useEffect(() => {
  let scene, camera, rendererLocal, controls, loader;
  let modelGroup = new THREE.Group();
  modelGroupRef.current = modelGroup;

  const init = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2;

    rendererLocal = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererLocal.setSize(window.innerWidth, window.innerHeight);

    // Clear previous canvas if any
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
      rendererLocal.domElement.style.position = 'absolute';
      rendererLocal.domElement.style.top = '0';
      rendererLocal.domElement.style.left = '0';
      rendererLocal.domElement.style.width = '100%';
      rendererLocal.domElement.style.height = '100%';
      rendererLocal.domElement.style.pointerEvents = 'none'; // So UI is clickable
      canvasRef.current.appendChild(rendererLocal.domElement);
    }

    setRenderer(rendererLocal);

    controls = new OrbitControls(camera, rendererLocal.domElement);
    controls.enablePan = false;

    const light = new THREE.HemisphereLight(0xffffff, 0x444444);
    scene.add(light);

    loader = new GLTFLoader();
    loadModel(selectedModel.path);

    const animate = () => {
      requestAnimationFrame(animate);
      if (modelGroupRef.current) {
          modelGroupRef.current.scale.set(modelScale, modelScale, modelScale);
        }
      controls.update();
      rendererLocal.render(scene, camera);
    };

    animate();
  };

  const loadModel = (path) => {
    loader.load(
      path,
      (gltf) => {
        modelGroup.clear();
        modelGroup.add(gltf.scene);
        scene.add(modelGroup);
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  };

  init();

  return () => {
    rendererLocal && rendererLocal.dispose();
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
  };
}, [selectedModel,modelScale]);

  return (
    <div className="relative w-full h-screen bg-black text-white">
      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover -z-10" muted></video>

      <div ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></div>

      <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 p-4 rounded-xl space-y-2">
        <h2 className="text-xl font-bold mb-2">Choose an Animal</h2>
        {models.map((m) => (
          <button
            key={m.name}
            onClick={() => setSelectedModel(m)}
            className={`block px-4 py-2 rounded text-left w-full transition ${
              selectedModel.name === m.name
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {m.name}
          </button>
        ))}
         <div className="flex gap-2 mt-4">
          <button
            onClick={() => setModelScale((s) => Math.max(0.1, s - 0.1))}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >-</button>
          <span className="px-2">{modelScale.toFixed(1)}x</span>
          <button
            onClick={() => setModelScale((s) => Math.min(5, s + 0.1))}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >+</button>
        </div>
      </div>
    </div>
  );
}

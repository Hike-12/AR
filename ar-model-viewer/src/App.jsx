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

export default function ARViewer() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const controlsRef = useRef();
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [renderer, setRenderer] = useState(null);
  const modelGroupRef = useRef();
  const sceneRef = useRef();
  
  // Setup camera stream
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

  // Setup Three.js scene
  useEffect(() => {
    let scene, camera, rendererLocal, controls, loader;
    let modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    
    const init = () => {
      scene = new THREE.Scene();
      sceneRef.current = scene;
      
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
        canvasRef.current.appendChild(rendererLocal.domElement);
      }

      setRenderer(rendererLocal);

      // Configure orbit controls for mouse/touch interaction
      controls = new OrbitControls(camera, rendererLocal.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
      controlsRef.current = controls;

      // Add lights to the scene
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 10, 5);
      scene.add(directionalLight);

      // Set up GLTF loader
      loader = new GLTFLoader();
      loadModel(selectedModel.path);

      // Handle window resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        rendererLocal.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update(); // required for damping
        rendererLocal.render(scene, camera);
      };

      animate();
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const loadModel = (path) => {
      loader.load(
        path,
        (gltf) => {
          modelGroup.clear();
          
          // Auto-center and scale the model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Reset position to center
          gltf.scene.position.x -= center.x;
          gltf.scene.position.y -= center.y;
          gltf.scene.position.z -= center.z;
          
          // Scale model to reasonable size
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;
          gltf.scene.scale.set(scale, scale, scale);
          
          modelGroup.add(gltf.scene);
          scene.add(modelGroup);
        },
        (xhr) => {
          // Loading progress if needed
        },
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
  }, [selectedModel]);

  // Add touch/mouse interaction instructions
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="relative w-full h-screen bg-black text-white">
      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover -z-10" muted></video>
      
      <div ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></div>

      {/* Model selector menu */}
      <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-2">Choose an Animal</h2>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <button
              key={m.name}
              onClick={() => setSelectedModel(m)}
              className={`px-4 py-2 rounded transition ${
                selectedModel.name === m.name
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Touch instructions */}
      {showInstructions && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900 bg-opacity-80 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">Controls:</h3>
            <button 
              onClick={() => setShowInstructions(false)} 
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <ul className="text-sm">
            <li>• <strong>One finger/Left mouse</strong>: Rotate the model</li>
            <li>• <strong>Two fingers pinch/Mouse wheel</strong>: Zoom in/out</li>
            <li>• <strong>Two fingers pan/Right mouse</strong>: Move the model</li>
          </ul>
        </div>
      )}
    </div>
  );
}
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

export default function AUGMINT() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const controlsRef = useRef();
  const streamRef = useRef();
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [renderer, setRenderer] = useState(null);
  const modelGroupRef = useRef();
  const sceneRef = useRef();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is back camera
  const [showToast, setShowToast] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  
  // Setup camera stream
  useEffect(() => {
    async function setupCamera() {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const constraints = { 
          video: { 
            facingMode: facingMode 
          } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Camera error:', err);
      }
    }

    setupCamera();
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

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

  // Toggle camera facing mode (front/back)
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture photo function
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Create a temporary canvas to capture both video and 3D content
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoRef.current.videoWidth;
    captureCanvas.height = videoRef.current.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    
    // Draw the video frame
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Get the current renderer canvas and draw it on top
    if (renderer) {
      ctx.drawImage(renderer.domElement, 0, 0, captureCanvas.width, captureCanvas.height);
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = `AUGMINT_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = captureCanvas.toDataURL('image/png');
    link.click();
  };

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="relative w-full h-screen bg-black text-white">
      {/* App name */}
      <div className="absolute top-4 left-4 z-30">
        <h1 className="text-2xl font-bold text-white bg-gray-900 bg-opacity-60 px-3 py-1 rounded">AUGMINT</h1>
      </div>
      
      {/* Video background */}
      <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover -z-10" muted></video>
      
      {/* 3D canvas */}
      <div ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></div>

      {/* Sidebar toggle button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 right-4 z-40 bg-gray-900 bg-opacity-80 p-3 rounded-full text-white"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
      
      {/* Sidebar */}
      <div className={`absolute top-0 right-0 h-full bg-gray-900 bg-opacity-80 p-6 transition-all duration-300 z-30 ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-0 translate-x-full overflow-hidden'
      }`}>
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Models</h2>
          <div className="space-y-2">
            {models.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelectedModel(m)}
                className={`block w-full px-4 py-3 rounded text-left transition ${
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
      </div>
      
      {/* Camera controls buttons group - top right */}
      <div className="absolute top-16 right-4 z-30 flex flex-col space-y-3">
        {/* Camera flip button */}
        <button 
          onClick={toggleCameraFacing}
          className="bg-gray-900 bg-opacity-80 p-3 rounded-full text-white"
          aria-label="Switch camera"
        >
          {facingMode === 'environment' ? '📱' : '🤳'}
        </button>
        
        {/* Capture photo button */}
        <button 
          onClick={capturePhoto}
          className="bg-gray-900 bg-opacity-80 p-3 rounded-full text-white"
          aria-label="Take photo"
        >
          📸
        </button>
        
        {/* Help button */}
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="bg-gray-900 bg-opacity-80 p-3 rounded-full text-white"
          aria-label="Help"
        >
          ❓
        </button>
      </div>
      
      {/* Help modal */}
      {showHelp && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">AUGMINT Controls</h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-1">Model Controls:</h4>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>One finger/Left mouse</strong>: Rotate model</li>
                  <li>• <strong>Two fingers pinch/Mouse wheel</strong>: Zoom in/out</li>
                  <li>• <strong>Two fingers pan/Right mouse</strong>: Move model</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-1">Camera Controls:</h4>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Camera switch</strong>: Toggle front/back camera</li>
                  <li>• <strong>Camera button</strong>: Take and save a photo</li>
                  <li>• <strong>Menu button</strong>: Open/close model selector</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast notification */}
      {showToast && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-90 text-white px-6 py-3 rounded-xl z-50 pointer-events-none animate-fade-in-up shadow-lg">
          <div className="text-center">
            <p>Welcome to AUGMINT! Use gestures to control 3D models.</p>
            <p className="text-sm text-gray-300 mt-1">Tap the ❓ button for help</p>
          </div>
        </div>
      )}
    </div>
  );
}
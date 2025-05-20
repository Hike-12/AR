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
  const [facingMode, setFacingMode] = useState('environment');
  const [showToast, setShowToast] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [modelControlsActive, setModelControlsActive] = useState(false);
  
  // Setup camera stream
  useEffect(() => {
    async function setupCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        const constraints = { 
          video: { facingMode: facingMode } 
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
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle model controls
  const toggleModelControls = () => {
    const newState = !modelControlsActive;
    setModelControlsActive(newState);
    
    if (renderer && controlsRef.current) {
      renderer.domElement.style.pointerEvents = newState ? 'auto' : 'none';
      controlsRef.current.enabled = newState;
    }
  };

  // Setup Three.js scene
  useEffect(() => {
    let scene, camera, rendererLocal, controls, loader;
    let modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    
    const init = () => {
      // Create scene
      scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Set up camera
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 2;

      // Set up renderer
      rendererLocal = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
      });
      rendererLocal.setSize(window.innerWidth, window.innerHeight);
      rendererLocal.setClearColor(0x000000, 0);

      // Clear and set up canvas
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        rendererLocal.domElement.style.position = 'absolute';
        rendererLocal.domElement.style.inset = '0';
        rendererLocal.domElement.style.width = '100%';
        rendererLocal.domElement.style.height = '100%';
        rendererLocal.domElement.style.pointerEvents = 'none'; // Default: can't interact
        canvasRef.current.appendChild(rendererLocal.domElement);
      }

      setRenderer(rendererLocal);

      // Configure orbit controls with strong boundaries
      controls = new OrbitControls(camera, rendererLocal.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableRotate = true;
      
      // Strict constraints to keep model in view
      controls.minDistance = 0.5; 
      controls.maxDistance = 3;
      controls.maxPolarAngle = Math.PI * 0.7; // Don't go too far below
      controls.minPolarAngle = Math.PI * 0.2; // Don't go too far above
      
      // Limit panning to keep model centered
      controls.screenSpacePanning = true;
      controls.panSpeed = 0.7;
      
      // Restrict rotation to prevent disorientation
      controls.minAzimuthAngle = -Math.PI / 2;
      controls.maxAzimuthAngle = Math.PI / 2;

      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
      
      // Disabled by default - will be enabled by button
      controls.enabled = false;
      controlsRef.current = controls;

      // Add lights for better model visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight.position.set(1, 10, 5);
      scene.add(directionalLight);
      
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-1, -1, 2);
      scene.add(fillLight);

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
        controls.update();
        
        // Add slight rotation to model when not actively controlled
        if (!modelControlsActive && modelGroup) {
          modelGroup.rotation.y += 0.002;
        }
        
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
          
          // Center model properly
          gltf.scene.position.x -= center.x;
          gltf.scene.position.y -= center.y;
          gltf.scene.position.z -= center.z;
          
          // Scale model to reasonable size
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1 / maxDim;
          gltf.scene.scale.set(scale, scale, scale);
          
          modelGroup.add(gltf.scene);
          scene.add(modelGroup);
          
          // Reset camera position to frame model nicely
          camera.position.z = 2;
          
          // Reset model controls when loading a new model
          setModelControlsActive(false);
          if (renderer) {
            renderer.domElement.style.pointerEvents = 'none';
          }
          if (controlsRef.current) {
            controlsRef.current.enabled = false;
            controlsRef.current.reset();
          }
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
  }, [selectedModel]);

  // Toggle camera facing mode (front/back)
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Capture photo function
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoRef.current.videoWidth;
    captureCanvas.height = videoRef.current.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    if (renderer) {
      ctx.drawImage(renderer.domElement, 0, 0, captureCanvas.width, captureCanvas.height);
    }
    
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
    <div className="relative w-full h-screen bg-black text-gray-50 overflow-hidden">
      {/* Video background - centered */}
      <video 
        ref={videoRef} 
        className="absolute inset-0 w-full h-full object-cover -z-10" 
        playsInline 
        muted
      />
      
      {/* 3D canvas - also centered */}
      <div ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top controls bar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-900 bg-opacity-95 p-3 flex justify-between items-center z-40 shadow-lg">
        {/* Left side - App name */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white px-2 py-1">AUGMINT</h1>
        </div>

        {/* Middle - Model controls button */}
        <div>
          <button 
            onClick={toggleModelControls}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
              modelControlsActive ? 'bg-blue-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {modelControlsActive ? '✋ Exit 3D Mode' : '👆 Control Model'}
          </button>
        </div>
        
        {/* Right side - Action buttons */}
        <div className="flex gap-3 mr-1">
          {/* Camera flip button */}
          <button 
            onClick={toggleCameraFacing}
            className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-white transition"
            aria-label="Switch camera"
          >
            {facingMode === 'environment' ? '📱' : '🤳'}
          </button>
          
          {/* Capture photo button */}
          <button 
            onClick={capturePhoto}
            className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-white transition"
            aria-label="Take photo"
          >
            📸
          </button>
          
          {/* Help button */}
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-white transition"
            aria-label="Help"
          >
            ❓
          </button>
          
          {/* Sidebar toggle button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg text-white transition"
            aria-label="Menu"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
      
      {/* Model controls active indicator */}
      {modelControlsActive && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 px-4 py-2 rounded-lg text-white text-sm z-40 pointer-events-none shadow-lg">
          3D Controls Active
        </div>
      )}
      
      {/* Sidebar with improved dark theme */}
      <div className={`absolute top-0 right-0 h-full bg-gray-900 bg-opacity-95 p-6 transition-all duration-300 z-30 pt-20 shadow-xl ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-0 translate-x-full overflow-hidden'
      }`}>
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-4 text-white">Models</h2>
          <div className="space-y-2">
            {models.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelectedModel(m)}
                className={`block w-full px-4 py-3 rounded text-left transition ${
                  selectedModel.name === m.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-100'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Help modal with improved dark theme */}
      {showHelp && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl max-w-md w-full shadow-2xl border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">AUGMINT Controls</h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white text-2xl transition"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-1 text-blue-400">Model Controls:</h4>
                <ul className="ml-4 space-y-1 text-gray-200">
                  <li>• Click <strong>"Control Model"</strong> to interact with the 3D model</li>
                  <li>• <strong>One finger/Left mouse</strong>: Rotate model</li>
                  <li>• <strong>Two fingers pinch/Mouse wheel</strong>: Zoom in/out</li>
                  <li>• <strong>Two fingers pan/Right mouse</strong>: Move model</li>
                  <li>• Click <strong>"Exit 3D Mode"</strong> to return to normal scrolling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-1 text-blue-400">Camera Controls:</h4>
                <ul className="ml-4 space-y-1 text-gray-200">
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
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-95 text-white px-6 py-3 rounded-xl z-50 pointer-events-none shadow-lg">
          <div className="text-center">
            <p>Welcome to AUGMINT! Click "Control Model" to interact.</p>
            <p className="text-sm text-gray-300 mt-1">Tap the ❓ button for help</p>
          </div>
        </div>
      )}
    </div>
  );
}
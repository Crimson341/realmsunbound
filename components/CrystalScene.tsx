/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CrystalScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting (Celestia Theme: Gold & White)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const mainLight = new THREE.PointLight(0xfff8e7, 3, 20); // Warm White
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);
    
    const goldLight = new THREE.PointLight(0xdcb478, 2, 20); // Gold
    goldLight.position.set(-5, -2, 5);
    scene.add(goldLight);
    
    const rimLight = new THREE.SpotLight(0xa5c5d9, 4); // Slight Blue Rim
    rimLight.position.set(0, 10, 0);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // --- The Divine Crystal (Primogem Shape) ---
    const gemGroup = new THREE.Group();
    
    // Geometry: Octahedron (Primogem Base)
    const geometry = new THREE.OctahedronGeometry(1.2, 0);
    
    // Material: Diamond/Glass like
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6, // Glass-like
        thickness: 1.5,
        ior: 1.5, 
        clearcoat: 1.0,
        emissive: 0xdcb478,
        emissiveIntensity: 0.1
    });
    
    const gem = new THREE.Mesh(geometry, material);
    gem.scale.y = 1.3; // Elongate
    gemGroup.add(gem);

    // Outer Ring (Halo)
    const ringGeo = new THREE.TorusGeometry(2.2, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xdcb478, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    gemGroup.add(ring);
    
    const ringGeo2 = new THREE.TorusGeometry(1.8, 0.01, 16, 64);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.x = Math.PI / 2;
    gemGroup.add(ring2);

    // Floating Particles
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 150;
    const posArray = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xffd700,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    scene.add(gemGroup);

    // Animation Loop
    let frameId: number;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        
        // Base Rotation
        gem.rotation.y += 0.003;
        // Float & Time
        const time = Date.now() * 0.001;
        gem.position.y = Math.sin(time) * 0.2; // Float
        
        // Ring Rotation
        ring.rotation.x += 0.002;
        ring.rotation.y -= 0.002;
        
        ring2.rotation.x -= 0.002;
        ring2.rotation.z += 0.002;
        
        // Particle drift
        particles.rotation.y = -time * 0.05;

        renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const mountNode = mountRef.current;

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(frameId);
        
        if(mountNode && mountNode.contains(renderer.domElement)) {
            mountNode.removeChild(renderer.domElement);
        }

        // Proper Cleanup of Three.js resources
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach((mat: any) => mat.dispose());
                } else if (object.material) {
                    object.material.dispose();
                }
            }
        });
        
        renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

export default CrystalScene;

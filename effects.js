// effects.js
let negativePlane;
let negativePlaneMaterial;

export function initAdvancedEffects(scene, camera, renderer) {
  // --- Ripple Effect ---
  const rippleGeometry = new THREE.PlaneGeometry(20, 20);
  const rippleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uStrength: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uCenter;
      uniform float uStrength;
      varying vec2 vUv;
      void main(){
        vec2 pos = vUv - uCenter;
        float dist = length(pos);
        float ripple = sin(10.0 * dist - uTime * 5.0) * uStrength;
        float alpha = smoothstep(0.5, 0.0, dist);
        vec3 color = mix(vec3(0.0), vec3(0.0,1.0,1.0), ripple);
        gl_FragColor = vec4(color, alpha * ripple);
      }
    `,
    transparent: true
  });
  const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
  rippleMesh.position.z = -1;
  scene.add(rippleMesh);
  
  window.addEventListener("click", (e) => {
    const uvX = e.clientX / window.innerWidth;
    const uvY = 1 - e.clientY / window.innerHeight;
    rippleMaterial.uniforms.uCenter.value.set(uvX, uvY);
    rippleMaterial.uniforms.uStrength.value = 1.0;
  });
  
  renderer.setAnimationLoop(() => {
    rippleMaterial.uniforms.uTime.value += 0.02;
    rippleMaterial.uniforms.uStrength.value = Math.max(0.0, rippleMaterial.uniforms.uStrength.value - 0.01);
  });
  
  // --- Audio Reactivity ---
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
  oscillator.start();
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.0;
  oscillator.connect(gainNode).connect(audioCtx.destination);
  
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const velocity = Math.abs(window.scrollY - lastScrollY);
    const newFreq = 220 + velocity * 5;
    oscillator.frequency.setTargetAtTime(newFreq, audioCtx.currentTime, 0.1);
    gainNode.gain.setTargetAtTime(Math.min(0.3, velocity / 100), audioCtx.currentTime, 0.1);
    lastScrollY = window.scrollY;
  });
  
  // --- Periodic Glitch Effect ---
  setInterval(() => {
    renderer.domElement.classList.add("glitch-effect");
    setTimeout(() => {
      renderer.domElement.classList.remove("glitch-effect");
    }, 100);
  }, 5000);
  
  // --- Negative Space Shifting Plane ---
  const negGeom = new THREE.PlaneGeometry(30, 30, 64, 64);
  negativePlaneMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(0x000000) },
      uColor2: { value: new THREE.Color(0xff00ff) },
      uShift: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main(){
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(uv.x * 10.0 + uTime) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uShift;
      void main(){
         float dist = distance(vUv, vec2(0.5));
         float alpha = smoothstep(0.45 + uShift, 0.5 + uShift, dist);
         vec3 color = mix(uColor1, uColor2, vUv.x + sin(uTime) * 0.5);
         gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
  negativePlane = new THREE.Mesh(negGeom, negativePlaneMaterial);
  negativePlane.position.z = -2;
  scene.add(negativePlane);
}

export function updateAdvancedEffects(deltaTime, mouseX, mouseY) {
  if (negativePlaneMaterial) {
    negativePlaneMaterial.uniforms.uTime.value += deltaTime;
    negativePlaneMaterial.uniforms.uShift.value = (mouseX / window.innerWidth) * 0.1;
    let hue = (mouseY / window.innerHeight) * 360;
    negativePlaneMaterial.uniforms.uColor2.value.setHSL(hue / 360, 0.8, 0.5);
  }
}
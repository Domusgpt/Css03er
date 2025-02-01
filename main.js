// main.js
import { initAdvancedEffects, updateAdvancedEffects } from './effects.js';

// --- Boid Simulation Parameters ---
const NUM_BOIDS = 1000;
const MAX_SPEED = 0.08;
const MAX_FORCE = 0.003;
const NEIGHBOR_DIST = 1.5;

// --- Three.js Setup ---
const canvas = document.getElementById('background-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 5;

// --- Global Force Fields ---
let globalGravity = new THREE.Vector3(0, 0, 0);
let mouseForce = new THREE.Vector3(0, 0, 0);

// --- Boid Class & Simulation ---
class Boid {
  constructor() {
    this.position = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );
    this.acceleration = new THREE.Vector3();
    this.history = [];
  }
  
  flock(boids) {
    let separation = new THREE.Vector3();
    let alignment = new THREE.Vector3();
    let cohesion = new THREE.Vector3();
    let count = 0;
    
    for (let other of boids) {
      let d = this.position.distanceTo(other.position);
      if (d > 0 && d < NEIGHBOR_DIST) {
        let diff = new THREE.Vector3().subVectors(this.position, other.position);
        diff.normalize();
        diff.divideScalar(d);
        separation.add(diff);
        alignment.add(other.velocity);
        cohesion.add(other.position);
        count++;
      }
    }
    if (count > 0) {
      alignment.divideScalar(count);
      alignment.setLength(MAX_SPEED);
      alignment.sub(this.velocity);
      alignment.clampLength(0, MAX_FORCE);
      
      cohesion.divideScalar(count);
      cohesion.sub(this.position);
      cohesion.setLength(MAX_SPEED);
      cohesion.sub(this.velocity);
      cohesion.clampLength(0, MAX_FORCE);
      
      separation.divideScalar(count);
      separation.setLength(MAX_SPEED);
      separation.sub(this.velocity);
      separation.clampLength(0, MAX_FORCE);
    }
    
    this.acceleration.add(separation);
    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
  }
  
  applyForces() {
    this.acceleration.add(globalGravity);
    this.acceleration.add(mouseForce);
  }
  
  update() {
    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, MAX_SPEED);
    this.position.add(this.velocity);
    this.history.push(this.position.clone());
    if (this.history.length > 50) this.history.shift();
    this.acceleration.set(0, 0, 0);
  }
  
  borders() {
    const bound = 10;
    if (this.position.x < -bound) this.position.x = bound;
    if (this.position.x > bound) this.position.x = -bound;
    if (this.position.y < -bound) this.position.y = bound;
    if (this.position.y > bound) this.position.y = -bound;
    if (this.position.z < -bound) this.position.z = bound;
    if (this.position.z > bound) this.position.z = -bound;
  }
}

const boids = [];
for (let i = 0; i < NUM_BOIDS; i++) {
  boids.push(new Boid());
}

// --- Create BufferGeometry for Boids ---
const boidGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(NUM_BOIDS * 3);
const colors = new Float32Array(NUM_BOIDS * 3);
boidGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
boidGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const boidMaterial = new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.9
});
const boidPoints = new THREE.Points(boidGeometry, boidMaterial);
scene.add(boidPoints);

// --- Additional Lattice & Grid Layers ---
const groupLattice = new THREE.Group();
scene.add(groupLattice);
function createWireframeCube(size, color, opacity) {
  const geom = new THREE.BoxGeometry(size, size, size);
  const wire = new THREE.WireframeGeometry(geom);
  const mat = new THREE.LineBasicMaterial({ color, opacity, transparent: true });
  return new THREE.LineSegments(wire, mat);
}
const cube1 = createWireframeCube(6, 0xff00ff, 0.3);
cube1.rotation.set(Math.PI / 4, Math.PI / 6, 0);
groupLattice.add(cube1);
const cube2 = createWireframeCube(10, 0x00f7ff, 0.2);
cube2.rotation.set(-Math.PI / 3, Math.PI / 3, 0);
groupLattice.add(cube2);
const cube3 = createWireframeCube(14, 0x8a2be2, 0.15);
cube3.rotation.set(Math.PI / 6, -Math.PI / 4, 0);
groupLattice.add(cube3);

// --- Retro-Futuristic Grid (Shader Layer) ---
const gridGeometry = new THREE.PlaneGeometry(30, 30, 32, 32);
const gridMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00fff7) },
    uOpacity: { value: 0.4 }
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
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main(){
      float grid = abs(sin(vUv.x * 30.0 + uTime)) * abs(sin(vUv.y * 30.0 + uTime));
      gl_FragColor = vec4(uColor, grid * uOpacity);
    }
  `,
  transparent: true,
});
const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
gridMesh.position.z = -2.0;
scene.add(gridMesh);

// --- GSAP Scroll-Triggered Section Animations ---
gsap.registerPlugin(ScrollTrigger);
document.querySelectorAll(".section").forEach((section) => {
  gsap.fromTo(
    section.querySelector(".section-content"),
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        end: "bottom 60%",
        toggleActions: "play none none reverse",
        onEnter: () => console.log(`Entering ${section.id}`),
        onLeaveBack: () => console.log(`Leaving ${section.id}`)
      },
    }
  );
});

// --- Portal Transition on Scroll ---
const portal = document.getElementById("portal");
let lastScrollY = window.scrollY;
window.addEventListener("scroll", () => {
  portal.classList.add("active");
  setTimeout(() => { portal.classList.remove("active"); }, 300);
  const velocity = Math.abs(window.scrollY - lastScrollY) * 0.00002;
  globalGravity.set(0, -velocity, 0);
  lastScrollY = window.scrollY;
});

// --- Main Logo Neon Flare ---
const mainLogo = document.getElementById("main-logo");
mainLogo.addEventListener("click", (e) => {
  const flare = document.createElement("div");
  flare.classList.add("neon-flare");
  flare.style.left = `${e.clientX - 100}px`;
  flare.style.top = `${e.clientY - 100}px`;
  document.body.appendChild(flare);
  setTimeout(() => { flare.remove(); }, 1000);
});

// --- Mouse Interaction for Force Fields ---
let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;
window.addEventListener("mousemove", (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  const mousePos = new THREE.Vector3(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1,
    0.5
  );
  mousePos.unproject(camera);
  mouseForce.set(0, 0, 0);
});

// --- Video-Triggered Effects for "Who We Are" Section ---
const video = document.getElementById("intro-video");
const videoThanks = document.getElementById("video-thanks");
video.addEventListener("play", () => {
  // Invert colors by toggling a CSS class on the canvas and overlay
  canvas.classList.add("inverted");
  document.getElementById("overlay").classList.add("inverted");
  // Show "Thank you" overlay
  videoThanks.style.opacity = "1";
  setTimeout(() => {
    videoThanks.style.opacity = "0";
    canvas.classList.remove("inverted");
    document.getElementById("overlay").classList.remove("inverted");
  }, 5000);
});

// --- Initialize Advanced Effects ---
initAdvancedEffects(scene, camera, renderer);

// --- Animation Loop & Boid Simulation ---
let prevTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const currentTime = performance.now();
  const deltaTime = (currentTime - prevTime) * 0.001;
  prevTime = currentTime;
  
  // Update boids
  for (let i = 0; i < boids.length; i++) {
    const boid = boids[i];
    boid.flock(boids);
    const mouseWorld = new THREE.Vector3(
      (lastMouseX / window.innerWidth) * 2 - 1,
      -(lastMouseY / window.innerHeight) * 2 + 1,
      0.5
    );
    mouseWorld.unproject(camera);
    let dir = new THREE.Vector3().subVectors(boid.position, mouseWorld);
    let distance = dir.length();
    if (distance < 2.5) {
      dir.normalize();
      boid.acceleration.add(dir.multiplyScalar(0.005 * (2.5 - distance)));
    }
    boid.applyForces();
    boid.update();
    boid.borders();
    
    // Update boid color based on speed
    const speed = boid.velocity.length();
    const t = THREE.MathUtils.clamp(speed / MAX_SPEED, 0, 1);
    const color = new THREE.Color().setHSL(0.5 * (1 - t) + 0.9 * t, 0.8, 0.5);
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    positions[i * 3 + 0] = boid.position.x;
    positions[i * 3 + 1] = boid.position.y;
    positions[i * 3 + 2] = boid.position.z;
  }
  boidGeometry.attributes.position.needsUpdate = true;
  boidGeometry.attributes.color.needsUpdate = true;
  
  globalGravity.multiplyScalar(0.98);
  gridMaterial.uniforms.uTime.value += deltaTime;
  updateAdvancedEffects(deltaTime, lastMouseX, lastMouseY);
  
  renderer.render(scene, camera);
}
animate();

// --- Resize Handler ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
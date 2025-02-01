// main.js
import { initAdvancedEffects, updateAdvancedEffects } from './effects.js';

// --- Three.js Setup ---
const canvas = document.getElementById('background-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 3000);
// We'll move the camera along the Z-axis as the user scrolls.
camera.position.set(0, 0, 0);

// --- Global Variables for 3D Movement ---
const sectionDistance = 20; // distance in Z between sections
const numSections = 7;
const totalTravel = (numSections - 1) * sectionDistance; // total Z travel

// --- Setup Scroll Container ---
const scrollContainer = document.getElementById("scroll-container");
const scrollContent = document.getElementById("scroll-content");

// --- Map Scroll to Camera Movement ---
gsap.registerPlugin(ScrollTrigger);
gsap.to(camera.position, {
  z: -totalTravel,
  ease: "none",
  scrollTrigger: {
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true
  }
});

// --- Place Section Content in Overlay ---
const sections = document.querySelectorAll("#sections-overlay section");

// Position each section overlay according to its data-z value
sections.forEach((sec) => {
  const zVal = sec.getAttribute("data-z");
  // We'll use opacity tweening based on camera position relative to section z
  sec.style.top = "0";
  sec.style.left = "0";
  sec.style.position = "absolute";
});

// --- Function to Update Section Visibility ---
function updateSectionVisibility() {
  const camZ = camera.position.z;
  sections.forEach((sec) => {
    const secZ = parseFloat(sec.getAttribute("data-z"));
    // When the camera is within ±5 units of the section's z, show it
    if (Math.abs(camZ - secZ) < 5) {
      sec.style.opacity = 1;
      sec.style.transform = "translateY(0)";
    } else {
      sec.style.opacity = 0;
      sec.style.transform = "translateY(20px)";
    }
  });
}

// --- Create an animation loop that updates section visibility and advanced effects ---
let prevTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const currentTime = performance.now();
  const deltaTime = (currentTime - prevTime) * 0.001;
  prevTime = currentTime;
  
  updateSectionVisibility();
  updateAdvancedEffects(deltaTime, lastMouseX, lastMouseY);
  
  renderer.render(scene, camera);
}
animate();

// --- Optional: Click-to-Jump Behavior ---
// When a section overlay is clicked, scroll to that section
sections.forEach((sec) => {
  sec.addEventListener("click", () => {
    const targetIndex = sec.getAttribute("data-index");
    const targetScroll = targetIndex * window.innerHeight;
    gsap.to(scrollContainer, { scrollTo: targetScroll, duration: 1 });
  });
});

// --- Add Global Portal Transition when entering a new section ---
function triggerPortalTransition() {
  const portal = document.getElementById("global-portal");
  gsap.fromTo(portal, { opacity: 0 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 });
}

// Use a ScrollTrigger that calls our function when passing each section's trigger point
sections.forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec,
    start: "top center",
    onEnter: () => {
      triggerPortalTransition();
      changePalette(sec.getAttribute("data-palette"));
    }
  });
});

// --- Function to Change Global Palette ---
function changePalette(paletteName) {
  // Define palettes for each section
  const palettes = {
    palette1: { primary: "#00fff7", secondary: "#ff00ff", accent: "#2D1B69", hue: 200 },
    palette2: { primary: "#ff00ff", secondary: "#00fff7", accent: "#1a0dab", hue: 300 },
    palette3: { primary: "#00fff7", secondary: "#2D1B69", accent: "#ff00ff", hue: 180 },
    palette4: { primary: "#2D1B69", secondary: "#00fff7", accent: "#ff00ff", hue: 220 },
    palette5: { primary: "#ff00ff", secondary: "#2D1B69", accent: "#00fff7", hue: 280 },
    palette6: { primary: "#00fff7", secondary: "#ff00ff", accent: "#2D1B69", hue: 240 },
    palette7: { primary: "#2D1B69", secondary: "#ff00ff", accent: "#00fff7", hue: 260 },
  };
  const palette = palettes[paletteName] || palettes.palette1;
  document.documentElement.style.setProperty("--primary", palette.primary);
  document.documentElement.style.setProperty("--secondary", palette.secondary);
  document.documentElement.style.setProperty("--accent", palette.accent);
  // Tween atmosphere shader hue if needed (see below in advanced effects)
  gsap.to(atmosphereMaterial.uniforms.uHue, { value: palette.hue, duration: 1 });
}

// --- Mouse Interaction (for additional effects) ---
let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;
window.addEventListener("mousemove", (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

// --- Advanced 3D Layers Setup ---
// (Reuse previous boids, lattice, grid, atmosphere, etc.)
// Here we reinitialize particle layers (base and sparkle), lattice, grid, and atmosphere as in the previous build.

// [For brevity, include the particle/lattice/grid/atmosphere setup from the previous main.js here]
// … (reinsert your existing Three.js object creation code for boids, sparkles, groupLattice, gridMesh, etc.)
// Also call initAdvancedEffects(scene, camera, renderer);
initAdvancedEffects(scene, camera, renderer);

// --- Resize Handler ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
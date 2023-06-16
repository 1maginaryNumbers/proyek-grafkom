import * as THREE from "three";
// import * as gsap from "gsaptest";
// import gsap from "./gsap.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "./node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "./node_modules/three/examples/jsm/postprocessing/OutlinePass.js";
import { ShaderPass } from "./node_modules/three/examples/jsm/postprocessing/ShaderPass.js";
import { CopyShader } from "./node_modules/three/examples/jsm/shaders/CopyShader.js";

// import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
// import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
// import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
// import { CopyShader } from "three/addons/shaders/CopyShader.js";

const card = document.getElementById("card");
const nameText = document.getElementById("name");
const descriptionText = document.getElementById("description");
const interactFunctions = {
    fridgeInteract: (fridge) => {
        if (!fridge.opened) fridge.opened = true;
        else fridge.opened = false;

        fridge.children.find((x) => x.name == "light").intensity = fridge.opened
            ? 1
            : 0;
        const fridgeDoor = fridge.children.find((x) => x.name == "fridge_door");
        gsap.to(fridgeDoor.rotation, { y: fridge.opened ? Math.PI / 2 : 0 });
    },
    doorInteract: (door) => {
        if (!door.opened) door.opened = true;
        else door.opened = false;
        gsap.to(door.rotation, { y: door.opened ? Math.PI / 2 : 0 });
    },
    stoveInteract: (stove) => {
        if (!stove.on) stove.on = true;
        else stove.on = false;
        const stoveBurner = stove.children.find(
            (x) => x.name == "stove_burner"
        );
        stoveBurner.material = stove.on
            ? stove.heatedBurnerMaterial
            : stove.originalBurnerMaterial;
    },
    lampInteract: (lamp) => {
        if (!lamp.on) lamp.on = true;
        else lamp.on = false;

        lamp.children.find((x) => x.name == "light").intensity = lamp.on
            ? 1
            : 0;
    },
};

let jsonData;
let keyboard = [];
let yVelocity = 0;
const groundLevel = 3;
const gravity = 0.001;
const moveSpeed = 0.1;
const jumpSpeed = 0.04;

let scene;
let loader = new GLTFLoader();

fetch("./info.json")
    .then((response) => response.json())
    .then((data) => {
        jsonData = data;
        loader.load("./models.gltf", (result) => {
            scene = result.scene;
            loadInteractions();
            startLoad();
            console.log(scene);
        });
    });

let raycaster = new THREE.Raycaster();
let selected;

function loadInteractions() {
    scene.children.map((x) => {
        const funcName = jsonData.data[x.name].interact_method;
        if (funcName) {
            x.interact = interactFunctions[funcName];
        }

        if (x.name == "fridge") {
            const fridgeLight = new THREE.PointLight(0xffffff, 0);
            const fridgeLightHelper = new THREE.PointLightHelper(
                fridgeLight,
                0.2
            );
            fridgeLight.position.copy(x.position);
            fridgeLightHelper.name = "Weird Glowing Orb";
            fridgeLight.name = "light";
            scene.add(fridgeLightHelper);
            x.children.push(fridgeLight);
        }
        if (x.name == "stove") {
            x.originalBurnerMaterial = x.children[0].material;
            x.heatedBurnerMaterial = new THREE.MeshBasicMaterial({
                color: 0xaa1111,
            });
        } else if (x.name == "lamp") {
            const lampLight = new THREE.PointLight(0xffffff, 0);
            const lampLightHelper = new THREE.PointLightHelper(lampLight, 0.2);
            lampLight.position.copy(x.position);
            lampLightHelper.name = "Weird Glowing Orb";
            scene.add(lampLightHelper);
            lampLight.name = "light";
            x.children.push(lampLight);
        }
    });
}

function startLoad() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xaaaaaa);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight
    );
    cam.position.z = 5;

    const controls = new PointerLockControls(cam, renderer.domElement);

    const pLight1 = new THREE.PointLight(0xffffff);
    pLight1.position.y = 5;
    pLight1.position.x = 0;
    pLight1.position.z = 5;

    const pLight1Helper = new THREE.PointLightHelper(pLight1, 0.2);
    pLight1Helper.name = "Weird Glowing Orb";
    // const cube = new THREE.Mesh(
    //     new THREE.BoxGeometry(1,1,1),
    //     new THREE.MeshPhongMaterial({color: 0x1166ff,}),
    // );

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({ color: 0xff6611 })
    );

    ground.name = "The Void";
    ground.rotation.x -= Math.PI / 2;
    ground.position.y -= 0.5;

    // scene.add(cube);
    scene.add(ground);
    scene.add(pLight1);
    scene.add(pLight1Helper);
    // create a composer
    const composer = new EffectComposer(renderer);

    // create a render pass
    const renderPass = new RenderPass(scene, cam);
    composer.addPass(renderPass);

    // create an outline pass
    const outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        cam
    );
    outlinePass.edgeStrength = 100;
    composer.addPass(outlinePass);

    // create a shader pass
    const shaderPass = new ShaderPass(CopyShader);
    shaderPass.renderToScreen = true;
    composer.addPass(shaderPass);

    const update = () => {
        processInput();
        processPhysics();
        // renderer.render(scene, cam);
        composer.render();
        requestAnimationFrame(update);
    };
    update();

    document.body.onkeydown = (evt) => {
        keyboard[evt.key] = true;
    };

    document.body.onkeyup = async (evt) => {
        keyboard[evt.key] = false;
    };

    renderer.domElement.addEventListener("click", async () => {
        await renderer.domElement.requestPointerLock();
    });

    window.addEventListener("resize", () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        cam.aspect = window.innerWidth / window.innerHeight;
        cam.updateProjectionMatrix();
    });

    window.addEventListener("click", () => {
        controls.lock();
    });

    window.addEventListener("mousedown", (e) => {
        if (document.pointerLockElement) {
            if (e.buttons == 2) {
                outlinePass.selectedObjects = [];
                card.className = "";
                selected = null;
                return;
            }
            if (e.buttons != 1) return;
            raycaster.setFromCamera({ x: 0, y: 0 }, cam);
            let items = raycaster.intersectObjects(scene.children);

            if (items.length != 0) {
                let selectedTemp = items[0].object;
                while (selectedTemp.parent.name != "Scene") {
                    selectedTemp = selectedTemp.parent;
                }
                if (selected == selectedTemp && selected.interact) {
                    console.log("interacted with : ");
                    console.log(selected);
                    selected.interact(selected);
                } else selected = selectedTemp;

                card.className = "active";
                const jsonSelected = jsonData.data[selected.name];
                nameText.innerText = jsonSelected
                    ? jsonSelected.name
                    : selected.name;
                descriptionText.innerText = jsonSelected
                    ? jsonSelected.description
                    : "";
                outlinePass.selectedObjects = [selected];
            } else {
                outlinePass.selectedObjects = [];
                card.className = "";
                selected = null;
            }
        }
    });

    function processInput() {
        const currentY = cam.position.y;
        if (keyboard["a"]) {
            controls.moveRight(-moveSpeed);
        } else if (keyboard["d"]) {
            controls.moveRight(moveSpeed);
        }

        if (keyboard["w"]) {
            controls.moveForward(moveSpeed);
        } else if (keyboard["s"]) {
            controls.moveForward(-moveSpeed);
        }
        cam.position.y = currentY;

        if (keyboard[" "] && cam.position.y == groundLevel) {
            yVelocity = jumpSpeed;
        }
    }

    function processPhysics() {
        if (cam.position.y > groundLevel) {
            yVelocity -= gravity;
        }

        cam.position.y += yVelocity;

        if (cam.position.y <= groundLevel) {
            cam.position.y = groundLevel;
            yVelocity = 0;
        }
    }
}

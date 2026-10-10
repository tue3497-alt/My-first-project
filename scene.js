/* Oxygen English classroom. Three.js is loaded locally, only near the viewport. */
(() => {
  'use strict';

  const stage = document.getElementById('classroom-stage');
  const canvas = document.getElementById('classroom-canvas');
  const fallback = document.getElementById('classroom-fallback');
  const hotspots = document.getElementById('classroom-hotspots');
  const status = document.getElementById('scene-status');
  const reset = document.getElementById('classroom-reset');
  if (!stage || !canvas) return;

  let started = false;
  let disposed = false;
  let visible = false;
  let frame = 0;
  let renderer;
  let scene;
  let camera;
  let renderScene;
  let releaseResources;
  let resizeObserver;

  const setFallback = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    stage.dataset.state = 'fallback';
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    if (hotspots) hotspots.hidden = true;
    if (reset) reset.disabled = true;
    if (status) status.textContent = 'A quiet classroom preview. Explore the same activities using the buttons below.';
  };

  function requestRender() {
    if (frame || !visible || disposed || document.hidden || stage.dataset.state !== 'ready') return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      try { renderScene?.(); } catch (_) { setFallback(); }
    });
  }

  async function initialize() {
    if (started || disposed) return;
    started = true;
    try {
      // Three.js r180 requires WebGL 2. Unsupported browsers skip the library download.
      const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
      if (!context) { setFallback(); return; }
      const THREE = await import('./vendor/three/three.module.min.js');
      if (disposed) return;
      const {
        Scene, Color, OrthographicCamera, WebGLRenderer, Mesh, BoxGeometry,
        MeshStandardMaterial, MeshBasicMaterial, PlaneGeometry, CylinderGeometry,
        SphereGeometry, Shape, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute,
        CanvasTexture, SRGBColorSpace, RepeatWrapping, Group, HemisphereLight,
        DirectionalLight, PCFSoftShadowMap, ACESFilmicToneMapping, Vector3, Vector2,
        Raycaster, DoubleSide, InstancedMesh, Object3D
      } = THREE;

      renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;
      scene = new Scene();
      scene.background = new Color('#F7F5F0');
      camera = new OrthographicCamera(-6, 6, 3.5, -3.5, 0.1, 60);

      const materials = new Set();
      const textures = new Set();
      const geometries = new Set();
      const mat = (color, extra = {}) => {
        const material = new MeshStandardMaterial({ color, roughness: 0.87, metalness: 0, ...extra });
        materials.add(material);
        return material;
      };
      const ivory = mat('#F2EEE5');
      const oak = mat('#C6AD89');
      const paleOak = mat('#D6C3A5');
      const frameMat = mat('#E8E6DC');
      const charcoal = mat('#3D443E', { roughness: 0.7 });
      const sage = mat('#8FA99B');
      const darkSage = mat('#6E8575');
      const potMat = mat('#CDC3AD');
      const soilMat = mat('#6A6251');
      const leaves = [mat('#687E60', { side: DoubleSide }), mat('#7C926F', { side: DoubleSide }), mat('#8D9B74', { side: DoubleSide })];
      const bookMaterials = [sage, mat('#D3B99B'), mat('#D8D5C7'), mat('#657E70'), mat('#A79380')];
      const boxGeo = new BoxGeometry(1, 1, 1);
      geometries.add(boxGeo);
      const cylinderGeo = new CylinderGeometry(1, 1, 1, 12);
      geometries.add(cylinderGeo);
      const planeGeo = new PlaneGeometry(1, 1);
      geometries.add(planeGeo);
      const sphereGeo = new SphereGeometry(1, 12, 8);
      geometries.add(sphereGeo);

      const add = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene) => {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };
      const box = (material, x, y, z, w, h, d, parent) => add(boxGeo, material, x, y, z, w, h, d, parent);
      const plane = (material, x, y, z, w, h, parent) => add(planeGeo, material, x, y, z, w, h, 1, parent);
      const cylinder = (material, x, y, z, r, h, parent) => add(cylinderGeo, material, x, y, z, r, h, r, parent);
      const texture = (drawing, width, height) => {
        const image = document.createElement('canvas');
        image.width = width;
        image.height = height;
        drawing(image.getContext('2d'), width, height);
        const result = new CanvasTexture(image);
        result.colorSpace = SRGBColorSpace;
        result.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        textures.add(result);
        return result;
      };
      const textured = (map, extra = {}) => mat('#FFFFFF', { map, ...extra });
      const roundGeometry = (w, h, d, radius = 0.06) => {
        const shape = new Shape();
        const x = -w / 2, y = -d / 2;
        shape.moveTo(x + radius, y);
        shape.lineTo(x + w - radius, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + radius);
        shape.lineTo(x + w, y + d - radius);
        shape.quadraticCurveTo(x + w, y + d, x + w - radius, y + d);
        shape.lineTo(x + radius, y + d);
        shape.quadraticCurveTo(x, y + d, x, y + d - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        const geometry = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.012, bevelThickness: 0.008, curveSegments: 3 });
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, -h / 2, 0);
        geometries.add(geometry);
        return geometry;
      };
      const contactTexture = texture((ctx, w, h) => {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, 'rgba(36,40,36,.25)');
        gradient.addColorStop(.48, 'rgba(36,40,36,.12)');
        gradient.addColorStop(1, 'rgba(36,40,36,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }, 64, 64);
      const contactMat = new MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: 0.8 });
      materials.add(contactMat);
      const contact = (x, z, w, d, y = 0.012) => {
        const shadow = plane(contactMat, x, y, z, w, d);
        shadow.rotation.x = -Math.PI / 2;
        shadow.castShadow = false;
        shadow.receiveShadow = false;
      };

      // The open front and right wall keep the room inviting and every desk visible.
      const floorTexture = texture((ctx, w, h) => {
        ctx.fillStyle = '#D5C4A8';
        ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 12; row++) {
          const yy = row * h / 12;
          ctx.fillStyle = ['#D7C7AD', '#D1BEA0', '#D4C2A5', '#D9CAB2'][row % 4];
          ctx.fillRect(0, yy, w, h / 12);
          ctx.strokeStyle = 'rgba(113,91,67,.16)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
          const joint = (row % 3 + 1) * w / 4;
          ctx.beginPath(); ctx.moveTo(joint, yy); ctx.lineTo(joint, yy + h / 12); ctx.stroke();
          for (let grain = 0; grain < 6; grain++) {
            ctx.strokeStyle = `rgba(128,104,75,${0.035 + grain * 0.004})`;
            ctx.beginPath();
            ctx.moveTo(0, yy + grain * h / 90);
            ctx.bezierCurveTo(w * .3, yy + grain * h / 80, w * .55, yy + grain * h / 100, w, yy + grain * h / 90);
            ctx.stroke();
          }
        }
      }, 1024, 1024);
      const floorMaterial = textured(floorTexture);
      box(paleOak, 0, -0.12, 0, 7.85, .23, 6.4);
      const floor = plane(floorMaterial, 0, 0.002, 0, 7.8, 6.35);
      floor.rotation.x = -Math.PI / 2;
      floor.castShadow = false;
      box(ivory, 0, 1.7, -3.22, 7.8, 3.4, .14);
      box(frameMat, 0, .08, -3.115, 7.8, .16, .05);
      box(ivory, -3.89, .39, 0, .14, .78, 6.4);
      box(ivory, -3.89, 3.18, 0, .14, .46, 6.4);
      box(frameMat, -3.80, .79, 0, .27, .08, 6.4);

      // Tall, matte window frames. No downloaded textures or reflections are needed.
      const windowMaterial = new MeshBasicMaterial({ color: '#F5F7EC' });
      materials.add(windowMaterial);
      [-2.12, 0, 2.12].forEach((z) => {
        const glass = plane(windowMaterial, -3.955, 1.97, z, 2.00, 2.32);
        glass.rotation.y = Math.PI / 2;
        glass.castShadow = false;
        glass.receiveShadow = false;
        box(frameMat, -3.855, 1.97, z - 1.06, .12, 2.45, .065);
        box(frameMat, -3.855, 1.97, z + 1.06, .12, 2.45, .065);
        box(frameMat, -3.855, 1.65, z, .12, .046, 2.1);
        box(frameMat, -3.855, 1.97, z, .08, 2.40, .035);
      });
      // A quiet linen rug delineates the teaching space.
      const rugTexture = texture((ctx, w, h) => {
        ctx.fillStyle = '#E7E2D7'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(115,108,92,.07)';
        for (let i = 0; i < w; i += 4) ctx.fillRect(i, 0, 1, h);
        for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);
        ctx.strokeStyle = '#D3CEBF'; ctx.lineWidth = 6;
        ctx.strokeRect(13, 13, w - 26, h - 26);
      }, 256, 256);
      const rug = plane(textured(rugTexture), -.10, .010, .5, 5.8, 4.15);
      rug.rotation.x = -Math.PI / 2;
      rug.castShadow = false;

      const targets = [];
      const interactive = (group, activity) => {
        group.traverse((object) => {
          if (object.isMesh) { object.userData.activity = activity; targets.push(object); }
        });
      };
      const board = new Group(); scene.add(board);
      box(paleOak, -.4, 2.15, -3.06, 3.85, 1.68, .11, board);
      box(darkSage, -.4, 2.15, -2.985, 3.67, 1.5, .055, board);
      const boardTexture = texture((ctx, w, h) => {
        ctx.fillStyle = '#6E8575'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#F4F1E7';
        ctx.font = '38px Georgia, serif'; ctx.fillText('Oxygen English', 58, 82);
        ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = '#DCE6DB';
        ctx.fillText('A little English. A bigger world.', 60, 112);
        ctx.strokeStyle = '#A9BCAC'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(60, 138); ctx.lineTo(w - 60, 138); ctx.stroke();
        ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = '#DCE6DB';
        ctx.fillText('LESSON 01   /   YOUR FIRST CONVERSATION', 60, 178);
        ctx.font = '31px Georgia, serif'; ctx.fillStyle = '#F4F1E7';
        ctx.fillText('Hello, world.', 60, 225);
        ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = '#DCE6DB';
        ctx.fillText('Small steps. New possibilities.', 60, 259);
      }, 768, 320);
      const boardWriting = plane(textured(boardTexture), -.4, 2.15, -2.953, 3.65, 1.485, board);
      boardWriting.castShadow = false;
      box(oak, -.4, 1.35, -2.91, 3.85, .055, .22, board);
      box(ivory, .6, 1.395, -2.85, .17, .035, .035, board);
      box(charcoal, 1.03, 1.395, -2.85, .18, .04, .09, board);
      interactive(board, 'lesson');

      const deskTop = roundGeometry(1.62, .075, .88, .09);
      const chairSeat = roundGeometry(.58, .045, .56, .09);
      const chairBack = roundGeometry(.59, .055, .39, .08);
      const legGeo = new CylinderGeometry(.026, .026, 1, 8);
      geometries.add(legGeo);
      const legs = new InstancedMesh(legGeo, charcoal, 32);
      legs.castShadow = true; legs.receiveShadow = true;
      scene.add(legs);
      const dummy = new Object3D();
      let legIndex = 0;
      const leg = (x, y, z, height, tilt = 0) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, tilt);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        legs.setMatrixAt(legIndex++, dummy.matrix);
      };
      const deskPositions = [[-1.65, -.65], [1.25, -.65], [-1.65, 1.35], [1.25, 1.35]];
      const desks = [];
      deskPositions.forEach(([x, z], index) => {
        const group = new Group(); scene.add(group); desks.push(group);
        add(deskTop, paleOak, x, .84, z, 1, 1, 1, group);
        [-.63, .63].forEach(dx => [-.30, .30].forEach(dz => leg(x + dx, .4, z + dz, .8)));
        box(charcoal, x, .71, z, 1.3, .045, .57, group);
        const chairZ = z + .92;
        add(chairSeat, index === 3 ? sage : paleOak, x, .47, chairZ);
        const back = add(chairBack, index === 3 ? sage : paleOak, x, .88, chairZ + .255);
        back.rotation.x = -Math.PI / 2 - .09;
        [-.22, .22].forEach(dx => [-.19, .19].forEach(dz => leg(x + dx, .22, chairZ + dz, .44, dx * -.12)));
        // Uprights connect the chair back to its frame.
        cylinder(charcoal, x - .235, .69, chairZ + .22, .018, .47);
        cylinder(charcoal, x + .235, .69, chairZ + .22, .018, .47);
        contact(x, z + .1, 1.9, 1.3, .017);
        contact(x, chairZ, .8, .7, .018);
        if (index === 3) interactive(group, 'quiz');
      });
      legs.instanceMatrix.needsUpdate = true;

      const bookGroup = new Group(); scene.add(bookGroup);
      const bookX = -1.65, bookZ = 1.29;
      box(sage, bookX, .899, bookZ, .71, .028, .47, bookGroup);
      const paper = mat('#F4EEDF');
      const leftPage = box(paper, bookX - .169, .925, bookZ, .328, .035, .445, bookGroup);
      leftPage.rotation.z = .047;
      const rightPage = box(paper, bookX + .169, .925, bookZ, .328, .035, .445, bookGroup);
      rightPage.rotation.z = -.047;
      const pageTexture = texture((ctx, w, h) => {
        ctx.fillStyle = '#F4EEDF'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#647D6D'; ctx.font = '19px Georgia, serif';
        ctx.fillText('Everyday', 26, 44); ctx.fillText('words', 26, 67);
        ctx.fillStyle = '#878C7C'; ctx.font = '12px Arial, sans-serif';
        ['hello', 'a new beginning', 'listen', 'a little closer'].forEach((text, i) => ctx.fillText(text, 26, 110 + i * 24));
      }, 192, 256);
      const bookWriting = plane(textured(pageTexture), bookX -.17, .948, bookZ, .315, .43, bookGroup);
      bookWriting.rotation.x = -Math.PI / 2;
      bookWriting.castShadow = false;
      for (let i = 0; i < 6; i++) {
        const rule = box(mat('#D6D0BF'), bookX + .16, .949, bookZ -.135 + i * .046, .215, .001, .003, bookGroup);
        rule.castShadow = false;
      }
      interactive(bookGroup, 'vocabulary');
      // Pencil and a closed notebook on the other desk.
      box(bookMaterials[1], 1.18, .90, -.69, .5, .035, .36);
      box(paper, 1.18, .909, -.69, .455, .008, .329);
      const pencil = cylinder(oak, 1.49, .902, -.66, .009, .30);
      pencil.rotation.x = Math.PI / 2;
      pencil.rotation.z = .3;

      // Open oak shelving, with muted cloth-bound books and small ceramic objects.
      box(oak, 2.45, .69, -2.86, 1.76, 1.34, .39);
      box(ivory, 2.45, .69, -2.635, 1.65, 1.22, .075);
      [0.12, .65, 1.26].forEach(y => box(paleOak, 2.45, y, -2.60, 1.84, .06, .56));
      [1.57, 3.33].forEach(x => box(paleOak, x, .69, -2.60, .06, 1.23, .56));
      for (let i = 0; i < 6; i++) {
        box(bookMaterials[i % 5], 1.78 + i * .105, .9 + (i % 3) * .022, -2.57, .09, .39 + (i % 3) * .044, .235);
      }
      for (let i = 0; i < 3; i++) box(bookMaterials[i], 2.88, .72 + i * .041, -2.6, .37 - i * .025, .035, .27);
      box(bookMaterials[2], 1.98, .345, -2.6, .53, .37, .31);
      cylinder(potMat, 2.83, 1.37, -2.57, .12, .18);

      const leafGeometry = new BufferGeometry();
      const positions = [], indices = [], segments = 9;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const width = .19 * Math.pow(Math.sin(Math.PI * t), .8);
        const bend = .1 * Math.sin(Math.PI * t) + .11 * t * t;
        positions.push(-width, t, bend, 0, t, bend + .025 * Math.sin(Math.PI * t), width, t, bend);
        if (i < segments) {
          const a = i * 3;
          indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
        }
      }
      leafGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      leafGeometry.setIndex(indices); leafGeometry.computeVertexNormals(); geometries.add(leafGeometry);
      const stemBetween = (from, to, radius, material) => {
        const direction = new Vector3().subVectors(to, from);
        const midpoint = new Vector3().addVectors(from, to).multiplyScalar(.5);
        const stem = cylinder(material, midpoint.x, midpoint.y, midpoint.z, radius, direction.length());
        stem.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
      };
      const plant = (x, z, size) => {
        const potGeometry = new CylinderGeometry(.29 * size, .225 * size, .46 * size, 16, 1, false);
        geometries.add(potGeometry);
        add(potGeometry, potMat, x, .23 * size, z);
        cylinder(soilMat, x, .455 * size, z, .262 * size, .008);
        contact(x, z, 1.03 * size, .92 * size);
        const top = new Vector3(x, 1.90 * size, z);
        stemBetween(new Vector3(x, .42 * size, z), top, .015 * size, leaves[0]);
        for (let i = 0; i < 13; i++) {
          const angle = i * 2.399;
          const height = (.77 + i * .087) * size;
          const length = (.53 - i * .013) * size;
          const radius = (.31 + (i % 3) * .08) * size;
          const start = new Vector3(x, height, z);
          const end = new Vector3(x + Math.cos(angle) * radius, height + .14 * size, z + Math.sin(angle) * radius);
          stemBetween(start, end, .006 * size, leaves[0]);
          const leaf = add(leafGeometry, leaves[i % 3], end.x, end.y, end.z, length, length, length);
          leaf.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(Math.cos(angle) * .85, .34, Math.sin(angle) * .85).normalize());
          leaf.rotateY(angle * .4);
        }
      };
      plant(-3.02, -2.42, 1.05);
      plant(3.24, -1.6, .7);
      // A restrained sculptural pendant and circular wall clock finish the architecture.
      const clockGeometry = new CylinderGeometry(.19, .19, .035, 24);
      geometries.add(clockGeometry);
      const clock = add(clockGeometry, ivory, 2.65, 2.69, -3.09);
      clock.rotation.x = Math.PI / 2;
      box(charcoal, 2.65, 2.735, -3.062, .015, .09, .014);
      const hand = box(charcoal, 2.69, 2.69, -3.06, .09, .015, .014);
      hand.rotation.z = -.15;
      cylinder(charcoal, .35, 3.45, -.6, .014, .6);
      const shadeGeo = new CylinderGeometry(.11, .36, .23, 24, 1, true);
      geometries.add(shadeGeo);
      add(shadeGeo, ivory, .35, 3.08, -.6);
      const bulbMaterial = mat('#F9F6E8', { emissive: '#FFF6D5', emissiveIntensity: .16 });
      const bulb = add(sphereGeo, bulbMaterial, .35, 2.98, -.6, .09, .07, .09);
      bulb.castShadow = false;

      const ambient = new HemisphereLight('#FFF9E9', '#9EAA93', 2.1);
      scene.add(ambient);
      const sun = new DirectionalLight('#FFF5DF', 3.1);
      sun.position.set(-4.5, 7.5, 4.5);
      sun.target.position.set(0, 0, -1);
      scene.add(sun, sun.target);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -7;
      sun.shadow.camera.right = 7;
      sun.shadow.camera.top = 7;
      sun.shadow.camera.bottom = -7;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 25;
      sun.shadow.normalBias = .035;
      sun.shadow.bias = -.0001;
      sun.shadow.radius = 3;
      // The room is still; re-use its shadow map while the visitor turns the camera.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;

      let yawOffset = 0, pitchOffset = 0;
      const focus = new Vector3(0, 1.58, -.2);
      const baseYaw = .45, basePitch = .57, radius = 14;
      const updateCamera = () => {
        const yaw = baseYaw + yawOffset, pitch = basePitch + pitchOffset;
        camera.position.set(
          focus.x + Math.sin(yaw) * Math.cos(pitch) * radius,
          focus.y + Math.sin(pitch) * radius,
          focus.z + Math.cos(yaw) * Math.cos(pitch) * radius
        );
        camera.lookAt(focus);
        camera.updateMatrixWorld();
      };
      const hotspotDefinitions = [
        { activity: 'lesson', label: 'Board lesson', number: '01', point: new Vector3(-.4, 2.16, -2.94) },
        { activity: 'vocabulary', label: 'Vocabulary book', number: '02', point: new Vector3(-1.65, .96, 1.29) },
        { activity: 'quiz', label: 'Desk quiz', number: '03', point: new Vector3(1.25, .92, 1.38) }
      ];
      if (hotspots) {
        hotspots.replaceChildren();
        hotspotDefinitions.forEach(item => {
          const button = document.createElement('button');
          button.className = 'classroom-hotspot';
          button.type = 'button';
          button.dataset.activity = item.activity;
          button.setAttribute('aria-label', `Open ${item.label.toLowerCase()}`);
          const number = document.createElement('span'); number.className = 'hotspot-number'; number.textContent = item.number;
          const label = document.createElement('span'); label.className = 'hotspot-label'; label.textContent = item.label;
          button.append(number, label);
          hotspots.append(button);
          item.button = button;
        });
      }
      const projected = new Vector3();
      const updateHotspots = (width, height) => {
        hotspotDefinitions.forEach(item => {
          if (!item.button) return;
          projected.copy(item.point).project(camera);
          item.button.style.left = `${(projected.x * .5 + .5) * width}px`;
          item.button.style.top = `${(-projected.y * .5 + .5) * height}px`;
          item.button.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .96 || Math.abs(projected.y) > .94;
        });
      };
      let width = 0, height = 0;
      const resize = () => {
        const rectangle = stage.getBoundingClientRect();
        width = Math.max(1, rectangle.width);
        height = Math.max(1, rectangle.height);
        renderer.setSize(width, height, false);
        const aspect = width / height;
        const viewHeight = Math.max(8.3, 10.65 / aspect);
        camera.left = -viewHeight * aspect / 2;
        camera.right = viewHeight * aspect / 2;
        camera.top = viewHeight / 2;
        camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
        updateCamera();
        requestRender();
      };
      renderScene = () => {
        renderer.render(scene, camera);
        updateHotspots(width, height);
      };
      stage.dataset.state = 'ready';
      canvas.hidden = false;
      if (fallback) fallback.hidden = true;
      if (hotspots) hotspots.hidden = false;
      if (reset) reset.disabled = false;
      if (status) status.textContent = 'Drag gently to look around · tap an object to learn.';
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      resize();

      const raycaster = new Raycaster();
      const pointer = new Vector2();
      const activityAt = (clientX, clientY) => {
        const bounds = canvas.getBoundingClientRect();
        pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(targets, false)[0]?.object.userData.activity;
      };
      let drag = null;
      const pointerDown = (event) => {
        if (event.button !== 0 || stage.dataset.state !== 'ready') return;
        stage.focus({ preventScroll: true });
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: yawOffset, pitch: pitchOffset, moved: false, scrolling: false, type: event.pointerType };
      };
      const pointerMove = (event) => {
        if (drag?.id === event.pointerId) {
          const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
          if (drag.type === 'touch' && !drag.moved && Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) drag.scrolling = true;
          if (drag.scrolling) return;
          if (!drag.moved && (Math.abs(dx) > 5 || (drag.type !== 'touch' && Math.abs(dy) > 5))) {
            if (drag.type === 'touch' && Math.abs(dx) < Math.abs(dy) * 1.2) return;
            drag.moved = true;
            try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* Native page scrolling may already own the gesture. */ }
          }
          if (drag.moved) {
            yawOffset = Math.max(-.21, Math.min(.21, drag.yaw - dx * .0017));
            if (drag.type !== 'touch') pitchOffset = Math.max(-.055, Math.min(.055, drag.pitch + dy * .0009));
            updateCamera(); requestRender(); canvas.style.cursor = 'grabbing';
          }
        } else if (event.pointerType !== 'touch') {
          canvas.style.cursor = activityAt(event.clientX, event.clientY) ? 'pointer' : 'grab';
        }
      };
      const pointerUp = (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const shouldActivate = !drag.moved && !drag.scrolling;
        drag = null;
        canvas.style.cursor = 'grab';
        if (shouldActivate && stage.dataset.state === 'ready') {
          const activity = activityAt(event.clientX, event.clientY);
          if (activity) window.dispatchEvent(new CustomEvent('oxygen:activity', { detail: { activity, source: 'scene' } }));
        }
      };
      const pointerCancel = () => { drag = null; canvas.style.cursor = 'grab'; };
      const resetCamera = () => {
        yawOffset = 0; pitchOffset = 0;
        updateCamera(); requestRender();
      };
      const keyboard = (event) => {
        if (event.target !== stage && event.target !== canvas) return;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') { resetCamera(); return; }
        yawOffset = Math.max(-.21, Math.min(.21, yawOffset + (event.key === 'ArrowLeft' ? -.035 : event.key === 'ArrowRight' ? .035 : 0)));
        pitchOffset = Math.max(-.055, Math.min(.055, pitchOffset + (event.key === 'ArrowUp' ? .018 : event.key === 'ArrowDown' ? -.018 : 0)));
        updateCamera(); requestRender();
      };
      canvas.style.touchAction = 'pan-y';
      canvas.style.cursor = 'grab';
      canvas.addEventListener('pointerdown', pointerDown);
      canvas.addEventListener('pointermove', pointerMove);
      canvas.addEventListener('pointerup', pointerUp);
      canvas.addEventListener('pointercancel', pointerCancel);
      canvas.addEventListener('lostpointercapture', pointerCancel);
      stage.addEventListener('keydown', keyboard);
      reset?.addEventListener('click', resetCamera);
      const lost = event => { event.preventDefault(); setFallback(); };
      const restored = () => {
        if (disposed) return;
        stage.dataset.state = 'ready'; canvas.hidden = false;
        renderer.shadowMap.needsUpdate = true;
        if (fallback) fallback.hidden = true;
        if (hotspots) hotspots.hidden = false;
        if (reset) reset.disabled = false;
        if (status) status.textContent = 'Drag gently to look around · tap an object to learn.';
        requestRender();
      };
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      releaseResources = () => {
        canvas.removeEventListener('pointerdown', pointerDown);
        canvas.removeEventListener('pointermove', pointerMove);
        canvas.removeEventListener('pointerup', pointerUp);
        canvas.removeEventListener('pointercancel', pointerCancel);
        canvas.removeEventListener('lostpointercapture', pointerCancel);
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
        stage.removeEventListener('keydown', keyboard);
        reset?.removeEventListener('click', resetCamera);
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        for (const map of textures) map.dispose();
        sun.shadow.dispose();
        renderer.dispose();
      };
    } catch (_) {
      renderer?.dispose();
      setFallback();
    }
  }

  // Offscreen classrooms do no GPU work. Initial downloads are deferred until nearby.
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { initialize(); requestRender(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '180px', threshold: 0 }) : null;
  if (observer) observer.observe(stage);
  else { visible = true; initialize(); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestRender();
  });
  window.addEventListener('pagehide', event => {
    // Keep the scene intact for Safari's back/forward cache.
    if (event.persisted) { cancelAnimationFrame(frame); frame = 0; return; }
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver?.disconnect();
    releaseResources?.();
  });
})();

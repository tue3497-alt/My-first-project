/* Native WebGL: an Oxygen molecule, rendered locally without external libraries. */
(() => {
  'use strict';

  const canvas = document.getElementById('oxygen-scene');
  const stage = document.getElementById('scene-stage');
  const fallback = document.getElementById('scene-fallback');
  const toggle = document.getElementById('scene-toggle');
  const reset = document.getElementById('scene-reset');
  if (!canvas || !stage) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !reducedMotion.matches;
  let unavailable = false;
  let userRotation = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let elapsed = 0;
  let lastTime = 0;
  let frame = 0;
  let onScreen = true;
  let drag = null;
  let gl;

  function updateToggle() {
    if (!toggle) return;
    toggle.textContent = playing ? '暂停动画' : '播放动画';
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? '暂停 3D 分子动画' : '播放 3D 分子动画');
  }

  function showFallback() {
    unavailable = true;
    cancelAnimationFrame(frame);
    canvas.hidden = true;
    if (fallback) {
      fallback.hidden = false;
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', 'Oxygen 氧气分子示意图，当前浏览器暂不支持 3D 渲染');
    }
    if (toggle) toggle.disabled = true;
    if (reset) reset.disabled = true;
    stage.classList.add('scene-unavailable');
  }

  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false
    });
  } catch (_) { /* The illustrated fallback remains usable. */ }
  if (!gl) {
    showFallback();
    return;
  }

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProjection;
    uniform mat3 uNormalMatrix;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vPosition = world.xyz;
      vNormal = normalize(uNormalMatrix * aNormal);
      gl_Position = uViewProjection * world;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform vec3 uColor;
    uniform float uMetallic;
    uniform vec3 uCamera;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(uCamera - vPosition);
      vec3 key = normalize(vec3(-3.0, 4.5, 5.0));
      vec3 fill = normalize(vec3(4.0, -1.0, 2.0));
      vec3 halfKey = normalize(key + v);
      vec3 halfFill = normalize(fill + v);
      float diffuse = max(dot(n, key), 0.0);
      float secondary = max(dot(n, fill), 0.0);
      float specular = pow(max(dot(n, halfKey), 0.0), 95.0);
      float fillSpecular = pow(max(dot(n, halfFill), 0.0), 55.0);
      float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.7);
      float sky = n.y * 0.5 + 0.5;
      vec3 environment = mix(vec3(0.075, 0.025, 0.11), vec3(0.49, 0.37, 0.62), sky);
      vec3 color = uColor * (0.15 + diffuse * 0.72 + secondary * 0.17);
      color += environment * uColor * (0.20 + uMetallic * 0.5);
      color += mix(vec3(0.9, 0.84, 1.0), vec3(1.0, 0.86, 0.59), uMetallic) * specular * 1.55;
      color += vec3(0.65, 0.32, 0.98) * fillSpecular * 0.5;
      color += mix(vec3(0.54, 0.24, 0.94), vec3(0.96, 0.69, 0.3), uMetallic) * fresnel * 0.42;
      gl_FragColor = vec4(pow(color, vec3(0.4545)), 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Shader compilation failed');
    }
    return shader;
  }

  let program;
  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
  } catch (_) {
    showFallback();
    return;
  }

  const uniforms = {};
  ['Model', 'ViewProjection', 'NormalMatrix', 'Color', 'Metallic', 'Camera'].forEach(name => {
    uniforms[name] = gl.getUniformLocation(program, `u${name}`);
  });
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const normalLocation = gl.getAttribLocation(program, 'aNormal');

  function mesh(positions, normals, indices) {
    const position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const normal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normal);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    const index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return {position, normal, index, count: indices.length};
  }

  function sphere(segments = 56, rows = 36) {
    const positions = [], normals = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const phi = row / rows * Math.PI;
      for (let segment = 0; segment <= segments; segment++) {
        const theta = segment / segments * Math.PI * 2;
        const xyz = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
        positions.push(...xyz);
        normals.push(...xyz);
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = row * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    return mesh(positions, normals, indices);
  }

  function torus(radius, thickness, segments = 180, sides = 8) {
    const positions = [], normals = [], indices = [];
    for (let segment = 0; segment <= segments; segment++) {
      const theta = segment / segments * Math.PI * 2;
      for (let side = 0; side <= sides; side++) {
        const phi = side / sides * Math.PI * 2;
        const r = radius + thickness * Math.cos(phi);
        positions.push(r * Math.cos(theta), r * Math.sin(theta), thickness * Math.sin(phi));
        normals.push(Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi));
      }
    }
    for (let segment = 0; segment < segments; segment++) {
      for (let side = 0; side < sides; side++) {
        const a = segment * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return mesh(positions, normals, indices);
  }

  function cylinder(radius, length, segments = 40) {
    const positions = [], normals = [], indices = [];
    for (let side = 0; side <= segments; side++) {
      const theta = side / segments * Math.PI * 2;
      const x = Math.cos(theta), z = Math.sin(theta);
      positions.push(x * radius, -length / 2, z * radius, x * radius, length / 2, z * radius);
      normals.push(x, 0, z, x, 0, z);
      if (side < segments) {
        const a = side * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    return mesh(positions, normals, indices);
  }

  function identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        result[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1]
          + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
      }
    }
    return result;
  }
  function translation(x, y, z) {
    const result = identity();
    result[12] = x; result[13] = y; result[14] = z;
    return result;
  }
  function scale(value) {
    const result = identity();
    result[0] = value; result[5] = value; result[10] = value;
    return result;
  }
  function rotateX(angle) {
    const result = identity(), c = Math.cos(angle), s = Math.sin(angle);
    result[5] = c; result[6] = s; result[9] = -s; result[10] = c;
    return result;
  }
  function rotateY(angle) {
    const result = identity(), c = Math.cos(angle), s = Math.sin(angle);
    result[0] = c; result[2] = -s; result[8] = s; result[10] = c;
    return result;
  }
  function rotateZ(angle) {
    const result = identity(), c = Math.cos(angle), s = Math.sin(angle);
    result[0] = c; result[1] = s; result[4] = -s; result[5] = c;
    return result;
  }
  function compose(...matrices) {
    return matrices.reduce(multiply, identity());
  }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0,
      (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function normalMatrix(m) {
    // Inverse transpose, so light remains correct after any model transformation.
    const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
    const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    const inv = determinant ? 1 / determinant : 1;
    return new Float32Array([(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv,
      (f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv,
      (d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv]);
  }

  const atomMesh = sphere();
  const satelliteMesh = sphere(24, 16);
  const orbitMesh = torus(2.15, 0.013);
  const connectorMesh = cylinder(0.19, 1.9);
  const gold = [0.78, 0.43, 0.09];
  const violet = [0.19, 0.025, 0.43];
  const paleGold = [0.94, 0.75, 0.38];
  const lavender = [0.38, 0.12, 0.67];

  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0, 0, 0, 0);
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(normalLocation);

  function draw(object, model, color, metallic = 0.7) {
    gl.bindBuffer(gl.ARRAY_BUFFER, object.position);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, object.normal);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.index);
    gl.uniformMatrix4fv(uniforms.Model, false, model);
    gl.uniformMatrix3fv(uniforms.NormalMatrix, false, normalMatrix(model));
    gl.uniform3fv(uniforms.Color, color);
    gl.uniform1f(uniforms.Metallic, metallic);
    gl.drawElements(gl.TRIANGLES, object.count, gl.UNSIGNED_SHORT, 0);
  }

  function render(time) {
    frame = 0;
    if (unavailable || document.hidden || !onScreen) return;
    if (playing && lastTime) elapsed += Math.min((time - lastTime) / 1000, 0.06);
    lastTime = time;
    smoothX += (pointerX - smoothX) * 0.075;
    smoothY += (pointerY - smoothY) * 0.075;
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bufferWidth = Math.round(width * ratio), bufferHeight = Math.round(height * ratio);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const aspect = width / height;
    const cameraDistance = aspect < 1 ? 6.25 / aspect : 6.25;
    const viewProjection = compose(perspective(Math.PI / 3.8, aspect, 0.1, 40), translation(0, 0, -cameraDistance));
    gl.uniformMatrix4fv(uniforms.ViewProjection, false, viewProjection);
    gl.uniform3f(uniforms.Camera, 0, 0, cameraDistance);

    const spin = elapsed * 0.13;
    const group = compose(rotateX(-0.10 + smoothY * 0.13), rotateY(-0.24 + userRotation + smoothX * 0.22), rotateZ(0.25));
    const atomGroup = compose(group, rotateY(Math.sin(spin) * 0.27));
    draw(connectorMesh, compose(atomGroup, rotateZ(Math.PI / 2)), gold);
    draw(atomMesh, compose(atomGroup, translation(-0.95, 0, 0), scale(0.77)), gold, 1);
    draw(atomMesh, compose(atomGroup, translation(0.95, 0, 0), scale(0.86)), violet, 0.08);

    const ringOne = compose(group, rotateY(0.22 + spin * 0.1), rotateX(0.87));
    const ringTwo = compose(group, rotateY(0.92 - spin * 0.08), rotateX(-0.7), scale(1.045));
    draw(orbitMesh, ringOne, paleGold, 0.85);
    draw(orbitMesh, ringTwo, lavender, 0.15);
    const orbitAngle = elapsed * 0.27 + 0.4;
    draw(satelliteMesh, compose(ringOne, translation(Math.cos(orbitAngle) * 2.15, Math.sin(orbitAngle) * 2.15, 0), scale(0.13)), paleGold, 1);
    draw(satelliteMesh, compose(ringTwo, translation(Math.cos(-orbitAngle + 2.8) * 2.15, Math.sin(-orbitAngle + 2.8) * 2.15, 0), scale(0.09)), lavender, 0.2);
    draw(satelliteMesh, compose(ringOne, translation(Math.cos(orbitAngle + 3.6) * 2.15, Math.sin(orbitAngle + 3.6) * 2.15, 0), scale(0.045)), paleGold, 1);

    const pointerMoving = Math.abs(pointerX - smoothX) + Math.abs(pointerY - smoothY) > 0.002;
    if (playing || pointerMoving) requestRender();
  }

  function requestRender() {
    if (!frame && !unavailable && !document.hidden && onScreen) frame = requestAnimationFrame(render);
  }

  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button > 0) return;
    drag = {id: event.pointerId, startX: event.clientX, startY: event.clientY, rotation: userRotation, captured: false};
  });
  stage.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      // Safari keeps normal vertical page scrolling via touch-action: pan-y.
      if (!drag.captured && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        drag.captured = true;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
      }
      if (drag.captured) {
        userRotation = drag.rotation + dx * 0.009;
        requestRender();
      }
    } else if (event.pointerType !== 'touch' && !reducedMotion.matches) {
      const bounds = stage.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      requestRender();
    }
  });
  function stopDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    drag = null;
    stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('lostpointercapture', () => {
    drag = null;
    stage.classList.remove('is-dragging');
  });
  stage.addEventListener('pointerleave', () => {
    pointerX = 0; pointerY = 0;
    requestRender();
  });
  stage.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      userRotation += event.key === 'ArrowLeft' ? -0.2 : 0.2;
      requestRender();
    }
  });
  if (toggle) toggle.addEventListener('click', () => {
    playing = !playing;
    lastTime = 0;
    updateToggle();
    requestRender();
  });
  if (reset) reset.addEventListener('click', () => {
    userRotation = 0; pointerX = 0; pointerY = 0;
    smoothX = 0; smoothY = 0; elapsed = 0; lastTime = 0;
    requestRender();
  });
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestRender();
  });
  const motionChanged = () => {
    playing = !reducedMotion.matches;
    pointerX = 0; pointerY = 0; lastTime = 0;
    updateToggle();
    requestRender();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', motionChanged);
  else reducedMotion.addListener(motionChanged);
  if ('ResizeObserver' in window) new ResizeObserver(requestRender).observe(stage);
  else window.addEventListener('resize', requestRender);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      onScreen = entries[entries.length - 1].isIntersecting;
      lastTime = 0;
      if (onScreen) requestRender();
      else { cancelAnimationFrame(frame); frame = 0; }
    }).observe(stage);
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    showFallback();
  });
  if (fallback) fallback.hidden = true;
  updateToggle();
  requestRender();
})();

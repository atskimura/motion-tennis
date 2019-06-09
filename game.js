class VSTennis {
  constructor() {
    this.scene;
    this.renderer;
    this.camera;
    this.controls;
    this.world;
    this.ball;
    this.ballMesh;
    this.racket;
    this.racketMesh;
    this.otherRacket;
    this.otherRacketMesh;
    this.physicsMaterial = new CANNON.Material("defaultMaterial");
    this.centerPosition;
    this.wallProps = {length:50, width:15, height:12, depth:1};
    this.racketProps = {x:0, y:0, z:this.wallProps.length/2 - 10, width:4, height:4, depth:0.4, color:0x0000ff, colorHit:0xff0000};
    this.otherRacketProps = {x:0, y:0, z:-this.wallProps.length/2 + 10, width:4, height:4, depth:0.4, color:0x0000ff, colorHit:0xff0000};
    this.dt = 1/60;
    this.messageEl = document.getElementById('message');
    this.isGameStart = false;

    this.init();
  }

  createWall(w, h, d, x, y, z) {
    const wallMaterial = new THREE.MeshStandardMaterial({color:0xffffff});
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
    wall.position.set(x, y, z);
    this.scene.add(wall);

    const wallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)),
      material: this.physicsMaterial
    });
    wallBody.position.set(x, y, z);
    this.world.addBody(wallBody);
  }

  createLine(w, h, d, x, y, z) {
    const lineMaterial = new THREE.MeshStandardMaterial({color:0xff0000});
    const line = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lineMaterial);
    line.position.set(x, y, z);
    this.scene.add(line);
  }

  createWalls() {
    const {width, length, height, depth} = this.wallProps;

    const wallY = height/2 - depth;

    this.createWall(depth, height, length, -8, 0, 0);
    this.createWall(depth, height, length, 8, 0, 0);
    this.createWall(width, depth, length, 0, wallY, 0);
    this.createWall(width, depth, length, 0, -wallY, 0);
    this.createWall(width, height, depth, 0, 0, -length/2);
    this.createWall(width, height, depth, 0, 0, length/2);

    // ラケットの位置にライン
    this.createLine(depth, height, depth, -8, 0, this.racketProps.z);
    this.createLine(depth, height, depth, 8, 0, this.racketProps.z);
    this.createLine(width, depth, depth, 0, wallY, this.racketProps.z);
    this.createLine(width, depth, depth, 0, -wallY, this.racketProps.z);

    // 相手のラケットの位置にライン
    this.createLine(depth, height, depth, -8, 0, this.otherRacketProps.z);
    this.createLine(depth, height, depth, 8, 0, this.otherRacketProps.z);
    this.createLine(width, depth, depth, 0, wallY, this.otherRacketProps.z);
    this.createLine(width, depth, depth, 0, -wallY, this.otherRacketProps.z);
  }

  createBall() {
    const ballRadius = 0.5;
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
    this.ball = new CANNON.Body({
      mass: webRtcStore.isMaster ? 5 : 0, // 参加者ではボールは物理演算対象外
      shape: ballShape,
      material: this.physicsMaterial,
      linearDamping: 0.0,
      angularDamping: 0.0
    });
    this.ball.position.set(this.racketProps.x, this.racketProps.y, this.racketProps.z - this.racketProps.depth - ballRadius);
    this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    this.ballMesh.position.set(this.racketProps.x, this.racketProps.y, this.racketProps.z - this.racketProps.depth - ballRadius);
    this.scene.add(this.ballMesh);
    this.world.addBody(this.ball);
  }

  createRacket(racketProps) {
    return new Promise((resolve) => {
      let result = {};
      result.racketMesh = new THREE.Mesh(
        new THREE.BoxGeometry(racketProps.width, racketProps.height, racketProps.depth),
        new THREE.MeshBasicMaterial({
          color: racketProps.color,
          transparent: true,
          opacity: 0.5
        })
      );
      result.racketMesh.position.set(racketProps.x, racketProps.y, racketProps.z);
      this.scene.add(result.racketMesh);
      
      result.racket = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(racketProps.width/2, racketProps.height/2, racketProps.depth/2)),
        material: this.physicsMaterial
      });
      result.racket.position.set(racketProps.x, racketProps.y, racketProps.z);
      result.racket.addEventListener("collide", (e) => {
        result.racketMesh.material.color = new THREE.Color(racketProps.colorHit);
        setTimeout(() => {
          result.racketMesh.material.color = new THREE.Color(racketProps.color);
        }, 200);
      });
      this.world.addBody(result.racket);
      resolve(result);
    });
  }

  createRackets() {
    this.createRacket(this.racketProps)
    .then((result) => {
      this.racketMesh = result.racketMesh;
      this.racket = result.racket;
    });
    this.createRacket(this.otherRacketProps)
    .then((result) => {
      this.otherRacketMesh = result.racketMesh;
      this.otherRacket = result.racket;
    });
  }

  init() {
    this.initCannon();

    this.initThree();

    this.initListener();

    this.animate();
  }

  initListener() {
    this.centerPosition = {x:window.innerWidth/2, y:window.innerHeight/2};
    
    // ラケットがマウスに追随
    window.addEventListener('mousemove', (e) => {
      if (this.racket) {
        // 壁の大きさに合わせて座標を変換
        const mouseX = (e.clientX - this.centerPosition.x)/window.innerWidth * 8 * 2;
        const mouseY = (e.clientY - this.centerPosition.y)/window.innerHeight * -6 * 2;
        this.racket.position.set(mouseX, mouseY, this.racket.position.z);
        // リモートにラケット座標を送る
        if (webRtcStore.isOpen) {
          webRtcStore.dataConnection.send(JSON.stringify({racket:this.racket.position}));
        }
      }
    });
    document.addEventListener('keydown', (e) => {
      switch (e.keyCode) {
        case 32: // space
          this.shootBall();
          break;
      }
    });
  }

  startGame() {
    if (webRtcStore.isOpen && !this.isGameStart) {
      this.createBall();
      this.isGameStart = true;
      this.messageEl.style.display = 'none';
      this.shootBall();
    }
  }

  getRandom(max, min) {
    return Math.random() * (max - min) + min;
  }

  shootBall() {
    this.ball.velocity.set(this.getRandom(-2, 2), this.getRandom(-1, 1), -20);
  }

  initThree() {
    const {width, length, height, depth} = this.wallProps;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.shadowMapEnabled = true;
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById('game-canvas').appendChild( this.renderer.domElement );

    this.createWalls();

    this.createRackets();

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 2);
    hemiLight.position.set(0, 6, 0);
    this.scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.2);
    dirLight.position.set(0, 5, length/2 - 5);
    dirLight.lookAt(0, 0, 0);
    this.scene.add(dirLight);

    this.renderer.setClearColor(0xffffff);

    this.camera.position.set(0, 0, length/2);
    this.camera.lookAt(this.scene.position);

    // this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  initCannon() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -20, 0); //重力を追加

    const physicsContactMaterial = new CANNON.ContactMaterial(
      this.physicsMaterial,
      this.physicsMaterial,
      {
        friction: 0.0,
        restitution: 1.0
      }
    );
    this.world.addContactMaterial(physicsContactMaterial);
  }

  moveRacket() {
    const getRacektPosition = BREAKOUT_CONST.isHandtrack ? this.getRacektPositionHandtrack : this.getRacektPositionMotion;
    getRacektPosition()
    .then((position) => {
      if (position) {
        // ぶるぶる防止、0.5以下は無視する
        if(Math.abs(position.x - this.racket.position.x) < 0.5) {
          position.x = this.racket.position.x;
        }
        if(Math.abs(position.y - this.racket.position.y) < 0.5) {
          position.y = this.racket.position.y;
        }
        // 壁を超えられないようにする
        position.x = position.x < 0 ? Math.max(position.x, -8 + this.racketProps.width/2) : Math.min(position.x, 8 - this.racketProps.height/2);
        position.y = position.y < 0 ? Math.max(position.y, -6 + this.racketProps.width/2) : Math.min(position.y, 6 - this.racketProps.height/2);
        this.racket.position.set(position.x, position.y, this.racket.position.z);
        // リモートにラケット座標を送る
        if (webRtcStore.isOpen) {
          webRtcStore.dataConnection.send(JSON.stringify({racket:this.racket.position}));
        }
      }
    }); 
  }

  handleWebRtcData() {
    if (webRtcStore.data) {
      const data = JSON.parse(webRtcStore.data);
      if (data.ball && !webRtcStore.isMaster) {
        const position = data.ball;
        this.ball.position.set(position.x, position.y, -position.z);
      }
      if (data.racket) {
        const position = data.racket;
        this.otherRacket.position.set(position.x, position.y, this.otherRacket.position.z);
      }
    }
  }

  sendBallPosition() {
    // 主催側だったらボールの座標を送る
    if (webRtcStore.isOpen && webRtcStore.isMaster) {
      webRtcStore.dataConnection.send(JSON.stringify({ball:this.ball.position}));
    }
  }

  getRacektPositionMotion() {
    return new Promise((resolve) => {
      if (poses && poses.length) {
        const nose = poses[0].pose.nose;
        if (nose.confidence > 0.5) {
          // 壁の大きさに合わせて座標を変換
          const canvasWidth = BREAKOUT_CONST.captureCanvasWidth;
          const canvasHeight = BREAKOUT_CONST.captureCanvasHeight;
          let position = {};
          position.x = (nose.x - canvasWidth/2)/canvasWidth * -8 * 5;
          position.y = (nose.y - canvasHeight/2)/canvasHeight * -6 * 8;
          resolve(position);
        }
      }
    });
  }

  getRacektPositionHandtrack() {
    return new Promise((resolve) => {
      if (poses && poses.length && poses[0].score > 0.5) {
        const bbox = poses[0].bbox;
        const handX = bbox[0] + bbox[2]/2;
        const handY = bbox[1] + bbox[3]/2;
        const canvasWidth = BREAKOUT_CONST.captureCanvasWidth;
        const canvasHeight = BREAKOUT_CONST.captureCanvasHeight;
        let position = {};
        position.x = (handX - canvasWidth/2)/canvasWidth * 8 * 3;
        position.y = (handY - canvasHeight/2)/canvasHeight * -6 * 5;
        resolve(position);
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    this.world.step(this.dt);

    this.startGame();

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ball.position);
      this.ballMesh.quaternion.copy(this.ball.quaternion);
    }

    if (this.racketMesh) {
      this.racketMesh.position.copy(this.racket.position);
      this.racketMesh.quaternion.copy(this.racket.quaternion);
    }

    if (this.otherRacketMesh) {
      this.otherRacketMesh.position.copy(this.otherRacket.position);
      this.otherRacketMesh.quaternion.copy(this.otherRacket.quaternion);
    }

    this.sendBallPosition();

    this.moveRacket();

    this.handleWebRtcData();

    if (this.controls) this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }
}

new VSTennis();
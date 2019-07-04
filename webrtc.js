const Peer = window.Peer;

(async function main() {
  const localId = document.getElementById('js-local-id');
  const localText = document.getElementById('js-local-text');
  const connectTrigger = document.getElementById('js-connect-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteId = document.getElementById('js-remote-id');
  const messageEl = document.getElementById('message');
  const gameCanvasContainer = document.getElementById('game-canvas');

  const peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  });

  // ゲスト側の接続処理
  connectTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    const dataConnection = peer.connect(remoteId.value);
    webRtcStore.dataConnection = dataConnection;

    dataConnection.once('open', async () => {
      console.log(`=== DataConnection has been opened ===\n`);
      webRtcStore.isOpen = true;
    });

    const mediaConnection = peer.call(remoteId.value);

    // ゲスト側のストリーム接続処理
    mediaConnection.on('stream', async stream => {
      console.log('=== MediaConnection on stream ===');
      messageEl.style.display = 'none';
      // ゲスト側のCanvasストリームをvideoに表示
      const gameVideo = document.createElement('video');
      gameCanvasContainer.appendChild(gameVideo);
      gameVideo.srcObject = stream;
      gameVideo.playsInline = true;
      console.log(gameVideo);
      await gameVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      gameCanvas.srcObject.getTracks().forEach(track => track.stop());
      gameCanvas.srcObject = null;
    });

    // Register closing handler
    closeTrigger.addEventListener('click', () => dataConnection.close(), {
      once: true,
    });

    // ゲスト側のモーションをホストに定期送信
    setInterval(() => {
      if (poses.length) {
        webRtcStore.dataConnection.send(JSON.stringify({poses:poses}));
      }
    }, 100);
  });

  peer.once('open', id => (localId.textContent = id));

  // ホスト側のデータ取得処理
  peer.on('connection', dataConnection => {
    webRtcStore.dataConnection = dataConnection;

    dataConnection.once('open', async () => {
      console.log(`=== DataConnection has been opened ===\n`);
      webRtcStore.isOpen = true;
      webRtcStore.isMaster = true;
    });

    dataConnection.on('data', data => {
      // console.log(data);
      webRtcStore.data = data;
    });

    dataConnection.once('close', () => {
      console.log(`=== DataConnection has been closed ===\n`);
      webRtcStore.isOpen = false;
    });

    // Register closing handler
    closeTrigger.addEventListener('click', () => dataConnection.close(), {
      once: true,
    });
  });

  // ホスト側のストリーム取得処理
  peer.on('call', mediaConnection => {
    console.log('=== MediaConnection on call ===');
    new VSTennis();

    const gameCanvas = gameCanvasContainer.querySelectorAll('canvas')[1];
    mediaConnection.answer(gameCanvas.captureStream());
  });

  peer.on('error', console.error);
})();
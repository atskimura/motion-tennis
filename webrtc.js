const Peer = window.Peer;

(async function main() {
  const localId = document.getElementById('js-local-id');
  const localText = document.getElementById('js-local-text');
  const connectTrigger = document.getElementById('js-connect-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteId = document.getElementById('js-remote-id');

  const peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  });

  // Register connecter handler
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

  peer.once('open', id => (localId.textContent = id));

  // Register connected peer handler
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

  peer.on('error', console.error);
})();
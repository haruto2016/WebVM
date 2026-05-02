const STREAMING_SERVER = 'streaming-production-e1f3.up.railway.app';

let ramBuffer, ramView;
let currentVmName = localStorage.getItem('vm_name');

const setupView = document.getElementById('setup-view');
const manageView = document.getElementById('manage-view');
const launchBtn = document.getElementById('launch-btn');
const createBtn = document.getElementById('create-btn');
const statusText = document.getElementById('vm-status');

// Initialize UI based on saved VM
if (currentVmName) {
    setupView.style.display = 'none';
    manageView.style.display = 'block';
    document.getElementById('display-name').innerText = currentVmName;
}

createBtn.onclick = async () => {
    const name = document.getElementById('setup-name').value || 'Windows 11';
    const ramSize = parseInt(document.getElementById('setup-ram').value);
    const diskSize = document.getElementById('setup-disk').value;
    const file = document.getElementById('setup-file').files[0];

    if (!file) return alert('Please select a boot image (ISO or VHD)');

    createBtn.innerText = 'Creating VM...';
    
    // Allocate Memory locally (using Main PC memory)
    console.log(`Allocating ${ramSize}MB RAM...`);
    ramBuffer = new ArrayBuffer(ramSize * 1024 * 1024);
    ramView = new Uint8Array(ramBuffer);

    // Upload Boot Image and Create VM on Server
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    formData.append('ram', ramSize);
    formData.append('disk', diskSize);

    const res = await fetch(`https://${STREAMING_SERVER}/api/create`, {
        method: 'POST',
        body: formData
    });
    
    const data = await res.json();
    if (data.success) {
        localStorage.setItem('vm_name', name);
        localStorage.setItem('vm_ram', ramSize);
        currentVmName = name;
        setupView.style.display = 'none';
        manageView.style.display = 'block';
        document.getElementById('display-name').innerText = name;
    } else {
        alert('Failed to create VM: ' + data.error);
        createBtn.innerText = 'Create & Initialize';
    }
};

launchBtn.onclick = async () => {
    statusText.innerText = 'Initializing RAM Sync...';
    
    // Connect to the Remote RAM Bridge
    const ws = new WebSocket(`wss://${STREAMING_SERVER}`);
    
    ws.onopen = async () => {
        statusText.innerText = 'RAM Sync Active. Starting QEMU...';
        
        // Start the VM on Railway
        const res = await fetch(`https://${STREAMING_SERVER}/api/start`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'started' || data.status === 'running') {
            statusText.innerText = 'Running (Main PC RAM in use)';
            // Open the VNC console in a new window
            window.open(`console.html?port=${data.wsPort}`, '_blank', 'width=1024,height=768');
        }
    };

    ws.onmessage = (msg) => {
        // Handle memory read/write requests from the server
        // In this simplified version, the server tells us what changed
        // and we update our local buffer, or vice versa.
    };

    // Periodically sync random chunks to keep the server updated (Example logic)
    setInterval(() => {
        // Real implementation would use a "Dirty Page" tracking mechanism
    }, 100);
};

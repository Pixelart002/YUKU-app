function initAdminNotifyPage() {
  const sendBtn = document.getElementById('send-custom-notif-btn');
  const statusEl = document.getElementById('notif-status');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const targetEmail = document.getElementById('target-email').value;
      const title = document.getElementById('notif-title').value;
      const body = document.getElementById('notif-body').value;
      const imageUrl = document.getElementById('image-url').value;
      
      if (!title || !body) {
        statusEl.textContent = '[ERROR]: Title and Body are required.';
        statusEl.className = 'text-red-400';
        return;
      }
      
      const isBroadcast = !targetEmail.trim();
      const endpoint = isBroadcast ? 'broadcast' : 'send-custom';
      const token = window.app.getAuthToken();
      
      if (!token) {
        statusEl.textContent = '[ERROR]: Not authenticated.';
        statusEl.className = 'text-red-400';
        return;
      }
      
      let payload = { title, body };
      if (!isBroadcast) {
        payload.target_email = targetEmail;
      }
      if (imageUrl.trim()) {
        payload.image = imageUrl;
      }
      
      statusEl.textContent = 'Dispatching notification...';
      statusEl.className = 'text-yellow-400';
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      };
      
      const result = await window.app.handleApiRequest(`webpush/${endpoint}`, options);
      
      if (result) {
        statusEl.textContent = result.message || 'Dispatch successful!';
        statusEl.className = 'text-green-400';
      } else {
        statusEl.textContent = '[ERROR]: Dispatch failed. Check console.';
        statusEl.className = 'text-red-400';
      }
    });
  }
}
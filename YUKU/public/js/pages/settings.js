// File: js/pages/settings.js
function initSettingsPage() {
    const enableBtn = document.getElementById('enable-notifications-btn');
    if (enableBtn) {
        enableBtn.addEventListener('click', () => {
            enableBtn.disabled = true;
            enableBtn.textContent = 'Processing...';
            
            window.app.subscribeUserToPush()
                .then(() => {
                    enableBtn.textContent = 'Notifications Enabled';
                    alert('Notifications have been enabled successfully!');
                })
                .catch(err => {
                    console.error('Failed to subscribe:', err);
                    alert(`Error: ${err.message}`);
                    enableBtn.textContent = 'Enable Push Notifications';
                    enableBtn.disabled = false;
                });
        });
    }
}
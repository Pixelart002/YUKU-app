// File: js/utils/notificationPrompt.js

async function promptForNotifications() {
    // Check karein ki is session mein prompt pehle dikhaya ja chuka hai ya nahi
    if (sessionStorage.getItem('notificationPromptShown')) {
        return;
    }

    // Check karein ki browser push notifications support karta hai ya nahi
    if (!('PushManager' in window)) {
        return;
    }

    // Check karein ki user pehle se subscribed hai ya nahi
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        return; // User pehle se subscribed hai, kuch mat karein
    }

    // Agar user subscribed nahi hai, to SweetAlert2 popup dikhayein
    Swal.fire({
        title: 'Stay Updated!',
        text: 'Enable notifications to receive real-time alerts and updates from YUKU Protocol.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Enable Notifications',
        cancelButtonText: 'Maybe Later',
        confirmButtonColor: 'var(--accent-green)',
        background: 'var(--bg-medium)',
        color: 'var(--text-primary)',
        customClass: {
            popup: 'glass-panel'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Agar user 'Enable' par click karta hai, to subscribe function call karein
                await window.app.subscribeUserToPush();
                Swal.fire({
                    title: 'Subscribed!',
                    text: 'You will now receive notifications.',
                    icon: 'success',
                    background: 'var(--bg-medium)',
                    color: 'var(--text-primary)',
                    confirmButtonColor: 'var(--accent-green)',
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: error.message,
                    icon: 'error',
                    background: 'var(--bg-medium)',
                    color: 'var(--text-primary)',
                    confirmButtonColor: 'var(--accent-green)',
                });
            }
        }
    });

    // Mark karein ki is session mein prompt dikha diya gaya hai
    sessionStorage.setItem('notificationPromptShown', 'true');
}
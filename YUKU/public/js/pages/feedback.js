// File: js/pages/feedback.js (SMART VERSION)
function initFeedbackPage() {
  const ui = {
    title: document.getElementById('feedback-title'),
    submitBtn: document.getElementById('submit-feedback-btn'),
    commentText: document.getElementById('feedback-textarea'),
    statusEl: document.getElementById('feedback-status'),
    ratingInputs: document.querySelectorAll('input[name="rating"]')
  };
  
  const handleSubmit = async () => {
    const selectedRatingInput = document.querySelector('input[name="rating"]:checked');
    const comment = ui.commentText.value.trim();
    
    if (!selectedRatingInput) {
      ui.statusEl.innerHTML = `<p class="text-red-400">[ERROR]: Please select a star rating.</p>`;
      return;
    }
    if (comment.length < 10) {
      ui.statusEl.innerHTML = `<p class="text-red-400">[ERROR]: Comment must be at least 10 characters.</p>`;
      return;
    }
    
    const rating = parseInt(selectedRatingInput.value);
    ui.submitBtn.disabled = true;
    ui.submitBtn.textContent = 'Processing...';
    ui.statusEl.innerHTML = '';
    
    // Step 1: Always try to submit first (POST request)
    const submitResult = await window.app.handleFeedbackSubmit(rating, comment);
    
    if (submitResult) {
      // Success on the first try (new feedback)
      ui.statusEl.innerHTML = `<p class="text-green-400">Thank you! Your feedback has been submitted.</p>`;
      ui.submitBtn.textContent = "Update Feedback";
    } else {
      // The POST request failed. Check if it was because feedback already exists.
      const errorText = window.app.elements.authErrorBox.textContent;
      if (errorText.includes("already submitted")) {
        // If it's a conflict error (409), it means we should update instead.
        ui.statusEl.innerHTML = `<p class="text-yellow-400">Existing feedback found. Attempting to update...</p>`;
        
        // Step 2: Automatically try to update (PUT request)
        const updateResult = await window.app.handleFeedbackUpdate(rating, comment);
        
        if (updateResult) {
          ui.statusEl.innerHTML = `<p class="text-green-400">Your feedback has been updated successfully!</p>`;
          ui.submitBtn.textContent = "Update Feedback";
        } else {
          // This means the PUT request also failed for some reason.
          ui.statusEl.innerHTML = `<p class="text-red-400">[ERROR]: Failed to update feedback.</p>`;
          ui.submitBtn.textContent = "Try Again";
        }
      }
    }
    ui.submitBtn.disabled = false;
  };
  
  ui.submitBtn.addEventListener('click', handleSubmit);
}
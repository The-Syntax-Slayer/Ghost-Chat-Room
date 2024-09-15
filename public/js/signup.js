async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (name && username && password) {
    try {
      const response = await fetch('/server/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, password }),
      });

      const data = await response.json();

      if (data.success) {
        showPopup('SIGNUP', 'SUCCESSFUL', false);
        setTimeout(() => {
          const transitionElement = hackerTransition(null, null, true);
          transitionElement.style.zIndex = '9999'; // Set z-index for transition
          
          // Wait for 1 second before showing the welcome message
          setTimeout(() => {
            showWelcomeMessage(name, () => {
              // After the welcome message is complete, redirect to login page
              transitionElement.remove(); // Remove transition element
              window.location.href = 'login.html';
            });
          }, 1000);
        }, 2000);
      } else {
        showPopup('SIGNUP', data.message.toUpperCase(), true);
      }
    } catch (error) {
      console.error('Error:', error);
      showPopup('SIGNUP', 'FAILED', true);
    }
  } else {
    showPopup('SIGNUP', 'ALL FIELDS REQUIRED', true);
  }
}

document.getElementById('signupForm').addEventListener('submit', handleSignup);
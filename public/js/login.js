async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (username && password) {
    try {
      const response = await fetch('/server/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        showPopup('ACCESS', 'GRANTED', false);
        setTimeout(() => {
          const transitionElement = hackerTransition(null, null, true);
          transitionElement.style.zIndex = '9999';

          setTimeout(() => {
            showWelcomeToChatRoom(username, () => {
              transitionElement.remove();
              window.location.href = `chat.html?username=${encodeURIComponent(username)}&isAdmin=${data.isAdmin}`;
            });
          }, 1000);
        }, 2000);
      } else {
        showPopup('ACCESS', 'DENIED', true);
      }
    } catch (error) {
      console.error('Error:', error);
      showPopup('ACCESS', 'DENIED', true);
    }
  } else {
    showPopup('ACCESS', 'DENIED', true);
  }
}

document.getElementById('loginForm').addEventListener('submit', handleLogin);
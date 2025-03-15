// Canvas element ko get karna
const canvas = document.getElementById('canvas');

// 2D rendering context ko get karna
const ctx = canvas.getContext('2d');

// Canvas ki width aur height ko browser window ki width aur height ke barabar set karna
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Columns ki ginti ko calculate karna (har column 20 pixels wide hogi)
const cols = Math.floor(canvas.width / 20) + 1;

// Y-positions array ko initialize karna (har column ki y-position 0 se start hogi)
const ypos = Array(cols).fill(0);

// Matrix effect ko create karne wala function
function matrix() {
  // Previous frame ko fade out karne ke liye semi-transparent black fill style set karna
  ctx.fillStyle = '#0001';

  // Canvas ko pura cover karne wala rectangle draw karna
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Falling text ke liye bright green fill style set karna
  ctx.fillStyle = '#0f0';

  // Text ke font style ko set karna (15pt size aur monospace font)
  ctx.font = '15pt monospace';

  // Har column ke liye falling characters draw karna
  ypos.forEach((y, ind) => {
    // Random character generate karna (ASCII code 0-127 ke beech)
    const text = String.fromCharCode(Math.random() * 128);

    // Character ki x-position calculate karna (har column 20 pixels wide hogi)
    const x = ind * 20;

    // Character ko draw karna
    ctx.fillText(text, x, y);

    // Agar character canvas ke neeche se nikal gaya hai, toh uski y-position reset karna
    if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
    // Nahi toh character ko neeche ki taraf move karna
    else ypos[ind] = y + 20;
  });
}

// Matrix function ko har 50 milliseconds ke baad call karna
setInterval(matrix, 50);

// User ko save karne wala function
function saveUser(name, username, password) {
  // Local storage se users ko get karna
  const users = JSON.parse(localStorage.getItem('users') || '{}');

  // User ko users object mein add karna
  users[username] = { name, password: btoa(password) };

  // Users object ko local storage mein save karna
  localStorage.setItem('users', JSON.stringify(users));
}

// User ko get karne wala function
function getUser(username) {
  // Local storage se users ko get karna
  const users = JSON.parse(localStorage.getItem('users') || '{}');

  // User ko return karna
  return users[username];
}

// Popup ko show karne wala function
function showPopup(text1, text2, isDenied) {
  // Popup element ko get karna
  const popup = document.getElementById('hackerPopup');

  // Popup ko show karna
  popup.style.display = 'flex';

  // Text ko set karna
  popup.querySelector('.access').textContent = text1;
  popup.querySelector('.granted').textContent = text2;

  // Agar access denied hai, toh denied class add karna
  if (isDenied) {
    popup.classList.add('denied');
  } else {
    popup.classList.remove('denied');
  }

  // Typing effect ko add karna
  const typeText = (element, text, i = 0) => {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      setTimeout(() => typeText(element, text, i + 1), 50);
    }
  };

  // Text ko clear karna
  popup.querySelector('.access').textContent = '';
  popup.querySelector('.granted').textContent = '';

  // Typing effect ko start karna
  setTimeout(() => {
    typeText(popup.querySelector('.access'), text1);
    setTimeout(() => typeText(popup.querySelector('.granted'), text2), text1.length * 50);
  }, 100);

  // Show class ko add karna
  setTimeout(() => {
    popup.classList.add('show');
  }, 10);

  // Timeout ko set karna
  window.popupTimeout = setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => {
      popup.style.display = 'none';
    }, 500);
  }, 4000);
}

// Hacker transition effect ko create karne wala function
function hackerTransition(url, callback, isBackground = false) {
  const transitionElement = document.createElement('div');
  transitionElement.className = 'hacker-transition';
  document.body.appendChild(transitionElement);

  for (let i = 0; i < 100; i++) {
    const char = document.createElement('span');
    char.textContent = String.fromCharCode(33 + Math.floor(Math.random() * 94));
    char.style.left = `${Math.random() * 100}vw`;
    char.style.animationDelay = `${Math.random() * 2}s`;
    transitionElement.appendChild(char);
  }

  setTimeout(() => {
    transitionElement.style.opacity = '1';
    if (!isBackground && callback) {
      setTimeout(callback, 2000);
    } else if (!isBackground && url) {
      setTimeout(() => {
        window.location.href = url;
      }, 2000);
    }
  }, 100);

  if (isBackground) {
    // Keep adding new characters
    setInterval(() => {
      const char = document.createElement('span');
      char.textContent = String.fromCharCode(33 + Math.floor(Math.random() * 94));
      char.style.left = `${Math.random() * 100}vw`;
      char.style.animationDelay = '0s';
      transitionElement.appendChild(char);
    }, 100);
  }

  return transitionElement;
}

// Handle redirect function
function handleRedirect(url) {
  // Hacker transition effect ko use karna
  hackerTransition(url, () => {
    window.location.href = url;
  });
}

// Add event listeners to all anchor tags
document.addEventListener('DOMContentLoaded', function() {
  // Get all anchor tags
  const anchors = document.querySelectorAll('a');

  // Add event listener to each anchor tag
  anchors.forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      handleRedirect(this.href);
    });
  });
});

// Window resize event listener to adjust canvas size
window.addEventListener('resize', () => {
  // Get the canvas element
  const canvas = document.getElementById('canvas');

  // Set the canvas width and height to the window width and height
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function showWelcomeMessage(name, callback) {
  const welcomeElement = document.createElement('div');
  welcomeElement.id = 'welcomeMessage';
  welcomeElement.style.position = 'fixed';
  welcomeElement.style.top = '50%';
  welcomeElement.style.left = '50%';
  welcomeElement.style.transform = 'translate(-50%, -50%)';
  welcomeElement.style.fontSize = '24px';
  welcomeElement.style.color = '#0f0';
  welcomeElement.style.textAlign = 'center';
  welcomeElement.style.zIndex = '10000';
  welcomeElement.style.fontFamily = 'monospace';
  welcomeElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  welcomeElement.style.padding = '30px';
  welcomeElement.style.border = '3px solid #0f0';
  welcomeElement.style.boxShadow = '0 0 30px #0f0, inset 0 0 30px #0f0';
  welcomeElement.style.width = '80%';
  welcomeElement.style.maxWidth = '600px';
  welcomeElement.style.textShadow = '0 0 10px #0f0';
  welcomeElement.style.lineHeight = '1.5';
  document.body.appendChild(welcomeElement);

  const messages = [
    `Welcome ${name.toUpperCase()}!`,
    'Please Login to access,',
    '.........................',
    'CYBER GHOST\'s CHAT ROOM'
  ];

  let lineIndex = 0;
  let charIndex = 0;

  function typeWriter() {
    if (lineIndex < messages.length) {
      if (charIndex < messages[lineIndex].length) {
        welcomeElement.innerHTML += messages[lineIndex].charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, 50);
      } else {
        welcomeElement.innerHTML += '<br>';
        lineIndex++;
        charIndex = 0;
        setTimeout(typeWriter, 500);
      }
    } else {
      setTimeout(() => {
        welcomeElement.style.opacity = '0';
        welcomeElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          welcomeElement.remove();
          if (callback) callback();
        }, 500);
      }, 2000);
    }
  }

  typeWriter();
}

function showWelcomeToChatRoom(username, callback) {
  const welcomeElement = document.createElement('div');
  welcomeElement.id = 'welcomeMessage';
  welcomeElement.style.position = 'fixed';
  welcomeElement.style.top = '50%';
  welcomeElement.style.left = '50%';
  welcomeElement.style.transform = 'translate(-50%, -50%)';
  welcomeElement.style.fontSize = '24px';
  welcomeElement.style.color = '#0f0';
  welcomeElement.style.textAlign = 'center';
  welcomeElement.style.zIndex = '10000';
  welcomeElement.style.fontFamily = 'monospace';
  welcomeElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  welcomeElement.style.padding = '30px';
  welcomeElement.style.border = '3px solid #0f0';
  welcomeElement.style.boxShadow = '0 0 30px #0f0, inset 0 0 30px #0f0';
  welcomeElement.style.width = '80%';
  welcomeElement.style.maxWidth = '600px';
  welcomeElement.style.textShadow = '0 0 10px #0f0';
  welcomeElement.style.lineHeight = '1.5';
  document.body.appendChild(welcomeElement);

  const messages = [
    `Welcome ${username.toUpperCase()}!`,
    'Access Granted to',
    '.........................',
    'CYBER GHOST\'s CHAT ROOM'
  ];

  let lineIndex = 0;
  let charIndex = 0;

  function typeWriter() {
    if (lineIndex < messages.length) {
      if (charIndex < messages[lineIndex].length) {
        welcomeElement.innerHTML += messages[lineIndex].charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, 50);
      } else {
        welcomeElement.innerHTML += '<br>';
        lineIndex++;
        charIndex = 0;
        setTimeout(typeWriter, 500);
      }
    } else {
      setTimeout(() => {
        welcomeElement.style.opacity = '0';
        welcomeElement.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          welcomeElement.remove();
          if (callback) callback();
        }, 500);
      }, 2000);
    }
  }

  typeWriter();
}
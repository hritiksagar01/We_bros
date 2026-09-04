/**
 * WeBros Main Controller
 * Handles countdown timer, stats fetching, waitlist subscription,
 * micro-confetti burst, ticket generation, and sharing.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');
  const adopterCountEl = document.getElementById('live-adopter-count');

  const waitlistForm = document.getElementById('waitlist-form');
  const emailInput = document.getElementById('subscriber-email');
  const submitBtn = document.getElementById('submit-button');
  const formFeedback = document.getElementById('form-feedback');
  const rolePills = document.querySelectorAll('.role-pill');

  const successModal = document.getElementById('success-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalMessage = document.getElementById('modal-message');
  const ticketPosition = document.getElementById('ticket-position');
  const ticketRole = document.getElementById('ticket-role');
  const shareInviteBtn = document.getElementById('share-invite-btn');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  let selectedRole = 'Developer';
  // Target launch date fallback: 45 days in the future from now
  let targetLaunchDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).getTime();

  // Role Selection
  rolePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      rolePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      selectedRole = pill.getAttribute('data-role') || 'Developer';
    });
  });

  // Fetch initial stats from Express API
  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.totalAdopters && adopterCountEl) {
          adopterCountEl.textContent = `${data.totalAdopters.toLocaleString()}+`;
        }
        if (data.launchDate) {
          // If future date, use it
          if (data.launchDate > Date.now()) {
            targetLaunchDate = data.launchDate;
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch server stats, using defaults.', err);
    }
  }
  fetchStats();

  // Countdown Timer Logic
  function updateCountdown() {
    const now = Date.now();
    const distance = targetLaunchDate - now;

    if (distance <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // Feedback display helper
  function showFeedback(msg, isError = false) {
    if (!formFeedback) return;
    formFeedback.textContent = msg;
    formFeedback.className = `form-feedback show ${isError ? 'error' : 'success'}`;
  }

  function clearFeedback() {
    if (!formFeedback) return;
    formFeedback.textContent = '';
    formFeedback.className = 'form-feedback';
  }

  // Toast helper
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Waitlist Form Submission
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFeedback();

      const email = (emailInput.value || '').trim();

      // Basic client validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailPattern.test(email)) {
        showFeedback('Please enter a valid email address.', true);
        emailInput.focus();
        return;
      }

      // Show loading spinner
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            role: selectedRole
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update live adopters
          if (data.position && adopterCountEl) {
            adopterCountEl.textContent = `${data.position.toLocaleString()}+`;
          }

          // Populate modal ticket
          if (ticketPosition) ticketPosition.textContent = `#${data.position ? data.position.toLocaleString() : '2,481'}`;
          if (ticketRole) ticketRole.textContent = `${selectedRole} VIP`;
          if (modalMessage) modalMessage.textContent = data.message;

          // Open Modal
          openModal();
          triggerConfettiBurst();

          // Reset input
          emailInput.value = '';
          clearFeedback();
        } else {
          showFeedback(data.message || 'Something went wrong. Please try again.', true);
        }
      } catch (err) {
        console.error('Waitlist submission failed:', err);
        showFeedback('Unable to connect to server. Please try again in a moment.', true);
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // Modal Control
  function openModal() {
    if (!successModal) return;
    successModal.classList.add('open');
    successModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!successModal) return;
    successModal.classList.remove('open');
    successModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && successModal && successModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Share VIP Link
  if (shareInviteBtn) {
    shareInviteBtn.addEventListener('click', async () => {
      const shareUrl = window.location.origin || window.location.href;
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('VIP Invite Link copied to clipboard! 🚀');
        } catch (err) {
          fallbackCopy(shareUrl);
        }
      } else {
        fallbackCopy(shareUrl);
      }
    });
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('VIP Invite Link copied to clipboard! 🚀');
  }

  // Micro Confetti Burst
  function triggerConfettiBurst() {
    const colors = ['#00f0ff', '#a855f7', '#ec4899', '#f59e0b', '#34d399', '#ffffff'];
    const count = 45;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.zIndex = '1200';
      confetti.style.width = Math.random() * 8 + 6 + 'px';
      confetti.style.height = Math.random() * 8 + 6 + 'px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = '50%';
      confetti.style.top = '50%';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      confetti.style.pointerEvents = 'none';

      document.body.appendChild(confetti);

      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 300 + 150;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;

      const anim = confetti.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { 
          transform: `translate(${vx}px, ${vy + 200}px) rotate(${Math.random() * 720}deg) scale(${Math.random() * 0.5})`, 
          opacity: 0 
        }
      ], {
        duration: Math.random() * 1000 + 900,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
      });

      anim.onfinish = () => confetti.remove();
    }
  }
});

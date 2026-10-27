/// <reference types="vite/client" />

const greeting = document.querySelector<HTMLParagraphElement>('#greeting');
if (greeting) {
  // VITE_* values are public build-time data. textContent avoids interpreting HTML.
  greeting.textContent = import.meta.env.VITE_SAMPLE_GREETING || 'Hello from Vite.';
}

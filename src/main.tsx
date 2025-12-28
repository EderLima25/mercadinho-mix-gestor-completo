import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logPWAStatus } from "./utils/pwaUtils";

// Log PWA status for debugging
logPWAStatus();

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered successfully:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('New service worker found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker installed, ready to update');
                // You could show a notification to the user here
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });

  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Message from service worker:', event.data);
  });
} else {
  console.warn('Service workers are not supported in this browser');
}

createRoot(document.getElementById("root")!).render(<App />);

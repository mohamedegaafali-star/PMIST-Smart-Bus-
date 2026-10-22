
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  ref,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const $ = (id) => document.getElementById(id);

const loginSection = $("loginSection");
const dashboardSection = $("dashboardSection");
const loginForm = $("loginForm");
const loginMessage = $("loginMessage");
const dashboardMessage = $("dashboardMessage");
const trackingStatus = $("trackingStatus");
const coordinates = $("coordinates");
const connectionStatus = $("connectionStatus");
const busIdInput = $("busId");
const startButton = $("startButton");
const stopButton = $("stopButton");
const logoutButton = $("logoutButton");

let gpsWatchId = null;
let activeBusPath = null;
let tracking = false;
let latestPosition = null;
let updateInProgress = false;
let pendingPosition = null;
let authReady = false;

function showMessage(element, message) {
  element.textContent = message;
}

function getBusPath() {
  const busId = busIdInput.value.trim();

  // Firebase keys cannot contain these characters.
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(busId)) {
    throw new Error(
      "Enter a valid Bus ID using letters, numbers, - or _."
    );
  }

  return `locations/${busId}`;
}

function friendlyError(error) {
  const code = error?.code || "";

  if (code.includes("auth/invalid-credential") ||
      code.includes("auth/wrong-password") ||
      code.includes("auth/user-not-found")) {
    return "Incorrect email or password. Check your Firebase driver account.";
  }

  if (code.includes("auth/too-many-requests")) {
    return "Too many login attempts. Wait a while and try again.";
  }

  if (code.includes("permission-denied")) {
    return "Firebase permission denied. Check your Realtime Database rules.";
  }

  if (code.includes("network-request-failed")) {
    return "Network error. Check your internet connection.";
  }

  return error?.message || "An unexpected error occurred.";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  showMessage(loginMessage, "Signing in...");

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    $("password").value = "";
    showMessage(loginMessage, "");
  } catch (error) {
    showMessage(loginMessage, friendlyError(error));
  }
});

onAuthStateChanged(auth, (user) => {
  authReady = true;

  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    $("driverEmail").textContent = user.email || "Authenticated driver";
    showMessage(loginMessage, "");
  } else {
    stopLocalTracking();

    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    $("driverEmail").textContent = "-";
  }
});

async function publishPosition(position) {
  if (!tracking || !activeBusPath || !auth.currentUser) return;

  const coords = position.coords;

  const data = {
    lat: coords.latitude,
    lng: coords.longitude,
    speed: coords.speed == null
      ? null
      : Math.round(coords.speed * 3.6 * 10) / 10,
    updatedAt: serverTimestamp(),
    status: "active"
  };

  // Serialize writes so slow network requests do not overlap.
  if (updateInProgress) {
    pendingPosition = data;
    return;
  }

  updateInProgress = true;
  let next = data;

  try {
    while (next && tracking && auth.currentUser) {
      pendingPosition = null;

      await update(ref(db, activeBusPath), next);

      connectionStatus.textContent = "Connected — location sent";
      showMessage(dashboardMessage, "Bus location updated successfully.");

      next = pendingPosition;
    }
  } catch (error) {
    pendingPosition = null;
    connectionStatus.textContent = "Update failed";
    showMessage(
      dashboardMessage,
      "Could not send location: " + friendlyError(error)
    );
  } finally {
    updateInProgress = false;
  }
}

function stopLocalTracking() {
  if (gpsWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  gpsWatchId = null;
  tracking = false;
  pendingPosition = null;
  latestPosition = null;

  startButton.disabled = false;
  stopButton.disabled = true;

  trackingStatus.textContent = "Not tracking";
}

startButton.addEventListener("click", async () => {
  if (!authReady || !auth.currentUser) {
    showMessage(dashboardMessage, "Please log in first.");
    return;
  }

  if (!navigator.geolocation) {
    showMessage(
      dashboardMessage,
      "This browser does not support GPS location."
    );
    return;
  }

  if (!window.isSecureContext) {
    showMessage(
      dashboardMessage,
      "GPS requires HTTPS or localhost. Open your hosted HTTPS website."
    );
    return;
  }

  try {
    activeBusPath = getBusPath();
  } catch (error) {
    showMessage(dashboardMessage, error.message);
    return;
  }

  if (tracking) return;

  tracking = true;
  startButton.disabled = true;
  stopButton.disabled = false;

  trackingStatus.textContent = "Waiting for GPS...";
  connectionStatus.textContent = "Waiting for location...";
  showMessage(dashboardMessage, "Requesting GPS permission...");

  gpsWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      if (!tracking) return;

      latestPosition = position;

      coordinates.textContent =
        position.coords.latitude.toFixed(6) + ", " +
        position.coords.longitude.toFixed(6);

      trackingStatus.textContent = "Tracking";
      await publishPosition(position);
    },
    (error) => {
      const messages = {
        1: "Location permission denied. Allow location access in browser settings.",
        2: "GPS position unavailable. Check your device location settings.",
        3: "GPS request timed out. Try again in an area with better reception."
      };

      connectionStatus.textContent = "GPS error";
      showMessage(
        dashboardMessage,
        messages[error.code] || "Could not read the device location."
      );

      // Keep watchPosition active so it may recover if GPS returns.
      trackingStatus.textContent = "Waiting for GPS";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 20000
    }
  );
});

stopButton.addEventListener("click", async () => {
  const path = activeBusPath;

  stopLocalTracking();

  connectionStatus.textContent = "Stopping...";
  showMessage(dashboardMessage, "Stopping live location updates...");

  try {
    if (path && auth.currentUser) {
      await update(ref(db, path), {
        status: "stopped",
        updatedAt: serverTimestamp()
      });
    }

    connectionStatus.textContent = "Tracking stopped";
    showMessage(dashboardMessage, "Live tracking has stopped.");
  } catch (error) {
    connectionStatus.textContent = "Stop update failed";
    showMessage(
      dashboardMessage,
      "GPS stopped on this phone, but Firebase status could not be updated: " +
      friendlyError(error)
    );
  }
});

logoutButton.addEventListener("click", async () => {
  const path = activeBusPath;

  stopLocalTracking();

  try {
    if (path && auth.currentUser) {
      await update(ref(db, path), {
        status: "stopped",
        updatedAt: serverTimestamp()
      });
    }

    await signOut(auth);

    activeBusPath = null;
    showMessage(loginMessage, "You have logged out.");
    showMessage(dashboardMessage, "");
  } catch (error) {
    showMessage(
      dashboardMessage,
      "Logout or status update failed: " + friendlyError(error)
    );
  }
});

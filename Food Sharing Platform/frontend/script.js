
"use strict";

// ==================== STORAGE KEYS ====================

const DEMO_KEY = "foodshare_demo_user";
const DONATION_KEY = "foodshare_demo_donations";
const PICKUP_KEY = "foodshare_demo_pickups";

const API_BASE_URL = "http://127.0.0.1:8000";

// ==================== NAVIGATION & TOAST ====================

function toggleNav() {
  document.getElementById("navLinks")?.classList.toggle("nav-open");
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("sidebar-open");
}

function showToast(message) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("toast-show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("toast-show");
  }, 3200);
}

// ==================== USER STORAGE ====================

function getDemoUser() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function setDemoUser(user) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(user));
}

// ==================== LOGIN ====================

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const role = document.getElementById("loginRole").value;
  const known = getDemoUser();

  const sameUser = known?.email?.toLowerCase() === email.toLowerCase()
    && known?.role === role;

  const user = {
    name: sameUser
      ? known.name
      : (email.split("@")[0].replace(/[._-]/g, " ") || "Demo User"),
    email,
    role,
    city: sameUser ? known.city : "Nagpur"
  };

  // Keep the database ID only for the same registered donor.
  if (role === "donor" && sameUser && known.donor_id) {
    user.donor_id = known.donor_id;
  }

  setDemoUser(user);

  const pages = {
    donor: "donor-dashboard.html",
    ngo: "ngo-dashboard.html",
    admin: "admin-dashboard.html"
  };

  window.location.href = pages[role] || pages.donor;

  return false;
}

// ==================== REGISTRATION ====================

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const role = document.getElementById("regRole").value;
  const city = document.getElementById("regCity").value;

  if (!name || !email) {
    showToast("Please enter your name and email.");
    return false;
  }

  // NGO registration is currently demo-only.
  if (role === "ngo") {
    setDemoUser({
      name,
      email,
      role: "ngo",
      city
    });

    showToast("Demo NGO account created.");

    setTimeout(() => {
      window.location.href = "ngo-dashboard.html";
    }, 500);

    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/donors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        full_name: name,
        email
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = Array.isArray(data.detail)
        ? data.detail.map(item => item.msg).join(", ")
        : data.detail || "Registration failed.";

      showToast(String(message));
      return false;
    }

    setDemoUser({
      name: data.full_name || name,
      email,
      role: "donor",
      city,
      donor_id: data.donor_id
    });

    showToast("Donor registered successfully!");

    setTimeout(() => {
      window.location.href = "donor-dashboard.html";
    }, 500);

  } catch (error) {
    console.error("Donor registration error:", error);

    showToast(
      "Cannot connect to the backend. Check that FastAPI is running."
    );
  }

  return false;
}

// ==================== LOGOUT ====================

function logout() {
  localStorage.removeItem(DEMO_KEY);

  showToast("Logged out of this demo session.");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 450);
}

// ==================== USER DETAILS ====================

function updateUserLabels() {
  const user = getDemoUser();
  const name = user?.name || "Demo Donor";

  document.querySelectorAll("#sideUserName").forEach(element => {
    element.textContent = name;
  });

  const welcome = document.getElementById("donorWelcome");

  if (welcome) {
    welcome.textContent = `Hello, ${name.split(" ")[0]} 👋`;
  }
}

// ==================== HOME LISTING FILTERS ====================

function filterHomeListings() {
  const search = (
    document.getElementById("listingSearch")?.value || ""
  ).toLowerCase();

  const city = document.getElementById("cityFilter")?.value || "";
  const category = document.getElementById("categoryFilter")?.value || "";

  document.querySelectorAll("#homeListings .food-card").forEach(card => {
    const matches =
      (!search ||
        (card.dataset.search || "").toLowerCase().includes(search) ||
        card.textContent.toLowerCase().includes(search)) &&
      (!city || card.dataset.city === city) &&
      (!category || card.dataset.category === category);

    card.style.display = matches ? "" : "none";
  });
}

function filterNgoListings() {
  const search = (
    document.getElementById("ngoSearch")?.value || ""
  ).toLowerCase();

  const city = document.getElementById("ngoCity")?.value || "";
  const category = document.getElementById("ngoCategory")?.value || "";

  document.querySelectorAll("#ngoListings .food-card").forEach(card => {
    const matches =
      (!search ||
        (card.dataset.search || "").toLowerCase().includes(search) ||
        card.textContent.toLowerCase().includes(search)) &&
      (!city || card.dataset.city === city) &&
      (!category || card.dataset.category === category);

    card.style.display = matches ? "" : "none";
  });
}

// ==================== DONATION STORAGE ====================

function getDonations() {
  try {
    const data = JSON.parse(localStorage.getItem(DONATION_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// ==================== CREATE DONATION ====================

async function submitDonation(event) {
  event.preventDefault();

  const user = getDemoUser();

  if (!user || user.role !== "donor" || !user.donor_id) {
    showToast(
      "Please register your donor account through the backend first."
    );
    return false;
  }

  const foodName = document.getElementById("foodName").value.trim();
  const foodCategory = document.getElementById("foodCategory").value;
  const quantityKg = Number(
    document.getElementById("foodQuantity").value
  );
  const pickupDeadline = document.getElementById("pickupDeadline").value;
  const preparedAt = document.getElementById("preparedAt")?.value || "";
  const foodSource = document.getElementById("foodSource")?.value || null;
  const foodNotes = document.getElementById("foodNotes")?.value.trim() || "";
  const foodSafetyConfirmed = Boolean(document.getElementById("foodSafety")?.checked);
  const city = document.getElementById("foodCity").value;
  const area = document.getElementById("foodArea").value.trim();
  const address = document.getElementById("foodAddress").value.trim();

  const latitudeValue = document.getElementById("pickupLat").value;
  const longitudeValue = document.getElementById("pickupLng").value;

  if (!foodName || !foodCategory) {
    showToast("Please enter the food name and category.");
    return false;
  }

  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    showToast("Enter a valid quantity in kilograms.");
    return false;
  }

  if (!pickupDeadline || !Number.isFinite(new Date(pickupDeadline).getTime())) {
    showToast("Please enter a valid pickup deadline.");
    return false;
  }

  if (new Date(pickupDeadline).getTime() <= Date.now()) {
    showToast("Pickup deadline must be in the future.");
    return false;
  }

  if (preparedAt && new Date(preparedAt).getTime() > Date.now()) {
    showToast("Preparation date cannot be in the future.");
    return false;
  }

  if (!area || !address) {
    showToast("Please enter the pickup area and address.");
    return false;
  }

  const latitude = latitudeValue === "" ? null : Number(latitudeValue);
  const longitude = longitudeValue === "" ? null : Number(longitudeValue);

  if (
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    showToast("The selected map coordinates are invalid.");
    return false;
  }

  const donationData = {
    donor_id: Number(user.donor_id),
    food_name: foodName,
    food_category: foodCategory,
    quantity_kg: quantityKg,
    pickup_deadline: new Date(pickupDeadline).toISOString(),
    pickup_location: `${address}, ${area}, ${city}`,
    latitude,
    longitude
  };

  try {
    showToast("Saving donation to the database...");

    const response = await fetch(`${API_BASE_URL}/donations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(donationData)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = Array.isArray(result.detail)
        ? result.detail.map(item => item.msg).join(", ")
        : result.detail || "Could not save the donation.";

      throw new Error(String(message));
    }

    if (result.donation_id == null) {
      throw new Error(
        "The server response did not include a donation ID. Check the API response."
      );
    }

    // Cache the successful server record for the existing frontend.
    // The database remains the authoritative source.
    const donations = getDonations();

    donations.push({
      id: result.donation_id,
      donation_id: result.donation_id,
      donor_id: Number(user.donor_id),

      // Field names used by existing dashboard and alert functions.
      name: foodName,
      category: foodCategory,
      area,
      city,
      quantity: `${quantityKg} kg`,
      deadline: pickupDeadline,

      // Additional donation details.
      foodName,
      foodCategory,
      quantity_kg: quantityKg,
      pickupDeadline,
      pickupLocation: donationData.pickup_location,
      latitude,
      longitude,
      status: result.status || "available",
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(DONATION_KEY, JSON.stringify(donations));

    showToast("Donation saved successfully!");

    setTimeout(() => {
      window.location.href = "donor-dashboard.html#donations";
    }, 1000);

  } catch (error) {
    console.error("Donation submission error:", error);

    showToast(
      error.message || "Could not connect to the backend."
    );
  }

  return false;
}

// ==================== DATE & HTML HELPERS ====================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// ==================== DONOR DASHBOARD ====================

function renderDonorDonations() {
  const rows = document.getElementById("donorDonationRows");

  if (!rows) return;

  const donations = getDonations();

  if (!donations.length) return;

  const user = getDemoUser();

  // Show the current donor's cached donations when donor IDs are available.
  const ownDonations = donations.filter(donation =>
    !user?.donor_id ||
    !donation.donor_id ||
    Number(donation.donor_id) === Number(user.donor_id)
  );

  if (!ownDonations.length) return;

  const total = document.getElementById("donorTotal");

  if (total) {
    total.textContent = String(3 + ownDonations.length);
  }

  const newRows = ownDonations.map(donation => {
    const name = donation.name || donation.foodName || "Food donation";
    const category = donation.category || donation.foodCategory || "";
    const location = donation.area
      ? `${donation.area}, ${donation.city || ""}`
      : donation.pickupLocation || "—";
    const quantity = donation.quantity ||
      (donation.quantity_kg != null ? `${donation.quantity_kg} kg` : "—");
    const deadline = donation.deadline || donation.pickupDeadline;
    const status = donation.status || "available";

    return `
      <tr>
        <td>
          <strong>${escapeHTML(name)}</strong>
          <small>${escapeHTML(category)}</small>
        </td>
        <td>${escapeHTML(location)}</td>
        <td>${escapeHTML(quantity)}</td>
        <td>${formatDate(deadline)}</td>
        <td>
          <span class="status ${
            /completed|picked up/i.test(status)
              ? "status-green"
              : "status-pending"
          }">${escapeHTML(status)}</span>
        </td>
      </tr>
    `;
  }).join("");

  // Avoid inserting the same cached donations repeatedly.
  const existingIds = new Set(
    Array.from(rows.querySelectorAll("[data-donation-id]"))
      .map(row => row.dataset.donationId)
  );

  const fragment = document.createElement("tbody");
  fragment.innerHTML = newRows;

  const tableRows = Array.from(fragment.querySelectorAll("tr"));

  tableRows.forEach((row, index) => {
    const donation = ownDonations[index];
    row.dataset.donationId = String(
      donation.donation_id ?? donation.id ?? ""
    );
  });

  const freshRows = tableRows.filter(row =>
    !existingIds.has(row.dataset.donationId)
  );

  freshRows.reverse().forEach(row => rows.prepend(row));
}

// ==================== NGO PICKUP REQUESTS: DEMO ====================

function requestPickup(button, name) {
  button.disabled = true;
  button.textContent = "Requested ✓";
  button.classList.add("btn-muted");

  let pickups = [];

  try {
    pickups = JSON.parse(localStorage.getItem(PICKUP_KEY) || "[]");
    if (!Array.isArray(pickups)) pickups = [];
  } catch (error) {
    pickups = [];
  }

  pickups.unshift({
    name,
    city: button.closest(".food-card")?.dataset.city || "Local area",
    status: "Pickup requested"
  });

  localStorage.setItem(PICKUP_KEY, JSON.stringify(pickups));

  const rows = document.getElementById("ngoPickupRows");

  if (rows) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <strong>${escapeHTML(name)}</strong>
        <small>Demo request</small>
      </td>
      <td>${escapeHTML(pickups[0].city)}</td>
      <td><span class="status status-pending">Pickup requested</span></td>
      <td>
        <button class="table-action" onclick="advancePickup(this)">
          Schedule pickup
        </button>
      </td>
    `;

    rows.prepend(row);
  }

  const count = document.getElementById("ngoActiveCount");

  if (count) {
    count.textContent = String(Number(count.textContent || 0) + 1);
  }

  showToast(`Demo pickup request added for ${name}.`);
}

function advancePickup(button) {
  const cell = button.closest("tr")?.querySelector("td:nth-child(3)");

  if (!cell) return;

  const current = cell.textContent.trim().toLowerCase();

  if (current.includes("scheduled")) {
    cell.innerHTML = '<span class="status status-green">Picked up</span>';
    button.textContent = "Completed";
    button.disabled = true;
    showToast("Demo status updated: picked up.");
  } else if (current.includes("requested")) {
    cell.innerHTML = '<span class="status status-blue">Pickup scheduled</span>';
    button.textContent = "Mark picked up";
    showToast("Demo pickup scheduled.");
  } else {
    cell.innerHTML = '<span class="status status-green">Picked up</span>';
    button.disabled = true;
    showToast("Demo status updated.");
  }
}

// ==================== ADMIN DEMO ACTIONS ====================

function reviewNgo(button, decision) {
  const row = button.closest("tr");

  if (!row) return;

  const status = row.querySelector(".status");

  if (status) {
    status.className = "status " +
      (decision === "approved" ? "status-green" : "status-rejected");

    status.textContent = decision === "approved"
      ? "Approved (demo)"
      : "Rejected (demo)";
  }

  row.querySelectorAll("button").forEach(item => {
    item.disabled = true;
  });

  const count = document.getElementById("pendingNgoCount");

  if (count) {
    count.textContent = String(
      Math.max(0, Number(count.textContent) - 1)
    );
  }

  showToast(`Organisation marked ${decision} in this demo only.`);
}

function moderateListing(button, decision) {
  const row = button.closest("tr");

  if (!row) return;

  button.textContent = "Reviewed ✓";
  button.disabled = true;
  button.classList.add("btn-muted");

  row.style.opacity = ".7";

  showToast("Listing marked reviewed in demo mode.");
}

// ==================== PAGE INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  updateUserLabels();
  renderDonorDonations();
  renderExpiryAlerts();
  renderPickupHistory();

  if (document.getElementById("pickupMap")) {
    initPickupMap();

    document.getElementById("foodCity")?.addEventListener(
      "change",
      resetDemoMap
    );
  }

  if (document.getElementById("ngoMatchMap")) {
    renderLiveMatchMap();
  }
});

// ==================== MAPS & LOCATION ====================

let pickupMapInstance = null;
let pickupMarker = null;
let ngoMapInstance = null;

const demoPlaces = {
  Nagpur: {
    donor: [21.1458, 79.0882],
    ngos: [
      {
        name: "Seva Community Kitchen",
        lat: 21.1491,
        lng: 79.0808,
        capacity: 30,
        area: "Dhantoli"
      },
      {
        name: "Anna Mitra Network",
        lat: 21.1325,
        lng: 79.0957,
        capacity: 50,
        area: "Sitabuldi"
      },
      {
        name: "Helping Hands Nagpur",
        lat: 21.1612,
        lng: 79.0725,
        capacity: 20,
        area: "Civil Lines"
      }
    ]
  },

  Indore: {
    donor: [22.7196, 75.8577],
    ngos: [
      {
        name: "Helping Hands Collective",
        lat: 22.7254,
        lng: 75.8831,
        capacity: 40,
        area: "Vijay Nagar"
      },
      {
        name: "Annapurna Community Support",
        lat: 22.7048,
        lng: 75.8512,
        capacity: 25,
        area: "Palasia"
      },
      {
        name: "Sahyog Food Network",
        lat: 22.7352,
        lng: 75.8419,
        capacity: 60,
        area: "Rajendra Nagar"
      }
    ]
  }
};

function setMapStatus(message) {
  const element = document.getElementById("mapStatus");

  if (element) {
    element.textContent = message;
  }
}

function initPickupMap() {
  const element = document.getElementById("pickupMap");

  if (!element || !window.L || pickupMapInstance) return;

  const city = document.getElementById("foodCity")?.value || "Nagpur";
  const center = demoPlaces[city]?.donor || demoPlaces.Nagpur.donor;

  pickupMapInstance = L.map(element).setView(center, 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(pickupMapInstance);

  pickupMapInstance.on("click", event => {
    setPickupPoint(
      event.latlng.lat,
      event.latlng.lng,
      "Map point selected"
    );
  });

  setTimeout(() => {
    pickupMapInstance?.invalidateSize();
  }, 250);
}

function setPickupPoint(lat, lng, source) {
  const latInput = document.getElementById("pickupLat");
  const lngInput = document.getElementById("pickupLng");

  if (latInput) latInput.value = lat.toFixed(6);
  if (lngInput) lngInput.value = lng.toFixed(6);

  if (pickupMapInstance && window.L) {
    if (pickupMarker) {
      pickupMarker.setLatLng([lat, lng]);
    } else {
      pickupMarker = L.marker([lat, lng]).addTo(pickupMapInstance);
    }

    pickupMapInstance.setView([lat, lng], 15);
  }

  setMapStatus(
    `${source}: ${lat.toFixed(5)}, ${lng.toFixed(5)} (approximate pickup point).`
  );
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast(
      "Location is not supported. Enter the pickup address manually."
    );
    return;
  }

  showToast("Requesting location permission...");

  navigator.geolocation.getCurrentPosition(
    position => {
      setPickupPoint(
        position.coords.latitude,
        position.coords.longitude,
        "Current browser location selected"
      );
    },
    () => {
      setMapStatus(
        "Location permission unavailable. Select a map point or enter the address manually."
      );

      showToast(
        "Could not access location. Manual address entry is still available."
      );
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

function resetDemoMap() {
  const city = document.getElementById("foodCity")?.value || "Nagpur";
  const center = demoPlaces[city]?.donor || demoPlaces.Nagpur.donor;

  if (pickupMapInstance) {
    pickupMapInstance.setView(center, 13);
  }

  if (pickupMarker && pickupMapInstance) {
    pickupMapInstance.removeLayer(pickupMarker);
    pickupMarker = null;
  }

  const latitude = document.getElementById("pickupLat");
  const longitude = document.getElementById("pickupLng");

  if (latitude) latitude.value = "";
  if (longitude) longitude.value = "";

  setMapStatus(
    "Map location cleared. Choose a point or enter the address manually."
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const radians = value => value * Math.PI / 180;

  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(
    Math.sqrt(value),
    Math.sqrt(1 - value)
  );
}

// ==================== DEMO NGO MATCHING ====================

function renderMatches() {
  const results = document.getElementById("matchResults");

  if (!results) return;

  const city = document.getElementById("matchCity")?.value || "Nagpur";
  const capacity = Number(
    document.getElementById("matchCapacity")?.value || 25
  );

  const places = demoPlaces[city] || demoPlaces.Nagpur;

  const ranked = places.ngos
    .map(ngo => ({
      ...ngo,
      distance: haversineKm(
        places.donor[0],
        places.donor[1],
        ngo.lat,
        ngo.lng
      )
    }))
    .map(ngo => ({
      ...ngo,
      fit: ngo.capacity >= capacity
        ? "Good capacity fit"
        : "Limited capacity",
      score: ngo.distance + (ngo.capacity >= capacity ? 0 : 8)
    }))
    .sort((a, b) => a.score - b.score);

  results.innerHTML = ranked.map((ngo, index) => `
    <article class="match-card">
      <strong>${escapeHTML(ngo.name)}</strong>
      <span class="tag ${
        ngo.capacity >= capacity ? "tag-green" : "tag-orange"
      }">
        ${index === 0 ? "Top match" : ngo.fit} ·
        ${ngo.distance.toFixed(1)} km
      </span>
      <p>
        Sample NGO · ${escapeHTML(city)} · ${escapeHTML(ngo.area)}
        · Capacity: ${ngo.capacity} portions
      </p>
      <p>
        ${
          ngo.capacity >= capacity
            ? "Capacity appears suitable for this demo request."
            : "Consider a smaller quantity or another NGO."
        }
      </p>
    </article>
  `).join("");

  if (window.L && document.getElementById("ngoMatchMap")) {
    if (!ngoMapInstance) {
      ngoMapInstance = L.map("ngoMatchMap").setView(places.donor, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(ngoMapInstance);
    }

    ngoMapInstance.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        ngoMapInstance.removeLayer(layer);
      }
    });

    L.marker(places.donor)
      .addTo(ngoMapInstance)
      .bindPopup("Sample donation area");

    ranked.forEach(ngo => {
      L.marker([ngo.lat, ngo.lng])
        .addTo(ngoMapInstance)
        .bindPopup(`${ngo.name} · ${ngo.distance.toFixed(1)} km`);
    });

    ngoMapInstance.setView(places.donor, 13);

    setTimeout(() => {
      ngoMapInstance?.invalidateSize();
    }, 150);
  }
}

// ==================== EXPIRY ALERTS ====================

function renderExpiryAlerts() {
  const target = document.getElementById("donorAlerts");

  if (!target) return;

  const donations = getDonations();
  const now = Date.now();

  const urgent = donations.filter(donation => {
    const deadline = donation.deadline || donation.pickupDeadline;

    return deadline &&
      new Date(deadline).getTime() > now &&
      new Date(deadline).getTime() - now < 6 * 60 * 60 * 1000;
  });

  const expired = donations.filter(donation => {
    const deadline = donation.deadline || donation.pickupDeadline;
    const status = donation.status || "";

    return deadline &&
      new Date(deadline).getTime() <= now &&
      !/completed|picked up|cancelled/i.test(status);
  });

  const cards = [];

  urgent.forEach(donation => {
    cards.push(`
      <div class="alert-item alert-warn">
        <span>⏰</span>
        <div>
          <strong>
            Pickup deadline coming up:
            ${escapeHTML(donation.name || donation.foodName || "Food donation")}
          </strong>
          <p>
            Deadline: ${formatDate(donation.deadline || donation.pickupDeadline)}.
            Confirm collection arrangements.
          </p>
        </div>
      </div>
    `);
  });

  expired.forEach(donation => {
    cards.push(`
      <div class="alert-item alert-warn">
        <span>⚠️</span>
        <div>
          <strong>
            Deadline passed:
            ${escapeHTML(donation.name || donation.foodName || "Food donation")}
          </strong>
          <p>Update or close this listing so NGOs have accurate information.</p>
        </div>
      </div>
    `);
  });

  if (!cards.length) {
    cards.push(`
      <div class="alert-item">
        <span>🔔</span>
        <div>
          <strong>No urgent demo alerts</strong>
          <p>
            Local reminders appear when a saved listing is close
            to its pickup deadline.
          </p>
        </div>
      </div>
    `);
  }

  target.innerHTML = cards.join("");
}

// ==================== PICKUP HISTORY ====================

function renderPickupHistory() {
  const rows = document.getElementById("ngoPickupRows");

  if (!rows) return;

  let pickups = [];

  try {
    pickups = JSON.parse(localStorage.getItem(PICKUP_KEY) || "[]");

    if (!Array.isArray(pickups)) pickups = [];
  } catch (error) {
    pickups = [];
  }

  if (!pickups.length) return;

  rows.innerHTML = pickups.map(pickup => `
    <tr>
      <td>
        <strong>${escapeHTML(pickup.name)}</strong>
        <small>Demo request</small>
      </td>
      <td>${escapeHTML(pickup.city || "Local area")}</td>
      <td>
        <span class="status ${
          /picked up|completed/i.test(pickup.status)
            ? "status-green"
            : /scheduled/i.test(pickup.status)
              ? "status-blue"
              : "status-pending"
        }">${escapeHTML(pickup.status)}</span>
      </td>
      <td>
        <button class="table-action" onclick="advancePickup(this)">
          Update status
        </button>
      </td>
    </tr>
  `).join("");
}


// Live map rendering uses only records returned by the API; no demo coordinates are inserted.
async function renderLiveMatchMap() {
  const target = document.getElementById("ngoMatchMap");
  if (!target) return;
  try {
    const donations = await apiRequest("/donations");
    const withCoords = donations.filter(d => d.latitude !== null && d.longitude !== null && Number.isFinite(Number(d.latitude)) && Number.isFinite(Number(d.longitude)));
    const results = document.getElementById("matchResults");
    if (results) {
      const recommendationGroups = await Promise.all(donations.slice(0, 20).map(async d => {
        try { return { donation: d, result: await apiRequest(`/donations/${Number(d.id)}/matches`) }; }
        catch (error) { return { donation: d, error: error.message }; }
      }));
      const cards = recommendationGroups.flatMap(group => (group.result?.matches || []).slice(0, 2).map(match => `<article class="match-card"><strong>${escapeHTML(match.organization_name)}</strong><span class="tag tag-green">${Number(match.distance_km).toFixed(1)} km · ${Number(match.match_score).toFixed(0)} score</span><p>${escapeHTML(group.donation.food_name)} · ${Number(group.donation.quantity_kg)} kg · ${escapeHTML(group.donation.pickup_location)}</p></article>`));
      results.innerHTML = cards.length ? cards.join("") : '<p>No eligible matches yet. Check that available donations have coordinates and a future deadline, and that NGOs are verified with enough capacity.</p>';
    }
    if (!window.L) { target.textContent = "Map library unavailable. Use the live matching recommendations and donation listings below."; return; }
    if (!withCoords.length) { target.textContent = "No available donations have map coordinates yet."; return; }
    if (ngoMapInstance) { ngoMapInstance.remove(); ngoMapInstance = null; }
    const first = withCoords[0];
    ngoMapInstance = L.map(target).setView([Number(first.latitude), Number(first.longitude)], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(ngoMapInstance);
    withCoords.forEach(d => L.marker([Number(d.latitude), Number(d.longitude)]).addTo(ngoMapInstance).bindPopup(`${escapeHTML(d.food_name)} · ${Number(d.quantity_kg)} kg`));
  } catch (error) { target.textContent = `Could not load live map: ${error.message}`; }
}

// ==================== LIVE API INTEGRATION ====================

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getDemoUser()?.access_token ? { Authorization: `Bearer ${getDemoUser().access_token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map(item => item.msg).join(", ")
      : payload.detail;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return payload;
}

function normalizeDonation(item) {
  return {
    ...item,
    id: item.id ?? item.donation_id,
    donation_id: item.id ?? item.donation_id,
    name: item.food_name ?? item.name ?? "Food donation",
    category: item.food_category ?? item.category ?? "",
    quantity: `${item.quantity_kg ?? item.quantity ?? "—"} kg`,
    deadline: item.pickup_deadline ?? item.deadline,
    pickupLocation: item.pickup_location ?? item.pickupLocation ?? "—",
    status: item.status ?? "available"
  };
}

async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const role = document.getElementById("regRole").value;
  const city = document.getElementById("regCity").value;
  const password = document.getElementById("regPassword").value;
  const organizationName = document.getElementById("regOrganization")?.value.trim();
  const capacityKg = Number(document.getElementById("regCapacity")?.value || 50);
  const foodCategories = document.getElementById("regCategories")?.value.trim();
  const latitudeRaw = document.getElementById("regLatitude")?.value;
  const longitudeRaw = document.getElementById("regLongitude")?.value;
  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if (role === "ngo" && (!organizationName || !Number.isFinite(capacityKg) || capacityKg <= 0 || !foodCategories)) {
    showToast("Enter the NGO name, a positive collection capacity, and accepted food categories.");
    return false;
  }
  if (password.length < 8) {
    showToast("Use a password with at least 8 characters.");
    return false;
  }

  try {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: name, email, password, role, city,
        ...(role === "ngo" ? { organization_name: organizationName, capacity_kg: capacityKg, food_categories: foodCategories, latitude, longitude } : {})
      })
    });
    setDemoUser({
      name: data.full_name,
      email: data.email,
      role: data.role,
      city,
      user_id: data.user_id,
      donor_id: data.donor_id,
      ngo_id: data.ngo_id,
      access_token: data.access_token
    });
    showToast("Account created successfully.");
    setTimeout(() => {
      window.location.href = role === "ngo" ? "ngo-dashboard.html" : "donor-dashboard.html";
    }, 450);
  } catch (error) {
    console.error("Registration error:", error);
    showToast(error.message || "Could not register. Check the backend.");
  }
  return false;
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const role = document.getElementById("loginRole").value;

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role })
    });
    setDemoUser({
      name: data.name,
      email: data.email,
      role: data.role,
      user_id: data.user_id,
      donor_id: data.donor_id,
      ngo_id: data.ngo_id,
      access_token: data.access_token
    });
    window.location.href = role === "admin" ? "admin-dashboard.html" : role === "ngo" ? "ngo-dashboard.html" : "donor-dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    showToast(error.message || "Login failed.");
  }
  return false;
}

async function submitDonation(event) {
  event.preventDefault();
  const user = getDemoUser();
  if (!user || user.role !== "donor" || !user.donor_id) {
    showToast("Please log in with a registered donor account first.");
    return false;
  }

  const foodName = document.getElementById("foodName").value.trim();
  const foodCategory = document.getElementById("foodCategory").value;
  const quantityKg = Number(document.getElementById("foodQuantity").value);
  const pickupDeadline = document.getElementById("pickupDeadline").value;
  const preparedAt = document.getElementById("preparedAt")?.value || "";
  const foodSource = document.getElementById("foodSource")?.value || null;
  const foodNotes = document.getElementById("foodNotes")?.value.trim() || "";
  const foodSafetyConfirmed = Boolean(document.getElementById("foodSafety")?.checked);
  const city = document.getElementById("foodCity").value;
  const area = document.getElementById("foodArea").value.trim();
  const address = document.getElementById("foodAddress").value.trim();
  const latValue = document.getElementById("pickupLat").value;
  const lngValue = document.getElementById("pickupLng").value;

  if (!foodName || !foodCategory || !Number.isFinite(quantityKg) || quantityKg <= 0) {
    showToast("Enter a food name, category, and valid positive quantity.");
    return false;
  }
  if (!pickupDeadline || new Date(pickupDeadline).getTime() <= Date.now()) {
    showToast("Pickup deadline must be in the future.");
    return false;
  }
  if (preparedAt && new Date(preparedAt).getTime() > Date.now()) {
    showToast("Preparation date cannot be in the future.");
    return false;
  }
  if (!area || !address) {
    showToast("Enter the pickup area and address.");
    return false;
  }

  const latitude = latValue === "" ? null : Number(latValue);
  const longitude = lngValue === "" ? null : Number(lngValue);
  if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    showToast("Pickup coordinates are invalid.");
    return false;
  }

  try {
    const result = await apiRequest("/donations", {
      method: "POST",
      body: JSON.stringify({
        donor_id: Number(user.donor_id),
        food_name: foodName,
        food_category: foodCategory,
        quantity_kg: quantityKg,
        pickup_deadline: new Date(pickupDeadline).toISOString(),
        pickup_location: `${address}, ${area}, ${city}`,
        latitude,
        longitude,
        description: foodNotes || null,
        food_source: foodSource,
        prepared_at: preparedAt ? new Date(preparedAt).toISOString() : null,
        storage_notes: foodNotes || null,
        food_safety_confirmed: foodSafetyConfirmed
      })
    });
    showToast(`Donation #${result.donation_id} saved to MySQL.`);
    document.getElementById("donationForm").reset();
    setTimeout(() => window.location.href = "donor-dashboard.html#donations", 650);
  } catch (error) {
    console.error("Donation submission error:", error);
    showToast(error.message || "Could not save the donation.");
  }
  return false;
}

async function renderDonorDonations() {
  const rows = document.getElementById("donorDonationRows");
  if (!rows) return;
  const user = getDemoUser();
  if (!user?.donor_id) {
    rows.innerHTML = '<tr><td colspan="5">Log in with a registered donor account to view your donations.</td></tr>';
    return;
  }
  rows.innerHTML = '<tr><td colspan="5">Loading donations from database…</td></tr>';
  try {
    const data = await apiRequest(`/donors/${Number(user.donor_id)}/donations`);
    const donations = (data.donations || []).map(normalizeDonation);
    const total = document.getElementById("donorTotal");
    if (total) total.textContent = String(donations.length);
    const completed = document.getElementById("donorCompleted");
    if (completed) completed.textContent = String(donations.filter(d => d.status === "completed").length);
    if (!donations.length) {
      rows.innerHTML = '<tr><td colspan="5">No donations yet. Create your first donation.</td></tr>';
      return;
    }
    rows.innerHTML = donations.map(d => `
      <tr>
        <td><strong>${escapeHTML(d.food_name)}</strong><small>${escapeHTML(d.food_category)}</small></td>
        <td>${escapeHTML(d.pickup_location)}</td>
        <td>${escapeHTML(d.quantity_kg)} kg</td>
        <td>${escapeHTML(formatDate(d.pickup_deadline))}</td>
        <td><span class="status ${d.status === "completed" ? "status-green" : ["picked_up", "accepted"].includes(d.status) ? "status-blue" : d.status === "cancelled" ? "status-orange" : "status-pending"}">${escapeHTML(d.status)}</span>${d.status === "available" ? ` <button class="table-action danger-action" onclick="cancelDonation(${Number(d.id)})">Cancel</button>` : ""}</td>
      </tr>`).join("");
    localStorage.setItem(DONATION_KEY, JSON.stringify(donations));
  } catch (error) {
    console.error("Donor dashboard load failed:", error);
    rows.innerHTML = `<tr><td colspan="5">Could not load donations: ${escapeHTML(error.message)}</td></tr>`;
  }
}

async function renderNgoLiveData() {
  const listing = document.getElementById("ngoListings");
  const pickupRows = document.getElementById("ngoPickupRows");
  const user = getDemoUser();
  if (listing) {
    listing.innerHTML = '<p>Loading available donations…</p>';
    try {
      const donations = (await apiRequest("/donations")).map(normalizeDonation)
        .filter(d => d.status === "available" && new Date(d.pickup_deadline).getTime() > Date.now());
      const count = document.getElementById("ngoAvailableCount");
      if (count) count.textContent = String(donations.length);
      listing.innerHTML = donations.length ? donations.map(d => `
        <article class="food-card" data-city="${escapeHTML((d.pickup_location || "").split(",").slice(-1)[0].trim())}" data-category="${escapeHTML(d.food_category)}" data-search="${escapeHTML(`${d.food_name} ${d.pickup_location}`.toLowerCase())}">
          <div class="food-card-body">
            <div class="card-topline"><span class="tag tag-green">${escapeHTML(d.food_category)}</span><span class="time-left">${escapeHTML(formatDate(d.pickup_deadline))}</span></div>
            <h3>${escapeHTML(d.food_name)}</h3>
            <p class="location">⌖ ${escapeHTML(d.pickup_location)}</p>
            <div class="food-meta"><span>${escapeHTML(d.quantity_kg)} kg</span><span>Donation #${d.id}</span></div>
            <button class="btn btn-primary btn-full" onclick="requestPickup(this, ${Number(d.id)}, '${escapeHTML(d.food_name).replace(/'/g, "\\\\'")}')">Accept donation</button>
          </div>
        </article>`).join("") : '<p>No currently available donations found.</p>';
    } catch (error) {
      console.error("NGO listings failed:", error);
      listing.innerHTML = `<p>Could not load listings: ${escapeHTML(error.message)}</p>`;
    }
  }

  if (pickupRows) {
    if (!user?.ngo_id) {
      pickupRows.innerHTML = '<tr><td colspan="4">Log in with a registered NGO account to see accepted donations.</td></tr>';
      return;
    }
    pickupRows.innerHTML = '<tr><td colspan="4">Loading your accepted donations…</td></tr>';
    try {
      const result = await apiRequest(`/ngos/${Number(user.ngo_id)}/donations`);
      const items = result.donations || [];
      const count = document.getElementById("ngoActiveCount");
      if (count) count.textContent = String(items.filter(d => !["completed", "cancelled"].includes(d.status)).length);
      const completedCount = document.getElementById("ngoCompletedCount");
      if (completedCount) completedCount.textContent = String(items.filter(d => d.status === "completed").length);
      pickupRows.innerHTML = items.length ? items.map(d => {
        const next = d.status === "accepted" ? "picked_up" : d.status === "picked_up" ? "completed" : "";
        const label = next === "picked_up" ? "Mark picked up" : next === "completed" ? "Mark completed" : "Completed";
        return `<tr>
          <td><strong>${escapeHTML(d.food_name)}</strong><small>Donation #${Number(d.id)}</small></td>
          <td>${escapeHTML(d.pickup_location)}</td>
          <td><span class="status ${d.status === "completed" ? "status-green" : "status-blue"}">${escapeHTML(d.status)}</span></td>
          <td>${next ? `<button class="table-action" onclick="advancePickup(this, ${Number(d.id)}, '${next}')">${label}</button>` : "—"}</td>
        </tr>`;
      }).join("") : '<tr><td colspan="4">You have not accepted any donations yet.</td></tr>';
    } catch (error) {
      console.error("NGO accepted donations failed:", error);
      pickupRows.innerHTML = `<tr><td colspan="4">Could not load accepted donations: ${escapeHTML(error.message)}</td></tr>`;
    }
  }
}

async function requestPickup(button, donationId, name) {
  const user = getDemoUser();
  if (!Number.isInteger(Number(donationId)) || !user?.ngo_id) {
    showToast("Log in with a registered NGO account to accept a live donation.");
    return;
  }
  button.disabled = true;
  try {
    await apiRequest(`/donations/${Number(donationId)}/accept`, {
      method: "POST",
      body: JSON.stringify({ ngo_id: Number(user.ngo_id) })
    });
    showToast(`${name || "Donation"} accepted successfully.`);
    await renderNgoLiveData();
  } catch (error) {
    button.disabled = false;
    showToast(error.message || "Could not accept this donation.");
  }
}

async function advancePickup(button, donationId, nextStatus) {
  if (!Number.isInteger(Number(donationId)) || !nextStatus) {
    showToast("This is a sample row. Live status updates require a database donation.");
    return;
  }
  button.disabled = true;
  try {
    await apiRequest(`/donations/${Number(donationId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });
    showToast(`Donation status updated to ${nextStatus}.`);
    await renderNgoLiveData();
  } catch (error) {
    button.disabled = false;
    showToast(error.message || "Could not update status.");
  }
}

async function cancelDonation(donationId) {
  if (!confirm("Cancel this available donation? This cannot be undone from the donor dashboard.")) return;
  try {
    await apiRequest(`/donations/${Number(donationId)}/status`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
    showToast("Donation cancelled.");
    await renderDonorDonations();
  } catch (error) { showToast(error.message || "Could not cancel donation."); }
}

async function renderPickupHistory() {
  if (document.getElementById("ngoListings") || document.getElementById("ngoPickupRows")) {
    await renderNgoLiveData();
  }
}

async function renderExpiryAlerts() {
  const target = document.getElementById("donorAlerts");
  if (!target) return;
  const user = getDemoUser();
  if (!user?.donor_id || !user.access_token) { target.innerHTML = '<p>Log in to view your pickup reminders.</p>'; return; }
  try {
    const data = await apiRequest(`/donors/${Number(user.donor_id)}/donations`);
    const now = Date.now();
    const upcoming = (data.donations || []).filter(d => d.status === "available" && new Date(d.pickup_deadline).getTime() > now && new Date(d.pickup_deadline).getTime() - now < 24 * 60 * 60 * 1000);
    target.innerHTML = upcoming.length ? upcoming.map(d => `<div class="alert-item alert-warn"><span>⏰</span><div><strong>${escapeHTML(d.food_name)} pickup deadline</strong><p>${escapeHTML(formatDate(d.pickup_deadline))} · Make sure the collection can be completed in time.</p></div></div>`).join("") : '<div class="alert-item"><span>🔔</span><div><strong>No urgent pickup deadlines</strong><p>Available donations due within the next 24 hours will appear here.</p></div></div>';
  } catch (error) { target.textContent = `Could not load reminders: ${error.message}`; }
}

async function loadImpactStats() {
  if (!document.body.contains(document.querySelector("#impactStats"))) return;
  const target = document.getElementById("impactStats");
  try {
    const stats = await apiRequest("/stats");
    target.innerHTML = `
      <article class="stat-card"><small>Total donations</small><strong>${Number(stats.total_donations)}</strong></article>
      <article class="stat-card"><small>Completed donations</small><strong>${Number(stats.completed_donations)}</strong></article>
      <article class="stat-card"><small>Food redistributed</small><strong>${Number(stats.food_redistributed_kg)} kg</strong></article>
      <article class="stat-card"><small>Registered NGOs</small><strong>${Number(stats.registered_ngos)}</strong></article>`;
  } catch (error) {
    target.textContent = `Could not load live impact statistics: ${error.message}`;
  }
}

async function renderAdminDashboard() {
  const body = document.getElementById("adminNgoRows");
  if (!body) return;
  const user = getDemoUser();
  if (!user || user.role !== "admin" || !user.access_token) {
    body.innerHTML = '<tr><td colspan="5">Admin login required. Create an admin account using backend/create_admin.py, then log in.</td></tr>';
    return;
  }
  try {
    const data = await apiRequest("/admin/overview");
    const statStrong = document.querySelectorAll(".stat-grid .stat-card strong");
    if (statStrong[0]) statStrong[0].textContent = data.registered_donors;
    if (statStrong[1]) statStrong[1].textContent = data.pending_ngos;
    if (statStrong[2]) statStrong[2].textContent = data.available_donations;
    const pending = document.getElementById("pendingNgoCount");
    if (pending) pending.textContent = data.pending_ngos;
    const pendingTag = document.getElementById("pendingNgoTag");
    if (pendingTag) pendingTag.textContent = `${data.pending_ngos} pending`;
    body.innerHTML = data.ngos.length ? data.ngos.map(ngo => `<tr><td><strong>${escapeHTML(ngo.organization_name)}</strong><small>NGO #${Number(ngo.id)}</small></td><td>Coordinates/profile on file</td><td>Capacity: ${Number(ngo.capacity_kg || 0)} kg</td><td><span class="status ${ngo.is_verified ? "status-green" : "status-pending"}">${ngo.is_verified ? "Verified" : "Pending"}</span></td><td>${ngo.is_verified ? `<button class="table-action danger-action" onclick="setNgoVerification(${Number(ngo.id)}, false)">Revoke</button>` : `<button class="table-action" onclick="setNgoVerification(${Number(ngo.id)}, true)">Approve</button>`}</td></tr>`).join("") : '<tr><td colspan="5">No NGO accounts are registered.</td></tr>';
    const modBody = document.querySelector("#moderation tbody");
    if (modBody) modBody.innerHTML = data.donations.length ? data.donations.map(d => `<tr><td><strong>${escapeHTML(d.food_name)}</strong><small>Donation #${Number(d.id)}</small></td><td>Donor #${Number(d.donor_id)}</td><td>${escapeHTML(d.pickup_location)}</td><td>Current status: ${escapeHTML(d.status)}</td><td>${d.status === "cancelled" ? `<button class="table-action" onclick="moderateDonation(${Number(d.id)}, 'restore')">Restore</button>` : ["completed", "picked_up"].includes(d.status) ? "No action" : `<button class="table-action danger-action" onclick="moderateDonation(${Number(d.id)}, 'cancel')">Cancel listing</button>`}</td></tr>`).join("") : '<tr><td colspan="5">No donations are recorded.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="5">Could not load admin data: ${escapeHTML(error.message)}</td></tr>`;
  }
}

async function setNgoVerification(ngoId, isVerified) {
  try {
    await apiRequest(`/admin/ngos/${ngoId}/verification`, { method: "PATCH", body: JSON.stringify({ is_verified: isVerified }) });
    showToast(isVerified ? "NGO verified." : "NGO verification revoked.");
    await renderAdminDashboard();
  } catch (error) { showToast(error.message); }
}

async function moderateDonation(donationId, action) {
  try {
    await apiRequest(`/admin/donations/${donationId}/moderation`, { method: "PATCH", body: JSON.stringify({ action }) });
    showToast("Moderation action saved.");
    await renderAdminDashboard();
  } catch (error) { showToast(error.message); }
}

function requireDashboardRole(role) {
  const user = getDemoUser();
  if (!user || user.role !== role || !user.access_token) {
    showToast(`Please log in with a ${role} account.`);
    window.location.href = "login.html";
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const roleSelect = document.getElementById("regRole");
  const ngoFields = document.getElementById("ngoFields");
  const updateNgoFields = () => { if (ngoFields) ngoFields.hidden = roleSelect?.value !== "ngo"; };
  roleSelect?.addEventListener("change", updateNgoFields);
  updateNgoFields();
  loadImpactStats();
  if (document.getElementById("adminNgoRows")) renderAdminDashboard();
  if (document.getElementById("donorDonationRows")) {
    const user = getDemoUser();
    if (!user || user.role !== "donor" || !user.access_token) {
      document.getElementById("donorDonationRows").innerHTML = '<tr><td colspan="5">Please log in with a donor account to view live records.</td></tr>';
    }
  }
});

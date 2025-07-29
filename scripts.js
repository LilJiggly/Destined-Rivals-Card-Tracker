const searchInput = document.getElementById("searchInput");
const tagFilters = document.getElementById("tagFilters");
const cardsContainer = document.getElementById("cardsContainer");
const themeToggle = document.getElementById("themeToggle");
const ownedCounter = document.getElementById("ownedCounter");
const sortSelect = document.getElementById("sortSelect");
const body = document.body;

// Firebase Auth elements
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const authSection = document.getElementById("authSection");
const userInfo = document.getElementById("userInfo");
const syncStatus = document.getElementById("syncStatus");

// Modal elements
const loginModal = document.getElementById("loginModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const setupForm = document.getElementById("setupForm");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const setupBtn = document.getElementById("setupBtn");
const loginUsernameDisplay = document.getElementById("loginUsernameDisplay");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const resetCredentialsBtn = document.getElementById("resetCredentialsBtn");

let currentUser = null;
let ownedCards = new Map(); // Local cache

// Theme toggle
if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    body.className = themeToggle.checked ? "dark" : "light";
    localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
  });
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  body.className = savedTheme;
  if (themeToggle) {
    themeToggle.checked = savedTheme === "dark";
  }
}

// Firebase Auth functions
// Personal authentication - stores your credentials securely in localStorage
const PERSONAL_CREDENTIALS_KEY = "pokemon_tracker_credentials";

// Modal functions
function showModal() {
  loginModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function hideModal() {
  loginModal.style.display = "none";
  document.body.style.overflow = "auto";
  // Clear form inputs
  usernameInput.value = "";
  passwordInput.value = "";
  loginPasswordInput.value = "";
}

function showSetupForm() {
  modalTitle.textContent = "🎯 Welcome to Your Collection!";
  setupForm.style.display = "flex";
  loginForm.style.display = "none";
  usernameInput.focus();
}

function showLoginForm(username) {
  modalTitle.textContent = `👋 Welcome back, ${username}!`;
  setupForm.style.display = "none";
  loginForm.style.display = "flex";
  loginUsernameDisplay.value = username;
  loginPasswordInput.focus();
}

async function setupPersonalAuth() {
  const credentials = JSON.parse(
    localStorage.getItem(PERSONAL_CREDENTIALS_KEY) || "null"
  );

  if (!credentials) {
    // First time setup - show setup form
    showSetupForm();
    showModal();
  } else {
    // Returning user - show login form
    showLoginForm(credentials.username);
    showModal();
  }
}

async function handleSetup() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || username.length < 3) {
    alert("Please enter a username with at least 3 characters");
    usernameInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    alert("Please enter a password with at least 6 characters");
    passwordInput.focus();
    return;
  }

  setupBtn.disabled = true;
  setupBtn.textContent = "🔄 Setting up...";

  try {
    // Convert username to email format for Firebase
    const email = `${username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}@pokemoncards.local`;

    const { createUserWithEmailAndPassword } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    await createUserWithEmailAndPassword(window.auth, email, password);

    // Store credentials securely for future use
    const credentials = { username, email, password };
    localStorage.setItem(PERSONAL_CREDENTIALS_KEY, JSON.stringify(credentials));

    hideModal();
    // Success message will be handled by auth state change
  } catch (error) {
    alert("Setup failed: " + error.message);
    setupBtn.disabled = false;
    setupBtn.textContent = "🚀 Set Up My Collection";
  }
}

async function handleLogin() {
  const credentials = JSON.parse(
    localStorage.getItem(PERSONAL_CREDENTIALS_KEY) || "null"
  );
  const password = loginPasswordInput.value;

  if (!password) {
    alert("Please enter your password");
    loginPasswordInput.focus();
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "🔄 Signing in...";

  try {
    const { signInWithEmailAndPassword } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    await signInWithEmailAndPassword(window.auth, credentials.email, password);

    // Update stored password if it changed
    if (credentials.password !== password) {
      credentials.password = password;
      localStorage.setItem(
        PERSONAL_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
    }

    hideModal();
  } catch (error) {
    alert("Sign in failed: " + error.message);
    loginBtn.disabled = false;
    loginBtn.textContent = "🔓 Access My Collection";
    loginPasswordInput.focus();
  }
}

function resetCredentials() {
  if (
    confirm(
      "Are you sure you want to reset and start over? This will clear your stored credentials."
    )
  ) {
    localStorage.removeItem(PERSONAL_CREDENTIALS_KEY);
    hideModal();
    showSetupForm();
    showModal();
  }
}

async function signOut() {
  try {
    const { signOut } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    await signOut(window.auth);
  } catch (error) {
    alert("Sign out failed: " + error.message);
  }
}

// Firebase data functions
async function syncOwnedCards() {
  if (!currentUser) return;

  try {
    const { doc, getDoc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );
    const userDoc = doc(window.db, "users", currentUser.uid);
    const docSnap = await getDoc(userDoc);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.ownedCards) {
        // Merge Firebase data with local data
        Object.entries(data.ownedCards).forEach(([cardKey, owned]) => {
          if (owned) {
            ownedCards.set(cardKey, true);
            localStorage.setItem(cardKey, "true");
          }
        });
      }
    }
  } catch (error) {
    console.error("Error syncing owned cards:", error);
  }
}

async function saveOwnedCard(cardKey, owned) {
  if (owned) {
    ownedCards.set(cardKey, true);
  } else {
    ownedCards.delete(cardKey);
  }

  localStorage.setItem(cardKey, owned.toString());

  if (currentUser) {
    try {
      const { doc, setDoc } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      const userDoc = doc(window.db, "users", currentUser.uid);
      const ownedCardsObj = Object.fromEntries(ownedCards);
      await setDoc(userDoc, { ownedCards: ownedCardsObj }, { merge: true });
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    }
  }
}

// Auth state listener
window.addEventListener("load", async () => {
  const { onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
  );

  onAuthStateChanged(window.auth, (user) => {
    currentUser = user;

    if (user) {
      // User is signed in
      authSection.style.display = "none";
      userInfo.style.display = "flex";

      // Show username in sync status
      const credentials = JSON.parse(
        localStorage.getItem(PERSONAL_CREDENTIALS_KEY) || "null"
      );
      if (credentials && credentials.username && syncStatus) {
        syncStatus.textContent = `☁️ ${credentials.username}`;
      }

      syncOwnedCards();
    } else {
      // User is signed out
      authSection.style.display = "flex";
      userInfo.style.display = "none";
      ownedCards.clear();
    }
  });
});

// Event listeners
if (signInBtn) signInBtn.addEventListener("click", setupPersonalAuth);
if (signOutBtn) signOutBtn.addEventListener("click", signOut);

// Modal event listeners
if (closeModal) closeModal.addEventListener("click", hideModal);
if (setupBtn) setupBtn.addEventListener("click", handleSetup);
if (loginBtn) loginBtn.addEventListener("click", handleLogin);
if (resetCredentialsBtn)
  resetCredentialsBtn.addEventListener("click", resetCredentials);

// Close modal when clicking outside
if (loginModal) {
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      hideModal();
    }
  });
}

// Handle Enter key in forms
if (passwordInput) {
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSetup();
    }
  });
}

if (loginPasswordInput) {
  loginPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  });
}

fetch("cards.json")
  .then((res) => res.json())
  .then((cards) => {
    // Collect all unique tags
    const tagSet = new Set();
    cards.forEach((card) => {
      if (Array.isArray(card.tags)) {
        card.tags.forEach((tagArr) => {
          if (Array.isArray(tagArr) && tagArr[0]) tagSet.add(tagArr[0]);
        });
      }
    });

    // Group tags and populate checkboxes
    renderTagFiltersWithGroups(Array.from(tagSet));

    function getSelectedTags() {
      return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
        (cb) => cb.value
      );
    }
    const ownedFilterBtn = document.getElementById("ownedFilterBtn");
    let showOwnedOnly = false;

    if (ownedFilterBtn) {
      ownedFilterBtn.addEventListener("click", () => {
        showOwnedOnly = !showOwnedOnly;
        ownedFilterBtn.textContent = showOwnedOnly
          ? "Show All Cards"
          : "Show Owned Only";
        renderCards(searchInput.value, getSelectedTags());
        ownedFilterBtn.classList.toggle("active", showOwnedOnly);
      });
    }

    function renderCards(filter = "", selectedTags = []) {
      cardsContainer.innerHTML = "";
      let filtered = cards.filter((card) => {
        const cardKey = card.number + "_" + card.name;
        const matchesName =
          card.name && card.name.toLowerCase().includes(filter.toLowerCase());
        const cardTags = Array.isArray(card.tags)
          ? card.tags.map((t) => t[0])
          : [];
        const matchesTags =
          selectedTags.length === 0 ||
          selectedTags.every((tag) => cardTags.includes(tag));
        const matchesOwned =
          !showOwnedOnly || localStorage.getItem(cardKey) === "true";
        return matchesName && matchesTags && matchesOwned;
      });

      // Sort
      if (sortSelect && sortSelect.value === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        filtered.sort((a, b) => a.number - b.number);
      }

      const ownedCount = filtered.filter(
        (card) => localStorage.getItem(card.number + "_" + card.name) === "true"
      ).length;
      if (ownedCounter) {
        ownedCounter.textContent = `Owned: ${ownedCount} / ${filtered.length}`;
      }

      filtered.forEach((card) => {
        const cardKey = card.number + "_" + card.name;
        const div = document.createElement("div");
        div.className = "card";
        const owned = localStorage.getItem(cardKey) === "true";
        if (owned) div.classList.add("owned");

        if (card.imageUrl) {
          const img = document.createElement("img");
          img.src = card.imageUrl;
          img.alt = card.name || "";
          div.appendChild(img);
        }

        const name = document.createElement("p");
        name.textContent = card.name || "No Name";
        div.appendChild(name);

        // Show tags
        if (Array.isArray(card.tags)) {
          const tagsDiv = document.createElement("div");
          tagsDiv.textContent = card.tags.map((t) => t[0]).join(", ");
          div.appendChild(tagsDiv);
        }

        // Card number (e.g., 12/244)
        const numberDiv = document.createElement("div");
        numberDiv.className = "card-number";
        numberDiv.textContent = `${card.number}/182`;
        div.appendChild(numberDiv);

        // Owned indicator
        const ownedMark = document.createElement("span");
        ownedMark.className = "owned-mark";
        ownedMark.textContent = owned ? "✓ Owned" : "Mark as Owned";
        div.appendChild(ownedMark);

        // Make card clickable
        div.tabIndex = 0;
        div.setAttribute("role", "button");
        div.addEventListener("click", async () => {
          const nowOwned = !(localStorage.getItem(cardKey) === "true");
          await saveOwnedCard(cardKey, nowOwned);
          renderCards(filter, selectedTags);
        });
        div.addEventListener("keypress", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            div.click();
          }
        });

        cardsContainer.appendChild(div);
      });
    }

    searchInput.addEventListener("input", () =>
      renderCards(searchInput.value, getSelectedTags())
    );
    tagFilters.addEventListener("change", () =>
      renderCards(searchInput.value, getSelectedTags())
    );
    if (sortSelect) {
      sortSelect.addEventListener("change", () =>
        renderCards(searchInput.value, getSelectedTags())
      );
    }
    renderCards();

    const resetFiltersBtn = document.getElementById("resetFiltersBtn");
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        searchInput.value = "";
        document
          .querySelectorAll(".tag-checkbox")
          .forEach((cb) => (cb.checked = false));
        showOwnedOnly = false;
        if (ownedFilterBtn) {
          ownedFilterBtn.textContent = "Show Owned";
          ownedFilterBtn.classList.remove("active");
        }
        if (sortSelect) sortSelect.value = "number";
        renderCards();
      });
    }
  });

const backToTopBtn = document.getElementById("backToTopBtn");

window.addEventListener("scroll", () => {
  if (window.scrollY > 200) {
    backToTopBtn.style.display = "inline-flex";
  } else {
    backToTopBtn.style.display = "none";
  }
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const TAG_GROUPS = {
  People: [
    "Ethan",
    "Steven",
    "Misty",
    "Marnie",
    "Cynthia",
    "Arven",
    "Team Rocket",
  ],
  CardType: ["EX", "Special Art", "Hyper Rare", "Trainer card", "Mask"],
  // Add more groups as needed
};

function renderTagFiltersWithGroups(allTags) {
  const tagFiltersDiv = document.getElementById("tagFilters");
  tagFiltersDiv.innerHTML = ""; // Clear previous

  // Create groups with available tags
  const groupsToRender = {};
  const usedTags = new Set();

  // First, populate predefined groups with available tags
  Object.entries(TAG_GROUPS).forEach(([groupName, groupTags]) => {
    const availableTags = groupTags.filter((tag) => allTags.includes(tag));
    if (availableTags.length > 0) {
      groupsToRender[groupName] = availableTags;
      availableTags.forEach((tag) => usedTags.add(tag));
    }
  });

  // Add remaining tags to "Other" group
  const otherTags = allTags.filter((tag) => !usedTags.has(tag));
  if (otherTags.length > 0) {
    groupsToRender["Other"] = otherTags;
  }

  // Render groups
  Object.entries(groupsToRender).forEach(([groupName, tags]) => {
    const groupContainer = document.createElement("div");
    groupContainer.className = "tag-group-container";

    const groupTitle = document.createElement("div");
    groupTitle.textContent = groupName;
    groupTitle.className = "tag-group-title";
    groupContainer.appendChild(groupTitle);

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tag-group-tags";

    tags.forEach((tag) => {
      const tagLabel = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag;
      checkbox.className = "tag-checkbox";
      tagLabel.appendChild(checkbox);
      tagLabel.appendChild(document.createTextNode(" " + tag));
      tagsContainer.appendChild(tagLabel);
    });

    groupContainer.appendChild(tagsContainer);
    tagFiltersDiv.appendChild(groupContainer);
  });
}

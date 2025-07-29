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
const saveBtn = document.getElementById("saveBtn");
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
let ownedCards = new Map(); // Firebase data cache
let wishlistCards = new Map(); // Firebase wishlist cache
let firestoreListener = null; // Real-time listener

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
    // First time setup or new device - show setup form
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
  setupBtn.textContent = "🔄 Connecting...";

  // Convert username to email format for Firebase
  const email = `${username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}@pokemoncards.local`;

  try {
    // First try to sign in (existing account)
    const { signInWithEmailAndPassword } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    await signInWithEmailAndPassword(window.auth, email, password);

    // Store credentials for this device
    const credentials = { username, email, password };
    localStorage.setItem(PERSONAL_CREDENTIALS_KEY, JSON.stringify(credentials));

    hideModal();
  } catch (signInError) {
    // If sign in fails, try to create new account
    try {
      const { createUserWithEmailAndPassword } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
      );
      await createUserWithEmailAndPassword(window.auth, email, password);

      // Store credentials for this device
      const credentials = { username, email, password };
      localStorage.setItem(
        PERSONAL_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );

      hideModal();
    } catch (signUpError) {
      alert("Authentication failed: " + signUpError.message);
      setupBtn.disabled = false;
      setupBtn.textContent = "🔐 Access My Collection";
    }
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

// Global variables for cards and functions
let allCards = [];
let getSelectedTags = null;
let filterMode = "all";
let ownedFilterBtn = null;
let wishlistFilterBtn = null;
let unownedFilterBtn = null;

// Firebase real-time listener
function setupFirestoreListener() {
  if (!currentUser || firestoreListener) return;

  import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
    .then((module) => {
      const userDoc = module.doc(window.db, "users", currentUser.uid);

      firestoreListener = module.onSnapshot(
        userDoc,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Clear current data
            ownedCards.clear();
            wishlistCards.clear();

            // Load owned cards from Firebase
            if (data.ownedCards) {
              Object.entries(data.ownedCards).forEach(([cardKey, owned]) => {
                if (owned) {
                  ownedCards.set(cardKey, true);
                }
              });
            }

            // Load wishlist cards from Firebase
            if (data.wishlistCards) {
              Object.entries(data.wishlistCards).forEach(
                ([cardKey, wishlisted]) => {
                  if (wishlisted) {
                    wishlistCards.set(cardKey, true);
                  }
                }
              );
            }

            // Update UI with new data
            renderCards(searchInput?.value || "", getSelectedTags?.() || []);

            // Update sync status
            updateSyncStatus();

            console.log(
              `Real-time update: ${ownedCards.size} owned, ${wishlistCards.size} wishlisted`
            );
          } else {
            // No document exists yet, render with empty data
            renderCards(searchInput?.value || "", getSelectedTags?.() || []);
            updateSyncStatus();
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
        }
      );
    })
    .catch((error) => {
      console.error("Error setting up Firestore listener:", error);
    });
}

function removeFirestoreListener() {
  if (firestoreListener) {
    firestoreListener();
    firestoreListener = null;
  }
}

function updateSyncStatus() {
  if (syncStatus && currentUser) {
    const credentials = JSON.parse(
      localStorage.getItem(PERSONAL_CREDENTIALS_KEY) || "null"
    );
    if (credentials && credentials.username) {
      syncStatus.textContent = `☁️ ${credentials.username} (${ownedCards.size} owned, ${wishlistCards.size} wishlist)`;
    }
  }
}

// Global renderCards function
function renderCards(filter = "", selectedTags = []) {
  if (!allCards.length) return; // Wait for cards to load

  cardsContainer.innerHTML = "";
  let filtered = allCards.filter((card) => {
    const cardKey = card.number + "_" + card.name;
    const matchesName =
      card.name && card.name.toLowerCase().includes(filter.toLowerCase());
    const cardTags = Array.isArray(card.tags) ? card.tags.map((t) => t[0]) : [];
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => cardTags.includes(tag));

    // Filter by ownership status
    const isOwned = ownedCards.has(cardKey);
    const isWishlisted = wishlistCards.has(cardKey);

    let matchesFilter = true;
    if (filterMode === "owned") {
      matchesFilter = isOwned;
    } else if (filterMode === "wishlist") {
      matchesFilter = isWishlisted && !isOwned;
    } else if (filterMode === "unowned") {
      matchesFilter = !isOwned && !isWishlisted;
    }

    return matchesName && matchesTags && matchesFilter;
  });

  // Sort
  if (sortSelect && sortSelect.value === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => a.number - b.number);
  }

  const ownedCount = filtered.filter((card) =>
    ownedCards.has(card.number + "_" + card.name)
  ).length;
  const wishlistCount = filtered.filter(
    (card) =>
      wishlistCards.has(card.number + "_" + card.name) &&
      !ownedCards.has(card.number + "_" + card.name)
  ).length;

  if (ownedCounter) {
    ownedCounter.textContent = `Owned: ${ownedCount} | Wishlist: ${wishlistCount} | Total: ${filtered.length}`;
  }

  filtered.forEach((card) => {
    const cardKey = card.number + "_" + card.name;
    const div = document.createElement("div");
    div.className = "card";
    const owned = ownedCards.has(cardKey);
    const wishlisted = wishlistCards.has(cardKey);

    if (owned) {
      div.classList.add("owned");
    } else if (wishlisted) {
      div.classList.add("wishlisted");
    }

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

    // Status buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "card-buttons";

    // Owned button
    const ownedBtn = document.createElement("button");
    ownedBtn.className = "card-btn owned-btn";
    ownedBtn.textContent = owned ? "✓ Owned" : "Mark as Owned";
    if (owned) ownedBtn.classList.add("active");

    // Wishlist button
    const wishlistBtn = document.createElement("button");
    wishlistBtn.className = "card-btn wishlist-btn";
    wishlistBtn.textContent = wishlisted
      ? "⭐ Wishlisted"
      : "⭐ Add to Wishlist";
    if (wishlisted) wishlistBtn.classList.add("active");

    // Only show wishlist button if not owned
    if (!owned) {
      buttonsContainer.appendChild(wishlistBtn);
    }
    buttonsContainer.appendChild(ownedBtn);

    div.appendChild(buttonsContainer);

    // Button click handlers
    ownedBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const nowOwned = !ownedCards.has(cardKey);

      // Show loading state
      ownedBtn.disabled = true;
      ownedBtn.textContent = nowOwned ? "⏳ Marking..." : "⏳ Removing...";

      const success = await saveOwnedCard(cardKey, nowOwned);

      // Reset button state - the listener will update the UI
      ownedBtn.disabled = false;
      if (!success) {
        // Revert on failure
        ownedBtn.textContent = nowOwned ? "Mark as Owned" : "✓ Owned";
      }
    });

    wishlistBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const nowWishlisted = !wishlistCards.has(cardKey);

      // Show loading state
      wishlistBtn.disabled = true;
      wishlistBtn.textContent = nowWishlisted
        ? "⏳ Adding..."
        : "⏳ Removing...";

      const success = await saveWishlistCard(cardKey, nowWishlisted);

      // Reset button state - the listener will update the UI
      wishlistBtn.disabled = false;
      if (!success) {
        // Revert on failure
        wishlistBtn.textContent = nowWishlisted
          ? "⭐ Add to Wishlist"
          : "⭐ Wishlisted";
      }
    });

    cardsContainer.appendChild(div);
  });
}

async function saveOwnedCard(cardKey, owned) {
  if (!currentUser) {
    alert("Please sign in to save your collection");
    return false;
  }

  try {
    const { doc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    // Update local cache immediately for UI responsiveness
    if (owned) {
      ownedCards.set(cardKey, true);
      // Remove from wishlist if marking as owned
      wishlistCards.delete(cardKey);
    } else {
      ownedCards.delete(cardKey);
    }

    const userDoc = doc(window.db, "users", currentUser.uid);
    const ownedCardsObj = Object.fromEntries(ownedCards);
    const wishlistCardsObj = Object.fromEntries(wishlistCards);

    await setDoc(
      userDoc,
      {
        ownedCards: ownedCardsObj,
        wishlistCards: wishlistCardsObj,
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    alert("Failed to save: " + error.message);
    return false;
  }
}

async function saveWishlistCard(cardKey, wishlisted) {
  if (!currentUser) {
    alert("Please sign in to save your wishlist");
    return false;
  }

  try {
    const { doc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    // Update local cache immediately for UI responsiveness
    if (wishlisted) {
      wishlistCards.set(cardKey, true);
    } else {
      wishlistCards.delete(cardKey);
    }

    const userDoc = doc(window.db, "users", currentUser.uid);
    const wishlistCardsObj = Object.fromEntries(wishlistCards);

    await setDoc(userDoc, { wishlistCards: wishlistCardsObj }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error saving wishlist to Firebase:", error);
    alert("Failed to save wishlist: " + error.message);
    return false;
  }
}

async function manualSave() {
  if (!currentUser) {
    alert("Please sign in first to save to cloud");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "💾 Saving...";

  try {
    const { doc, setDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    const userDoc = doc(window.db, "users", currentUser.uid);
    const ownedCardsObj = Object.fromEntries(ownedCards);
    const wishlistCardsObj = Object.fromEntries(wishlistCards);

    await setDoc(
      userDoc,
      {
        ownedCards: ownedCardsObj,
        wishlistCards: wishlistCardsObj,
      },
      { merge: true }
    );

    updateSyncStatus();

    alert(
      `✅ Successfully saved ${ownedCards.size} owned cards and ${wishlistCards.size} wishlist cards to cloud!`
    );
  } catch (error) {
    console.error("Error during manual save:", error);
    alert("❌ Save failed: " + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Save";
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

      // Initial sync status will be updated by the Firestore listener
      updateSyncStatus();

      setupFirestoreListener();
    } else {
      // User is signed out
      authSection.style.display = "flex";
      userInfo.style.display = "none";
      removeFirestoreListener();
      ownedCards.clear();
      wishlistCards.clear();
    }
  });
});

// Event listeners
if (signInBtn) signInBtn.addEventListener("click", setupPersonalAuth);
if (signOutBtn) signOutBtn.addEventListener("click", signOut);
if (saveBtn) saveBtn.addEventListener("click", manualSave);

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
    // Store cards globally
    allCards = cards;
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

    // Set up global functions and variables
    getSelectedTags = function () {
      return Array.from(document.querySelectorAll(".tag-checkbox:checked")).map(
        (cb) => cb.value
      );
    };

    ownedFilterBtn = document.getElementById("ownedFilterBtn");
    wishlistFilterBtn = document.getElementById("wishlistFilterBtn");
    unownedFilterBtn = document.getElementById("unownedFilterBtn");

    if (ownedFilterBtn) {
      ownedFilterBtn.addEventListener("click", () => {
        filterMode = filterMode === "owned" ? "all" : "owned";
        updateFilterButtons();
        renderCards(searchInput.value, getSelectedTags());
      });
    }

    if (wishlistFilterBtn) {
      wishlistFilterBtn.addEventListener("click", () => {
        filterMode = filterMode === "wishlist" ? "all" : "wishlist";
        updateFilterButtons();
        renderCards(searchInput.value, getSelectedTags());
      });
    }

    if (unownedFilterBtn) {
      unownedFilterBtn.addEventListener("click", () => {
        filterMode = filterMode === "unowned" ? "all" : "unowned";
        updateFilterButtons();
        renderCards(searchInput.value, getSelectedTags());
      });
    }

    function updateFilterButtons() {
      // Reset all buttons
      [ownedFilterBtn, wishlistFilterBtn, unownedFilterBtn].forEach((btn) => {
        if (btn) {
          btn.classList.remove("active");
          btn.textContent = btn.textContent.replace(
            "Show All Cards",
            btn.id.includes("owned")
              ? "Show Owned"
              : btn.id.includes("wishlist")
              ? "Show Wishlist"
              : "Show Unowned"
          );
        }
      });

      // Update active button
      if (filterMode === "owned" && ownedFilterBtn) {
        ownedFilterBtn.classList.add("active");
        ownedFilterBtn.textContent = "Show All Cards";
      } else if (filterMode === "wishlist" && wishlistFilterBtn) {
        wishlistFilterBtn.classList.add("active");
        wishlistFilterBtn.textContent = "Show All Cards";
      } else if (filterMode === "unowned" && unownedFilterBtn) {
        unownedFilterBtn.classList.add("active");
        unownedFilterBtn.textContent = "Show All Cards";
      }
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

        // Filter by ownership status
        const isOwned = ownedCards.has(cardKey);
        const isWishlisted = wishlistCards.has(cardKey);

        let matchesFilter = true;
        if (filterMode === "owned") {
          matchesFilter = isOwned;
        } else if (filterMode === "wishlist") {
          matchesFilter = isWishlisted && !isOwned;
        } else if (filterMode === "unowned") {
          matchesFilter = !isOwned && !isWishlisted;
        }

        return matchesName && matchesTags && matchesFilter;
      });

      // Sort
      if (sortSelect && sortSelect.value === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        filtered.sort((a, b) => a.number - b.number);
      }

      const ownedCount = filtered.filter((card) =>
        ownedCards.has(card.number + "_" + card.name)
      ).length;
      const wishlistCount = filtered.filter(
        (card) =>
          wishlistCards.has(card.number + "_" + card.name) &&
          !ownedCards.has(card.number + "_" + card.name)
      ).length;

      if (ownedCounter) {
        ownedCounter.textContent = `Owned: ${ownedCount} | Wishlist: ${wishlistCount} | Total: ${filtered.length}`;
      }

      filtered.forEach((card) => {
        const cardKey = card.number + "_" + card.name;
        const wishlistKey = cardKey + "_wishlist";
        const div = document.createElement("div");
        div.className = "card";
        const owned = ownedCards.has(cardKey);
        const wishlisted = wishlistCards.has(cardKey);

        if (owned) {
          div.classList.add("owned");
        } else if (wishlisted) {
          div.classList.add("wishlisted");
        }

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

        // Status buttons container
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "card-buttons";

        // Owned button
        const ownedBtn = document.createElement("button");
        ownedBtn.className = "card-btn owned-btn";
        ownedBtn.textContent = owned ? "✓ Owned" : "Mark as Owned";
        if (owned) ownedBtn.classList.add("active");

        // Wishlist button
        const wishlistBtn = document.createElement("button");
        wishlistBtn.className = "card-btn wishlist-btn";
        wishlistBtn.textContent = wishlisted
          ? "⭐ Wishlisted"
          : "⭐ Add to Wishlist";
        if (wishlisted) wishlistBtn.classList.add("active");

        // Only show wishlist button if not owned
        if (!owned) {
          buttonsContainer.appendChild(wishlistBtn);
        }
        buttonsContainer.appendChild(ownedBtn);

        div.appendChild(buttonsContainer);

        // Button click handlers
        ownedBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const nowOwned = !ownedCards.has(cardKey);

          // Show loading state
          ownedBtn.disabled = true;
          ownedBtn.textContent = nowOwned ? "⏳ Marking..." : "⏳ Removing...";

          const success = await saveOwnedCard(cardKey, nowOwned);

          // Reset button state
          ownedBtn.disabled = false;
          if (!success) {
            // Revert on failure
            ownedBtn.textContent = nowOwned ? "Mark as Owned" : "✓ Owned";
          }
        });

        wishlistBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const nowWishlisted = !wishlistCards.has(cardKey);

          // Show loading state
          wishlistBtn.disabled = true;
          wishlistBtn.textContent = nowWishlisted
            ? "⏳ Adding..."
            : "⏳ Removing...";

          const success = await saveWishlistCard(cardKey, nowWishlisted);

          // Reset button state
          wishlistBtn.disabled = false;
          if (!success) {
            // Revert on failure
            wishlistBtn.textContent = nowWishlisted
              ? "⭐ Add to Wishlist"
              : "⭐ Wishlisted";
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
        filterMode = "all";
        updateFilterButtons();
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

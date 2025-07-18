const searchInput = document.getElementById("searchInput");
const tagFilters = document.getElementById("tagFilters");
const cardsContainer = document.getElementById("cardsContainer");
const themeToggle = document.getElementById("themeToggle");
const ownedCounter = document.getElementById("ownedCounter");
const sortSelect = document.getElementById("sortSelect");
const body = document.body;

// Theme toggle
if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    body.className = themeToggle.checked ? "dark" : "light";
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

    // Populate checkboxes
    tagSet.forEach((tag) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag;
      checkbox.className = "tag-checkbox";
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + tag));
      tagFilters.appendChild(label);
    });

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
        div.addEventListener("click", () => {
          const nowOwned = !(localStorage.getItem(cardKey) === "true");
          localStorage.setItem(cardKey, nowOwned);
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

function renderTagFilters() {
  const tagFiltersDiv = document.getElementById("tagFilters");
  tagFiltersDiv.innerHTML = ""; // Clear previous

  Object.entries(TAG_GROUPS).forEach(([groupName, tags]) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "tag-group";
    const label = document.createElement("span");
    label.textContent = groupName + ": ";
    label.className = "tag-group-label";
    groupDiv.appendChild(label);

    tags.forEach((tag) => {
      const tagLabel = document.createElement("label");
      tagLabel.className = "tag-checkbox-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag;
      checkbox.className = "tag-checkbox";
      tagLabel.appendChild(checkbox);
      tagLabel.appendChild(document.createTextNode(tag));
      groupDiv.appendChild(tagLabel);
    });

    tagFiltersDiv.appendChild(groupDiv);
  });
}

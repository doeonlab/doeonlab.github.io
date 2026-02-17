const ROLE_ORDER = [
  "Faculty",
  "Post Doctors",
  "Ph.D Students",
  "Master Students",
  "Interns",
  "Academic Breaks",
  "Researcher",
  "Ph.D Alumni",
  "Master Alumni",
  "Former Members"
];

async function loadPeople() {
  const targets = document.querySelectorAll("[data-people-list]");
  if (!targets.length) return;

  try {
    const res = await fetch("/people/people.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load people/people.json");
    const peopleData = await res.json();
    const { flatPeople, groups } = normalizePeopleData(peopleData);
    const visiblePeople = flatPeople.filter(hasDisplayName);

    targets.forEach((target) => {
      const limit = Number(target.getAttribute("data-limit")) || visiblePeople.length;

      if (target.hasAttribute("data-grouped")) {
        target.innerHTML = renderGroupedPeople(groups);
      } else {
        const items = visiblePeople.slice(0, limit);
        target.innerHTML = renderPeopleGrid(items);
      }
    });
    initPeopleCarousel();
  } catch (err) {
    console.error(err);
  }
}

function normalizePeopleData(peopleData) {
  if (Array.isArray(peopleData)) {
    return {
      flatPeople: peopleData,
      groups: groupPeopleByRole(peopleData)
    };
  }

  if (peopleData && typeof peopleData === "object") {
    const groups = groupPeopleObject(peopleData);
    const flatPeople = [];
    groups.forEach((items) => flatPeople.push(...items));
    return { flatPeople, groups };
  }

  return { flatPeople: [], groups: new Map() };
}

function groupPeopleByRole(people) {
  const map = new Map();
  ROLE_ORDER.forEach((role) => map.set(role, []));

  people.forEach((person) => {
    const role = (person.role || "").trim();
    if (map.has(role)) {
      map.get(role).push(person);
    } else if (role) {
      if (!map.has("Other")) map.set("Other", []);
      map.get("Other").push(person);
    }
  });

  return map;
}

function groupPeopleObject(groupedPeople) {
  const map = new Map();
  ROLE_ORDER.forEach((role) => map.set(role, []));

  Object.entries(groupedPeople).forEach(([role, items]) => {
    if (!Array.isArray(items)) return;
    const peopleWithRole = items.map((person) => ({ ...person, role }));
    if (map.has(role)) {
      map.get(role).push(...peopleWithRole);
    } else {
      if (!map.has("Other")) map.set("Other", []);
      map.get("Other").push(...peopleWithRole);
    }
  });

  return map;
}

function renderGroupedPeople(groups) {
  let html = "";
  groups.forEach((items, role) => {
    if (!items.length) return;
    const namedItems = items.filter(hasDisplayName);
    const itemsToRender = namedItems;
    if (!itemsToRender.length) return;
    const gridClass = role === "Faculty" ? "people-grid single" : "people-grid";
    html += `
      <div class="people-section">
        <div class="section-title">${role}</div>
        <div class="${gridClass}">
          ${renderPeopleGrid(itemsToRender)}
        </div>
      </div>
    `;
  });
  return html;
}

function renderPeopleGrid(items) {
  return items
    .filter(hasDisplayName)
    .map((person) => {
      const rawPhoto = (person.photo || "").trim();
      const hasPhoto = Boolean(rawPhoto);
      const photoSrc = rawPhoto
        ? (rawPhoto.includes("/") ? rawPhoto : `/images/people/${rawPhoto}`)
        : "";
      const avatar = hasPhoto
        ? `<img class="person-photo" src="${photoSrc}" alt="${person.name}" />`
        : `<div class="person-photo placeholder" aria-hidden="true"></div>`;
      const title = person.title
        ? `<div class="meta-row">${person.title}</div>`
        : "";
      const affiliation = person.affiliation
        ? `<div class="meta-row">${person.affiliation}</div>`
        : "";
      const email = person.email
        ? `<div class="meta-row"><a href="mailto:${person.email}">${person.email}</a></div>`
        : "";
      const interests = person.interests
        ? `<div class="meta-row">${person.interests}</div>`
        : "";
      const website = person.website
        ? `<div class="meta-row"><a href="${person.website}" target="_blank" rel="noopener">${person.website}</a></div>`
        : "";

      return `
        <div class="person-card">
          ${avatar}
          <div class="person-info">
            <div class="name">${person.name}</div>
            ${title}
            ${affiliation}
            ${email}
            ${interests}
            ${website}
          </div>
        </div>
      `;
    })
    .join("");
}

function hasDisplayName(person) {
  return Boolean((person?.name || "").trim());
}

loadPeople();

async function loadPublications() {
  const targets = document.querySelectorAll("[data-publications-list]");
  if (!targets.length) return;

  try {
    const basePath = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const firstUrl = new URL(`${basePath}publications_first_author.json`, window.location.origin);
    const coUrl = new URL(`${basePath}publications_co_author.json`, window.location.origin);
    const [firstRes, coRes] = await Promise.all([
      fetch(firstUrl.toString(), { cache: "no-cache" }),
      fetch(coUrl.toString(), { cache: "no-cache" })
    ]);
    if (!firstRes.ok) throw new Error("Failed to load publications_first_author.json");
    if (!coRes.ok) throw new Error("Failed to load publications_co_author.json");
    const [firstPublications, coPublications] = await Promise.all([firstRes.json(), coRes.json()]);
    const grouped = groupPublicationsByYear(firstPublications, coPublications);
    const html = renderPublicationGroups(grouped);

    targets.forEach((target) => {
      target.innerHTML = html;
    });
  } catch (err) {
    console.error(err);
  }
}

function groupPublicationsByYear(firstPublications, coPublications) {
  const map = new Map();
  firstPublications.forEach((item) => {
    const year = Number(item.year);
    if (!year) return;
    if (!map.has(year)) map.set(year, []);
    map.get(year).push({ ...item, _group: "first" });
  });
  coPublications.forEach((item) => {
    const year = Number(item.year);
    if (!year) return;
    if (!map.has(year)) map.set(year, []);
    map.get(year).push({ ...item, _group: "co" });
  });
  const sorted = new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
  sorted.forEach((items, year) => {
    const first = items.filter((item) => item._group === "first");
    const co = items.filter((item) => item._group === "co");
    sorted.set(year, [...first, ...co]);
  });
  return sorted;
}

function renderPublicationGroups(groups) {
  const placeholders = [
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='260' viewBox='0 0 420 260'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23e8d6c2'/%3E%3Cstop offset='1' stop-color='%23d59b6a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='260' fill='url(%23g)' rx='18'/%3E%3Cpath d='M40 178c44-40 92-60 144-60 52 0 98 20 138 60' fill='none' stroke='%23b3422e' stroke-width='10' stroke-linecap='round'/%3E%3Ccircle cx='320' cy='90' r='26' fill='%231c5c4e'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='260' viewBox='0 0 420 260'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23dfe9e3'/%3E%3Cstop offset='1' stop-color='%23a6cdbd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='260' fill='url(%23g)' rx='18'/%3E%3Cpath d='M70 190l70-80 70 60 80-90 60 80' fill='none' stroke='%231c5c4e' stroke-width='10' stroke-linecap='round'/%3E%3Ccircle cx='120' cy='90' r='22' fill='%23b3422e'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='260' viewBox='0 0 420 260'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23efe1d4'/%3E%3Cstop offset='1' stop-color='%23c9a88a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='260' fill='url(%23g)' rx='18'/%3E%3Crect x='70' y='70' width='280' height='120' fill='none' stroke='%23b3422e' stroke-width='10' rx='18'/%3E%3Ccircle cx='130' cy='130' r='24' fill='%231c5c4e'/%3E%3C/svg%3E",
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='260' viewBox='0 0 420 260'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23f0e6db'/%3E%3Cstop offset='1' stop-color='%23e2c1a5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='260' fill='url(%23g)' rx='18'/%3E%3Cpath d='M80 160h260' stroke='%231c5c4e' stroke-width='12' stroke-linecap='round'/%3E%3Cpath d='M80 110h160' stroke='%23b3422e' stroke-width='12' stroke-linecap='round'/%3E%3C/svg%3E"
  ];

  let index = 0;
  let html = "";

  groups.forEach((items, year) => {
    const list = items
      .map((item, idx) => {
        const thumb = (item.thumb || "").trim();
        const thumbSrc = thumb
          ? `/images/publications/${thumb}`
          : placeholders[(index + idx) % placeholders.length];
        const meta = (item.venue || "").trim();

        const divider = idx === items.length - 1 ? "" : `<div class="pub-divider"></div>`;
        return `
          <article class="pub-item">
            <img class="pub-thumb" src="${thumbSrc}" alt="Publication thumbnail" />
            <div class="pub-content">
              <div class="pub-title">${item.title}</div>
              <div class="pub-authors">${item.authors}</div>
              <div class="pub-conf">${meta}</div>
            </div>
          </article>
          ${divider}
        `;
      })
      .join("");

    html += `
      <section class="pub-year-block">
        <h2 class="pub-year">${year}</h2>
        <div class="pub-list">
          ${list}
        </div>
      </section>
    `;
    index += items.length;
  });

  return html;
}

loadPublications();

async function loadResearch() {
  const targets = document.querySelectorAll("[data-research-list]");
  if (!targets.length) return;

  try {
    const basePath = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const dataUrl = new URL(`${basePath}research.json`, window.location.origin);
    const res = await fetch(dataUrl.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load research.json");
    const researchItems = await res.json();
    const html = renderResearchCards(researchItems);

    targets.forEach((target) => {
      target.innerHTML = html;
    });
  } catch (err) {
    console.error(err);
  }
}

function renderResearchCards(items) {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => {
      const title = item.title || "";
      const desc = item.desc || "";
      const tag = item.tag ? `<div class="tag">${item.tag}</div>` : "";
      const image = (item.image || "").trim();
      const imageBlock = image
        ? `<div class="research-thumb-wrap"><img class="research-thumb" src="/images/research/${image}" alt="${title}" /></div>`
        : "";
      const contentClass = image ? "research-content" : "";
      return `
        <article class="card">
          ${imageBlock}
          <div class="${contentClass}">
            <h3>${title}</h3>
            <p>${desc}</p>
            ${tag}
          </div>
        </article>
      `;
    })
    .join("");
}

loadResearch();

async function loadFooter() {
  const targets = document.querySelectorAll("[data-footer]");
  if (!targets.length) return;

  try {
    const res = await fetch("/footer.html", { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load footer.html");
    const html = await res.text();
    targets.forEach((target) => {
      target.innerHTML = html;
    });
    await applySiteMeta();
  } catch (err) {
    console.error(err);
  }
}

let siteMetaPromise;

function getSiteMeta() {
  if (!siteMetaPromise) {
    siteMetaPromise = fetch("/site.json", { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load site.json");
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return null;
      });
  }
  return siteMetaPromise;
}

async function applySiteMeta() {
  const data = await getSiteMeta();
  if (!data) return;
  const nameTargets = document.querySelectorAll("[data-site-name]");
  const fullTargets = document.querySelectorAll("[data-site-full]");
  const footerTargets = document.querySelectorAll("[data-footer-text]");
  const copyrightTargets = document.querySelectorAll("[data-copyright]");
  const name = (data.yourName || "").trim();
  const full = (data.labName || "").trim();
  const copyright = (data.copyright || "").trim();

  if (name) {
    nameTargets.forEach((el) => {
      el.textContent = name;
    });
  }
  if (full) {
    fullTargets.forEach((el) => {
      el.textContent = full;
    });
  }
  if (name && full) {
    const footerText = `${name} · ${full}`;
    footerTargets.forEach((el) => {
      el.textContent = footerText;
    });
  }
  if (copyright) {
    copyrightTargets.forEach((el) => {
      el.textContent = copyright;
    });
  }
}

loadFooter();

async function loadHeader() {
  const targets = document.querySelectorAll("[data-header]");
  if (!targets.length) return;

  try {
    const res = await fetch("/header.html", { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load header.html");
    const html = await res.text();
    targets.forEach((target) => {
      target.innerHTML = html;
    });
    await applySiteMeta();
  } catch (err) {
    console.error(err);
  }
}

loadHeader();
applySiteMeta();

async function loadHero() {
  const target = document.querySelector("[data-hero]");
  if (!target) return;

  try {
    const [htmlRes, dataRes] = await Promise.all([
      fetch("/hero/hero.html", { cache: "no-cache" }),
      fetch("/hero/hero.json", { cache: "no-cache" })
    ]);
    if (!htmlRes.ok) throw new Error("Failed to load hero/hero.html");
    if (!dataRes.ok) throw new Error("Failed to load hero/hero.json");

    const [html, data] = await Promise.all([htmlRes.text(), dataRes.json()]);
    target.innerHTML = html;

    const eyebrow = target.querySelector("[data-hero-eyebrow]");
    const title = target.querySelector("[data-hero-title]");
    const lead = target.querySelector("[data-hero-lead]");
    const buttonsWrap = target.querySelector("[data-hero-buttons]");
    const metaWrap = target.querySelector("[data-hero-meta]");
    const slidesWrap = target.querySelector("[data-hero-slides]");
    const dotsWrap = target.querySelector("[data-hero-dots]");

    if (eyebrow) eyebrow.textContent = data.eyebrow || "";
    if (title) title.textContent = data.title || "";
    if (lead) lead.textContent = data.lead || "";

    if (buttonsWrap) {
      const buttons = Array.isArray(data.buttons) ? data.buttons : [];
      buttonsWrap.innerHTML = buttons
        .map((btn) => {
          const variant = (btn.variant || "primary").toLowerCase();
          const className = variant === "ghost" ? "btn ghost" : "btn";
          return `<a class="${className}" href="${btn.href || "#"}">${btn.label || ""}</a>`;
        })
        .join("");
    }

    if (metaWrap) {
      const metaItems = Array.isArray(data.meta) ? data.meta : [];
      metaWrap.innerHTML = metaItems
        .map(
          (item) => `
            <div>
              <div class="meta-label">${item.label || ""}</div>
              <div class="meta-value">${item.value || ""}</div>
            </div>
          `
        )
        .join("");
    }

    if (slidesWrap && dotsWrap) {
      const slides = Array.isArray(data.slides) ? data.slides : [];
      slidesWrap.innerHTML = slides
        .map((item, idx) => {
          const rawSrc = (item.src || "").trim();
          const src = rawSrc ? `/images/hero/${rawSrc.replace(/^\/+/, "")}` : "";
          return `
            <div class="hero-slide${idx === 0 ? " is-active" : ""}">
              <img src="${src}" alt="${item.alt || "Hero slide"}" loading="lazy" />
            </div>
          `;
        })
        .join("");

      dotsWrap.innerHTML = slides
        .map((_, idx) => `<span class="hero-dot${idx === 0 ? " is-active" : ""}"></span>`)
        .join("");

      initHeroSlider(slidesWrap, dotsWrap);
    }
  } catch (err) {
    console.error(err);
  }
}

function initHeroSlider(track, dotsWrap) {
  const slides = Array.from(track.querySelectorAll(".hero-slide"));
  const dots = Array.from(dotsWrap.querySelectorAll(".hero-dot"));
  if (!slides.length) return;

  let index = 0;
  const setSlide = (next) => {
    index = (next + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  setSlide(0);
  setInterval(() => setSlide(index + 1), 4000);
}

loadHero();

async function loadAbout() {
  const target = document.querySelector("[data-about]");
  if (!target) return;

  try {
    const [htmlRes, dataRes] = await Promise.all([
      fetch("/about/about.html", { cache: "no-cache" }),
      fetch("/about/about.json", { cache: "no-cache" })
    ]);
    if (!htmlRes.ok) throw new Error("Failed to load about/about.html");
    if (!dataRes.ok) throw new Error("Failed to load about/about.json");

    const [html, data] = await Promise.all([htmlRes.text(), dataRes.json()]);
    target.innerHTML = html;

    const title = target.querySelector("[data-about-title]");
    const body = target.querySelector("[data-about-body]");
    if (title) title.textContent = data.title || "";
    if (body) {
      const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
      body.innerHTML = paragraphs.map((text) => `<p class=\"body\">${text}</p>`).join("");
    }
  } catch (err) {
    console.error(err);
  }
}

loadAbout();

function initPeopleCarousel() {
  const track = document.querySelector("[data-people-carousel]");
  if (!track) return;
  const prev = document.querySelector("[data-people-prev]");
  const next = document.querySelector("[data-people-next]");
  if (!prev || !next) return;

  const pageSize = Number(track.getAttribute("data-people-page")) || 3;
  const cards = () => Array.from(track.querySelectorAll(".person-card"));
  let index = 0;

  const renderPage = () => {
    const items = cards();
    items.forEach((card, i) => {
      const start = index * pageSize;
      const end = start + pageSize;
      card.style.display = i >= start && i < end ? "" : "none";
    });
  };

  const pageCount = () => Math.max(1, Math.ceil(cards().length / pageSize));

  prev.addEventListener("click", () => {
    const total = pageCount();
    index = (index - 1 + total) % total;
    renderPage();
  });
  next.addEventListener("click", () => {
    const total = pageCount();
    index = (index + 1) % total;
    renderPage();
  });

  renderPage();
}

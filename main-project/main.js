// set up
const CURATED_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuAwVS6S8Ms1CIXHVODFuGZ50y-34RqIS3DgBIudsHqpY-t5P-3FTrdkdH5VrETKkrwins925IQDZG/pub?gid=0&single=true&output=csv";
const USER_CSV_URL    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuAwVS6S8Ms1CIXHVODFuGZ50y-34RqIS3DgBIudsHqpY-t5P-3FTrdkdH5VrETKkrwins925IQDZG/pub?gid=1023793574&single=true&output=csv";
const CACHE_KEY       = "femme_data_cache";
const CACHE_TTL       = 5 * 60 * 1000;

// LARGE NODE SVGs
const CATEGORY_SVGS = [
  "assets/black ant large-01.svg",
  "assets/black ant large-02.svg",
  "assets/black ant large-03.svg",
  "assets/black ant large-04.svg",
  "assets/black ant large-05.svg",
];

// SMALL NODE SVGs
const USER_NODE_SVGS = {
  "Computer Science Pioneers": [
    "assets/black-ants-01.svg",
    "assets/black-ants-02.svg",
    "assets/black-ants-03.svg",
  ],
  "Cyberfeminist Narrators": [
    "assets/black-ants-01.svg",
    "assets/black-ants-02.svg",
    "assets/black-ants-03.svg",
  ],
  "CyberCommunity Builder": [
    "assets/black-ants-01.svg",
    "assets/black-ants-02.svg",
    "assets/black-ants-03.svg",
  ],
};

const CATEGORY_COLORS = {
  "Computer Science Pioneers": "#ff6ed6",
  "Cyberfeminist Narrators":   "#ff6ed6",
  "CyberCommunity Builder":    "#ff6ed6",
};

const IS_MOBILE = window.innerWidth <= 768;

// CSV PARSER
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// cache data
async function fetchData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, curated, userContributions } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        refreshCacheInBackground();
        return { curated, userContributions };
      }
    }
  } catch (e) {}
  return await fetchFromNetwork();
}

async function fetchFromNetwork() {
  const [curatedRes, userRes] = await Promise.all([
    fetch(CURATED_CSV_URL),
    fetch(USER_CSV_URL),
  ]);
  const [curatedText, userText] = await Promise.all([
    curatedRes.text(),
    userRes.text(),
  ]);
  const curated           = parseCSV(curatedText);
  const userContributions = parseCSV(userText);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      curated,
      userContributions,
    }));
  } catch (e) {}
  return { curated, userContributions };
}

function refreshCacheInBackground() {
  setTimeout(() => { fetchFromNetwork().catch(() => {}); }, 100);
}

// ============================================================
// BUILD GRAPH DATA
// Desktop: tighter padding (60), zigzag both directions
// Mobile: larger pannable canvas, smaller padding
// ============================================================
function buildGraphData(curated, userContributions, viewW, viewH) {
  const nodes = [];
  const links = [];

  const padding = IS_MOBILE ? 80  : 100;
  const canvasW = IS_MOBILE ? viewW * 2 : viewW;
  const canvasH = IS_MOBILE ? viewH * 3 : viewH;

  const cols = IS_MOBILE ? 3 : 5;
  const rows = Math.ceil(curated.length / cols);

  const cellW  = (canvasW - padding * 2) / Math.max(cols - 1, 1);
  const cellH  = (canvasH - padding * 2) / Math.max(rows - 1, 1);
  const zigzag = cellW * 0.3;
  const jitter = IS_MOBILE ? 30 : 80;

  // ── Curated (large) nodes ──
  curated.forEach((row, i) => {
  if (!row["Title"] || row["Title"].trim() === "") return; // skip blank rows
    const keys        = Object.keys(row);
    const categoryKey = keys[5];
    const imageKey = keys[6];

    const col    = i % cols;
    const rowIdx = Math.floor(i / cols);

    // alternate left/right by half-zigzag so BOTH edges zigzag
    const offset = rowIdx % 2 === 0 ? -zigzag / 2 : zigzag / 2;

    const baseX = padding + col * cellW + offset;
    const baseY = padding + rowIdx * cellH;

    const x = Math.max(padding, Math.min(canvasW - padding, baseX + (Math.random() - 0.5) * jitter));
    const y = Math.max(padding, Math.min(canvasH - padding, baseY + (Math.random() - 0.5) * jitter));

    const imageFile = row[imageKey] || "";

    nodes.push({
      id:           row["Title"],
      type:         "curated",
      title:        row["Title"],
      subheader:    row["Sub-header"],
      year:         row["Year"],
      location:     row["Location"],
      contribution: row["Contribution"],
      category:     row[categoryKey] || "Uncategorized",
      image:        imageFile ? `images/${imageFile}` : "",
      svgFile:      CATEGORY_SVGS[(i * 3 + Math.floor(i / 5)) % CATEGORY_SVGS.length],
      x,
      y,
    });
  });

  // ── User (small) nodes — fanned around parent ──
  const userCountByParent = {};

  userContributions.forEach((row, i) => {
    const parentTitle = row["What are you contributing to?"];
    const linkTitle   = row["Name of link "] || row["Name of link"];
    const url         = row["Submit your link"] || row["Submit your link,"];
    const nodeId      = `user-${i}-${linkTitle}`;

    const parent = nodes.find((n) => n.title === parentTitle);
    if (!parent) return;

    if (!userCountByParent[parentTitle]) userCountByParent[parentTitle] = 0;
    const childIndex = userCountByParent[parentTitle];
    userCountByParent[parentTitle]++;

    const totalChildren = userContributions.filter(
      (r) => r["What are you contributing to?"] === parentTitle
    ).length;

    const angle    = (childIndex / Math.max(totalChildren, 1)) * 2 * Math.PI - Math.PI / 2;
    const radius   = IS_MOBILE ? 60 : 80;
    const variants = USER_NODE_SVGS[parent.category] || [];
    const svgFile  = variants[childIndex % variants.length] || "";

    nodes.push({
      id:       nodeId,
      type:     "user",
      title:    linkTitle,
      url:      url,
      parentId: parentTitle,
      category: parent.category,
      svgFile:  svgFile,
      x: parent.x + Math.cos(angle) * radius,
      y: parent.y + Math.sin(angle) * radius,
    });

    links.push({ source: parentTitle, target: nodeId });
  });

  return { nodes, links, canvasW, canvasH };
}

// CARD
function createCard() {
  const imageBox = document.createElement("div");
  imageBox.id = "node-image-box";
  imageBox.innerHTML = `<img id="card-image" src="" alt="" />`;
  document.body.appendChild(imageBox);

  const card = document.createElement("div");
  card.id = "node-card";
  card.innerHTML = `
    <button id="card-close">✕</button>
    <h2 id="card-title"></h2>
    <p id="card-subheader"></p>
    <div id="card-meta">
      <span id="card-year"></span>
      <span id="card-location"></span>
    </div>
    <p id="card-contribution"></p>
    <div id="card-category"></div>
  `;
  document.body.appendChild(card);

  document.getElementById("card-close").addEventListener("click", () => {
    card.classList.remove("visible");
    imageBox.classList.remove("visible");
  });
}

function showCard(node) {
  if (!node.title) return; // skip empty nodes
  const card     = document.getElementById("node-card");
  const imageBox = document.getElementById("node-image-box");
  const img      = document.getElementById("card-image");

  document.getElementById("card-title").textContent        = node.title;
  document.getElementById("card-subheader").textContent    = node.subheader || "";
  document.getElementById("card-year").textContent         = node.year || "";
  document.getElementById("card-location").textContent     = node.location ? `· ${node.location}` : "";
  document.getElementById("card-contribution").textContent = node.contribution || "";
  document.getElementById("card-category").textContent     = node.category;
  document.getElementById("card-category").style.color     = CATEGORY_COLORS[node.category] || "#000";

  card.classList.add("visible");
  console.log("image path:", node.image);
  if (node.image) {
    img.src = node.image;
    img.alt = node.title;

    imageBox.style.width  = "auto";
    imageBox.style.height = "auto";

    img.onload = () => {
      const maxW  = window.innerWidth * 0.45;
      const maxH  = window.innerHeight * 0.8;
      const ratio = img.naturalWidth / img.naturalHeight;

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxW) { w = maxW; h = w / ratio; }
      if (h > maxH) { h = maxH; w = h * ratio; }

      imageBox.style.width  = `${w}px`;
      imageBox.style.height = `${h}px`;
    };

    imageBox.classList.add("visible");
  } else {
    imageBox.classList.remove("visible");
  }
}

// d3 graph
function drawGraph({ nodes, links, canvasW, canvasH }) {
  const container = document.getElementById("graph");
  const viewW     = container.clientWidth;
  const viewH     = container.clientHeight;

  const svg = d3
    .select("#graph")
    .append("svg")
    .attr("width", viewW)
    .attr("height", viewH)
    .style("cursor", IS_MOBILE ? "grab" : "default");

  const g = svg.append("g");

  // ── Mobile pan + pinch zoom ──
  if (IS_MOBILE) {
    const initialX = -(canvasW / 2 - viewW / 2);
    const initialY = -(canvasH / 2 - viewH / 2);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => { g.attr("transform", event.transform); });

    svg.call(zoom)
       .on("dblclick.zoom", null); // prevent double-tap zoom interfering

    svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY));
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const linkLines = g
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#000000")
    .attr("stroke-opacity", 0)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "3,6")
    .attr("x1", (d) => nodeById.get(d.source)?.x ?? 0)
    .attr("y1", (d) => nodeById.get(d.source)?.y ?? 0)
    .attr("x2", (d) => nodeById.get(d.target)?.x ?? 0)
    .attr("y2", (d) => nodeById.get(d.target)?.y ?? 0);

  function updateLinks() {
    linkLines
      .attr("x1", (d) => nodeById.get(d.source)?.x ?? 0)
      .attr("y1", (d) => nodeById.get(d.source)?.y ?? 0)
      .attr("x2", (d) => nodeById.get(d.target)?.x ?? 0)
      .attr("y2", (d) => nodeById.get(d.target)?.y ?? 0);
  }

  // drag (desktop only)
  function makeDrag() {
    if (IS_MOBILE) return d3.drag();
    return d3.drag()
      .on("start", (event) => {
        event.sourceEvent.stopPropagation();
        linkLines.attr("stroke-opacity", 0);
      })
      .on("drag", (event, d) => {
        d.x = Math.max(40, Math.min(canvasW - 40, event.x));
        d.y = Math.max(40, Math.min(canvasH - 40, event.y));
        d3.select(event.sourceEvent.target.closest("g.curated-node, g.user-node"))
          .attr("transform", `translate(${d.x},${d.y})`);
      })
      .on("end", () => {
        updateLinks();
      });
  }

  // curated (large) nodes
  const curatedGs = g
    .append("g")
    .selectAll("g.curated-node")
    .data(nodes.filter((d) => d.type === "curated"))
    .join("g")
    .attr("class", "curated-node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .style("cursor", "pointer")
    .call(makeDrag())
    .on("click", (event, d) => {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      showCard(d);
    })
    .on("mouseover", (event, d) => {
      if (IS_MOBILE) return;
      linkLines
        .filter((l) => {
          const sourceId = l.source?.id ?? l.source;
          return sourceId === d.id;
        })
        .attr("stroke-opacity", 0.8);

      d3.select(event.currentTarget).select("image")
        .style("filter", "brightness(0) saturate(100%) invert(63%) sepia(60%) saturate(500%) hue-rotate(280deg) brightness(1.1)");

      userGs
        .filter((u) => u.parentId === d.id)
        .selectAll("image")
        .style("filter", "brightness(0) saturate(100%) invert(63%) sepia(60%) saturate(500%) hue-rotate(280deg) brightness(1.1)");
    })
    .on("mouseout", () => {
      if (IS_MOBILE) return;
      linkLines.attr("stroke-opacity", 0);
      curatedGs.selectAll("image").style("filter", null);
      userGs.selectAll("image").style("filter", null);
    });

  curatedGs.append("image")
    .attr("href", (d) => d.svgFile)
    .attr("width", IS_MOBILE ? 70 : 90)
    .attr("height", IS_MOBILE ? 70 : 90)
    .attr("x", IS_MOBILE ? -35 : -45)
    .attr("y", IS_MOBILE ? -35 : -45)
    .attr("opacity", 1)
    .style("animation-delay", (d, i) => `${i * 0.05}s`);

  // user (small) nodes
  const userGs = g
    .append("g")
    .selectAll("g.user-node")
    .data(nodes.filter((d) => d.type === "user"))
    .join("g")
    .attr("class", "user-node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .style("cursor", "pointer")
    .call(makeDrag())
    .on("click", (event, d) => {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      if (d.url) window.open(d.url, "_blank");
    })
    .on("mouseover", (event, d) => {
      if (IS_MOBILE) return;
      linkLines
        .filter((l) => {
          const targetId = l.target?.id ?? l.target;
          return targetId === d.id;
        })
        .attr("stroke-opacity", 0.8);

      curatedGs
        .filter((c) => c.id === d.parentId)
        .selectAll("image")
        .style("filter", "brightness(0) saturate(100%) invert(63%) sepia(60%) saturate(500%) hue-rotate(280deg) brightness(1.1)");

      d3.select(event.currentTarget).select("image")
        .style("filter", "brightness(0) saturate(100%) invert(63%) sepia(60%) saturate(500%) hue-rotate(280deg) brightness(1.1)");
    })
    .on("mouseout", () => {
      if (IS_MOBILE) return;
      linkLines.attr("stroke-opacity", 0);
      curatedGs.selectAll("image").style("filter", null);
      userGs.selectAll("image").style("filter", null);
    });

  userGs.append("image")
    .attr("href", (d) => d.svgFile)
    .attr("width", IS_MOBILE ? 20 : 24)
    .attr("height", IS_MOBILE ? 20 : 24)
    .attr("x", IS_MOBILE ? -10 : -12)
    .attr("y", IS_MOBILE ? -10 : -12)
    .attr("opacity", 1)
    .style("animation-delay", (d, i) => `${i * 0.05}s`);

  userGs.append("text")
    .text((d) => d.title)
    .attr("text-anchor", "middle")
    .attr("dy", 22)
    .attr("font-size", "9px")
    .attr("fill", "#333")
    .attr("class", "user-label")
    .attr("font-family", "inherit");

  // background click closes cards (desktop only — mobile uses pan)
  if (!IS_MOBILE) {
    svg.on("click", () => {
      document.getElementById("node-card").classList.remove("visible");
      document.getElementById("node-image-box").classList.remove("visible");
    });
  }
}

async function init() {
  createCard();

  document.getElementById("graph").innerHTML =
    '<p style="color:#000000;padding:2rem;font-family:inherit;">Loading...</p>';

  try {
    const { curated, userContributions } = await fetchData();
    document.getElementById("graph").innerHTML = "";

    const container = document.getElementById("graph");
    const viewW     = container.clientWidth;
    const viewH     = container.clientHeight;
    const graphData = buildGraphData(curated, userContributions, viewW, viewH);
    drawGraph(graphData);
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById("graph").innerHTML =
      '<p style="color:#333;padding:2rem;font-family:inherit;">Could not load data. Check your CSV URLs in main.js.</p>';
  }
}

window.addEventListener("load", init);

// sidebar
const aboutBtn     = document.querySelector('.about-btn');
const aboutSidebar = document.querySelector('.sidebar');

aboutBtn.addEventListener('click', () => {
  aboutSidebar.classList.toggle('open');
});

document.querySelector('.close-btn').addEventListener('click', () => {
  aboutSidebar.classList.remove('open');
});

console.log("you found a hidden message! hey dev nerd :P");
console.log("snooping through my code huh, i see you.");
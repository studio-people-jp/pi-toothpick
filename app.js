const $ = (id) => document.getElementById(id);
const L = 1;
const D = 2;
let client;
let busy = false;

function formatCount(value) {
  return Number(value).toLocaleString("en-US");
}

function setStatus(message) {
  $("status").textContent = message;
}

function drawScene(crossed = null, x = 0.5, angle = Math.PI / 4) {
  const canvas = $("tossCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0d1d2d";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#6f8da8";
  ctx.globalAlpha = .58;
  ctx.lineWidth = 3;
  for (let y = 54; y <= h - 24; y += 96) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const cx = w * .5;
  const cy = 150;
  const length = 150;
  const dx = Math.cos(angle) * length / 2;
  const dy = Math.sin(angle) * length / 2;
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.strokeStyle = crossed === null ? "#d8bd83" : crossed ? "#e3a77e" : "#8bb8df";
  ctx.beginPath();
  ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
  ctx.fillStyle = "#f4f7fa";
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
}

function renderStats(stats) {
  const total = Number(stats.total_drops ?? stats.total ?? 0);
  const crossed = Number(stats.crossings ?? stats.crossed ?? 0);
  $("totalCount").textContent = formatCount(total);
  $("crossCount").textContent = formatCount(crossed);
  if (crossed > 0) {
    const estimate = (2 * L * total) / (D * crossed);
    $("piEstimate").textContent = estimate.toFixed(8);
    const error = Math.abs(estimate - Math.PI);
    $("accuracyLabel").textContent = "Absolute error: " + error.toFixed(8);
  } else {
    $("piEstimate").textContent = "—";
    $("accuracyLabel").textContent = "Waiting for the first crossing";
  }
}

async function loadStats() {
  const { data, error } = await client.from("experiment_stats").select("total_drops,crossings").eq("id", 1).single();
  if (error) throw error;
  renderStats(data);
}

async function dropOne() {
  if (busy) return;
  busy = true;
  $("dropButton").disabled = true;
  $("buttonText").textContent = "DROPPING…";

  // Buffon's needle: midpoint is uniform over one line-spacing interval;
  // orientation is uniform over [0, pi). The needle crosses a line when
  // its vertical half-span reaches the nearest parallel line.
  const midpoint = Math.random() * D;
  const angle = Math.random() * Math.PI;
  const distanceToNearestLine = Math.min(midpoint, D - midpoint);
  const crossed = (L / 2) * Math.abs(Math.sin(angle)) >= distanceToNearestLine;
  drawScene(crossed, midpoint, angle);

  try {
    const { data, error } = await client.rpc("drop_toothpick", { p_crossed: crossed });
    if (error) throw error;
    renderStats(Array.isArray(data) ? data[0] : data);
    $("tossLabel").textContent = crossed ? "CROSSED A LINE · +1 DROP" : "DID NOT CROSS · +1 DROP";
    setStatus("Your toothpick has been added to the worldwide total.");
  } catch (error) {
    console.error(error);
    setStatus("Could not save this drop. Please try again. " + (error.message || ""));
    $("tossLabel").textContent = "DROP NOT RECORDED";
  } finally {
    busy = false;
    $("dropButton").disabled = false;
    $("buttonText").textContent = "DROP ONE TOOTHPICK";
  }
}

async function init() {
  drawScene();
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY ||
      window.SUPABASE_URL.includes("YOUR_") || window.SUPABASE_ANON_KEY.includes("YOUR_")) {
    setStatus("Supabase is not configured yet. Follow the setup instructions in the README.");
    $("buttonText").textContent = "SUPABASE SETUP REQUIRED";
    return;
  }

  client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  try {
    await loadStats();
    $("dropButton").disabled = false;
    $("buttonText").textContent = "DROP ONE TOOTHPICK";
    setStatus("Connected. Every click adds one drop to the shared experiment.");
  } catch (error) {
    console.error(error);
    setStatus("Could not connect to the experiment database. Check the Supabase setup.");
    $("buttonText").textContent = "CONNECTION ERROR";
  }
}

$("dropButton").addEventListener("click", dropOne);
init();

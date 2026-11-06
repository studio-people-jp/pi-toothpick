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
  // Match the visual scale to the simulation: D = 2 and L = 1.
  // The parallel lines are 96 px apart, so one unit is 48 px.
  const pixelsPerUnit = 48;
  const cy = 54 + x * pixelsPerUnit;
  const length = L * pixelsPerUnit;
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
  $("buttonText").textContent = "DROPPING 100…";
  setStatus("Generating 100 random toothpick drops…");

  // Generate 100 independent Buffon's needle trials.
  const results = [];
  let lastDrop = null;
  for (let i = 0; i < 100; i++) {
    const midpoint = Math.random() * D;
    const angle = Math.random() * Math.PI;
    const distanceToNearestLine = Math.min(midpoint, D - midpoint);
    const crossed = (L / 2) * Math.abs(Math.sin(angle)) >= distanceToNearestLine;
    results.push(crossed);
    lastDrop = { midpoint, angle, crossed };
  }
  drawScene(lastDrop.crossed, lastDrop.midpoint, lastDrop.angle);

  try {
    const { data, error } = await client.rpc("drop_toothpicks", { p_results: results });
    if (error) throw error;
    renderStats(Array.isArray(data) ? data[0] : data);
    const crossings = results.filter(Boolean).length;
    $("tossLabel").textContent = "100 DROPS COMPLETE · " + crossings + " CROSSED";
    setStatus("100 toothpicks have been added to the worldwide total.");
  } catch (error) {
    console.error(error);
    setStatus("Could not save this batch. Please try again. " + (error.message || ""));
    $("tossLabel").textContent = "BATCH NOT RECORDED";
  } finally {
    busy = false;
    $("dropButton").disabled = false;
    $("buttonText").textContent = "DROP 100 TOOTHPICKS";
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
    setStatus("Connected. Every click adds 100 drops to the shared experiment.");
  } catch (error) {
    console.error(error);
    setStatus("Could not connect to the experiment database. Check the Supabase setup.");
    $("buttonText").textContent = "CONNECTION ERROR";
  }
}

$("dropButton").addEventListener("click", dropOne);
init();

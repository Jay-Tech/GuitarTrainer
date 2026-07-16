// Tab navigation.
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("view-" + tab.dataset.view).classList.add("active");

    // Stop anything noisy when leaving its tab.
    if (tab.dataset.view !== "tuner") Tuner.stop();
    if (tab.dataset.view !== "metronome") Metronome.stop();
    if (tab.dataset.view !== "changes") Changes.stop();
    if (tab.dataset.view !== "practice") Practice.stop();
  });
});

/* A&B Design & Build — site behaviour. No dependencies. */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "971585538660";
  var EMAIL = "projects@abdesignandbuild.ae";

  /* ---------- Header: solid once the hero scrolls away ---------- */
  var header = document.querySelector("[data-header]");
  if (header && !header.classList.contains("is-static")) {
    var onScroll = function () {
      header.classList.toggle("is-solid", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Hero: crossfade through project photos (static if reduced motion) ---------- */
  var slideWrap = document.querySelector("[data-hero-slides]");
  if (slideWrap) {
    var allSlides = Array.prototype.slice.call(slideWrap.querySelectorAll(".hero-slide"));
    // Only the set that suits this screen shape is shown (wide or tall, see CSS)
    var shown = function () {
      return allSlides.filter(function (s) { return getComputedStyle(s).display !== "none"; });
    };
    var heroIndex = 0;
    var activateFirst = function () {
      var list = shown();
      allSlides.forEach(function (s) { s.classList.remove("is-active", "was-active"); });
      heroIndex = 0;
      if (list[0]) { list[0].loading = "eager"; list[0].classList.add("is-active"); }
    };
    activateFirst();
    window.matchMedia("(max-aspect-ratio: 1/1)").addEventListener("change", activateFirst);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Fetch the later slides once the page has loaded so the first view stays fast
      window.addEventListener("load", function () {
        shown().forEach(function (s) { s.loading = "eager"; });
      });
      setInterval(function () {
        var list = shown();
        if (document.hidden || list.length < 2) return;
        list.forEach(function (s) { s.classList.remove("was-active"); });
        list[heroIndex % list.length].classList.add("was-active");
        list[heroIndex % list.length].classList.remove("is-active");
        heroIndex = (heroIndex + 1) % list.length;
        var next = list[heroIndex];
        // Restart the push-in on the incoming photo
        next.style.animation = "none";
        void next.offsetWidth;
        next.style.animation = "";
        next.classList.add("is-active");
      }, 6500);
    }
  }

  /* ---------- Mobile menu ---------- */
  var menu = document.querySelector("[data-menu]");
  var openBtn = document.querySelector("[data-menu-open]");
  var closeBtn = document.querySelector("[data-menu-close]");
  if (menu && openBtn && closeBtn) {
    var setMenu = function (open) {
      menu.classList.toggle("is-open", open);
      openBtn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
      if (open) closeBtn.focus();
      else openBtn.focus();
    };
    openBtn.addEventListener("click", function () { setMenu(true); });
    closeBtn.addEventListener("click", function () { setMenu(false); });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("is-open");
        openBtn.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ---------- Portfolio: filters, show more, lightbox ---------- */
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll(".gallery-item"));
    var filterBtns = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
    var moreBtn = document.querySelector("[data-gallery-more]");
    var status = document.querySelector("[data-gallery-status]");
    var current = "all";
    var expanded = false;

    var labels = { all: "All", pools: "Pools", landscape: "Landscape & softscape", living: "Outdoor living", interiors: "Interiors & commercial" };
    filterBtns.forEach(function (btn) {
      var key = btn.dataset.filter;
      var n = key === "all" ? items.length : items.filter(function (it) { return it.dataset.cat === key; }).length;
      btn.innerHTML = labels[key] + '<span class="filter-count">' + n + "</span>";
    });

    var render = function () {
      var shown = 0;
      items.forEach(function (it) {
        var match = current === "all" || it.dataset.cat === current;
        // "Show more" only applies to the All view; a single category shows everything.
        var visible = match && (expanded || current !== "all" || !it.hasAttribute("data-more"));
        it.hidden = !visible;
        if (visible) shown++;
      });
      if (moreBtn) moreBtn.parentElement.hidden = expanded || current !== "all";
      if (status) status.textContent = "Showing " + shown + " projects";
    };

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        current = btn.dataset.filter;
        filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        render();
      });
    });
    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        var firstHidden = items.filter(function (it) { return it.hidden; })[0];
        expanded = true;
        render();
        if (firstHidden) firstHidden.querySelector("button").focus();
      });
    }
    render();

    // Lightbox
    var lb = document.querySelector("[data-lightbox]");
    var lbImg = lb.querySelector("[data-lb-img]");
    var lbCap = lb.querySelector("[data-lb-caption]");
    var lbCount = lb.querySelector("[data-lb-count]");
    var lbIndex = 0;
    var opener = null;
    var visibleItems = function () { return items.filter(function (it) { return !it.hidden; }); };

    var show = function (i) {
      var list = visibleItems();
      lbIndex = (i + list.length) % list.length;
      var btn = list[lbIndex].querySelector(".gallery-btn");
      var thumb = btn.querySelector("img");
      lbImg.src = btn.dataset.full;
      lbImg.alt = thumb.alt;
      lbCap.textContent = btn.querySelector(".gallery-cap").textContent;
      lbCount.textContent = (lbIndex + 1) + " / " + list.length;
    };

    gallery.addEventListener("click", function (e) {
      var btn = e.target.closest(".gallery-btn");
      if (!btn) return;
      opener = btn;
      show(visibleItems().indexOf(btn.closest(".gallery-item")));
      if (typeof lb.showModal === "function") lb.showModal();
      else window.open(btn.dataset.full, "_blank");
    });
    lb.querySelector("[data-lb-close]").addEventListener("click", function () { lb.close(); });
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { show(lbIndex - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { show(lbIndex + 1); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(lbIndex - 1);
      if (e.key === "ArrowRight") show(lbIndex + 1);
    });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener("close", function () { if (opener) opener.focus(); });

    // Swipe between photos on touch screens
    var startX = null;
    lb.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Design enquiry: validate, then hand off to WhatsApp or email ---------- */
  var form = document.querySelector("[data-form]");
  if (form) {
    var summary = form.querySelector("[data-form-summary]");
    var summaryList = form.querySelector("[data-form-summary-list]");
    var formStatus = form.querySelector("[data-form-status]");
    var sendVia = "whatsapp";

    form.querySelectorAll("[data-send]").forEach(function (b) {
      b.addEventListener("click", function () { sendVia = b.dataset.send; });
    });

    // Text fields: field name -> rule returning an error message or ""
    var rules = {
      firstName: function (v) { return v.trim().length < 2 ? "Enter your first name." : ""; },
      lastName: function (v) { return v.trim().length < 2 ? "Enter your last name." : ""; },
      phone: function (v) {
        return v.replace(/[^\d]/g, "").length < 7 ? "Enter a phone number we can reach you on, e.g. +971 50 123 4567." : "";
      },
      email: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter an email address like name@example.com.";
      },
      area: function (v) { return v ? "" : "Choose your community, or 'Elsewhere in Dubai'."; }
    };
    // Choice groups that need at least one answer: name -> [error element id, message]
    var groups = {
      want: ["f-want-err", "Choose at least one thing you'd like."],
      timeline: ["f-timeline-err", "Choose when you'd like to start."]
    };

    var validateField = function (input) {
      var msg = rules[input.name](input.value);
      var err = document.getElementById(input.id + "-err");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
      return msg;
    };
    var validateGroup = function (name) {
      var picked = form.querySelectorAll('input[name="' + name + '"]:checked').length > 0;
      var msg = picked ? "" : groups[name][1];
      document.getElementById(groups[name][0]).textContent = msg;
      return msg;
    };

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      input.addEventListener("blur", function () { if (input.value) validateField(input); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
      });
    });
    Object.keys(groups).forEach(function (name) {
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (box) {
        box.addEventListener("change", function () {
          if (document.getElementById(groups[name][0]).textContent) validateGroup(name);
        });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = [];
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        var msg = validateField(input);
        if (msg) errors.push({ el: input, msg: msg });
      });
      Object.keys(groups).forEach(function (name) {
        var msg = validateGroup(name);
        if (msg) errors.push({ el: form.querySelector('input[name="' + name + '"]'), msg: msg });
      });

      if (errors.length) {
        summaryList.innerHTML = "";
        errors.forEach(function (er) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "#contact";
          a.textContent = er.msg;
          a.addEventListener("click", function (ev) { ev.preventDefault(); er.el.focus(); });
          li.appendChild(a);
          summaryList.appendChild(li);
        });
        summary.hidden = false;
        summary.focus();
        return;
      }
      summary.hidden = true;

      var data = new FormData(form);
      var list = function (name) { return data.getAll(name).join(", "); };
      var name = data.get("firstName").trim() + " " + data.get("lastName").trim();
      var lines = ["Design enquiry from abdesignandbuild.ae", "", "Name: " + name, "Phone: " + data.get("phone").trim(), "Email: " + data.get("email").trim(), "Community: " + data.get("area")];
      if (data.get("propertyType")) lines.push("Property: " + data.get("propertyType"));
      lines.push("Would like: " + list("want"));
      if (data.get("budget")) lines.push("Investment: " + data.get("budget"));
      lines.push("Start: " + data.get("timeline"));
      if (list("source")) lines.push("Found us via: " + list("source"));
      if (list("callTime")) lines.push("Best time to call: " + list("callTime"));
      if (data.get("message").trim()) lines.push("", data.get("message").trim());
      var text = lines.join("\n");

      var url = sendVia === "email"
        ? "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Design enquiry: " + name) + "&body=" + encodeURIComponent(text)
        : "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
      var opened = sendVia === "email" ? (window.location.href = url, true) : !!window.open(url, "_blank", "noopener");

      // Always offer a real link too: some phones and embedded previews block the automatic opening
      formStatus.innerHTML = "";
      formStatus.appendChild(document.createTextNode(opened
        ? (sendVia === "email" ? "Your email app should now be open with your enquiry ready to send. " : "WhatsApp should now be open with your enquiry ready. Press send there. ")
        : "Your enquiry is ready. "));
      var link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = sendVia === "email" ? "Open it in email" : "Open it in WhatsApp";
      formStatus.appendChild(link);
    });
  }
  /* ---------- Cost guide ----------
     Indicative STARTING ranges in AED, excluding VAT, at the "Refined" level.
     Edit these numbers to match A&B's own pricing. */
  var PRICING = {
    pool: { label: "Swimming pool", sizes: { plunge: [55000, 80000], family: [85000, 140000], large: [140000, 220000] } },
    landscape: { label: "Softscape & landscaping", perSqm: [120, 260] },
    shade: { label: "Pergola or shade", fixed: [18000, 40000] },
    kitchen: { label: "Outdoor kitchen", fixed: [22000, 55000] },
    lighting: { label: "Lighting & water features", fixed: [8000, 20000] },
    interior: { label: "Interior renovation", perSqm: [450, 900] }
  };
  var FINISH = { refined: 1, premium: 1.25, signature: 1.55 };

  var calcForm = document.querySelector("[data-calc-form]");
  var lastEstimate = "";
  if (calcForm) {
    var totalEl = document.querySelector("[data-calc-total]");
    var listEl = document.querySelector("[data-calc-breakdown]");
    var gardenOut = document.querySelector("[data-calc-garden-out]");
    var interiorOut = document.querySelector("[data-calc-interior-out]");
    var fmt = function (n) { return "AED " + n.toLocaleString("en-US"); };
    var roundDown = function (n) { return Math.floor(n / 5000) * 5000; };
    var roundUp = function (n) { return Math.ceil(n / 5000) * 5000; };

    var calculate = function () {
      var data = new FormData(calcForm);
      var items = data.getAll("item");
      var mult = FINISH[data.get("finish")] || 1;
      var garden = Number(data.get("garden"));
      var interior = Number(data.get("interior"));
      gardenOut.textContent = garden.toLocaleString("en-US") + " m²";
      interiorOut.textContent = interior.toLocaleString("en-US") + " m²";

      calcForm.querySelectorAll("[data-calc-for]").forEach(function (g) {
        g.hidden = items.indexOf(g.dataset.calcFor) === -1;
      });

      var lo = 0, hi = 0, lines = [];
      listEl.innerHTML = "";
      items.forEach(function (key) {
        var p = PRICING[key], range;
        if (p.sizes) range = p.sizes[data.get("poolSize")];
        else if (p.perSqm) range = [p.perSqm[0] * (key === "landscape" ? garden : interior), p.perSqm[1] * (key === "landscape" ? garden : interior)];
        else range = p.fixed;
        var a = roundDown(range[0] * mult), b = roundUp(range[1] * mult);
        lo += a; hi += b;
        var li = document.createElement("li");
        li.innerHTML = "<span></span><span></span>";
        li.firstChild.textContent = p.label;
        li.lastChild.textContent = fmt(a) + " – " + fmt(b);
        listEl.appendChild(li);
        lines.push(p.label + ": " + fmt(a) + " – " + fmt(b));
      });

      if (!items.length) {
        totalEl.textContent = "Choose at least one item";
        lastEstimate = "";
        return;
      }
      totalEl.innerHTML = "";
      totalEl.appendChild(document.createTextNode(fmt(lo)));
      var to = document.createElement("span");
      to.textContent = "to " + fmt(hi);
      totalEl.appendChild(to);
      lastEstimate = "Cost guide estimate (" + data.get("finish") + " finish): " + fmt(lo) + " to " + fmt(hi) + "\n" + lines.join("\n");
    };
    calcForm.addEventListener("input", calculate);
    calcForm.addEventListener("change", calculate);
    calculate();

    // Carry the estimate into the contact form
    var serviceMap = { pool: "Pool", landscape: "Softscape & planting", shade: "Pergola or shade", kitchen: "Outdoor kitchen & BBQ", lighting: "Garden lighting", interior: "Interior design & fit-out" };
    document.querySelector("[data-calc-cta]").addEventListener("click", function () {
      var contact = document.querySelector("[data-form]");
      if (contact) {
        new FormData(calcForm).getAll("item").forEach(function (key) {
          var box = contact.querySelector('input[name="want"][value="' + serviceMap[key] + '"]');
          if (box) box.checked = true;
        });
        if (lastEstimate && !contact.elements.message.value.trim()) contact.elements.message.value = lastEstimate;
      }
      document.getElementById("contact").scrollIntoView();
      var name = document.getElementById("f-first");
      if (name) name.focus({ preventScroll: true });
    });
  }

  /* ---------- Season popup: once per page view, at whichever comes first:
     a third of the way down the page, reaching the four steps, or 40 seconds on the page ---------- */
  var season = document.querySelector("[data-season]");
  if (season) {
    var seasonDone = false;
    var tryShow = function () {
      if (seasonDone) return;
      // Never interrupt someone typing, browsing photos or using the menu: wait and try again
      var busy = document.activeElement && document.activeElement.closest("form, [data-lightbox], [data-menu]");
      var otherDialog = document.querySelector("dialog[open]");
      var menuOpen = document.querySelector("[data-menu].is-open");
      if (busy || otherDialog || menuOpen) { setTimeout(tryShow, 4000); return; }
      seasonDone = true;
      window.removeEventListener("scroll", onSeasonScroll);
      try { season.showModal(); }
      catch (err) { season.setAttribute("open", ""); } // some embedded viewers refuse modal dialogs
    };
    var seasonQueued = false;
    var queueShow = function (delay) {
      if (seasonQueued || seasonDone) return;
      seasonQueued = true;
      setTimeout(tryShow, delay);
    };
    var steps = document.getElementById("start");
    var onSeasonScroll = function () {
      var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      var pastThird = maxScroll > 0 && window.scrollY / maxScroll > 0.33;
      var atSteps = steps && steps.getBoundingClientRect().top < window.innerHeight * 0.8;
      if (pastThird || atSteps) queueShow(1200);
    };
    window.addEventListener("scroll", onSeasonScroll, { passive: true });
    setTimeout(function () { queueShow(0); }, 40000);

    var closeSeason = function () { if (typeof season.close === "function") season.close(); else season.removeAttribute("open"); };
    season.querySelectorAll("[data-season-close]").forEach(function (b) {
      b.addEventListener("click", closeSeason);
    });
    season.querySelector("[data-season-cta]").addEventListener("click", closeSeason);
    season.addEventListener("click", function (e) {
      // Clicking the dimmed page beside the panel closes it
      var r = season.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) season.close();
    });
  }

  /* ---------- Craft clips: play only while on screen; one button pauses them all ---------- */
  var clips = Array.prototype.slice.call(document.querySelectorAll("[data-craft-video]"));
  var craftToggle = document.querySelector("[data-craft-toggle]");
  if (clips.length && craftToggle) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var paused = reduce;
    var visible = new Set();
    var sync = function () {
      clips.forEach(function (v) {
        if (!paused && visible.has(v)) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
      craftToggle.textContent = paused ? "Play videos" : "Pause videos";
      craftToggle.setAttribute("aria-pressed", String(paused));
    };
    craftToggle.addEventListener("click", function () { paused = !paused; sync(); });
    if ("IntersectionObserver" in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.preload = "auto"; visible.add(e.target); }
          else visible.delete(e.target);
        });
        sync();
      }, { threshold: 0.25 });
      clips.forEach(function (v) { vio.observe(v); });
    }
    sync();
  }

  /* ---------- Footer year ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();

// main.js - shopping cart for the Pokémon: I Choose You! site
// Cart is saved in localStorage so every page shares the same cart.
(function () {
  "use strict";

  var KEY = "pokemonIChooseYouCart";

  // Storage 

  // Load the cart; ignore bad/old data and keep only valid items
  function load() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { return {}; }
    var clean = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { return clean; }
    Object.keys(raw).forEach(function (k) {
      var it = raw[k];
      if (it && typeof it === "object" &&
          isFinite(it.qty) && it.qty >= 1 && isFinite(it.price) && it.price >= 0) {
        clean[k] = {
          name: String(it.name || "Item"),
          price: Number(it.price),
          img: String(it.img || ""),
          qty: Math.floor(it.qty)
        };
      }
    });
    return clean;
  }

  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
  }

  var cart = load();

  // Helpers

  function count() { var n = 0; for (var k in cart) { n += cart[k].qty; } return n; }
  function total() { var t = 0; for (var k in cart) { t += cart[k].qty * cart[k].price; } return t; }
  function fmt(n) { return "PHP " + n.toLocaleString(); }

  // Create an element with optional class and text 
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  // Create a small button that carries an action and an item id
  function actBtn(cls, act, id, label, text) {
    var b = el("button", cls, text);
    b.type = "button";
    b.setAttribute("data-act", act);
    b.setAttribute("data-id", id);
    b.setAttribute("aria-label", label);
    return b;
  }

  // Find the picture on the product card that has this product id
  function cardImage(id) {
    var btns = document.querySelectorAll(".add-to-cart");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].dataset.id === id) {
        var card = btns[i].closest(".product-card");
        var pic = card && card.querySelector("img");
        return pic ? pic.getAttribute("src") : "";
      }
    }
    return "";
  }

  // Update every cart badge in the navigation
  function badge() {
    var els = document.querySelectorAll(".cart-count");
    for (var i = 0; i < els.length; i++) { els[i].textContent = count(); }
  }

  // Rendering

  function render() {
    badge();
    var list = document.getElementById("cartList");
    if (!list) { return; } // not the products page

    list.innerHTML = "";
    var keys = Object.keys(cart);

    var empty = document.getElementById("cartEmpty");
    if (empty) { empty.style.display = keys.length ? "none" : "block"; }

    keys.forEach(function (k) {
      var it = cart[k];
      var li = el("li", "list-group-item d-flex align-items-center gap-3");

      // Use the picture shown on the product card, so the cart image always
      var img = el("img", "rounded object-fit-cover");
      img.src = cardImage(k) || it.img;
      img.alt = ""; img.width = 56; img.height = 56;
      img.onerror = function () { this.onerror = null; this.src = PLACEHOLDER; };

      var info = el("div", "flex-grow-1");
      info.appendChild(el("div", "fw-bold", it.name));
      info.appendChild(el("div", "small text-muted", fmt(it.price)));

      var group = el("div", "btn-group btn-group-sm mt-1");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Quantity");
      group.appendChild(actBtn("btn btn-outline-secondary", "dec", k, "Decrease", "-"));
      group.appendChild(el("span", "btn btn-light disabled", it.qty));
      group.appendChild(actBtn("btn btn-outline-secondary", "inc", k, "Increase", "+"));
      info.appendChild(group);

      li.appendChild(img);
      li.appendChild(info);
      li.appendChild(actBtn("btn-close", "rm", k, "Remove " + it.name));
      list.appendChild(li);
    });

    var tot = document.getElementById("cartTotal");
    if (tot) { tot.textContent = fmt(total()); }
  }

  // Events 
  document.addEventListener("click", function (e) {
    if (!e.target.closest) { return; }

    // Add to cart
    var add = e.target.closest(".add-to-cart");
    if (add) {
      var id = add.dataset.id;
      var price = Number(add.dataset.price);
      if (!id || !isFinite(price)) { return; } // ignore a button with missing data
      if (!cart[id]) {
        cart[id] = { name: add.dataset.name || "Item", price: price, img: add.dataset.img || "", qty: 0 };
      }
      cart[id].qty += 1;
      save(cart); render();

      var t = document.getElementById("cartToast");
      var body = document.getElementById("cartToastBody");
      if (t && body && window.bootstrap) {
        body.textContent = cart[id].name + " added to cart.";
        window.bootstrap.Toast.getOrCreateInstance(t, { delay: 1800 }).show();
      }
      return;
    }

    // Plus, minus and remove buttons inside the cart list
    var b = e.target.closest("[data-act]");
    if (b) {
      var k = b.dataset.id, a = b.dataset.act;
      if (!cart[k]) { render(); return; } // item no longer exists
      if (a === "inc") { cart[k].qty += 1; }
      if (a === "dec") { cart[k].qty -= 1; if (cart[k].qty < 1) { delete cart[k]; } }
      if (a === "rm") { delete cart[k]; }
      save(cart); render();
      return;
    }

    // Clear cart 
    if (e.target.closest("#clearBtn")) {
      cart = {}; save(cart); render();
      return;
    }

    // Checkout
    if (e.target.closest("#checkoutBtn")) {
      if (!count()) { alert("Your cart is empty."); return; }
      alert("Thank you! This is a sample store, so no real order was placed. Total: " + fmt(total()));
      cart = {}; save(cart); render();
    }
  });

  // Keep the badge in sync when the cart changes in another tab
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) { cart = load(); render(); }
  });

  render();
})();

// Picture grid: inserts 12 pictures with JavaScript
// Pages without that div are not affected.
(function () {
  "use strict";

  var grid = document.getElementById("pictureGrid");
  if (!grid) { return; }

  var folder = "media/img/";   // folder that holds the pictures
  var total = 12;              // how many pictures to insert

  // Loop from 1 to 12 
  for (var i = 1; i <= total; i++) {
    var col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";   // 2 / 3 / 4 pictures per row

    var img = document.createElement("img");
    img.src = folder + "pic-" + i + ".jpg";      // change the name
    img.alt = "Picture " + i;
    img.className = "img-fluid rounded shadow-sm";
    img.width = 400;
    img.height = 300;
    img.loading = "lazy";

    col.appendChild(img);
    grid.appendChild(col);
  }
})();
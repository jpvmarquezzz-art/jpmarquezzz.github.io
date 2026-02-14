const { createApp } = Vue;

const STORAGE = {
  users: "mc_users",
  session: "mc_session",
  cart: "mc_cart",
  orders: "mc_orders",
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function moneyPHP(n) {
  const num = Number(n || 0);
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function nowISO() {
  return new Date().toISOString();
}
function getPage() {
  const meta = document.querySelector('meta[name="app-page"]');
  return meta?.content?.trim() || "home";
}

createApp({
  data() {
    return {
      page: getPage(),

      companyName: "Marquezcents Co.",
      tagline: "Luxury Men's Fragrances",
      supportEmail: "contactsupport@marquezcentsco.com",
      year: new Date().getFullYear(),

      users: readJSON(STORAGE.users, []),
      session: readJSON(STORAGE.session, null),
      cart: readJSON(STORAGE.cart, []),
      orders: readJSON(STORAGE.orders, []),

      products: [
        { id: "p1", name: "Tom Ford - Oud Wood Eau de Parfum", price: 16478, img: "images/perfume1.jpg" },
        { id: "p2", name: "Byredo - Bibliotheque EDP Spray", price: 4853, img: "images/perfume2.jpg" },
        { id: "p3", name: "Ralph Lauren Fragrances", price: 5990, img: "images/perfume3.jpg" },
      ],

      signupForm: { name: "", email: "", password: "", confirm: "" },
      loginForm: { email: "", password: "" },
      profileForm: { name: "", email: "" },
      checkoutForm: { fullName: "", email: "", address: "", paymentMethod: "COD" },

      notice: "",
      error: "",
    };
  },

  computed: {
    fmtMoney() {
      return moneyPHP;
    },
    isLoggedIn() {
      return !!this.session?.userId;
    },
    currentUser() {
      if (!this.session?.userId) return null;
      return this.users.find(u => u.id === this.session.userId) || null;
    },

    cartCount() {
      return this.cart.reduce((sum, i) => sum + i.qty, 0);
    },
    cartSubtotal() {
      return this.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    cartShipping() {
      return this.cart.length ? 150 : 0;
    },
    cartTotal() {
      return this.cartSubtotal + this.cartShipping;
    },

    // These hrefs MUST match your filenames exactly.
    navLinks() {
      const base = [
        { href: "index.html", text: "Home", page: "home" },
        { href: "products.html", text: "Products", page: "products" },
        { href: "cart.html", text: "Cart", page: "cart", badge: this.cartCount },
        { href: "transaction.html", text: "Transactions", page: "transaction", auth: true },
      ];

      const auth = this.isLoggedIn
        ? [
            { href: "profile.html", text: "Profile", page: "profile", auth: true },
            { href: "#", text: "Logout", page: "logout", action: "logout" },
          ]
        : [
            { href: "login.html", text: "Login", page: "login" },
            { href: "signup.html", text: "Sign Up", page: "signup" },
          ];

      const filteredBase = base.filter(l => !l.auth || this.isLoggedIn);
      return [...filteredBase, ...auth];
    },

    transactionsForUser() {
      if (!this.currentUser) return [];
      return this.orders
        .filter(o => o.userId === this.currentUser.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },

    receiptOrder() {
      const id = new URLSearchParams(window.location.search).get("orderId") || "";
      if (!id) return null;
      return this.orders.find(o => o.id === id) || null;
    },
  },

  methods: {
    clearMessages() {
      this.notice = "";
      this.error = "";
    },
    setNotice(msg) {
      this.notice = msg;
      this.error = "";
    },
    setError(msg) {
      this.error = msg;
      this.notice = "";
    },
    persistAll() {
      writeJSON(STORAGE.users, this.users);
      writeJSON(STORAGE.session, this.session);
      writeJSON(STORAGE.cart, this.cart);
      writeJSON(STORAGE.orders, this.orders);
    },

    // Only used for action links (logout). Normal links use plain href navigation.
    handleNav(link) {
      if (link.action === "logout") this.logout();
    },

    requireAuth(redirectBackTo) {
      if (this.isLoggedIn) return true;
      localStorage.setItem("mc_redirect_after_login", redirectBackTo);
      window.location.href = "login.html";
      return false;
    },

    signup() {
      this.clearMessages();
      const { name, email, password, confirm } = this.signupForm;

      if (!name.trim()) return this.setError("Name is required.");
      if (!email.trim()) return this.setError("Email is required.");
      if (!password) return this.setError("Password is required.");
      if (password.length < 6) return this.setError("Password must be at least 6 characters.");
      if (password !== confirm) return this.setError("Passwords do not match.");

      const exists = this.users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) return this.setError("Email is already registered.");

      const newUser = {
        id: uid("user"),
        name: name.trim(),
        email: email.trim(),
        password, // demo only
        createdAt: nowISO(),
      };

      this.users.push(newUser);
      this.persistAll();

      this.notice = "Account created! Redirecting to login...";
      setTimeout(() => (window.location.href = "login.html"), 500);
    },

    login() {
      this.clearMessages();
      const { email, password } = this.loginForm;

      const user = this.users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!user) return this.setError("Invalid email or password.");

      this.session = { userId: user.id, createdAt: nowISO() };
      this.persistAll();

      const redirect = localStorage.getItem("mc_redirect_after_login");
      if (redirect) {
        localStorage.removeItem("mc_redirect_after_login");
        window.location.href = redirect;
      } else {
        window.location.href = "products.html";
      }
    },

    logout() {
      this.session = null;
      this.persistAll();
      window.location.href = "login.html";
    },

    loadProfileForm() {
      if (!this.currentUser) return;
      this.profileForm.name = this.currentUser.name;
      this.profileForm.email = this.currentUser.email;
    },

    updateProfile() {
      this.clearMessages();
      if (!this.currentUser) return this.setError("Not logged in.");

      const name = this.profileForm.name.trim();
      const email = this.profileForm.email.trim();
      if (!name) return this.setError("Name is required.");
      if (!email) return this.setError("Email is required.");

      const emailTaken = this.users.some(
        u => u.email.toLowerCase() === email.toLowerCase() && u.id !== this.currentUser.id
      );
      if (emailTaken) return this.setError("Email is already used by another account.");

      const idx = this.users.findIndex(u => u.id === this.currentUser.id);
      this.users[idx] = { ...this.users[idx], name, email };
      this.persistAll();
      this.setNotice("Profile updated successfully.");
    },

    addToCart(product) {
      this.clearMessages();
      const existing = this.cart.find(i => i.productId === product.id);
      if (existing) existing.qty += 1;
      else {
        this.cart.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          img: product.img,
          qty: 1,
        });
      }
      this.persistAll();
      this.setNotice("Added to cart.");
    },

    removeFromCart(productId) {
      this.cart = this.cart.filter(i => i.productId !== productId);
      this.persistAll();
    },

    updateQty(productId, qty) {
      const item = this.cart.find(i => i.productId === productId);
      if (!item) return;
      const q = Math.floor(Number(qty));
      if (!Number.isFinite(q) || q < 1) return;
      item.qty = q;
      this.persistAll();
    },

    clearCart() {
      this.cart = [];
      this.persistAll();
      this.setNotice("Cart cleared.");
    },

    checkout() {
      this.clearMessages();
      if (!this.requireAuth("cart.html")) return;
      if (!this.cart.length) return this.setError("Your cart is empty.");

      const f = this.checkoutForm;
      if (!f.fullName.trim()) return this.setError("Full name is required.");
      if (!f.email.trim()) return this.setError("Email is required.");
      if (!f.address.trim()) return this.setError("Address is required.");

      const order = {
        id: uid("order"),
        userId: this.currentUser.id,
        createdAt: nowISO(),
        status: "Paid",
        paymentMethod: f.paymentMethod,
        shippingFee: this.cartShipping,
        subtotal: this.cartSubtotal,
        total: this.cartTotal,
        customer: {
          fullName: f.fullName.trim(),
          email: f.email.trim(),
          address: f.address.trim(),
        },
        items: this.cart.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          lineTotal: i.price * i.qty,
        })),
      };

      this.orders.push(order);
      this.cart = [];
      this.checkoutForm = { fullName: "", email: "", address: "", paymentMethod: "COD" };
      this.persistAll();

      window.location.href = `receipt.html?orderId=${encodeURIComponent(order.id)}`;
    },

    goToReceipt(orderId) {
      window.location.href = `receipt.html?orderId=${encodeURIComponent(orderId)}`;
    },
  },

  mounted() {
    if (["profile", "transaction", "receipt"].includes(this.page)) {
      this.requireAuth(`${this.page}.html`);
    }
    if (this.page === "profile" && this.currentUser) {
      this.loadProfileForm();
    }
  },
}).mount("#app");

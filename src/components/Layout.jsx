import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import CartDrawer from "./CartDrawer.jsx";
import Footer from "./Footer.jsx";

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Header onOpenCart={() => setOpen(true)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
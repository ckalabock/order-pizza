import React from "react";
import { Link } from "react-router-dom";

export default function EmptyState({ title, desc }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
      <div className="text-lg font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <Link
        to="/menu"
        className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
      >
        Перейти в меню
      </Link>
    </div>
  );
}
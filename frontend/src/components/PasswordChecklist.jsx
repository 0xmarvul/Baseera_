import React from "react";
import { passwordChecks } from "../utils/passwordPolicy";
import "./PasswordChecklist.css";

// Live checklist that updates as the user types. Each rule turns green when satisfied.
// Hidden completely when password is empty so the form isn't noisy at first sight.
function PasswordChecklist({ password }) {
  if (!password) return null;
  const c = passwordChecks(password);

  const items = [
    { ok: c.length, label: "At least 8 characters" },
    { ok: c.upper, label: "Uppercase letter (A-Z)" },
    { ok: c.lower, label: "Lowercase letter (a-z)" },
    { ok: c.digit, label: "Number (0-9)" },
    { ok: c.special, label: "Special character (!@#$ etc.)" },
  ];

  return (
    <ul className="pw-checklist" aria-label="Password requirements">
      {items.map((it, i) => (
        <li
          key={i}
          className={`pw-checklist-item ${it.ok ? "pw-ok" : "pw-pending"}`}
          aria-checked={it.ok}
          role="checkbox"
        >
          <span className="pw-icon" aria-hidden="true">
            {it.ok ? "✓" : "•"}
          </span>
          <span className="pw-label">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

export default PasswordChecklist;

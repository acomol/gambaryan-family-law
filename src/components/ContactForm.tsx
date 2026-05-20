"use client";

import { useState } from "react";

const PROJECT_TYPES = [
  { value: "", label: "Sélectionnez..." },
  { value: "residentiel", label: "Résidentiel" },
  { value: "commercial", label: "Commercial" },
  { value: "institutionnel", label: "Institutionnel" },
  { value: "autre", label: "Autre" },
] as const;

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    projectType: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Visual only — no real submission
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#B4B4B4",
    marginBottom: 8,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 400,
    padding: "12px 0",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
  };

  return (
    <section
      id="contact"
      className="bg-cargo-dark"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20">
          {/* ---- Left column ---- */}
          <div className="lg:col-span-5">
            <h2
              className="text-white"
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              D&eacute;butez un projet
            </h2>

            {/* decorative line */}
            <div
              style={{
                width: 60,
                height: 1,
                backgroundColor: "#FFFFFF",
                marginTop: 24,
                marginBottom: 24,
              }}
            />

            <p
              style={{
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.7,
                color: "#B4B4B4",
                maxWidth: 360,
              }}
            >
              La cueillette de ces informations &eacute;tant la premi&egrave;re
              &eacute;tape d&rsquo;un projet d&rsquo;architecture, nous vous
              invitons &agrave; remplir le formulaire ou &agrave; prendre
              rendez-vous avec nous.
            </p>

            <a
              href="mailto:contact@cargoarchitecture.ca"
              className="inline-block text-white hover:opacity-70 transition-opacity"
              style={{
                fontSize: 14,
                fontWeight: 400,
                textDecoration: "underline",
                textUnderlineOffset: 4,
                marginTop: 20,
              }}
            >
              Planifier une rencontre
            </a>
          </div>

          {/* ---- Right column — form ---- */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Name */}
              <div>
                <label htmlFor="cf-name" style={labelStyle}>
                  Quel est votre nom?
                </label>
                <input
                  id="cf-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Votre nom complet"
                  autoComplete="name"
                  style={inputStyle}
                  className="placeholder:text-cargo-muted focus:border-b-white"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="cf-email" style={labelStyle}>
                  Votre courriel
                </label>
                <input
                  id="cf-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nom@exemple.ca"
                  autoComplete="email"
                  style={inputStyle}
                  className="placeholder:text-cargo-muted focus:border-b-white"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="cf-phone" style={labelStyle}>
                  Votre t&eacute;l&eacute;phone
                </label>
                <input
                  id="cf-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(418) 000-0000"
                  autoComplete="tel"
                  style={inputStyle}
                  className="placeholder:text-cargo-muted focus:border-b-white"
                />
              </div>

              {/* Project type */}
              <div>
                <label htmlFor="cf-project" style={labelStyle}>
                  Type de projet
                </label>
                <select
                  id="cf-project"
                  name="projectType"
                  value={form.projectType}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23B4B4B4' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 4px center",
                    paddingRight: 24,
                    cursor: "pointer",
                  }}
                >
                  {PROJECT_TYPES.map((t) => (
                    <option
                      key={t.value}
                      value={t.value}
                      style={{ backgroundColor: "#1D1D1D", color: "#FFFFFF" }}
                    >
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="cf-message" style={labelStyle}>
                  Message
                </label>
                <textarea
                  id="cf-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="D&eacute;crivez votre projet..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 80,
                  }}
                  className="placeholder:text-cargo-muted focus:border-b-white"
                />
              </div>

              {/* Submit */}
              <div style={{ marginTop: 8 }}>
                <button
                  type="submit"
                  className="border border-white text-white hover:bg-white hover:text-cargo-dark transition-colors duration-300 cursor-pointer"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "14px 40px",
                    background: "transparent",
                    fontFamily: "inherit",
                  }}
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

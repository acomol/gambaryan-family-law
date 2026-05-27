"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    where: "",
    when: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <section id="contact" className="bg-[var(--color-mh-dark)] py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-lg shadow-2xl">
          {/* Left side — image placeholder */}
          <div
            className="hidden lg:block lg:w-[30%] relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,25,31,0.95) 0%, rgba(240,174,31,0.15) 100%)",
            }}
          >
            <div className="absolute inset-0 flex items-end justify-center p-8">
              <div
                className="w-full h-[80%] rounded-t-full"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(240,174,31,0.08) 0%, rgba(20,25,31,0.6) 100%)",
                  border: "1px solid rgba(240,174,31,0.1)",
                }}
              />
            </div>
            {/* Overlay text */}
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-white/60 text-sm font-[var(--font-body)]">
                Fighting for Alabama families since 1987
              </p>
            </div>
          </div>

          {/* Right side — form */}
          <div className="flex-1 bg-white p-8 lg:p-12">
            {/* Heading */}
            <h2
              className="font-serif italic text-[var(--color-mh-dark)] mb-2"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1 }}
            >
              Get Help Today
            </h2>
            <p className="text-[var(--color-mh-dark)] text-lg font-semibold mb-6">
              Consultations Are Always Free!
            </p>

            {/* Office numbers */}
            <div className="mb-8 pb-6 border-b border-gray-200">
              <p className="text-[var(--color-mh-gray)] text-sm mb-3">
                For faster assistance, call one of our offices directly.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href="tel:2564488523"
                  className="text-[var(--color-mh-dark)] font-semibold hover:text-[var(--color-mh-gold)] transition-colors"
                >
                  Huntsville{" "}
                  <span className="font-normal">(256) 448-8523</span>
                </a>
                <a
                  href="tel:2563335000"
                  className="text-[var(--color-mh-dark)] font-semibold hover:text-[var(--color-mh-gold)] transition-colors"
                >
                  Florence{" "}
                  <span className="font-normal">(256) 333-5000</span>
                </a>
                <a
                  href="tel:2566166616"
                  className="text-[var(--color-mh-dark)] font-semibold hover:text-[var(--color-mh-gold)] transition-colors"
                >
                  Athens{" "}
                  <span className="font-normal">(256) 616-6616</span>
                </a>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    Where did the injury happen?
                  </label>
                  <input
                    type="text"
                    name="where"
                    value={form.where}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                    When did the injury happen?
                  </label>
                  <input
                    type="text"
                    name="when"
                    value={form.when}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-mh-gray)] uppercase tracking-wide mb-1">
                  Tell us briefly how you were injured{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-[var(--color-mh-dark)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-mh-gold)] focus:border-transparent transition resize-y"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-4 bg-[var(--color-mh-gold)] hover:bg-[var(--color-mh-gold-light)] text-[var(--color-mh-dark)] font-bold text-lg uppercase tracking-wider rounded-md transition-colors duration-200 cursor-pointer"
              >
                GET HELP NOW
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

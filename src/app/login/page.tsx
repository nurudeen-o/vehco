"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Car, Shield, Lock, User } from "lucide-react";
import { AppLogo } from "@/components/shared/AppLogo";

const DEMO_CREDENTIALS = [
  {
    role: "Superadmin",
    name: "Chinedu Okonkwo",
    email: "ceo@facotransport.com",
    password: "ceo_facotransport_2026",
    desc: "Full access · Workflow config · Analytics",
    color: "bg-[#0F6B4B] text-white border-[#0F6B4B]",
    badge: "bg-[#F4B400] text-slate-900",
  },
  {
    role: "Admin",
    name: "Amina Bello",
    email: "manager@facotransport.com",
    password: "mgr_facotransport_2026",
    desc: "Approvals · Reports · Operational review",
    color: "bg-slate-800 text-white border-slate-800",
    badge: "bg-slate-200 text-slate-800",
  },
  {
    role: "Secretary",
    name: "Tunde Adebayo",
    email: "secretary@facotransport.com",
    password: "sec_facotransport_2026",
    desc: "Data entry · Vehicle & driver registration",
    color: "bg-white text-slate-800 border-slate-300",
    badge: "bg-emerald-100 text-emerald-800",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const populateCredentials = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Authentication failed.");
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 flex-col justify-between p-12">
        <AppLogo size={48} showText dark />

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Centralized fleet
              <br />
              operations at scale.
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Manage vehicles, drivers, maintenance, approvals,
              and QR-based identification, all from one secure platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Vehicle Tracking", icon: "🚗" },
              { label: "Maintenance Logs", icon: "🔧" },
              { label: "QR Identification", icon: "📱" },
              { label: "Approval Workflow", icon: "✅" },
              { label: "Audit Logs", icon: "📋" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2.5"
              >
                <span className="text-base">{f.icon}</span>
                <span className="text-xs font-medium text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-600">
          © {new Date().getFullYear()} Faco Transport · Faco Vehicle Mgt App
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-6">
            <AppLogo size={44} showText />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your credentials or click a demo role below.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Demo Accounts: Click to Auto-fill
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => populateCredentials(cred)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${cred.color}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{cred.name}</p>
                      <p className="text-[11px] opacity-70">{cred.desc}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cred.badge}`}>
                    {cred.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium">OR ENTER MANUALLY</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Email Address
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@facotransport.com"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] focus:border-[#0F6B4B] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] focus:border-[#0F6B4B] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0F6B4B] hover:bg-[#0c573d] text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                "Sign In to Faco Vehicle Mgt App"
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400">
            This is a secured internal system. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}

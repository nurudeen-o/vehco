"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Car, User, Receipt, Wrench } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SearchResults {
  vehicles: Array<{
    id: string;
    code: string;
    name: string;
    registrationNumber: string;
    status: string;
  }>;
  drivers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    licenseNumber: string;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    amount: number;
    description: string;
    date: string;
  }>;
  maintenance: Array<{
    id: string;
    serviceType: string;
    totalCost: number;
    vendor: string | null;
    status: string;
  }>;
}

const emptyResults: SearchResults = {
  vehicles: [],
  drivers: [],
  expenses: [],
  maintenance: [],
};

interface GlobalSearchProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function GlobalSearch({ isMobile = false, onCloseMobile }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalResults =
    results.vehicles.length +
    results.drivers.length +
    results.expenses.length +
    results.maintenance.length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
        if (isMobile && onCloseMobile) onCloseMobile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, onCloseMobile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) {
      setResults(emptyResults);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        fallbackOfflineSearch(term);
      }
    } catch {
      fallbackOfflineSearch(term);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fallbackOfflineSearch = async (term: string) => {
    try {
      const { cacheGet } = await import("@/lib/offline/db");
      const lower = term.toLowerCase();

      const [cachedVehicles, cachedDrivers, cachedExpenses, cachedMaint] = await Promise.all([
        cacheGet<any[]>("/api/vehicles").catch(() => []),
        cacheGet<any[]>("/api/drivers").catch(() => []),
        cacheGet<any[]>("/api/expenses").catch(() => []),
        cacheGet<any[]>("/api/maintenance").catch(() => []),
      ]);

      const filteredVehicles = (cachedVehicles || [])
        .filter((v: any) =>
          (v.code || "").toLowerCase().includes(lower) ||
          (v.name || "").toLowerCase().includes(lower) ||
          (v.registrationNumber || "").toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          registrationNumber: v.registrationNumber,
          status: v.status,
        }));

      const filteredDrivers = (cachedDrivers || [])
        .filter((d: any) =>
          `${d.firstName || ""} ${d.lastName || ""}`.toLowerCase().includes(lower) ||
          (d.licenseNumber || "").toLowerCase().includes(lower) ||
          (d.phone || "").toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((d: any) => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          licenseNumber: d.licenseNumber,
        }));

      const filteredExpenses = (cachedExpenses || [])
        .filter((exp: any) =>
          (exp.description || "").toLowerCase().includes(lower) ||
          (exp.category || "").toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((exp: any) => ({
          id: exp.id,
          category: exp.category,
          amount: exp.amount,
          description: exp.description,
          date: exp.date,
        }));

      const filteredMaint = (cachedMaint || [])
        .filter((m: any) =>
          (m.serviceType || "").toLowerCase().includes(lower) ||
          (m.vendor || "").toLowerCase().includes(lower)
        )
        .slice(0, 5)
        .map((m: any) => ({
          id: m.id,
          serviceType: m.serviceType,
          totalCost: m.totalCost,
          vendor: m.vendor,
          status: m.status,
        }));

      setResults({
        vehicles: filteredVehicles,
        drivers: filteredDrivers,
        expenses: filteredExpenses,
        maintenance: filteredMaint,
      });
    } catch {
      setResults(emptyResults);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults(emptyResults);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
    router.push(href);
  };

  const handleClear = () => {
    setQuery("");
    setResults(emptyResults);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      data-tour={!isMobile ? "header-search" : undefined}
      className={`relative ${isMobile ? "w-full" : "hidden md:block w-52 lg:w-72"}`}
    >
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search vehicles, drivers, expenses..."
          className="w-full pl-9 pr-14 py-1.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B4B] focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!isMobile && !query && (
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/80 rounded border border-slate-300">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Flyout Search Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isLoading && totalResults === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              Searching database...
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-400 mt-1">Try vehicle codes (e.g. VEH-001), plates, or driver names</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 py-1">
              {/* Vehicles */}
              {results.vehicles.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Car className="w-3 h-3 text-[#0F6B4B]" /> Vehicles ({results.vehicles.length})
                  </div>
                  {results.vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelect(`/vehicles/${v.id}`)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0F6B4B] truncate">
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded mr-1.5 text-slate-700">
                            {v.code}
                          </span>
                          {v.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Plate: <span className="font-mono">{v.registrationNumber}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#0F6B4B] shrink-0 uppercase">
                        {v.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Drivers */}
              {results.drivers.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#0F6B4B]" /> Drivers ({results.drivers.length})
                  </div>
                  {results.drivers.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSelect(`/drivers/${d.id}`)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0F6B4B] truncate">
                          {d.firstName} {d.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Tel: {d.phone} &bull; Lic: <span className="font-mono">{d.licenseNumber}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Expenses */}
              {results.expenses.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Receipt className="w-3 h-3 text-[#0F6B4B]" /> Expenses ({results.expenses.length})
                  </div>
                  {results.expenses.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => handleSelect(`/expenses/${exp.id}`)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0F6B4B] truncate">
                          {exp.description || exp.category}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {exp.category} &bull; {formatDate(exp.date)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 shrink-0">
                        {formatCurrency(exp.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Maintenance */}
              {results.maintenance.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-[#0F6B4B]" /> Maintenance ({results.maintenance.length})
                  </div>
                  {results.maintenance.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(`/maintenance/${m.id}`)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0F6B4B] truncate">
                          {m.serviceType}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {m.vendor ? `Garage: ${m.vendor}` : "In-House Service"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 shrink-0">
                        {formatCurrency(m.totalCost)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { Shield, Building2, FileText, ArrowLeft } from 'lucide-react';

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* Platform Master Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur border-b border-[var(--border)] px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/master"
              className="flex items-center gap-2.5 font-bold tracking-tight text-base sm:text-lg hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">Platform Master</span>
                <span className="text-[10px] text-indigo-500 font-semibold tracking-wider uppercase">Console</span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1.5 ml-6 pl-6 border-l border-[var(--border)] text-sm">
              <Link
                href="/master"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Organizations
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden md:flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Customer App
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
        BioMetric Dashboard Platform Master Control Room · Confidential &amp; Append-Only Audit Logging
      </footer>
    </div>
  );
}

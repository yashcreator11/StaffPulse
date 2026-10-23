'use client';
import { useState, useMemo } from 'react';
import { ArrowRight, Save, CheckCircle2, Calendar, Cpu } from 'lucide-react';
import { ColumnMapping } from '@/lib/types';
import { REQUIRED_STANDARD_FIELDS, OPTIONAL_STANDARD_FIELDS, FIELD_LABELS } from '@/lib/validateFile';
import { autoMatchColumns } from '@/lib/columnMatch';
import { VENDOR_TEMPLATES } from '@/lib/vendorTemplates';

interface ColumnMappingScreenProps {
  officeCode: string;
  csvHeaders: string[];
  initialMapping?: Partial<ColumnMapping>; // A8: pre-fill when re-opened from Settings
  onSave: (mapping: ColumnMapping) => void;
  onCancel?: () => void;
}

type DateFormat = 'DMY' | 'MDY' | 'YMD';

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; example: string; desc: string }[] = [
  { value: 'DMY', label: 'DD/MM/YYYY', example: '01/07/2026', desc: 'Day first — Indian biometric default' },
  { value: 'MDY', label: 'MM/DD/YYYY', example: '07/01/2026', desc: 'Month first — US / some software exports' },
  { value: 'YMD', label: 'YYYY-MM-DD', example: '2026-07-01', desc: 'ISO standard (auto-detected)' },
];

export default function ColumnMappingScreen({ officeCode, csvHeaders, initialMapping, onSave, onCancel }: ColumnMappingScreenProps) {
  const auto = useMemo(() => autoMatchColumns(csvHeaders), [csvHeaders]);

  const [vendorPreset, setVendorPreset] = useState<string>(
    initialMapping?.vendorPreset || auto.detectedVendor?.id || 'custom'
  );

  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(() => ({
    ...auto.mapping,
    ...(initialMapping || {}),
  }));

  const [autoMatchedFields] = useState<Set<keyof ColumnMapping>>(
    () => new Set(initialMapping ? [] : auto.autoMatched)
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>(
    (initialMapping?.dateFormat as DateFormat | undefined) ?? (auto.detectedVendor?.defaultDateFormat || 'DMY')
  );

  function applyPreset(presetId: string) {
    setVendorPreset(presetId);
    setError(null);
    const template = VENDOR_TEMPLATES[presetId];
    if (template) {
      setDateFormat(template.defaultDateFormat);
      // Attempt to map template columns to actual csvHeaders if exact or fuzzy match exists
      const updated: Partial<ColumnMapping> = { ...mapping, vendorPreset: presetId };
      for (const [key, standardName] of Object.entries(template.mapping)) {
        if (key === 'dateFormat' || key === 'vendorPreset') continue;
        const matchingHeader = csvHeaders.find(
          h => h.trim().toLowerCase() === String(standardName).trim().toLowerCase()
        );
        if (matchingHeader) {
          (updated as Record<string, string>)[key] = matchingHeader;
        }
      }
      setMapping(updated);
    }
  }

  function handleSave() {
    const missing = REQUIRED_STANDARD_FIELDS.filter(f => !mapping[f]);
    if (missing.length > 0) {
      setTouched(new Set(missing));
      setError(`Please map: ${missing.map(f => FIELD_LABELS[f]).join(', ')}`);
      return;
    }
    onSave({
      ...(mapping as ColumnMapping),
      dateFormat,
      vendorPreset,
    });
  }

  const extraCols = auto.unmatchedHeaders;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-xs font-medium mb-3">
            {initialMapping ? `Remapping ${officeCode}` : `First upload for ${officeCode}`}
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Map your columns</h2>
          <p className="text-[var(--text-muted)] text-sm">
            We&apos;ve pre-matched recognizable biometric headers. Review and adjust below. This is saved per office.
          </p>
        </div>

        {/* ── Hardware Preset Profile ────────────────────────────────────── */}
        <div className="mb-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/80">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Biometric Device Profile</span>
            </div>
            {auto.detectedVendor && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Auto-detected: {auto.detectedVendor.name}
              </span>
            )}
          </div>
          <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Select Device Vendor / Software:
                </label>
                <select
                  value={vendorPreset}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 border border-[var(--border)] w-full focus:outline-none focus:border-blue-500"
                >
                  <option value="custom">Custom / Generic Biometric CSV</option>
                  <option value="essl">eSSL (eTimeTrackLite / SilkBio)</option>
                  <option value="zkteco">ZKTeco (BioTime / uFace)</option>
                  <option value="matrix">Matrix COSEC (CENTRA / VEGA)</option>
                  <option value="realtime">Realtime (T502 / BioOffice)</option>
                  <option value="hikvision">Hikvision (IVMS-4200 / HikCentral)</option>
                </select>
              </div>
              <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                Loading a profile pre-populates the standard column aliases and default date format for your hardware export.
              </p>
            </div>
          </div>
        </div>

        {/* ── Date Format Selector ────────────────────────────────────────── */}
        <div className="mb-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/80">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Date Format in your CSV</span>
          </div>
          <div className="px-4 sm:px-6 py-4 space-y-2">
            <p className="text-[var(--text-muted)] text-xs mb-3">
              How are dates written in your CSV? This ensures attendance days align properly with calendar days.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DATE_FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDateFormat(opt.value)}
                  className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all ${
                    dateFormat === opt.value
                      ? 'bg-blue-600/15 border-blue-500/50 text-blue-400'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-blue-500/30 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {dateFormat === opt.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    )}
                    <span className="font-mono font-semibold text-sm">{opt.label}</span>
                  </div>
                  <span className="font-mono text-[11px] opacity-70">{opt.example}</span>
                  <span className="text-[10px] leading-tight opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Column Mapping Table ─────────────────────────────────────────── */}
        <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-2 gap-0 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/80">
            <span>Standard Field</span>
            <span>Your CSV Column</span>
          </div>

          <div className="divide-y divide-[var(--border)]/50">
            {/* Required Fields */}
            {REQUIRED_STANDARD_FIELDS.map((field) => {
              const isMissing = touched.has(field) && !mapping[field];
              return (
                <div key={field} className="grid grid-cols-2 items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)] text-sm font-medium">{FIELD_LABELS[field]}</span>
                    <span className="text-red-400 text-xs">*</span>
                    {autoMatchedFields.has(field) && mapping[field] && (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Auto-matched
                      </span>
                    )}
                  </div>
                  <div>
                    <select
                      value={(mapping as Record<string, string>)[field] || ''}
                      onChange={(e) => {
                        setError(null);
                        autoMatchedFields.delete(field);
                        setMapping(prev => ({ ...prev, [field]: e.target.value }));
                      }}
                      className={`bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 border w-full focus:outline-none focus:border-blue-500 ${isMissing ? 'border-red-500' : 'border-[var(--border)]'}`}
                    >
                      <option value="">— Select column —</option>
                      {csvHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {isMissing && (
                      <p className="text-red-400 text-[11px] mt-1">Required — please select a column.</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Optional Fields (e.g. Department) */}
            {OPTIONAL_STANDARD_FIELDS.map((field) => {
              return (
                <div key={field} className="grid grid-cols-2 items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 bg-[var(--bg-surface)]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)] text-sm font-medium">{FIELD_LABELS[field]}</span>
                    <span className="text-[var(--text-muted)] text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border)]">Optional</span>
                    {autoMatchedFields.has(field) && mapping[field] && (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Auto-matched
                      </span>
                    )}
                  </div>
                  <div>
                    <select
                      value={(mapping as Record<string, string>)[field] || ''}
                      onChange={(e) => {
                        autoMatchedFields.delete(field);
                        setMapping(prev => ({ ...prev, [field]: e.target.value }));
                      }}
                      className="bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 border border-[var(--border)] w-full focus:outline-none focus:border-blue-500"
                    >
                      <option value="">— None (Leave unassigned / General) —</option>
                      {csvHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {extraCols.length > 0 && (
          <div className="mt-3 p-3 bg-[var(--bg-elevated)]/60 border border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
            {extraCols.length} additional column{extraCols.length > 1 ? 's' : ''} detected and preserved: {extraCols.join(', ')}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-xl font-medium text-sm text-[var(--text-muted)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save &amp; Import
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

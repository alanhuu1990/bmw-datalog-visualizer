import { useState, useMemo } from 'react';
import {
  getDefaultSelectedKeys,
  sortColumnsForPicker,
  SOFT_SERIES_LIMIT,
} from '../lib/columnMeta';

export default function ColumnSelector({
  columns,
  selectedKeys,
  onSelectedKeysChange,
}) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState('');

  const plottable = useMemo(
    () => sortColumnsForPicker(columns.filter(c => c.validCount >= 2)),
    [columns],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return plottable;
    return plottable.filter(c =>
      c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
    );
  }, [plottable, search]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const toggle = (key) => {
    if (selectedSet.has(key)) {
      onSelectedKeysChange(selectedKeys.filter(k => k !== key));
    } else {
      onSelectedKeysChange([...selectedKeys, key]);
    }
  };

  const overLimit = selectedKeys.length > SOFT_SERIES_LIMIT;

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1f2937',
      borderRadius: 8,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          color: '#e2e8f0',
          fontFamily: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        <span>
          <span style={{ color: '#6b7280', letterSpacing: '0.1em', marginRight: 8 }}>PARAMETERS</span>
          {selectedKeys.length} selected
          {overLimit && (
            <span style={{ color: '#fbbf24', marginLeft: 8 }}>
              — chart may be hard to read ({selectedKeys.length} series)
            </span>
          )}
        </span>
        <span style={{ color: '#4b5563' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Filter columns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 140,
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: 6,
                color: '#e2e8f0',
                padding: '5px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={() => onSelectedKeysChange(getDefaultSelectedKeys(columns))}
              style={{
                background: '#14532d',
                border: '1px solid #4ade80',
                borderRadius: 6,
                color: '#4ade80',
                padding: '5px 10px',
                fontSize: 10,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Thermal preset
            </button>
            <button
              type="button"
              onClick={() => onSelectedKeysChange([])}
              style={{
                background: 'transparent',
                border: '1px solid #1f2937',
                borderRadius: 6,
                color: '#6b7280',
                padding: '5px 10px',
                fontSize: 10,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          </div>

          <div style={{
            maxHeight: 200,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {filtered.map(col => (
              <label
                key={col.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: selectedSet.has(col.key) ? '#1a2e1a' : 'transparent',
                  fontSize: 11,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(col.key)}
                  onChange={() => toggle(col.key)}
                />
                <span style={{ color: '#e2e8f0', flex: 1 }}>{col.label}</span>
                {col.unit && (
                  <span style={{ color: '#4b5563', fontSize: 10 }}>{col.unit}</span>
                )}
                <span style={{ color: '#374151', fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>
                  n={col.validCount}
                </span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div style={{ color: '#4b5563', fontSize: 10, padding: 8 }}>No columns match filter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

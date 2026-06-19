import { useState, useCallback } from 'react';

export default function FileUpload({ onFile, disabled }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((files) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result, file.name);
    reader.readAsText(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: `1px dashed ${dragOver ? '#4ade80' : '#1f2937'}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: dragOver ? '#0f1a14' : '#0d1117',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <label style={{
        background: '#14532d',
        border: '1px solid #4ade80',
        borderRadius: 6,
        color: '#4ade80',
        padding: '5px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
      }}>
        Upload CSV
        <input
          type="file"
          accept=".csv,.html,.htm"
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      <span style={{ fontSize: 10, color: '#6b7280' }}>
        Bootmod3 or BimmerLink · drag &amp; drop or click
      </span>
    </div>
  );
}

import { useState, useCallback } from 'react';

function UploadButton({ label, accept, hint, onFile, disabled, accent }) {
  const handleFiles = useCallback((files) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result, file.name);
    reader.readAsText(file);
  }, [onFile]);

  return (
    <label style={{
      position: 'relative',
      background: accent.bg,
      border: `1px solid ${accent.border}`,
      borderRadius: 6,
      color: accent.text,
      padding: '5px 12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 11,
      fontFamily: 'inherit',
      fontWeight: 600,
      opacity: disabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
    }}>
      {label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </label>
  );
}

export default function FileUpload({
  onDatalog,
  onGpx,
  onClearDatalog,
  onClearGpx,
  datalogName,
  gpxName,
  disabled,
}) {
  const [dragOver, setDragOver] = useState(false);

  const routeFile = useCallback((file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (name.endsWith('.gpx')) onGpx(content, file.name);
      else onDatalog(content, file.name);
    };
    reader.readAsText(file);
  }, [onDatalog, onGpx]);

  const handleDrop = useCallback((files) => {
    const file = files?.[0];
    if (!file) return;
    routeFile(file);
  }, [routeFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleDrop(e.dataTransfer.files);
      }}
      style={{
        border: `1px dashed ${dragOver ? '#4ade80' : '#1f2937'}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        background: dragOver ? '#0f1a14' : '#0d1117',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <UploadButton
        label="Upload CSV"
        accept=".csv,.html,.htm"
        onFile={onDatalog}
        disabled={disabled}
        accent={{ bg: '#14532d', border: '#4ade80', text: '#4ade80' }}
      />
      <UploadButton
        label="Upload GPX"
        accept=".gpx"
        onFile={onGpx}
        disabled={disabled}
        accent={{ bg: '#1e293b', border: '#60a5fa', text: '#93c5fd' }}
      />
      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>
        Bootmod3 / BimmerLink · GPX track · load either or both
        {(datalogName || gpxName) && (
          <div style={{ marginTop: 4, color: '#4b5563' }}>
            {datalogName && (
              <span>
                Datalog: {datalogName}
                {onClearDatalog && (
                  <button
                    type="button"
                    onClick={onClearDatalog}
                    style={{
                      marginLeft: 6, background: 'transparent', border: 'none',
                      color: '#6b7280', cursor: 'pointer', fontSize: 10, padding: 0,
                    }}
                    title="Remove datalog"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {datalogName && gpxName && ' · '}
            {gpxName && (
              <span>
                GPS: {gpxName}
                {onClearGpx && (
                  <button
                    type="button"
                    onClick={onClearGpx}
                    style={{
                      marginLeft: 6, background: 'transparent', border: 'none',
                      color: '#6b7280', cursor: 'pointer', fontSize: 10, padding: 0,
                    }}
                    title="Remove GPS track"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

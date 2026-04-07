import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { X, Download, Loader2, FileSpreadsheet } from 'lucide-react';

const EXCEL_STYLES = `
  .excel-preview table { border-collapse: collapse; width: 100%; font-size: 12px; font-family: 'Calibri', 'Arial', sans-serif; }
  .excel-preview th, .excel-preview td { border: 1px solid #d0d0d0; padding: 4px 8px; white-space: nowrap; min-width: 60px; }
  .excel-preview tr:nth-child(even) td { background: #f9f9f9; }
  .excel-preview tr:hover td { background: #e8f0fe; }
  .excel-preview thead th { background: #4472c4; color: #fff; font-weight: 600; position: sticky; top: 0; z-index: 1; }
  .excel-preview thead th:hover { background: #3a62b0; }
  .excel-preview td.s0 { background: #4472c4; color: #fff; font-weight: 600; }
  .excel-preview td.n { text-align: right; }
  .excel-preview td.b { text-align: center; }
`;

export default function FilePreview({ url, filename, onClose }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const ext = (filename || url).split('.').pop().toLowerCase();

    // Direct: PDF, images, video
    const directExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg'];
    if (directExts.includes(ext)) {
      setPreview({ type: 'direct', url });
      setLoading(false);
      return;
    }

    // Excel: parse client-side with SheetJS
    const excelExts = ['xlsx', 'xls', 'csv'];
    if (excelExts.includes(ext)) {
      setLoading(true);
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => {
          if (cancelled) return;
          const wb = XLSX.read(buf, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const html = XLSX.utils.sheet_to_html(sheet, { editable: false, id: 'excel-tbl' });
          setPreview({ type: 'excel', html, sheetName });
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) { setError('No se pudo leer el archivo Excel'); setLoading(false); }
        });
      return;
    }

    // Word/PPT: convert server-side via LibreOffice -> PDF (stored in PostgreSQL)
    const convertibleExts = ['docx', 'doc', 'pptx', 'ppt'];
    if (convertibleExts.includes(ext)) {
      setLoading(true);
      api.get('/reports/preview', { params: { url } })
        .then((r) => {
          if (cancelled) return;
          const data = r.data;
          // Fetch the PDF as blob to avoid iframe auth issues
          if (data.id) {
            return api.get(`/reports/preview/${data.id}/pdf`, { responseType: 'blob' });
          }
          throw new Error('No PDF ID');
        })
        .then((blobResp) => {
          if (!cancelled && blobResp) {
            const blobUrl = URL.createObjectURL(blobResp.data);
            setPreview({ type: 'pdf', blobUrl });
          }
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) { setError('No se pudo previsualizar este documento'); setLoading(false); }
        });
      return;
    }

    setError('Tipo de archivo no soportado');
    setLoading(false);

    return () => { cancelled = true; };
  }, [url, filename]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    };
  }, [preview?.blobUrl]);

  const displayUrl = preview?.url || url;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {preview?.type === 'excel' && <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />}
            <span className="text-sm font-medium text-gray-900 truncate">{filename || 'Vista previa'}</span>
            {preview?.type === 'excel' && preview.sheetName && (
              <span className="text-xs text-gray-400 flex-shrink-0">({preview.sheetName})</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </a>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-b-xl z-10">
              <Loader2 className="w-8 h-8 text-[#7095B4] animate-spin mb-3" />
              <p className="text-sm text-gray-500">Preparando vista previa...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-gray-500 text-sm">{error}</p>
              <a href={url} download target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-xs text-[#7095B4] hover:underline">
                <Download className="w-3.5 h-3.5" />Descargar archivo
              </a>
            </div>
          )}

          {preview && !loading && !error && (
            <PreviewContent preview={preview} displayUrl={displayUrl} iframeRef={iframeRef} />
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ preview, displayUrl, iframeRef }) {
  const ext = (displayUrl || '').split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isPdf = preview.type === 'pdf' || ext === 'pdf';

  if (preview.type === 'excel') {
    return (
      <>
        <style>{EXCEL_STYLES}</style>
        <div className="excel-preview overflow-auto" style={{ maxHeight: '75vh' }}>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      </>
    );
  }

  if (isImage) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 min-h-[300px] max-h-[70vh] overflow-auto">
        <img src={displayUrl} alt={displayUrl} className="max-w-full max-h-[70vh] object-contain rounded" />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="flex items-center justify-center p-4 bg-black min-h-[300px]">
        <video controls className="max-w-full max-h-[70vh]" src={displayUrl}>
          Tu navegador no soporta video.
        </video>
      </div>
    );
  }

  if (isPdf) {
    // Use blob URL (already has auth) or direct URL for native PDFs
    const pdfSrc = preview.blobUrl || displayUrl;
    return (
      <iframe
        ref={iframeRef}
        src={pdfSrc}
        className="w-full border-0"
        style={{ height: '75vh' }}
        title="Vista previa PDF"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-gray-500 text-sm">Tipo de archivo no soportado para previsualización</p>
      <a href={displayUrl} download target="_blank" rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1 text-xs text-[#7095B4] hover:underline">
        <Download className="w-3.5 h-3.5" />Descargar archivo
      </a>
    </div>
  );
}

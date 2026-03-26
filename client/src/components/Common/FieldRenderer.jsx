import { Upload, X, FileText, UploadCloud, CheckCircle, Download } from 'lucide-react';

export default function FieldRenderer({
  campo,
  value,
  onChange,
  onFileUpload,
  disabled = false,
}) {
  const { id, etiqueta, tipo, requerido, opciones, placeholder } = campo;

  const inputClass = `w-full px-4 py-2.5 border border-[#cbd5e1] rounded-md text-[#334155] text-[15px]
    focus:ring-2 focus:ring-[#7095B4] focus:border-[#7095B4] outline-none transition-all
    placeholder-[#94a3b8] ${disabled ? 'bg-[#f8fafc] cursor-not-allowed opacity-60' : 'hover:border-[#94a3b8]'}`;

  switch (tipo) {
    case 'texto':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-1.5">
            {etiqueta}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder={placeholder || 'Escribe tu respuesta...'}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      );

    case 'texto_largo':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-1.5">
            {etiqueta}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder={placeholder || 'Escribe tu respuesta...'}
            rows={4}
            className={`${inputClass} resize-none`}
            disabled={disabled}
          />
        </div>
      );

    case 'numero':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-1.5">
            {etiqueta}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(id, e.target.value)}
            placeholder={placeholder || 'Ingresa un número...'}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      );

    case 'fecha':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-1.5">
            {etiqueta}
          </label>
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(id, e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      );

    case 'seleccion_unica':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-2">
            {etiqueta}
          </label>
          <div className="space-y-1.5">
            {(opciones || []).map((opcion, idx) => (
              <label
                key={idx}
                className={`flex items-center px-4 py-3 rounded-md cursor-pointer transition-all border ${
                  value === opcion
                    ? 'bg-[#f0f5fa] border-[#7095B4]'
                    : 'border-transparent hover:bg-[#f8fafc]'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={`field-${id}`}
                  checked={value === opcion}
                  onChange={() => onChange(id, opcion)}
                  className="sr-only"
                  disabled={disabled}
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 transition-colors ${
                  value === opcion
                    ? 'border-[#7095B4]'
                    : 'border-[#cbd5e1]'
                }`}>
                  {value === opcion && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7095B4]" />
                  )}
                </div>
                <span className={`text-[15px] ${value === opcion ? 'text-[#232856] font-medium' : 'text-[#475569]'}`}>
                  {opcion}
                </span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'seleccion_multiple':
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-2">
            {etiqueta}
          </label>
          <div className="space-y-1.5">
            {(opciones || []).map((opcion, idx) => {
              const selected = Array.isArray(value) && value.includes(opcion);
              return (
                <label
                  key={idx}
                  className={`flex items-center px-4 py-3 rounded-md cursor-pointer transition-all border ${
                    selected
                      ? 'bg-[#f0f5fa] border-[#7095B4]'
                      : 'border-transparent hover:bg-[#f8fafc]'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(value) ? [...value] : [];
                      if (selected) {
                        onChange(id, current.filter((v) => v !== opcion));
                      } else {
                        onChange(id, [...current, opcion]);
                      }
                    }}
                    className="sr-only"
                    disabled={disabled}
                  />
                  <div className={`w-5 h-5 rounded-[4px] border-2 mr-3 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected
                      ? 'bg-[#7095B4] border-[#7095B4]'
                      : 'border-[#cbd5e1]'
                  }`}>
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[15px] ${selected ? 'text-[#232856] font-medium' : 'text-[#475569]'}`}>
                    {opcion}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      );

    case 'archivo': {
      const downloadUrl = placeholder && placeholder.startsWith('/');
      return (
        <div>
          <label className="block text-[15px] font-semibold text-[#232856] mb-2">
            {etiqueta}
          </label>
          {downloadUrl && (
            <a
              href={placeholder}
              download
              className="flex items-center px-4 py-2.5 mb-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-md hover:bg-[#dbeafe] transition-colors group"
            >
              <Download className="w-4 h-4 text-[#7095B4] mr-2 group-hover:animate-bounce" />
              <span className="text-sm font-medium text-[#5c80a0]">Descargar plantilla</span>
            </a>
          )}
          {value ? (
            <div className="flex items-center px-4 py-3 bg-[#f0fdf4] border border-[#86efac] rounded-md">
              <CheckCircle className="w-5 h-5 text-[#22c55e] mr-3 flex-shrink-0" />
              <FileText className="w-4 h-4 text-[#64748b] mr-2 flex-shrink-0" />
              <span className="text-sm text-[#334155] flex-1 truncate">{value}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(id, null)}
                  className="text-[#94a3b8] hover:text-[#D71E1F] ml-2 transition-colors p-1"
                  title="Eliminar archivo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <label className={`flex items-center justify-center px-4 py-5 border-2 border-dashed border-[#cbd5e1] rounded-md cursor-pointer hover:border-[#7095B4] hover:bg-[#f8fafc] transition-all group ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#f1f5f9] group-hover:bg-[#f0f5fa] flex items-center justify-center mx-auto mb-2 transition-colors">
                  <UploadCloud className="w-5 h-5 text-[#94a3b8] group-hover:text-[#7095B4] transition-colors" />
                </div>
                <span className="text-sm text-[#475569] font-medium">Seleccionar archivo</span>
                <p className="text-xs text-[#94a3b8] mt-0.5">Word, Excel, PPT, PDF, Imagen, Video, Audio (max 10MB)</p>
              </div>
              {!disabled && (
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.mp4,.avi,.mov,.wmv,.mkv,.webm,.mp3,.wav,.ogg,.aac,.wma,.flac,.txt,.csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) onFileUpload(id, file);
                  }}
                />
              )}
            </label>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

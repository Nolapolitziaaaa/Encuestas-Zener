import { useState, useRef } from 'react';
import FieldRenderer from './FieldRenderer';
import api from '../../services/api';

export default function DynamicForm({ campos, values, onChange, onFileUpload, disabled = false }) {
  return (
    <div className="divide-y divide-[#f1f5f9]">
      {campos?.map((campo, index) => (
        <div key={campo.id} className="py-6 first:pt-0">
          <div className="flex gap-4">
            <div className="flex-shrink-0 pt-1">
              <div className="w-7 h-7 rounded-full bg-[#f1f5f9] text-[#64748b] flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Pregunta {index + 1} de {campos.length}
                </span>
                {campo.requerido && (
                  <span className="text-[#D71E1F] ml-1 text-xs">*</span>
                )}
              </div>
              <FieldRenderer
                campo={campo}
                value={values?.[campo.id]}
                onChange={onChange}
                onFileUpload={onFileUpload}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(null);
  const abortRef = useRef(null);

  const uploadFile = async (campoId, file) => {
    setUploading(campoId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploading(null);
      return response.data.url;
    } catch (err) {
      setUploading(null);
      alert('Error subiendo archivo: ' + (err.response?.data?.error || err.message));
      return null;
    }
  };

  return { uploadFile, uploading };
}

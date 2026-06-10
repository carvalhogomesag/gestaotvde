import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";

export default function FileUpload({ label, onUploadComplete, folder = "documentos", mode = "full" }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      }, 
      (error) => {
        console.error("Erro no upload Firebase:", error);
        setUploading(false);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          /**
           * ATUALIZAÇÃO CRÍTICA:
           * Devolvemos a URL (para o Firestore) e o objeto FILE (para a IA processar sem CORS)
           */
          onUploadComplete(url, file);
          setUploading(false);
          setProgress(0);
        });
      }
    );
  };

  if (mode === "minimal") {
    return (
      <div className="relative cursor-pointer">
        {uploading ? (
          <div className="p-2 bg-white rounded-full shadow-md">
            <Loader2 className="animate-spin text-tvde-primary" size={16} />
          </div>
        ) : (
          <label className="cursor-pointer">
            {label}
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all relative overflow-hidden">
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-tvde-primary" size={24} />
            <span className="text-[10px] font-bold text-slate-400">{Math.round(progress)}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="text-slate-400" size={20} />
            <span className="text-[10px] font-medium text-slate-500">{label}</span>
          </div>
        )}
        <input type="file" className="hidden" onChange={handleUpload} />
      </label>
    </div>
  );
}
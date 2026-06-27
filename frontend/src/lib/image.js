import { api } from './api.js';

// Compresse une image (redimensionnée, JPEG) pour un chargement rapide même en connexion faible.
export function compressImage(file, maxDim = 1100, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Compresse puis téléverse l'image. Renvoie l'URL servie par le backend.
export async function uploadImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Veuillez choisir une image');
  const dataUrl = await compressImage(file);
  const { url } = await api.post('/menu/upload', { dataUrl });
  return url;
}

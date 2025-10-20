// Composita video + marco (tamaño del canvas = tamaño nativo del PNG usado)

import { defaultTextStyle, TextStyle } from "@/context/Context";

export function captureWithFrame({
  video,
  frame,
  targetW,
  targetH,
  mirror,
  wish,
}: {
  video: HTMLVideoElement;
  frame: HTMLImageElement | null;
  targetW: number;
  targetH: number;
  mirror: boolean;
  wish?: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;

  // Calcular el área donde va la imagen capturada (parte superior del frame)
  const captureAreaHeight = targetH;
  const captureAreaWidth = targetW;

  // Calcular el recorte del video para que quepa en el área de captura
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const videoAspect = vw / vh;
  const captureAspect = captureAreaWidth / captureAreaHeight;

  let sx = 0,
    sy = 0,
    sWidth = vw,
    sHeight = vh;

  if (videoAspect > captureAspect) {
    // El video es más ancho, recortar los lados
    const newWidth = vh * captureAspect;
    sx = (vw - newWidth) / 2;
    sWidth = newWidth;
  } else {
    // El video es más alto, recortar arriba y abajo
    const newHeight = vw / captureAspect;
    sy = (vh - newHeight) / 2;
    sHeight = newHeight;
  }

  // Ajustar la posición de la imagen capturada para subirla 20px
  const offsetY = -100; // Subir la imagen 100px

  // Dibujar la imagen capturada en el canvas
  if (mirror) {
    ctx.save();
    ctx.translate(captureAreaWidth, offsetY);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, captureAreaWidth, captureAreaHeight);
    ctx.restore();
  } else {
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, offsetY, captureAreaWidth, captureAreaHeight);
  }

  // Dibujar el frame completo encima
  if (frame) {
    ctx.drawImage(frame, 0, 0, targetW, targetH);
  }

  // Dibujar el texto del deseo en la parte inferior del frame
 
  return canvas.toDataURL("image/png", 1);
}

// Utilidad para agregar texto a una imagen con estilo personalizable
export const addTextToImage = (
  imageBase64: string,
  wish: { name: string; wish: string }, // Cambié el tipo de `text` a un objeto con `name` y `wish`
  customStyle: TextStyle = {}
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Dibujar la imagen base
      ctx.drawImage(img, 0, 0);

      // Agregar el texto del deseo
      if (wish && (wish.name.trim() || wish.wish.trim())) {
        // Combinar estilo por defecto con el personalizado
        const style = { ...defaultTextStyle, ...customStyle };

        const targetW = canvas.width;
        const targetH = canvas.height;

        // Calcular tamaños proporcionales al canvas
        const textPadding = targetW * 0.05;

        // Parsear el fontSize (puede venir como "40px" o "3.5%")
        let fontSize: number;
        if (style.fontSize?.includes('px')) {
          fontSize = parseInt(style.fontSize);
        } else if (style.fontSize?.includes('%')) {
          const percent = parseFloat(style.fontSize) / 100;
          fontSize = targetW * percent;
        } else {
          fontSize = Math.max(targetW * 0.035, 24);
        }

        // Escalar el fontSize según el tamaño del canvas
        fontSize = Math.max(fontSize * (targetW / 1000), 80); // Aumenté el tamaño mínimo del texto a 80 para mayor visibilidad

        const lineHeight = fontSize * 1; // Ajusté el lineHeight para mayor separación entre líneas

        // Configurar el estilo del texto
        const fontStyle = style.italic ? 'italic' : 'normal';
        const fontWeight = style.fontWeight || 'bold';
        const fontFamily = style.fontFamily || 'Arial, sans-serif';

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const maxWidth = targetW - (textPadding * 2);

        // Configurar el texto centrado y abajo
        ctx.textAlign = 'center';

        // Dibujar el nombre si está disponible
        if (wish.name.trim()) {
          ctx.fillStyle = '#000000'; // Cambié el color del texto a negro
          ctx.fillText(wish.name, targetW / 2, targetH - textPadding - lineHeight * 2); // Centrado y arriba del deseo
        }

        // Dibujar el deseo si está disponible
        if (wish.wish.trim()) {
          ctx.fillStyle = '#000000'; // Cambié el color del texto a negro
          ctx.fillText(wish.wish, targetW / 2, targetH - textPadding); // Centrado y debajo del nombre
        }
      }

      // Retornar la imagen final
      resolve(canvas.toDataURL('image/png', 1));
    };

    img.onerror = () => {
      console.error('Error al cargar la imagen');
      resolve(imageBase64); // Retornar la imagen original si hay error
    };

    img.src = imageBase64;
  });
};
/**
 * Generador de imágenes sintéticas de prueba con figuras vehiculares realistas
 * usando HTML Canvas. Permite probar el pipeline de visión de PIURA PASS
 * en cualquier entorno sin depender de una cámara física externa.
 */

export function generateVehicleSampleDataUrl(type: 'car' | 'mototaxi' | 'truck'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo simulado de calzada de asfalto y horizonte de Piura
  const skyGradient = ctx.createLinearGradient(0, 0, 0, 240);
  skyGradient.addColorStop(0, '#7dd3fc');
  skyGradient.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, 640, 240);

  // Calzada de asfalto
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 240, 640, 240);

  // Línea divisoria de carril amarilla
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.setLineDash([30, 20]);
  ctx.beginPath();
  ctx.moveTo(320, 240);
  ctx.lineTo(320, 480);
  ctx.stroke();
  ctx.setLineDash([]);

  if (type === 'car') {
    // Dibujo de Automóvil sedán
    // Carrocería principal
    ctx.fillStyle = '#dc2626'; // Rojo
    ctx.fillRect(160, 270, 320, 80);

    // Cabina superior
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(220, 270);
    ctx.lineTo(260, 210);
    ctx.lineTo(380, 210);
    ctx.lineTo(430, 270);
    ctx.closePath();
    ctx.fill();

    // Ventanas
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(265, 215, 50, 45);
    ctx.fillRect(325, 215, 65, 45);

    // Faros
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(160, 285, 20, 15);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(460, 285, 20, 15);

    // Ruedas
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(220, 350, 32, 0, Math.PI * 2);
    ctx.arc(420, 350, 32, 0, Math.PI * 2);
    ctx.fill();

    // Rines
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(220, 350, 14, 0, Math.PI * 2);
    ctx.arc(420, 350, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'mototaxi') {
    // Dibujo de Mototaxi Piurano (Torito Bajaj con cabina carrozada azul)
    // Cabina posterior
    ctx.fillStyle = '#2563eb'; // Azul característico
    ctx.fillRect(200, 190, 240, 160);

    // Techo redondeado
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(190, 180, 260, 20);

    // Parabrisas / Ventana frontal
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(220, 210, 80, 70);

    // Ventana lateral
    ctx.fillRect(320, 210, 100, 70);

    // Manillar delantero / horquilla
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(170, 280, 40, 20);

    // Rueda delantera
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(170, 350, 28, 0, Math.PI * 2);
    ctx.fill();

    // Rueda trasera
    ctx.beginPath();
    ctx.arc(400, 350, 28, 0, Math.PI * 2);
    ctx.fill();

    // Rin
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(170, 350, 10, 0, Math.PI * 2);
    ctx.arc(400, 350, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Dibujo de Camión de carga pesada
    // Remolque de carga
    ctx.fillStyle = '#e2e8f0'; // Contenedor blanco/gris
    ctx.fillRect(130, 160, 280, 170);

    // Cabina tractora
    ctx.fillStyle = '#ea580c'; // Naranja
    ctx.fillRect(410, 210, 110, 120);

    // Ventana de cabina
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(440, 220, 60, 45);

    // Ruedas múltiples
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(180, 340, 34, 0, Math.PI * 2);
    ctx.arc(260, 340, 34, 0, Math.PI * 2);
    ctx.arc(360, 340, 34, 0, Math.PI * 2);
    ctx.arc(470, 340, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(180, 340, 14, 0, Math.PI * 2);
    ctx.arc(260, 340, 14, 0, Math.PI * 2);
    ctx.arc(360, 340, 14, 0, Math.PI * 2);
    ctx.arc(470, 340, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

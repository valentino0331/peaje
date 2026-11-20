import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraState {
  isActive: boolean;
  isStreaming: boolean;
  facingMode: 'environment' | 'user';
  error: string | null;
  hasPermission: boolean | null;
  availableDevices: MediaDeviceInfo[];
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({
    isActive: false,
    isStreaming: false,
    facingMode: 'environment',
    error: null,
    hasPermission: null,
    availableDevices: [],
  });

  // Enumerar cámaras disponibles
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setState((prev) => ({ ...prev, availableDevices: videoInputs }));
    } catch (err) {
      console.warn('No se pudieron enumerar dispositivos de video:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({
      ...prev,
      isActive: false,
      isStreaming: false,
    }));
  }, []);

  const startCamera = useCallback(
    async (facing: 'environment' | 'user' = state.facingMode) => {
      stopCamera();
      setState((prev) => ({ ...prev, error: null }));

      if (!navigator.mediaDevices?.getUserMedia) {
        setState((prev) => ({
          ...prev,
          error:
            'Tu navegador no soporta MediaDevices (WebRTC) o requieres un contexto seguro (HTTPS / localhost).',
          hasPermission: false,
        }));
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn('Error al reproducir video:', e));
        }

        setState((prev) => ({
          ...prev,
          isActive: true,
          isStreaming: true,
          facingMode: facing,
          hasPermission: true,
          error: null,
        }));

        await refreshDevices();
      } catch (err: any) {
        let msg = 'Error desconocido al acceder a la cámara.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Permiso denegado para acceder a la cámara. Habilita los permisos en tu navegador.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No se encontró ninguna cámara conectada al dispositivo.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'La cámara está siendo utilizada por otra aplicación.';
        } else if (err.message) {
          msg = err.message;
        }

        setState((prev) => ({
          ...prev,
          isActive: false,
          isStreaming: false,
          hasPermission: false,
          error: msg,
        }));
      }
    },
    [state.facingMode, stopCamera, refreshDevices]
  );

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = state.facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  }, [state.facingMode, startCamera]);

  const captureFrameBlob = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !state.isStreaming) return null;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.88);
    });
  }, [state.isStreaming]);

  const captureFrameBase64 = useCallback((): string | null => {
    if (!videoRef.current || !state.isStreaming) return null;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [state.isStreaming]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    state,
    startCamera,
    stopCamera,
    toggleCameraFacing,
    captureFrameBlob,
    captureFrameBase64,
  };
}

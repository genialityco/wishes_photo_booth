/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/lib/firebaseConfig";
import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, orderBy, startAfter, limit as fqLimit, where, Timestamp,
    type QueryDocumentSnapshot,
    DocumentSnapshot,
    getCountFromServer
} from "firebase/firestore";

import {
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes,
} from "firebase/storage";

// Tipos
export type EventSettings = {
    backgroundColor: string;
    music: string;
    textFinal: string;
    frameUrl?: string;
    backgroundUrl?: string;
    mobileBackgroundUrl?: string;
};

export type Event = {
    id: string;
    name: string;
    description: string;
    theme: string;
    startDate: Date | null;
    endDate: Date | null;
    isActive: boolean;
    totalWishes: number;
    videoUrl?: string;
    previewUrl?: string;
    settings: EventSettings;
    createdAt: Date | null;
    updatedAt: Date | null;
};

export type Wish = {
    id: string;
    eventId: string;
    userName: string;
    message: string;
    photoUrl?: string;
    createdAt: Date | null;
    approved: boolean;
    deviceType: string;
    location?: { lat: number; lng: number };
    colorTheme: string;
    public: boolean;
};

export type PaginationResult<T> = {
    data: T[];
    hasNext: boolean;
    lastDoc: QueryDocumentSnapshot | null;
    total?: number;
};

// Nombres de las colecciones
const EVENTS_COLLECTION = "events";
const WISHES_SUBCOLLECTION = "wishes";
const PHOTO_BOOTH_PROMPTS_COLLECTION = "wish_event_photo_booth";

/* ================== Helpers ================== */
function tsToDate(ts: any): Date | null {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if ((ts as any)?.toDate) return (ts as any).toDate();
    if (ts instanceof Timestamp) return ts.toDate();
    return null;
}

function mapDocToEvent(d: DocumentSnapshot): Event {
    const data = d.data() as any;
    return {
        id: d.id,
        name: data.name ?? "",
        description: data.description ?? "",
        theme: data.theme ?? "",
        startDate: tsToDate(data.startDate),
        endDate: tsToDate(data.endDate),
        isActive: data.isActive ?? false,
        totalWishes: data.totalWishes ?? 0,
        videoUrl: data.videoUrl ?? "",
        previewUrl: data.previewUrl ?? "",
        settings: data.settings ?? {
            backgroundColor: "#000000",
            music: "",
            textFinal: "",
            frameUrl: "",
            backgroundUrl: "",
            mobileBackgroundUrl: ""
        },
        createdAt: tsToDate(data.createdAt),
        updatedAt: tsToDate(data.updatedAt),
    };
}

function mapDocToWish(d: DocumentSnapshot, eventId: string): Wish {
    const data = d.data() as any;
    return {
        id: d.id,
        eventId,
        userName: data.userName ?? "",
        message: data.message ?? "",
        photoUrl: data.photoUrl ?? "",
        createdAt: tsToDate(data.createdAt),
        approved: data.approved ?? false,
        deviceType: data.deviceType ?? "unknown",
        location: data.location ?? null,
        colorTheme: data.colorTheme ?? "gold",
        public: data.public ?? true,
    };
}

function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid Data URL format");
    const mime = mimeMatch[1];
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], {type: mime});
}

async function uploadFileToStorage(fileData: string, folder: string, fileName: string): Promise<string> {
    const storage = getStorage();
    
    // Normalizar la Data URL
    if (!fileData.startsWith("data:")) {
        fileData = `data:${fileData}`;
    }
    
    // Convertir a Blob
    const fileBlob = dataURLtoBlob(fileData);
    const contentType = fileBlob.type;
    
    // Crear referencia en Storage
    const extension = contentType.split("/")[1] || "png";
    const fullFileName = `${Date.now()}_${fileName}.${extension.replace("+", "_")}`;
    const fileRef = ref(storage, `${folder}/${fullFileName}`);
    
    // Subir archivo
    await uploadBytes(fileRef, fileBlob, { contentType });
    
    // Obtener URL de descarga
    return await getDownloadURL(fileRef);
}

/* ================== CRUD de Eventos ================== */

// CREATE - Crear un evento
export async function createEvent(
    data: Omit<Event, "id" | "createdAt" | "updatedAt" | "totalWishes">
): Promise<string> {
    try {
        // Subir archivos si existen
        let videoUrl = data.videoUrl;
        let previewUrl = data.previewUrl;
        let frameUrl = data.settings.frameUrl;
        let backgroundUrl = data.settings.backgroundUrl;
        let mobileBackgroundUrl = data.settings.mobileBackgroundUrl;

        // Subir video si es un archivo
        if (data.videoUrl && typeof data.videoUrl === 'string' && data.videoUrl.includes('base64')) {
            videoUrl = await uploadFileToStorage(data.videoUrl, 'events/videos', `${data.name}_video`);
        }

        // Subir preview si es un archivo
        if (data.previewUrl && typeof data.previewUrl === 'string' && data.previewUrl.includes('base64')) {
            previewUrl = await uploadFileToStorage(data.previewUrl, 'events/previews', `${data.name}_preview`);
        }

        // Subir frame si es un archivo
        if (data.settings.frameUrl && typeof data.settings.frameUrl === 'string' && data.settings.frameUrl.includes('base64')) {
            frameUrl = await uploadFileToStorage(data.settings.frameUrl, 'events/frames', `${data.name}_frame`);
        }

        // Subir background desktop si es un archivo
        if (data.settings.backgroundUrl && typeof data.settings.backgroundUrl === 'string' && data.settings.backgroundUrl.includes('base64')) {
            backgroundUrl = await uploadFileToStorage(data.settings.backgroundUrl, 'events/backgrounds', `${data.name}_background`);
        }

        // Subir background mobile si es un archivo
        if (data.settings.mobileBackgroundUrl && typeof data.settings.mobileBackgroundUrl === 'string' && data.settings.mobileBackgroundUrl.includes('base64')) {
            mobileBackgroundUrl = await uploadFileToStorage(data.settings.mobileBackgroundUrl, 'events/backgrounds', `${data.name}_mobile_background`);
        }

        const eventData: Omit<Event, "id"> = {
            name: data.name,
            description: data.description,
            theme: data.theme,
            startDate: data.startDate,
            endDate: data.endDate,
            isActive: data.isActive,
            totalWishes: 0,
            videoUrl: videoUrl,
            previewUrl: previewUrl,
            settings: {
                ...data.settings,
                frameUrl: frameUrl,
                backgroundUrl: backgroundUrl,
                mobileBackgroundUrl: mobileBackgroundUrl,
            },
            createdAt: Timestamp.now() as any,
            updatedAt: Timestamp.now() as any,
        };

        const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventData);
        return docRef.id;
    } catch (error) {
        console.error("Error creating event:", error);
        throw new Error("Error al crear el evento");
    }
}

// READ - Obtener todos los eventos con paginación
export async function getEvents(
    pageSize = 10,
    lastDocument: QueryDocumentSnapshot | null = null
): Promise<PaginationResult<Event> & { total: number }> {
    try {
        const size = Math.max(1, Math.min(pageSize, 50));

        const baseQ = query(
            collection(db, EVENTS_COLLECTION),
            orderBy("createdAt", "desc")
        );

        let q = baseQ;

        if (lastDocument) {
            q = query(baseQ, startAfter(lastDocument), fqLimit(size + 1));
        } else {
            q = query(baseQ, fqLimit(size + 1));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        const countSnap = await getCountFromServer(baseQ);
        const total = countSnap.data().count;

        const hasNext = docs.length > size;

        if (hasNext) {
            docs.pop();
        }

        const data = docs.map(mapDocToEvent);

        return {
            data,
            hasNext,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
            total
        };
    } catch (error) {
        console.error("Error getting events:", error);
        throw new Error("Error al obtener los eventos");
    }
}

// READ - Obtener eventos activos
export async function getActiveEvents(
    limit = 10,
    lastDocument?: QueryDocumentSnapshot
): Promise<PaginationResult<Event>> {
    try {
        let q = query(
            collection(db, EVENTS_COLLECTION),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc'),
            fqLimit(limit + 1)
        );

        if (lastDocument) {
            q = query(
                collection(db, EVENTS_COLLECTION),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                startAfter(lastDocument),
                fqLimit(limit + 1)
            );
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        
        const hasNext = docs.length > limit;
        if (hasNext) {
            docs.pop();
        }

        const data = docs.map(mapDocToEvent);

        return {
            data,
            hasNext,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null
        };
    } catch (error) {
        console.error('Error getting active events:', error);
        throw new Error('Error al obtener los eventos activos');
    }
}

// READ - Obtener un evento por ID
export async function getEventById(id: string): Promise<Event | null> {
    try {
        if (!id || id.trim() === '') {
            console.error('Event ID is required');
            return null;
        }
        
        const docRef = doc(db, EVENTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return mapDocToEvent(docSnap);
        }
        
        console.warn(`Event with ID ${id} not found`);
        return null;
    } catch (error) {
        console.error('Error getting event by ID:', error);
        throw new Error('Error al obtener el evento');
    }
}

// UPDATE - Actualizar un evento
export async function updateEvent(
    id: string,
    data: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'totalWishes'>>
): Promise<void> {
    try {
        const docRef = doc(db, EVENTS_COLLECTION, id);
        
        // Obtener datos actuales para el nombre
        const currentDoc = await getDoc(docRef);
        const currentData = currentDoc.data();
        const eventName = data.name || currentData?.name || 'event';

        // Subir archivos si existen y son nuevos
        let videoUrl = data.videoUrl;
        let previewUrl = data.previewUrl;
        let frameUrl = data.settings?.frameUrl;
        let backgroundUrl = data.settings?.backgroundUrl;
        let mobileBackgroundUrl = data.settings?.mobileBackgroundUrl;

        // Subir video si es un archivo
        if (data.videoUrl && typeof data.videoUrl === 'string' && data.videoUrl.includes('base64')) {
            videoUrl = await uploadFileToStorage(data.videoUrl, 'events/videos', `${eventName}_video`);
        }

        // Subir preview si es un archivo
        if (data.previewUrl && typeof data.previewUrl === 'string' && data.previewUrl.includes('base64')) {
            previewUrl = await uploadFileToStorage(data.previewUrl, 'events/previews', `${eventName}_preview`);
        }

        // Subir frame si es un archivo
        if (data.settings?.frameUrl && typeof data.settings.frameUrl === 'string' && data.settings.frameUrl.includes('base64')) {
            frameUrl = await uploadFileToStorage(data.settings.frameUrl, 'events/frames', `${eventName}_frame`);
        }

        // Subir background desktop si es un archivo
        if (data.settings?.backgroundUrl && typeof data.settings.backgroundUrl === 'string' && data.settings.backgroundUrl.includes('base64')) {
            backgroundUrl = await uploadFileToStorage(data.settings.backgroundUrl, 'events/backgrounds', `${eventName}_background`);
        }

        // Subir background mobile si es un archivo
        if (data.settings?.mobileBackgroundUrl && typeof data.settings.mobileBackgroundUrl === 'string' && data.settings.mobileBackgroundUrl.includes('base64')) {
            mobileBackgroundUrl = await uploadFileToStorage(data.settings.mobileBackgroundUrl, 'events/backgrounds', `${eventName}_mobile_background`);
        }

        const updateData: any = {
            ...data,
            videoUrl: videoUrl,
            previewUrl: previewUrl,
            settings: data.settings ? {
                ...data.settings,
                frameUrl: frameUrl,
                backgroundUrl: backgroundUrl,
                mobileBackgroundUrl: mobileBackgroundUrl,
            } : undefined,
            updatedAt: Timestamp.now()
        };

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Error updating event:', error);
        throw new Error('Error al actualizar el evento');
    }
}

// DELETE - Eliminar un evento
export async function deleteEvent(id: string): Promise<void> {
    try {
        const docRef = doc(db, EVENTS_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting event:', error);
        throw new Error('Error al eliminar el evento');
    }
}

// TOGGLE ACTIVE - Cambiar estado activo/inactivo
export async function toggleEventActive(id: string): Promise<void> {
    try {
        const event = await getEventById(id);
        if (!event) {
            throw new Error('Evento no encontrado');
        }
        
        await updateEvent(id, { isActive: !event.isActive });
    } catch (error) {
        console.error('Error toggling event active status:', error);
        throw new Error('Error al cambiar el estado del evento');
    }
}

/* ================== CRUD de Wishes (Deseos) ================== */

// CREATE - Crear un wish
export async function createWish(
    eventId: string,
    data: Omit<Wish, "id" | "eventId" | "createdAt">
): Promise<string> {
    try {
        if (!eventId || eventId.trim() === '') {
            throw new Error('Event ID is required');
        }

        // La foto ya debe venir como URL de Storage desde el componente
        // No intentar subirla de nuevo aquí
        const photoUrl = data.photoUrl;
        
        // Validar que sea una URL válida de Storage si existe
        if (photoUrl && !photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
            console.warn('photoUrl no es una URL válida de Storage:', photoUrl);
            // Si por alguna razón llegó un base64, subirlo
            if (photoUrl.includes('base64')) {
                const uploadedUrl = await uploadFileToStorage(
                    photoUrl, 
                    `wishes_${eventId}`, 
                    `${data.userName}_${Date.now()}`
                );
                data.photoUrl = uploadedUrl;
            }
        }
        
        const wishData = {
            userName: data.userName,
            message: data.message,
            photoUrl: data.photoUrl,
            approved: data.approved,
            deviceType: data.deviceType,
            location: data.location,
            colorTheme: data.colorTheme,
            public: data.public,
            createdAt: Timestamp.now(),
        };

        const wishesRef = collection(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION);
        const docRef = await addDoc(wishesRef, wishData);

        // Incrementar totalWishes del evento
        const eventRef = doc(db, EVENTS_COLLECTION, eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            const currentTotal = eventSnap.data().totalWishes || 0;
            await updateDoc(eventRef, { totalWishes: currentTotal + 1 });
        }

        return docRef.id;
    } catch (error) {
        console.error("Error creating wish:", error);
        throw new Error("Error al crear el deseo");
    }
}

// READ - Obtener wishes de un evento con paginación
export async function getWishesByEvent(
    eventId: string,
    pageSize = 10,
    lastDocument: QueryDocumentSnapshot | null = null
): Promise<PaginationResult<Wish>> {
    try {
        if (!eventId || eventId.trim() === '') {
            throw new Error('Event ID is required');
        }
        
        const size = Math.max(1, Math.min(pageSize, 50));
        const wishesRef = collection(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION);

        let q = query(wishesRef, orderBy("createdAt", "desc"), fqLimit(size + 1));

        if (lastDocument) {
            q = query(wishesRef, orderBy("createdAt", "desc"), startAfter(lastDocument), fqLimit(size + 1));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        const hasNext = docs.length > size;

        if (hasNext) {
            docs.pop();
        }

        const data = docs.map(d => mapDocToWish(d, eventId));

        return {
            data,
            hasNext,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null
        };
    } catch (error) {
        console.error("Error getting wishes:", error);
        throw new Error("Error al obtener los deseos");
    }
}

// READ - Obtener wishes aprobados
export async function getApprovedWishesByEvent(
    eventId: string,
    limit = 10,
    lastDocument?: QueryDocumentSnapshot
): Promise<PaginationResult<Wish>> {
    try {
        const wishesRef = collection(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION);

        let q = query(
            wishesRef,
            where('approved', '==', true),
            orderBy('createdAt', 'desc'),
            fqLimit(limit + 1)
        );

        if (lastDocument) {
            q = query(
                wishesRef,
                where('approved', '==', true),
                orderBy('createdAt', 'desc'),
                startAfter(lastDocument),
                fqLimit(limit + 1)
            );
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        
        const hasNext = docs.length > limit;
        if (hasNext) {
            docs.pop();
        }

        const data = docs.map(d => mapDocToWish(d, eventId));

        return {
            data,
            hasNext,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null
        };
    } catch (error) {
        console.error('Error getting approved wishes:', error);
        throw new Error('Error al obtener los deseos aprobados');
    }
}

// READ - Obtener un wish por ID
export async function getWishById(eventId: string, wishId: string): Promise<Wish | null> {
    try {
        const docRef = doc(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION, wishId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return mapDocToWish(docSnap, eventId);
        }
        
        return null;
    } catch (error) {
        console.error('Error getting wish by ID:', error);
        throw new Error('Error al obtener el deseo');
    }
}

// UPDATE - Actualizar un wish
export async function updateWish(
    eventId: string,
    wishId: string,
    data: Partial<Omit<Wish, 'id' | 'eventId' | 'createdAt'>>
): Promise<void> {
    try {
        let photoUrl = data.photoUrl;
        
        // Solo subir si es base64 (nuevo archivo)
        if (data.photoUrl && typeof data.photoUrl === 'string') {
            // Si ya es una URL de Storage, no hacer nada
            if (data.photoUrl.startsWith('http://') || data.photoUrl.startsWith('https://')) {
                photoUrl = data.photoUrl;
            }
            // Si es base64, subirla
            else if (data.photoUrl.includes('base64')) {
                photoUrl = await uploadFileToStorage(
                    data.photoUrl, 
                    `wishes_${eventId}`, 
                    `${data.userName || 'user'}_${Date.now()}`
                );
            }
        }

        const updateData = {
            ...data,
            photoUrl: photoUrl
        };

        const docRef = doc(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION, wishId);
        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Error updating wish:', error);
        throw new Error('Error al actualizar el deseo');
    }
}

// DELETE - Eliminar un wish
export async function deleteWish(eventId: string, wishId: string): Promise<void> {
    try {
        const docRef = doc(db, EVENTS_COLLECTION, eventId, WISHES_SUBCOLLECTION, wishId);
        await deleteDoc(docRef);

        // Decrementar totalWishes del evento
        const eventRef = doc(db, EVENTS_COLLECTION, eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            const currentTotal = eventSnap.data().totalWishes || 0;
            await updateDoc(eventRef, { totalWishes: Math.max(0, currentTotal - 1) });
        }
    } catch (error) {
        console.error('Error deleting wish:', error);
        throw new Error('Error al eliminar el deseo');
    }
}

// APPROVE/REJECT - Aprobar o rechazar un wish
export async function toggleWishApproval(eventId: string, wishId: string): Promise<void> {
    try {
        const wish = await getWishById(eventId, wishId);
        if (!wish) {
            throw new Error('Deseo no encontrado');
        }
        
        await updateWish(eventId, wishId, { approved: !wish.approved });
    } catch (error) {
        console.error('Error toggling wish approval:', error);
        throw new Error('Error al cambiar el estado de aprobación');
    }
}

/* ================== Utilidades ================== */
export const eventUtils = {
    // Validar datos de evento
    validateEvent: (data: Partial<Event>): string[] => {
        const errors: string[] = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('El nombre del evento es requerido');
        }
        
        if (!data.description || data.description.trim().length === 0) {
            errors.push('La descripción del evento es requerida');
        }
        
        if (!data.theme || data.theme.trim().length === 0) {
            errors.push('El tema del evento es requerido');
        }
        
        if (!data.startDate) {
            errors.push('La fecha de inicio es requerida');
        }
        
        if (!data.endDate) {
            errors.push('La fecha de fin es requerida');
        }
        
        if (data.startDate && data.endDate && data.startDate > data.endDate) {
            errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
        }
        
        return errors;
    },

    // Validar datos de wish
    validateWish: (data: Partial<Wish>): string[] => {
        const errors: string[] = [];
        
        if (!data.userName || data.userName.trim().length === 0) {
            errors.push('El nombre de usuario es requerido');
        }
        
        if (!data.message || data.message.trim().length === 0) {
            errors.push('El mensaje es requerido');
        }
        
        if (data.message && data.message.length > 500) {
            errors.push('El mensaje no puede exceder 500 caracteres');
        }
        
        return errors;
    },

    // Formatear fecha
    formatDate: (date: Date | null): string => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Verificar si un evento está activo actualmente
    isEventCurrentlyActive: (event: Event): boolean => {
        if (!event.isActive) return false;
        
        const now = new Date();
        const start = event.startDate;
        const end = event.endDate;
        
        if (!start || !end) return event.isActive;
        
        return now >= start && now <= end;
    }
};
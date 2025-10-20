/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { QueryDocumentSnapshot } from "firebase/firestore";
import {
  createEvent,
  deleteEvent,
  getEvents,
  Event,
  updateEvent,
  eventUtils,
} from "@/services/eventService";

import { Calendar, Edit, Eye, Trash } from "lucide-react";

import { useRouter } from "next/navigation";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import Form from "../components/Form";

const columns = [
  {
    key: "name",
    label: "Nombre",
    sortable: true,
    render: (item: Event, value: string) => <strong>{value}</strong>,
  },
  {
    key: "description",
    label: "Descripción",
    sortable: false,
    className: "truncate w-fit max-w-md",
    render: (item: Event, value: string) => value,
  },
  {
    key: "theme",
    label: "Tema",
    sortable: false,
    render: (item: Event, value: string) => (
      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
        {value}
      </span>
    ),
  },
  {
    key: "startDate",
    label: "Inicio",
    sortable: false,
    render: (item: Event, value: Date | null) => eventUtils.formatDate(value),
  },
  {
    key: "endDate",
    label: "Fin",
    sortable: false,
    render: (item: Event, value: Date | null) => eventUtils.formatDate(value),
  },
  {
    key: "totalWishes",
    label: "Deseos",
    sortable: false,
    render: (item: Event, value: number) => (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
        {value}
      </span>
    ),
  },
  {
    key: "isActive",
    label: "Estado",
    sortable: false,
    render: (item: Event, value: boolean) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        value 
          ? "bg-green-100 text-green-800" 
          : "bg-gray-100 text-gray-800"
      }`}>
        {value ? "Activo" : "Inactivo"}
      </span>
    ),
  },
];

interface PaginationState {
  currentPage: number;
  totalPages: number | null;
  pages: Array<{
    pageNumber: number;
    lastDoc: QueryDocumentSnapshot | null;
  }>;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: null,
    pages: [{ pageNumber: 1, lastDoc: null }],
  });

  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const pageSize = 10;

  const loadEvents = async (
    lastDocParam: QueryDocumentSnapshot | null = null,
    pageNumber: number = 1
  ) => {
    setIsLoading(true);
    try {
      const result = await getEvents(pageSize, lastDocParam);
      setEvents(result.data);
      const totalElements = result.total || 0;
      const calculatedTotalPages = Math.ceil(totalElements / pageSize);

      setTotalPages(calculatedTotalPages);
      setTotalElements(totalElements);

      setPagination(prev => {
        const newPages = [...prev.pages];
        const pageIndex = newPages.findIndex(p => p.pageNumber === pageNumber);

        if (pageIndex >= 0) {
          newPages[pageIndex] = {
            pageNumber,
            lastDoc: result.lastDoc,
          };
        } else if (result.hasNext && pageNumber < calculatedTotalPages) {
          newPages.push({
            pageNumber: pageNumber + 1,
            lastDoc: null,
          });
        }

        return {
          ...prev,
          currentPage: pageNumber,
          totalPages: calculatedTotalPages,
          pages: newPages,
        };
      });

      console.log("Loaded events:", result.data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleGoToPage = async (pageNumber: number) => {
    if (pageNumber === pagination.currentPage || pageNumber < 1 || pageNumber > totalPages) return;

    const prevPageInfo = pagination.pages.find(p => p.pageNumber === pageNumber - 1);
    const lastDoc = prevPageInfo?.lastDoc || null;

    await loadEvents(lastDoc, pageNumber);
  };

  const onEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
    
    try {
      await deleteEvent(id);
      const prevPageNumber = pagination.currentPage - 1;
      const prevPageInfo = pagination.pages.find(p => p.pageNumber === prevPageNumber);
      const lastDocToStartFrom = prevPageInfo?.lastDoc || null;

      await loadEvents(lastDocToStartFrom, pagination.currentPage);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Error al eliminar el evento");
    }
  };

  const onViewWishes = (event: Event) => {
    router.push(`/admin/events/${event.id}/wishes`);
  };

  const onCreate = () => {
    setSelectedEvent({
      id: "",
      name: "",
      description: "",
      theme: "linternas-doradas",
      startDate: null,
      endDate: null,
      isActive: false,
      totalWishes: 0,
      videoUrl: "",
      previewUrl: "",
      settings: {
        backgroundColor: "#000000",
        music: "",
        textFinal: "",
        frameUrl: "",
        backgroundUrl: "",
        mobileBackgroundUrl: "",
      },
      createdAt: null,
      updatedAt: null,
    } as Event);
    setIsModalOpen(true);
  };

  const actions = [
    {
      key: "viewWishes",
      label: "Ver Deseos",
      icon: <Eye className="h-4 w-4" />,
      onClick: (item: any) => onViewWishes(item),
    },
    {
      key: "edit",
      label: "Editar",
      icon: <Edit className="h-4 w-4" />,
      onClick: (item: any) => onEdit(item),
    },
    {
      key: "delete",
      label: "Eliminar",
      icon: <Trash className="h-4 w-4 hover:text-red-500" />,
      onClick: (item: any) => onDelete(item.id),
    },
  ];

  const formFields = [
    { 
      name: "name", 
      label: "Nombre del Evento", 
      type: "text", 
      required: true, 
      placeholder: "Ej: Concierto 2025" 
    },
    { 
      name: "description", 
      label: "Descripción", 
      type: "textarea", 
      required: true, 
      placeholder: "Describe el evento..." 
    },
    { 
      name: "theme", 
      label: "Tema", 
      type: "select",
      required: true,
      options: [
        { value: "linternas-doradas", label: "Linternas Doradas" },
        { value: "cielo-estrellado", label: "Cielo Estrellado" },
        { value: "fuegos-artificiales", label: "Fuegos Artificiales" },
        { value: "globos", label: "Globos" },
      ]
    },
    { 
      name: "startDate", 
      label: "Fecha de Inicio", 
      type: "datetime-local", 
      required: true 
    },
    { 
      name: "endDate", 
      label: "Fecha de Fin", 
      type: "datetime-local", 
      required: true 
    },
    { 
      name: "isActive", 
      label: "Activo", 
      type: "checkbox" 
    },
    {
      name: "videoUrl",
      label: "Video del Evento",
      type: "image",
      accept: "video/mp4,video/webm",
      maxSize: 50, // 50MB máximo para videos
      placeholder: "Sube un video o ingresa URL"
    },
    {
      name: "previewUrl",
      label: "Vista Previa",
      type: "image",
      accept: "image/png,image/jpeg,image/jpg,image/webp",
      maxSize: 5, // 5MB máximo
      placeholder: "Sube una imagen o ingresa URL"
    },
    {
      name: "settings.backgroundColor",
      label: "Color de Fondo",
      type: "color",
      defaultValue: "#000000"
    },
    {
      name: "settings.music",
      label: "Música",
      type: "text",
      placeholder: "ambient_theme.mp3"
    },
    {
      name: "settings.textFinal",
      label: "Texto Final",
      type: "text",
      placeholder: "We Are One"
    },
    {
      name: "settings.frameUrl",
      label: "Marco para Fotos",
      type: "image",
      accept: "image/png,image/jpeg,image/jpg,image/webp",
      maxSize: 5,
      placeholder: "Sube un marco o ingresa URL"
    },
    {
      name: "settings.backgroundUrl",
      label: "Fondo Desktop",
      type: "image",
      accept: "image/png,image/jpeg,image/jpg,image/webp",
      maxSize: 10,
      placeholder: "Sube un fondo o ingresa URL"
    },
    {
      name: "settings.mobileBackgroundUrl",
      label: "Fondo Mobile",
      type: "image",
      accept: "image/png,image/jpeg,image/jpg,image/webp",
      maxSize: 5,
      placeholder: "Sube un fondo mobile o ingresa URL"
    },
  ];

  const handleSubmit = async (data: any) => {
    try {
      // Validar datos
      const errors = eventUtils.validateEvent(data);
      if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
      }

      // Convertir las fechas de string a Date
      const eventData: Event = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      };

      if (eventData.id) {
        await updateEvent(eventData.id, eventData);
      } else {
        await createEvent(eventData);
      }
      
      setIsModalOpen(false);

      const prevPageNumber = pagination.currentPage - 1;
      const prevPageInfo = pagination.pages.find(p => p.pageNumber === prevPageNumber);
      const lastDocToStartFrom = prevPageInfo?.lastDoc || null;

      await loadEvents(lastDocToStartFrom, pagination.currentPage);
    } catch (error) {
      console.error("Error submitting event:", error);
      alert("Error al guardar el evento");
    }
  };

  const onClickRow = (row: any) => {

    router.push(`/admin/eventWishes/${row.id}`);
  };

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Gestión de Eventos
        </h1>
        <p className="text-gray-600 mt-2">
          Administra los eventos y sus deseos asociados
        </p>
      </div>

      <DataTable
        data={events}
        columns={columns}
        actions={actions}
        searchFields={["name", "description", "theme"]}
        title="Eventos"
        selectable
        onCreate={onCreate}
        onClickRow={onClickRow}
      />

      <Pagination
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={handleGoToPage}
        currentPage={pagination.currentPage}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEvent?.id ? "Editar Evento" : "Crear Evento"}
      >
        <Form
          initialData={selectedEvent}
          fields={formFields}
          onSubmit={handleSubmit}
          submitButtonText={selectedEvent?.id ? "Guardar Cambios" : "Crear Evento"}
        />
      </Modal>
    </div>
  );
}
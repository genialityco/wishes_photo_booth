/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { QueryDocumentSnapshot } from "firebase/firestore";
import {
  createWish,
  deleteWish,
  getWishesByEvent,
  Wish,
  updateWish,
  toggleWishApproval,
  eventUtils,
  getEventById,
  Event,
} from "@/services/eventService";

import { ArrowLeft, CheckCircle, Edit, Image, MapPin, Trash, User2, XCircle } from "lucide-react";

import { useRouter } from "next/navigation";
import DataTable from "../../components/DataTable";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import Form from "../../components/Form";

const columns = [
  {
    key: "userName",
    label: "Usuario",
    sortable: true,
    render: (item: Wish, value: string) => <strong>{value}</strong>,
  },
  {
    key: "message",
    label: "Mensaje",
    sortable: false,
    className: "truncate w-fit max-w-md",
    render: (item: Wish, value: string) => value,
  },
  {
    key: "photoUrl",
    label: "Foto",
    sortable: false,
    render: (item: Wish, value: string) => 
      value ? (
        <Image className="h-5 w-5 text-blue-500" />
      ) : (
        <span className="text-gray-400">-</span>
      ),
  },
  {
    key: "colorTheme",
    label: "Color",
    sortable: false,
    render: (item: Wish, value: string) => (
      <div className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs">{value}</span>
      </div>
    ),
  },
  {
    key: "deviceType",
    label: "Dispositivo",
    sortable: false,
    render: (item: Wish, value: string) => (
      <span className="text-xs text-gray-600">{value}</span>
    ),
  },
  {
    key: "location",
    label: "Ubicación",
    sortable: false,
    render: (item: Wish, value: { lat: number; lng: number } | undefined) => 
      value ? (
        <MapPin className="h-5 w-5 text-green-500" />
      ) : (
        <span className="text-gray-400">-</span>
      ),
  },
  {
    key: "approved",
    label: "Estado",
    sortable: false,
    render: (item: Wish, value: boolean) => (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        value 
          ? "bg-green-100 text-green-800" 
          : "bg-yellow-100 text-yellow-800"
      }`}>
        {value ? "Aprobado" : "Pendiente"}
      </span>
    ),
  },
  {
    key: "public",
    label: "Público",
    sortable: false,
    render: (item: Wish, value: boolean) => (
      value ? (
        <CheckCircle className="h-5 w-5 text-blue-500" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )
    ),
  },
  {
    key: "createdAt",
    label: "Fecha",
    sortable: false,
    render: (item: Wish, value: Date | null) => (
      <span className="text-xs text-gray-600">
        {eventUtils.formatDate(value)}
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

interface EventWishesPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default function EventWishesPage({ params }: EventWishesPageProps) {
  const router = useRouter();
  const [eventId, setEventId] = useState<string>("");
  
  // Resolver params (Next.js 15+ usa Promise)
  useEffect(() => {
    params.then(resolvedParams => {
      setEventId(resolvedParams.eventId);
    });
  }, [params]);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: null,
    pages: [{ pageNumber: 1, lastDoc: null }],
  });

  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const pageSize = 10;

  // Cargar información del evento
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return; // Esperar a que eventId esté disponible
      
      try {
        const eventData = await getEventById(eventId);
        if (eventData) {
          setEvent(eventData);
        } else {
          console.error("Evento no encontrado");
          alert("Evento no encontrado");
          router.push("/admin/events");
        }
      } catch (error) {
        console.error("Error loading event:", error);
        alert("Error al cargar el evento");
      }
    };
    loadEvent();
  }, [eventId, router]);

  const loadWishes = async (
    lastDocParam: QueryDocumentSnapshot | null = null,
    pageNumber: number = 1
  ) => {
    if (!eventId) return; // No cargar si no hay eventId
    
    setIsLoading(true);
    try {
      const result = await getWishesByEvent(eventId, pageSize, lastDocParam);
      setWishes(result.data);
      
      // Calcular total de páginas (estimado si no hay total)
      const estimatedTotal = event?.totalWishes || result.data.length;
      const calculatedTotalPages = Math.ceil(estimatedTotal / pageSize);

      setTotalPages(calculatedTotalPages);
      setTotalElements(estimatedTotal);

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

      console.log("Loaded wishes:", result.data);
    } catch (error) {
      console.error("Error loading wishes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadWishes();
    }
  }, [eventId]);

  const handleGoToPage = async (pageNumber: number) => {
    if (pageNumber === pagination.currentPage || pageNumber < 1 || pageNumber > totalPages) return;

    const prevPageInfo = pagination.pages.find(p => p.pageNumber === pageNumber - 1);
    const lastDoc = prevPageInfo?.lastDoc || null;

    await loadWishes(lastDoc, pageNumber);
  };

  const onEdit = (wish: Wish) => {
    setSelectedWish(wish);
    setIsModalOpen(true);
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este deseo?")) return;
    
    try {
      await deleteWish(eventId, id);
      const prevPageNumber = pagination.currentPage - 1;
      const prevPageInfo = pagination.pages.find(p => p.pageNumber === prevPageNumber);
      const lastDocToStartFrom = prevPageInfo?.lastDoc || null;

      await loadWishes(lastDocToStartFrom, pagination.currentPage);
    } catch (error) {
      console.error("Error deleting wish:", error);
      alert("Error al eliminar el deseo");
    }
  };

  const onToggleApproval = async (wish: Wish) => {
    try {
      await toggleWishApproval(eventId, wish.id);
      const prevPageNumber = pagination.currentPage - 1;
      const prevPageInfo = pagination.pages.find(p => p.pageNumber === prevPageNumber);
      const lastDocToStartFrom = prevPageInfo?.lastDoc || null;

      await loadWishes(lastDocToStartFrom, pagination.currentPage);
    } catch (error) {
      console.error("Error toggling approval:", error);
      alert("Error al cambiar el estado de aprobación");
    }
  };

  const onCreate = () => {
    setSelectedWish({
      id: "",
      eventId,
      userName: "",
      message: "",
      photoUrl: "",
      createdAt: null,
      approved: false,
      deviceType: "web",
      location: undefined,
      colorTheme: "gold",
      public: true,
    } as Wish);
    setIsModalOpen(true);
  };

  const actions = [
    {
      key: "toggleApproval",
      label: "Aprobar/Rechazar",
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: (item: any) => onToggleApproval(item),
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
      name: "userName", 
      label: "Nombre de Usuario", 
      type: "text", 
      required: true, 
      placeholder: "Ej: Sergio Giraldo" 
    },
    { 
      name: "message", 
      label: "Mensaje", 
      type: "textarea", 
      required: true, 
      placeholder: "Que todos cumplamos nuestros sueños ✨",
      maxLength: 500
    },
    {
      name: "photoUrl",
      label: "URL de la Foto",
      type: "text",
      placeholder: "https://firebasestorage.googleapis.com/..."
    },
    { 
      name: "colorTheme", 
      label: "Color del Tema", 
      type: "color",
      defaultValue: "#FFD700"
    },
    { 
      name: "deviceType", 
      label: "Tipo de Dispositivo", 
      type: "select",
      options: [
        { value: "mobile", label: "Móvil" },
        { value: "tablet", label: "Tablet" },
        { value: "desktop", label: "Escritorio" },
        { value: "web", label: "Web" },
      ]
    },
    { 
      name: "approved", 
      label: "Aprobado", 
      type: "checkbox" 
    },
    { 
      name: "public", 
      label: "Público", 
      type: "checkbox" 
    },
  ];

  const handleSubmit = async (data: any) => {
    try {
      // Validar datos
      const errors = eventUtils.validateWish(data);
      if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
      }

      if (data.id) {
        await updateWish(eventId, data.id, data);
      } else {
        await createWish(eventId, data);
      }
      
      setIsModalOpen(false);

      const prevPageNumber = pagination.currentPage - 1;
      const prevPageInfo = pagination.pages.find(p => p.pageNumber === prevPageNumber);
      const lastDocToStartFrom = prevPageInfo?.lastDoc || null;

      await loadWishes(lastDocToStartFrom, pagination.currentPage);
    } catch (error) {
      console.error("Error submitting wish:", error);
      alert("Error al guardar el deseo");
    }
  };

  return (
    <div className="py-8">
     <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <User2 className="h-8 w-8" />
          Gestión de Deseos de usuario
        </h1>
        <p className="text-gray-600 mt-2">
          Administra los eventos y sus deseos asociados
        </p>
      </div>

      <DataTable
        data={wishes}
        columns={columns}
        actions={actions}
        searchFields={["userName", "message"]}
        title="Deseos del Evento"
        selectable
        onCreate={onCreate}
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
        title={selectedWish?.id ? "Editar Deseo" : "Crear Deseo"}
      >
        <Form
          initialData={selectedWish}
          fields={formFields}
          onSubmit={handleSubmit}
          submitButtonText={selectedWish?.id ? "Guardar Cambios" : "Crear Deseo"}
        />
      </Modal>
    </div>
  );
}
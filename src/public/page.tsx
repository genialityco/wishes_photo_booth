
import { Suspense } from "react";
import PhotoBoothWizard from "./PhotoBoothWizard";
export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <PhotoBoothWizard
        //frameSrc="/images/marco.png"
        mirror
        boxSize="min(88vw, 70svh)"
        eventId="Dr8vPWpmnq1HtcEOCSEn"
      />
    </Suspense>
  );
}

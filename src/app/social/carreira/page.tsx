import { Carreira } from "@/app/admin/dr/Carreira";

export default function CarreiraPage() {
  return <Carreira endpoint="/api/carreira" podeEditar={false} />;
}

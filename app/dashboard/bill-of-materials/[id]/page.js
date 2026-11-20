
import BillOfMaterialsForm from "@/components/BillOfMaterialsForm";

export default async function EditBillOfMaterialsPage({ params }) {
    const { id } = await params;

    return <BillOfMaterialsForm bomId={id} />;
}
